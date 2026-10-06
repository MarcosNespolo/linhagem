/**
 * Os limites que a simulação de balanceamento precisa cumprir, os do plano, e
 * as medidas de cada um ao longo de uma partida do jogador automático.
 */
import {
  advance,
  applyAction,
  daysToMs,
  familyRates,
  livingMembers,
  ownedCount,
  serialize,
  totalProperties,
  type GameState,
} from '../engine'
import { BALANCE } from '../content/balance'
import { PROPERTY_TYPES } from '../content/properties'
import { formatGameSpan, formatMoney } from '../lib/format'
import { clockMs, strategyPicks } from './autoplay'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

export const LIMITS = {
  /** Números: dinheiro e renda finitos e abaixo disto. */
  maxNumber: 1e15,
  /**
   * Marcos: em que momento do jogo a família chega a cada um. O primeiro
   * imóvel não pode vir cedo demais, para o começo ter escolhas apertadas, nem
   * tarde demais, para o jogador ver progresso; dez imóveis perto de uma hora;
   * e o primeiro comercial depois de duas.
   */
  milestones: {
    firstProperty: { minMs: 6 * MINUTE, maxMs: 20 * MINUTE },
    tenProperties: { minMs: 40 * MINUTE, maxMs: 120 * MINUTE },
    firstCommercial: { minMs: 70 * MINUTE, maxMs: Infinity },
  },
  /**
   * Crescimento: a renda por mês no fim de cada hora, sem o bônus das
   * missões, fica entre `min` e `max` vezes a do fim da hora anterior. Com o
   * começo de uma pessoa só, a primeira hora é a mais fraca, e a família
   * cresce de uma dezena para uma centena de pessoas na segunda; depois, a
   * renda oscila com as gerações que nascem e morrem.
   */
  hourlyGrowth: { min: 0.75, max: 30 },
  /** Família: pessoas vivas depois das primeiras horas. */
  family: { afterMs: 3 * HOUR, min: 60, max: 150 },
  /** Save: o limite de cada save na nuvem, em bytes. */
  saveBytes: 1_048_576,
  /** Relógio: milissegundos de processamento por segundo de jogo. */
  msPerGameSecond: 2,
  /** Volta ao jogo: o teto do tempo fora, em anos do jogo, e o tempo máximo para simular. */
  offline: { years: BALANCE.away.capYears, maxMs: 200 },
} as const

/** Medidas que se acumulam a cada passo da simulação. */
export type Measures = {
  /** Maior valor visto em dinheiro, total ganho ou renda por mês. */
  maxNumber: number
  allFinite: boolean
  /** Quando a família chegou a cada marco, em milissegundos reais, ou null ainda não. */
  firstPropertyAtMs: number | null
  tenPropertiesAtMs: number | null
  firstCommercialAtMs: number | null
  /** Renda por mês no fim de cada hora completa, sem o bônus das missões. */
  hourlyIncome: number[]
  /** Menor e maior número de pessoas vivas depois das primeiras horas. */
  familyMin: number
  familyMax: number
}

export function newMeasures(): Measures {
  return {
    maxNumber: 0,
    allFinite: true,
    firstPropertyAtMs: null,
    tenPropertiesAtMs: null,
    firstCommercialAtMs: null,
    hourlyIncome: [],
    familyMin: Infinity,
    familyMax: 0,
  }
}

/** Quantos imóveis comerciais a família tem. */
function commercialCount(state: GameState): number {
  return PROPERTY_TYPES.reduce((sum, type) => sum + (type.home ? 0 : ownedCount(state, type.id)), 0)
}

/**
 * Registra o passo que termina em `elapsedMs`. Chame com o estado depois do
 * relógio andar e da estratégia gastar, para os marcos contarem as compras.
 */
export function measureStep(measures: Measures, state: GameState, elapsedMs: number): void {
  const { income } = familyRates(state)
  for (const value of [state.money, state.stats.totalEarned, income]) {
    if (!Number.isFinite(value)) measures.allFinite = false
    else measures.maxNumber = Math.max(measures.maxNumber, Math.abs(value))
  }

  const properties = totalProperties(state)
  if (measures.firstPropertyAtMs === null && properties >= 1) {
    measures.firstPropertyAtMs = elapsedMs
  }
  if (measures.tenPropertiesAtMs === null && properties >= 10) {
    measures.tenPropertiesAtMs = elapsedMs
  }
  if (measures.firstCommercialAtMs === null && commercialCount(state) >= 1) {
    measures.firstCommercialAtMs = elapsedMs
  }

  if (elapsedMs % HOUR === 0) measures.hourlyIncome.push(baseIncome(state))

  if (elapsedMs >= LIMITS.family.afterMs) {
    const alive = livingMembers(state).length
    measures.familyMin = Math.min(measures.familyMin, alive)
    measures.familyMax = Math.max(measures.familyMax, alive)
  }
}

/** Renda por mês sem o bônus das missões, que dura poucos minutos. */
export function baseIncome(state: GameState): number {
  return familyRates({ ...state, boosts: { incomeUntil: 0 } }).income
}

/** Tamanho do save em bytes. */
export function saveBytes(state: GameState): number {
  return new TextEncoder().encode(serialize(state)).length
}

/**
 * Milissegundos de processamento por segundo de jogo: avança um segundo por
 * vez, como o relógio do jogo, respondendo as escolhas fora da conta. Os
 * primeiros segundos esquentam o código; vale a mediana dos seguintes, que não
 * sofre com uma pausa do coletor de lixo.
 */
export function clockCost(start: GameState, seconds = 120): number {
  let state = start
  const samples: number[] = []
  for (let i = 0; i < 20 + seconds; i++) {
    const begin = performance.now()
    state = advance(state, 1_000).state
    if (i >= 20) samples.push(performance.now() - begin)
    state = answerChoices(state)
  }
  samples.sort((a, b) => a - b)
  return samples[Math.floor(samples.length / 2)]
}

/**
 * Milissegundos para simular de uma vez o teto do tempo fora do jogo. O jogo
 * para na primeira escolha; aqui as escolhas são respondidas fora da conta,
 * para medir o teto inteiro. Vale a menor de três medidas, depois de uma
 * para esquentar o código.
 */
export function offlineCost(start: GameState): number {
  const runs = [0, 1, 2, 3].map(() => offlineRun(start))
  return Math.min(...runs.slice(1))
}

function offlineRun(start: GameState): number {
  const target = clockMs(start) + daysToMs(LIMITS.offline.years * BALANCE.daysPerYear)
  let state = start
  let spent = 0
  while (clockMs(state) < target - 1) {
    const begin = performance.now()
    state = advance(state, target - clockMs(state)).state
    spent += performance.now() - begin
    const answered = answerChoices(state)
    if (answered === state && clockMs(state) < target - 1) break
    state = answered
  }
  return spent
}

function answerChoices(state: GameState): GameState {
  let current = state
  while (current.choices.length > 0) {
    const result = applyAction(current, { type: 'choose', picks: strategyPicks(current) })
    if (!result.ok) break
    current = result.state
  }
  return current
}

export type LimitResult = {
  name: string
  ok: boolean
  /** O que a simulação mediu, em palavras. */
  value: string
  /** O limite do plano, em palavras. */
  limit: string
}

export type FinalMeasures = {
  saveBytes: number
  /** Milissegundos por segundo de jogo com a família do fim. */
  clockMs: number
  /** Milissegundos para simular o progresso offline máximo. */
  offlineMs: number
}

/**
 * Um marco: ok quando a família chegou a ele dentro da faixa, ou quando a
 * partida ainda não durou o bastante para cobrar.
 */
function milestone(
  name: string,
  at: number | null,
  { minMs, maxMs }: { minMs: number; maxMs: number },
  elapsedMs: number,
): LimitResult {
  const limit =
    maxMs === Infinity
      ? `depois de ${minutes(minMs)}`
      : `entre ${minutes(minMs)} e ${minutes(maxMs)}`
  if (at === null) {
    return {
      name,
      ok: elapsedMs < maxMs,
      value: elapsedMs < maxMs ? 'ainda não' : `não chegou em ${minutes(elapsedMs)}`,
      limit,
    }
  }
  return { name, ok: at >= minMs && at <= maxMs, value: `aos ${minutes(at)}`, limit }
}

/**
 * Confere cada limite. Crescimento e família só valem quando a partida dura o
 * bastante: com menos de duas horas completas, ou sem passar das primeiras
 * horas, ficam de fora. Uma família que acabou antes conta como zero pessoas.
 */
export function evaluate(
  measures: Measures,
  final: FinalMeasures,
  elapsedMs: number,
): LimitResult[] {
  const results: LimitResult[] = []
  results.push({
    name: 'Números',
    ok: measures.allFinite && measures.maxNumber < LIMITS.maxNumber,
    value: measures.allFinite ? `maior valor ${formatMoney(measures.maxNumber)}` : 'valor infinito',
    limit: 'finitos e abaixo de 10^15',
  })
  const { firstProperty, tenProperties, firstCommercial } = LIMITS.milestones
  results.push(milestone('1º imóvel', measures.firstPropertyAtMs, firstProperty, elapsedMs))
  results.push(milestone('10 imóveis', measures.tenPropertiesAtMs, tenProperties, elapsedMs))
  results.push(milestone('1º comercial', measures.firstCommercialAtMs, firstCommercial, elapsedMs))
  const hours = measures.hourlyIncome
  if (hours.length >= 2) {
    const { min, max } = LIMITS.hourlyGrowth
    const ratios = hours.slice(1).map((income, index) => income / hours[index])
    results.push({
      name: 'Crescimento',
      ok: ratios.every((ratio) => ratio >= min && ratio <= max),
      value: `renda no fim de cada hora: ${hours.map((income) => formatMoney(income)).join(' → ')}`,
      limit: `de ${min}× a ${max}× a da hora anterior`,
    })
  }
  if (measures.familyMin !== Infinity) {
    const { min, max } = LIMITS.family
    results.push({
      name: 'Família',
      ok: measures.familyMin >= min && measures.familyMax <= max,
      value: `${measures.familyMin} a ${measures.familyMax} vivos`,
      limit: `${min} a ${max} depois de ${minutes(LIMITS.family.afterMs)}`,
    })
  }
  results.push({
    name: 'Save',
    ok: final.saveBytes < LIMITS.saveBytes,
    value: `${Math.round(final.saveBytes / 1024)} KB`,
    limit: `${LIMITS.saveBytes / 1024} KB`,
  })
  results.push({
    name: 'Relógio',
    ok: final.clockMs < LIMITS.msPerGameSecond,
    value: `${final.clockMs.toFixed(2)} ms por segundo de jogo`,
    limit: `${LIMITS.msPerGameSecond} ms`,
  })
  results.push({
    name: 'Volta ao jogo',
    ok: final.offlineMs < LIMITS.offline.maxMs,
    value: `${formatGameSpan(LIMITS.offline.years * BALANCE.daysPerYear, BALANCE.daysPerYear)} em ${Math.round(final.offlineMs)} ms`,
    limit: `${LIMITS.offline.maxMs} ms`,
  })
  return results
}

function minutes(ms: number): string {
  const total = ms / MINUTE
  if (total >= 60) {
    const hours = Math.floor(total / 60)
    const rest = Math.round(total - hours * 60)
    return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`
  }
  return `${Number(total.toFixed(1)).toLocaleString('pt-BR')} min`
}
