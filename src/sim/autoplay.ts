/**
 * Jogador automático da simulação de balanceamento, com a estratégia do
 * plano: casa todos e tem até 4 filhos por casal; põe os filhos no colégio
 * particular quando a renda cobre, tenta a federal e paga a faculdade
 * particular quando não passa; escolhe a vaga de maior salário, paga os cursos
 * de promoção, compra o imóvel que se paga mais rápido e pega as recompensas
 * das missões.
 *
 * O dinheiro se divide ao meio: metade de tudo o que entra fica guardada para
 * os imóveis, e a outra metade paga as escolas, os cursos, os casamentos e os
 * filhos, os mais baratos primeiro. Gastar tudo na família deixaria os imóveis
 * parados quando ela fica grande, e a renda pararia de crescer.
 *
 * Fica fora da engine e do jogo: só o script `npm run sim` e o teste de
 * balanceamento usam.
 */
import { careerLevel } from '../content/careers'
import { degree } from '../content/schools'
import {
  advance,
  applyAction,
  availableCourses,
  checkHaveChild,
  checkSeekPartner,
  childrenOf,
  claimableMissions,
  familyRates,
  isPropertyUnlocked,
  livingMembers,
  msToTicks,
  newGame,
  paybackYears,
  propertyPrice,
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
} from '../engine'
import type { PropertyId } from '../content/properties'

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
  /** Dinheiro guardado para o próximo imóvel; o resto é da família. */
  propertyFund: number
  /** Total ganho e aluguel recebido até o último passo, para separar a parte dos imóveis. */
  earnedSoFar: number
  rentSoFar: number
  counters: AutoplayCounters
}

/** Parte de tudo o que entra (salários, aluguel e recompensas) guardada para imóveis. */
export const PROPERTY_SHARE = 0.5

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
    propertyFund: 0,
    earnedSoFar: 0,
    rentSoFar: 0,
    counters: { births: 0, weddings: 0, deaths: 0, courses: 0, properties: 0, rewards: 0 },
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
    left -= clockMs(play.state) - before
    if (play.state.choices.length === 0) break
    if (!act(play, { type: 'choose', picks: strategyPicks(play.state) })) break
  }
  play.elapsedMs += ms
}

/**
 * Respostas da estratégia para as escolhas abertas. As mensalidades escolhidas
 * saem do que sobra para a família, uma escolha depois da outra, para várias
 * matrículas no mesmo janeiro não passarem juntas do orçamento.
 */
export function strategyPicks(state: GameState): ChoicePick[] {
  const budget = { left: familyNet(state) }
  return state.choices.map((choice) => ({
    memberId: choice.memberId,
    option: pick(choice, budget),
  }))
}

function pick(choice: Choice, budget: { left: number }): number {
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
      return choice.suggested
  }
}

/**
 * Gasta o dinheiro na ordem da estratégia. Metade de tudo o que entra fica
 * guardada para o imóvel que se paga mais rápido; com a outra metade, a família
 * pega as recompensas das missões, paga os cursos, casa e tem filhos.
 */
export function spend(play: Autoplay): void {
  const { totalEarned, rentEarned } = play.state.stats
  const rent = rentEarned - play.rentSoFar
  const salaries = totalEarned - play.earnedSoFar - rent
  play.earnedSoFar = totalEarned
  play.rentSoFar = rentEarned
  play.propertyFund = Math.min(
    play.state.money,
    play.propertyFund + (rent + salaries) * PROPERTY_SHARE,
  )
  const free = () => play.state.money - play.propertyFund

  const date = missionDate(play)
  if (play.state.missions?.date !== date) act(play, { type: 'drawMissions', date })
  for (const mission of claimableMissions(play.state)) {
    if (act(play, { type: 'claimMission', missionId: mission.id })) play.counters.rewards += 1
  }

  for (const course of availableCourses(play.state)) {
    if (course.cost > free()) break
    if (act(play, { type: 'payCourse', memberId: course.memberId })) play.counters.courses += 1
  }

  for (const member of livingMembers(play.state)) {
    if (!checkSeekPartner(play.state, member.id).ok || free() < weddingCost(play.state)) continue
    if (!act(play, { type: 'findSuitors', memberId: member.id })) continue
    const suitorIndex = bestSuitor(play.state, member.id)
    if (act(play, { type: 'marry', memberId: member.id, suitorIndex })) play.counters.weddings += 1
  }
  // Os filhos mais baratos primeiro: o primeiro filho de cada casal antes do terceiro de outro.
  const couples = livingMembers(play.state)
    .filter((member) => member.partnerId !== null && member.id < member.partnerId)
    .filter((member) => childrenOf(play.state, member.id).length < play.maxChildren)
    .map((member) => ({ member, check: checkHaveChild(play.state, member.id) }))
    .flatMap(({ member, check }) => (check.ok ? [{ id: member.id, cost: check.cost }] : []))
    .sort((a, b) => a.cost - b.cost)
  for (const couple of couples) {
    if (couple.cost > free()) break
    if (act(play, { type: 'haveChild', parentId: couple.id })) play.counters.births += 1
  }

  for (;;) {
    const choice = propertyToBuy(play)
    if (!choice || !act(play, { type: 'buyProperty', propertyId: choice.id })) break
    play.propertyFund -= choice.price
    play.counters.properties += 1
  }
}

/**
 * O imóvel que se paga mais rápido, quando o dinheiro guardado alcança. Se
 * juntar para ele levaria mais que `PATIENCE_MINUTES`, compra o que se paga mais
 * rápido entre os que já dá para comprar.
 */
function propertyToBuy(play: Autoplay): { id: PropertyId; price: number } | null {
  const { state } = play
  const options = visiblePropertyTypes(state)
    .filter((type) => isPropertyUnlocked(state, type.id))
    .map((type) => ({
      id: type.id,
      price: propertyPrice(state, type.id),
      payback: paybackYears(state, type.id),
    }))
    .sort((a, b) => a.payback - b.payback)
  const [best] = options
  if (!best) return null
  if (best.price <= play.propertyFund) return best
  const perMinute = PROPERTY_SHARE * 12 * familyRates(state).income
  const wait = (best.price - play.propertyFund) / Math.max(perMinute, 1)
  if (wait <= PATIENCE_MINUTES) return null
  return options.find((option) => option.price <= play.propertyFund) ?? null
}

/** O que sobra por mês para a família: a metade da renda que não vai para imóveis, menos as despesas. */
function familyNet(state: GameState): number {
  const { income, expense } = familyRates(state)
  return income * (1 - PROPERTY_SHARE) - expense
}

/** Entre as pessoas sugeridas como par, a de maior salário. */
function bestSuitor(state: GameState, memberId: string): number {
  const suitors = state.suitors[memberId] ?? []
  const salary = (index: number) =>
    careerLevel(suitors[index].career.id, suitors[index].career.level).salaryPerMonth
  return suitors.reduce((best, _suitor, index) => (salary(index) > salary(best) ? index : best), 0)
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
