/**
 * Jogador automático da simulação de balanceamento, com a estratégia do
 * plano: namora quem aparece, casa quando o casamento cabe no dinheiro e tem
 * até 4 filhos por casal; põe os filhos no colégio particular quando a renda
 * cobre, tenta a federal e paga a faculdade particular quando não passa;
 * escolhe a vaga de maior salário, paga os cursos de promoção, compra o imóvel
 * que se paga mais rápido e pega as recompensas das missões.
 *
 * A família vem primeiro: filhos e casamentos saem antes dos investimentos,
 * mas a estratégia guarda alguns meses de despesa e só tem mais um filho com
 * folga na renda, porque a família não pode ir à falência. O que sobra vai
 * para o imóvel que se paga mais rápido: os de moradia contam o aluguel que a
 * família deixa de pagar morando neles. Se mesmo assim o saldo ficar
 * negativo, ela despausa o jogo, como o jogador faria.
 *
 * Fica fora da engine e do jogo: só o script `npm run sim` e o teste de
 * balanceamento usam.
 */
import { BALANCE } from '../content/balance'
import { careerLevel } from '../content/careers'
import { type PropertyId, type PropertyType } from '../content/properties'
import { degree } from '../content/schools'
import {
  advance,
  applyAction,
  checkHaveChild,
  claimableMissions,
  familyRates,
  isPropertyUnlocked,
  livingMembers,
  msToTicks,
  newGame,
  PROPOSE_OPTIONS,
  propertiesLeft,
  propertyPrice,
  rentedPlaces,
  stageFee,
  TICKS_PER_DAY,
  TICKS_PER_MS,
  visiblePropertyTypes,
  weddingCost,
  type Action,
  type Choice,
  type ChoicePick,
  type GameEvent,
  type GameState,
  type Member,
} from '../engine'

export type AutoplayOptions = {
  seed: number
  /** Filhos por casal, no máximo. */
  maxChildren?: number
  /**
   * De quanto em quanto tempo real o dia das missões vira. Com 1 hora, a
   * simulação joga como quem abre o jogo uma hora por dia.
   */
  missionDayMs?: number
}

/** O que a estratégia já fez, para a tabela da simulação. */
export type AutoplayCounters = {
  births: number
  weddings: number
  /** Vezes que a família entrou no vermelho, e se foi à falência. */
  debts: number
  bankrupt: boolean
  deaths: number
  courses: number
  properties: number
  rewards: number
}

export type Autoplay = {
  state: GameState
  /** Tempo real jogado, em milissegundos. */
  elapsedMs: number
  maxChildren: number
  missionDayMs: number
  counters: AutoplayCounters
}

/** Quantos minutos a estratégia espera, no máximo, para juntar o dinheiro do imóvel melhor. */
const PATIENCE_MINUTES = 20

/** Data de começo das partidas simuladas. */
const START_DATE = '2026-01-01'

export function createAutoplay(options: AutoplayOptions): Autoplay {
  return {
    state: newGame({ seed: options.seed, now: 0, startDate: START_DATE }),
    elapsedMs: 0,
    maxChildren: options.maxChildren ?? 4,
    missionDayMs: options.missionDayMs ?? 3_600_000,
    counters: {
      births: 0,
      weddings: 0,
      debts: 0,
      bankrupt: false,
      deaths: 0,
      courses: 0,
      properties: 0,
      rewards: 0,
    },
  }
}

/** Deixa o relógio andar `ms` de tempo real, respondendo as escolhas que abrem. */
export function runClock(play: Autoplay, ms: number): void {
  let left = ms
  while (msToTicks(left) > 0) {
    const before = clockMs(play.state)
    const result = advance(play.state, left)
    play.state = result.state
    play.counters.deaths += count(result.events, 'died')
    play.counters.debts += count(result.events, 'inDebt')
    left -= clockMs(play.state) - before
    if (play.state.bankruptDay !== null) {
      play.counters.bankrupt = true
      break
    }
    // No vermelho o jogo pausa para avisar; o jogador despausa e segue.
    if (play.state.clock.paused) act(play, { type: 'resume' })
    else if (play.state.choices.length > 0) {
      const result = applyAction(play.state, { type: 'choose', picks: strategyPicks(play.state) })
      if (!result.ok) break
      play.state = result.state
      play.counters.weddings += count(result.events, 'married')
    } else break
  }
  play.elapsedMs += ms
}

/** Parte da renda que a estratégia guarda antes de pagar colégio ou faculdade particular. */
const SAVINGS_SHARE = 0.25

/**
 * Respostas da estratégia para as escolhas abertas. As mensalidades escolhidas
 * saem do que sobra para a família depois de guardar `SAVINGS_SHARE` da renda,
 * uma escolha depois da outra, para várias matrículas no mesmo janeiro não
 * passarem juntas do orçamento. Os casamentos saem do dinheiro guardado, sem
 * gastar a reserva, também um depois do outro.
 */
export function strategyPicks(state: GameState): ChoicePick[] {
  const { net, income, expense } = familyRates(state)
  const budget = {
    left: net - SAVINGS_SHARE * income,
    money: state.money - RESERVE_MONTHS * expense,
  }
  return state.choices.map((choice) => ({
    memberId: choice.memberId,
    option: pick(choice, budget),
  }))
}

function pick(choice: Choice, budget: { left: number; money: number }): number {
  const afford = (fee: number) => {
    if (budget.left < fee) return false
    budget.left -= fee
    return true
  }
  switch (choice.type) {
    case 'school': {
      const find = (network: string) =>
        choice.options.findIndex((option) => option.available && option.network === network)
      if (choice.stage === 'creche') return choice.suggested
      const federal = find('federal')
      if (federal >= 0) return federal
      const particular = find('particular')
      if (particular >= 0 && afford(stageFee(choice.stage, 'particular'))) return particular
      return choice.suggested
    }
    case 'afterSchool': {
      const federal = choice.options.findIndex(
        (option) => option.path === 'faculdade' && option.network === 'federal' && option.available,
      )
      if (federal >= 0) return federal
      // Sem a federal, a faculdade particular de carreira mais bem paga que o orçamento cobre.
      let best = -1
      let bestSalary = 0
      choice.options.forEach((option, index) => {
        if (option.path !== 'faculdade' || option.network !== 'particular') return
        const course = degree(option.degree)
        const salary = careerLevel(course.careerId, 4).salaryPerMonth
        if (budget.left >= course.fee && salary > bestSalary) {
          best = index
          bestSalary = salary
        }
      })
      if (best < 0) return choice.suggested
      const chosen = choice.options[best]
      if (chosen.path === 'faculdade') budget.left -= degree(chosen.degree).fee
      return best
    }
    case 'firstJob':
    case 'concurso':
    case 'meet':
      return choice.suggested
    case 'propose':
      // Casa quando o casamento cabe no dinheiro; senão, espera mais um ano.
      if (budget.money < weddingCost()) return PROPOSE_OPTIONS.wait
      budget.money -= weddingCost()
      return PROPOSE_OPTIONS.marry
  }
}

/** Meses de despesa que a estratégia guarda antes de gastar, para não ir ao vermelho. */
const RESERVE_MONTHS = 3

/** Folga na renda líquida por mês que a estratégia pede antes de mais um filho. */
const CHILD_MARGIN = 2_000

/**
 * Gasta o dinheiro na ordem da estratégia: recompensas das missões, cursos,
 * filhos, casamentos e, por último, os imóveis que se pagam mais rápido,
 * sempre guardando `RESERVE_MONTHS` meses de despesa.
 */
export function spend(play: Autoplay): void {
  const date = missionDate(play)
  if (play.state.missions?.date !== date) act(play, { type: 'drawMissions', date })
  for (const mission of claimableMissions(play.state)) {
    if (act(play, { type: 'claimMission', missionId: mission.id })) play.counters.rewards += 1
  }

  const paid = applyAction(play.state, { type: 'payAllCourses' })
  if (paid.ok) {
    play.state = paid.state
    play.counters.courses += paid.events.length
  }

  const reserve = () => RESERVE_MONTHS * familyRates(play.state).expense
  const kids = childrenCount(play.state)
  for (const member of couples(play.state)) {
    if ((kids.get(member.id) ?? 0) >= play.maxChildren) continue
    if (familyRates(play.state).net < CHILD_MARGIN) break
    const check = checkHaveChild(play.state, member.id)
    if (!check.ok || play.state.money < check.cost + reserve()) continue
    if (act(play, { type: 'haveChild', parentId: member.id })) play.counters.births += 1
  }

  for (;;) {
    const choice = propertyToBuy(play.state, play.state.money - reserve())
    if (!choice || !act(play, { type: 'buyProperty', propertyId: choice.id })) break
    play.counters.properties += 1
  }
}

/** Pessoas casadas e vivas, uma de cada casal. */
function couples(state: GameState): Member[] {
  return livingMembers(state).filter(
    (member) => member.partnerId !== null && member.id < member.partnerId,
  )
}

/**
 * Quanto um imóvel do tipo traz por mês: o de moradia, o aluguel que a família
 * deixa de pagar morando nele, menos as contas, quando ela ainda paga aluguel;
 * fora isso, o aluguel que ele rende.
 */
function monthlyReturn(state: GameState, type: PropertyType): number {
  const rented = rentedPlaces(state)
  if (!type.home || rented <= 0) return type.rentPerMonth
  const saved = Math.min(rented, type.home.places) * BALANCE.housing.rentPerPlace
  return Math.max(type.rentPerMonth, saved - type.home.billsPerMonth)
}

/** Quantos filhos cada pessoa tem, numa passada só por todos. */
function childrenCount(state: GameState): Map<string, number> {
  const kids = new Map<string, number>()
  for (const member of Object.values(state.members)) {
    for (const parentId of member.parentIds) kids.set(parentId, (kids.get(parentId) ?? 0) + 1)
  }
  return kids
}

/**
 * O imóvel que se paga mais rápido, quando `budget` alcança. Se juntar para ele
 * levaria mais que `PATIENCE_MINUTES`, compra o que se paga mais rápido entre os
 * que já dá para comprar, desde que não demore mais que o dobro para se pagar;
 * senão, continua juntando.
 */
function propertyToBuy(state: GameState, budget: number): { id: PropertyId; price: number } | null {
  const options = visiblePropertyTypes(state)
    .filter((type) => isPropertyUnlocked(state, type.id) && propertiesLeft(state, type.id) > 0)
    .map((type) => ({
      id: type.id,
      price: propertyPrice(type.id),
      payback: propertyPrice(type.id) / monthlyReturn(state, type),
    }))
    .sort((a, b) => a.payback - b.payback)
  const [best] = options
  if (!best) return null
  if (best.price <= budget) return best
  const perMinute = 12 * familyRates(state).net
  const wait = (best.price - budget) / Math.max(perMinute, 1)
  if (wait <= PATIENCE_MINUTES) return null
  return (
    options.find((option) => option.price <= budget && option.payback <= 2 * best.payback) ?? null
  )
}

/** Data das missões no dia simulado, a partir de 1º de janeiro de 2026. */
function missionDate(play: Autoplay): string {
  const day = Math.floor(play.elapsedMs / play.missionDayMs)
  return new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10)
}

function act(play: Autoplay, action: Action): boolean {
  const result = applyAction(play.state, action)
  if (result.ok) play.state = result.state
  return result.ok
}

function count(events: readonly GameEvent[], type: GameEvent['type']): number {
  return events.filter((event) => event.type === type).length
}

/** Posição do relógio em milissegundos reais desde o dia 0, sem arredondar. */
export function clockMs(state: GameState): number {
  return (state.clock.day * TICKS_PER_DAY + state.clock.tickOfDay) / TICKS_PER_MS
}
