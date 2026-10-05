/**
 * Jogador automático da simulação de balanceamento, com a estratégia do
 * plano: casa todos e tem até 4 filhos por casal; põe os filhos no colégio
 * particular quando a renda cobre, tenta a federal e paga a faculdade
 * particular quando não passa; escolhe a vaga de maior salário, paga os cursos
 * de promoção, compra o imóvel que se paga mais rápido e pega as recompensas
 * das missões.
 *
 * A família vem primeiro: filhos e casamentos saem antes dos investimentos, e
 * quando falta lugar em casa para eles, o dinheiro vai para o imóvel de
 * moradia com o lugar mais barato. Quando o bairro não tem mais imóvel de
 * moradia à venda, quem casa sai de casa para formar a própria família. O que
 * sobra vai para os imóveis que se pagam mais rápido.
 *
 * Fica fora da engine e do jogo: só o script `npm run sim` e o teste de
 * balanceamento usam.
 */
import { careerLevel } from '../content/careers'
import { PROPERTY_TYPES, type PropertyId } from '../content/properties'
import { degree } from '../content/schools'
import {
  advance,
  applyAction,
  checkHaveChild,
  checkSeekPartner,
  claimableMissions,
  familyRates,
  freePlaces,
  isPropertyUnlocked,
  livingMembers,
  msToTicks,
  newGame,
  paybackYears,
  propertiesLeft,
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
  /** Casais que saíram de casa para formar a própria família. */
  leftHome: number
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
      leftHome: 0,
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
    left -= clockMs(play.state) - before
    if (play.state.choices.length === 0) break
    if (!act(play, { type: 'choose', picks: strategyPicks(play.state) })) break
  }
  play.elapsedMs += ms
}

/** Parte da renda que a estratégia guarda antes de pagar colégio ou faculdade particular. */
const SAVINGS_SHARE = 0.25

/**
 * Respostas da estratégia para as escolhas abertas. As mensalidades escolhidas
 * saem do que sobra para a família depois de guardar `SAVINGS_SHARE` da renda,
 * uma escolha depois da outra, para várias matrículas no mesmo janeiro não
 * passarem juntas do orçamento.
 */
export function strategyPicks(state: GameState): ChoicePick[] {
  const { net, income } = familyRates(state)
  const budget = { left: net - SAVINGS_SHARE * income }
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
 * Gasta o dinheiro na ordem da estratégia: recompensas das missões, cursos,
 * filhos, casamentos e, por último, os imóveis que se pagam mais rápido. Filho
 * e casamento sem lugar em casa esperam o imóvel de moradia com o lugar mais
 * barato, e o dinheiro dele fica guardado. Sem imóvel de moradia à venda, quem
 * casa sai de casa.
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

  // Quantos lugares em casa a família quer a mais: um para cada filho e cada casamento.
  let wanted = 0
  const kids = childrenCount(play.state)
  for (const member of couples(play.state)) {
    if ((kids.get(member.id) ?? 0) >= play.maxChildren) continue
    const check = checkHaveChild(play.state, member.id)
    if (check.ok) {
      if (act(play, { type: 'haveChild', parentId: member.id })) play.counters.births += 1
    } else if (check.error === 'noRoom') {
      wanted += 1
    }
  }

  const cost = weddingCost()
  for (const member of livingMembers(play.state)) {
    if (!checkSeekPartner(play.state, member.id).ok) continue
    if (freePlaces(play.state) < 1 && homeForRoom(play.state)) {
      wanted += 1
      continue
    }
    if (play.state.money < cost) break
    if (!act(play, { type: 'findSuitors', memberId: member.id })) continue
    const suitorIndex = bestSuitor(play.state, member.id)
    const result = applyAction(play.state, { type: 'marry', memberId: member.id, suitorIndex })
    if (!result.ok) continue
    play.state = result.state
    play.counters.weddings += 1
    play.counters.leftHome += count(result.events, 'leftHome')
  }

  // O imóvel de moradia que dá lugar para quem espera, ou o dinheiro guardado para ele.
  let reserve = 0
  while (wanted > 0) {
    const home = homeForRoom(play.state)
    if (!home) break
    if (home.price > play.state.money) {
      reserve = home.price
      break
    }
    if (!act(play, { type: 'buyProperty', propertyId: home.id })) break
    play.counters.properties += 1
    wanted -= home.places
  }

  for (;;) {
    const choice = propertyToBuy(play.state, play.state.money - reserve)
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

/** O imóvel de moradia à venda com o lugar em casa mais barato, ou null quando o bairro não tem mais. */
function homeForRoom(state: GameState): { id: PropertyId; price: number; places: number } | null {
  let best: { id: PropertyId; price: number; places: number } | null = null
  for (const type of PROPERTY_TYPES) {
    if (!type.home || !isPropertyUnlocked(state, type.id) || propertiesLeft(state, type.id) < 1) {
      continue
    }
    const option = { id: type.id, price: propertyPrice(state, type.id), places: type.home.places }
    if (!best || option.price / option.places < best.price / best.places) best = option
  }
  return best
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
      price: propertyPrice(state, type.id),
      payback: paybackYears(state, type.id),
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
