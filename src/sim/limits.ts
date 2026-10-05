/**
 * Os limites que a simulação de balanceamento precisa cumprir, os do plano, e
 * as medidas de cada um ao longo de uma partida do jogador automático.
 */
import {
  advance,
  affordableCourses,
  applyAction,
  checkBuyProperty,
  checkHaveChild,
  checkSeekPartner,
  daysToMs,
  familyRates,
  livingMembers,
  serialize,
  visiblePropertyTypes,
  weddingCost,
  type GameState,
} from '../engine'
import { BALANCE } from '../content/balance'
import { formatMoney } from '../lib/format'
import { clockMs, strategyPicks } from './autoplay'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

export const LIMITS = {
  /** Números: dinheiro e renda finitos e abaixo disto. */
  maxNumber: 1e15,
  /** Ritmo: depois do começo, nunca mais que isto sem nada para comprar. */
  rhythm: { graceMs: 5 * MINUTE, maxIdleMs: 2 * MINUTE },
  /**
   * Crescimento: a renda por mês no fim de cada hora, sem a renda em dobro das
   * missões, é maior que a do fim da hora anterior, e no máximo tantas vezes.
   */
  maxHourlyGrowth: 10,
  /** Família: pessoas vivas depois das primeiras horas. */
  family: { afterMs: 3 * HOUR, min: 60, max: 150 },
  /** Save: o limite de cada save na nuvem, em bytes. */
  saveBytes: 1_048_576,
  /** Relógio: milissegundos de processamento por segundo de jogo. */
  msPerGameSecond: 2,
  /** Volta ao jogo: anos de progresso offline e o tempo máximo para simular. */
  offline: { years: BALANCE.offlineCapYears, maxMs: 200 },
} as const

/**
 * Se a família consegue comprar alguma coisa agora: um filho, um casamento, um
 * curso de promoção ou um imóvel.
 */
export function canBuySomething(state: GameState): boolean {
  if (affordableCourses(state).length > 0) return true
  if (visiblePropertyTypes(state).some((type) => checkBuyProperty(state, type.id).ok)) return true
  const wedding = state.money >= weddingCost()
  for (const member of livingMembers(state)) {
    if (wedding && checkSeekPartner(state, member.id).ok) return true
    if (member.partnerId && checkHaveChild(state, member.id).ok) return true
  }
  return false
}

/** Medidas que se acumulam a cada passo da simulação. */
export type Measures = {
  /** Maior valor visto em dinheiro, total ganho ou renda por mês. */
  maxNumber: number
  allFinite: boolean
  /** Maior tempo seguido sem nada para comprar, depois do começo, e quando terminou. */
  maxIdleMs: number
  maxIdleAtMs: number
  idleMs: number
  /** Renda por mês no fim de cada hora completa, sem a renda em dobro das missões. */
  hourlyIncome: number[]
  /** Menor e maior número de pessoas vivas depois das primeiras horas. */
  familyMin: number
  familyMax: number
}

export function newMeasures(): Measures {
  return {
    maxNumber: 0,
    allFinite: true,
    maxIdleMs: 0,
    maxIdleAtMs: 0,
    idleMs: 0,
    hourlyIncome: [],
    familyMin: Infinity,
    familyMax: 0,
  }
}

/**
 * Registra o passo de `stepMs` que termina em `elapsedMs`. Chame com o estado
 * depois do relógio andar e antes da estratégia gastar, para ver o que dava
 * para comprar.
 */
export function measureStep(
  measures: Measures,
  state: GameState,
  elapsedMs: number,
  stepMs: number,
): void {
  const { income } = familyRates(state)
  for (const value of [state.money, state.stats.totalEarned, income]) {
    if (!Number.isFinite(value)) measures.allFinite = false
    else measures.maxNumber = Math.max(measures.maxNumber, Math.abs(value))
  }

  if (elapsedMs > LIMITS.rhythm.graceMs) {
    if (canBuySomething(state)) {
      measures.idleMs = 0
    } else {
      measures.idleMs += stepMs
      if (measures.idleMs > measures.maxIdleMs) {
        measures.maxIdleMs = measures.idleMs
        measures.maxIdleAtMs = elapsedMs
      }
    }
  }

  if (elapsedMs % HOUR === 0) measures.hourlyIncome.push(baseIncome(state))

  if (elapsedMs >= LIMITS.family.afterMs) {
    const alive = livingMembers(state).length
    measures.familyMin = Math.min(measures.familyMin, alive)
    measures.familyMax = Math.max(measures.familyMax, alive)
  }
}

/** Renda por mês sem a renda em dobro das missões, que dura poucos minutos. */
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
 * Milissegundos para simular o progresso offline máximo de uma vez. O jogo
 * para na primeira escolha; aqui as escolhas são respondidas fora da conta,
 * para medir os anos inteiros. Vale a menor de três medidas, depois de uma
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
 * Confere cada limite. Crescimento e família só valem quando a partida dura o
 * bastante: com menos de duas horas completas, ou sem passar das primeiras
 * horas, ficam de fora.
 */
export function evaluate(measures: Measures, final: FinalMeasures): LimitResult[] {
  const results: LimitResult[] = []
  results.push({
    name: 'Números',
    ok: measures.allFinite && measures.maxNumber < LIMITS.maxNumber,
    value: measures.allFinite ? `maior valor ${formatMoney(measures.maxNumber)}` : 'valor infinito',
    limit: 'finitos e abaixo de 10^15',
  })
  results.push({
    name: 'Ritmo',
    ok: measures.maxIdleMs <= LIMITS.rhythm.maxIdleMs,
    value:
      measures.maxIdleMs > 0
        ? `${minutes(measures.maxIdleMs)} sem nada para comprar, até ${minutes(measures.maxIdleAtMs)}`
        : 'sempre com algo para comprar',
    limit: `até ${minutes(LIMITS.rhythm.maxIdleMs)} depois de ${minutes(LIMITS.rhythm.graceMs)}`,
  })
  const hours = measures.hourlyIncome
  if (hours.length >= 2) {
    const ratios = hours.slice(1).map((income, index) => income / hours[index])
    results.push({
      name: 'Crescimento',
      ok: ratios.every((ratio) => ratio > 1 && ratio <= LIMITS.maxHourlyGrowth),
      value: `renda no fim de cada hora: ${hours.map((income) => formatMoney(income)).join(' → ')}`,
      limit: `sobe toda hora, até ${LIMITS.maxHourlyGrowth}×`,
    })
  }
  if (measures.familyMax > 0) {
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
    value: `${LIMITS.offline.years} anos em ${Math.round(final.offlineMs)} ms`,
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
