import { BALANCE } from '../content/balance'
import type { MissionId } from '../content/missions'
import { inheritAppearance } from './appearance'
import type { PropertyId } from '../content/properties'
import type { Network } from '../content/schools'
import { applyPicks, checkPicks, type ChoicePick } from './choices'
import { FAMILY_NAME_MAX_LENGTH } from './constants'
import { draftOf } from './draft'
import { checkChangeSchool } from './enrollment'
import { refuse, type ActionError, type Refusal } from './errors'
import { recordEvents } from './log'
import { checkMarry, checkSeekPartner, joinFamily, rollSuitors } from './marriage'
import { addMember, ageOf, childrenOf, familySizeFactor, isAlive } from './members'
import { claimReward, drawMissions, isMissionDone, trackMissions } from './missions'
import {
  affordableCourses,
  availableCourses,
  courseFor,
  payCourse as applyCourse,
} from './promotions'
import { buyProperty as applyPurchase, checkBuyProperty } from './properties'
import { createRng } from './rng'
import { inheritAptitude } from './school'
import { canHaveTutor, setTutor as applyTutor } from './tutor'
import type { GameEvent, GameState, MemberId } from './types'

export type { ActionError }

export type Action =
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'renameFamily'; name: string }
  | { type: 'haveChild'; parentId: MemberId }
  | { type: 'findSuitors'; memberId: MemberId }
  | { type: 'marry'; memberId: MemberId; suitorIndex: number }
  /** Responde escolhas abertas. Quando não sobra nenhuma, o relógio volta a andar. */
  | { type: 'choose'; picks: ChoicePick[] }
  /** Troca a rede da escola ou do ensino médio na próxima matrícula. A mesma rede desfaz o pedido. */
  | { type: 'changeSchool'; memberId: MemberId; network: Network }
  /** Paga o curso de quem está pronto para o 4º ou o 5º nível, que sobe na hora. */
  | { type: 'payCourse'; memberId: MemberId }
  /** Paga os cursos disponíveis, do mais barato ao mais caro, enquanto houver dinheiro. */
  | { type: 'payAllCourses' }
  /** Compra um imóvel do tipo, de um em um. */
  | { type: 'buyProperty'; propertyId: PropertyId }
  /**
   * Sorteia as missões do dia do aparelho, no formato AAAA-MM-DD. A data vem da
   * store, porque a engine não conhece o relógio do aparelho. As missões do dia
   * anterior somem, com as recompensas que não foram pegas.
   */
  | { type: 'drawMissions'; date: string }
  /** Pega a recompensa de uma missão cumprida. */
  | { type: 'claimMission'; missionId: MissionId }
  /** Contrata ou dispensa o professor particular de quem está na escola ou no médio. */
  | { type: 'setTutor'; memberId: MemberId; active: boolean }

export type ActionResult = { ok: true; state: GameState; events: GameEvent[] } | Refusal

/** Aplica uma ação do jogador. Função pura: devolve um estado novo ou o motivo da recusa. */
export function applyAction(state: GameState, action: Action): ActionResult {
  switch (action.type) {
    case 'pause':
      return done({ ...state, clock: { ...state.clock, paused: true } })
    case 'resume':
      return done({ ...state, clock: { ...state.clock, paused: false } })
    case 'renameFamily': {
      const name = action.name.trim()
      if (name.length === 0 || name.length > FAMILY_NAME_MAX_LENGTH) return refuse('invalidName')
      return done({ ...state, familyName: name })
    }
    case 'haveChild':
      return haveChild(state, action.parentId)
    case 'findSuitors':
      return findSuitors(state, action.memberId)
    case 'marry':
      return marry(state, action.memberId, action.suitorIndex)
    case 'choose':
      return choose(state, action.picks)
    case 'changeSchool':
      return changeSchool(state, action.memberId, action.network)
    case 'payCourse':
      return payCourse(state, action.memberId)
    case 'payAllCourses':
      return payAllCourses(state)
    case 'buyProperty':
      return buyProperty(state, action.propertyId)
    case 'drawMissions':
      return newMissions(state, action.date)
    case 'claimMission':
      return claimMission(state, action.missionId)
    case 'setTutor':
      return setTutor(state, action.memberId, action.active)
  }
}

export type ChildCheck = { ok: true; cost: number; partnerId: MemberId } | Refusal

/**
 * Custo do próximo filho do casal: cresce a cada filho que os dois já tiveram
 * juntos e com o tamanho da família viva.
 */
export function childCost(state: GameState, parentId: MemberId, partnerId: MemberId): number {
  const together = childrenOf(state, parentId).filter((child) =>
    child.parentIds.includes(partnerId),
  ).length
  const { baseCost, coupleGrowth } = BALANCE.children
  return Math.round(baseCost * coupleGrowth ** together * familySizeFactor(state))
}

/** Dias do jogo até o casal poder ter outro filho. Zero quando já pode. */
export function childCooldownDaysLeft(state: GameState, parentId: MemberId): number {
  const parent = state.members[parentId]
  if (!parent) return 0
  const partner = parent.partnerId ? state.members[parent.partnerId] : undefined
  const last = Math.max(parent.lastChildDay ?? -Infinity, partner?.lastChildDay ?? -Infinity)
  return Math.max(0, BALANCE.children.cooldownDays - (state.clock.day - last))
}

/** Diz se o membro pode ter um filho agora e, se puder, quanto custa. */
export function checkHaveChild(state: GameState, parentId: MemberId): ChildCheck {
  const parent = state.members[parentId]
  if (!parent) return refuse('memberNotFound')
  if (!isAlive(parent)) return refuse('memberDeceased')
  const partner = parent.partnerId ? state.members[parent.partnerId] : undefined
  if (!partner || !isAlive(partner)) return refuse('noPartner')

  const { minParentAge, maxParentAge } = BALANCE.children
  const ages = [ageOf(parent, state.clock.day), ageOf(partner, state.clock.day)]
  if (ages.some((age) => age < minParentAge)) return refuse('tooYoung')
  if (ages.some((age) => age > maxParentAge)) return refuse('tooOld')
  if (childCooldownDaysLeft(state, parentId) > 0) return refuse('cooldown')

  const cost = childCost(state, parent.id, partner.id)
  if (state.money < cost) return refuse('notEnoughMoney')
  return { ok: true, cost, partnerId: partner.id }
}

function haveChild(state: GameState, parentId: MemberId): ActionResult {
  const check = checkHaveChild(state, parentId)
  if (!check.ok) return check

  const draft = draftOf(state)
  const rng = createRng(draft.rngState)
  const day = draft.clock.day
  const parent = draft.members[parentId]
  const partner = draft.members[check.partnerId]
  const gender = rng.chance(0.5) ? 'f' : 'm'
  const child = addMember(draft, rng, {
    gender,
    birthDay: day,
    generation: Math.max(parent.generation, partner.generation) + 1,
    parentIds: [parent.id, partner.id],
    origin: 'born',
    appearance: inheritAppearance(rng, parent.appearance, partner.appearance, gender),
  })
  child.aptitude = inheritAptitude(parent, partner, child)
  parent.lastChildDay = day
  partner.lastChildDay = day
  draft.money -= check.cost
  draft.stats.totalSpent += check.cost
  draft.rngState = rng.state
  const events: GameEvent[] = [{ type: 'born', day, memberId: child.id }]
  recordEvents(draft, events)
  return done(draft, events)
}

/** Sorteia novas pessoas sugeridas como par. Grátis: dá para procurar quantas vezes quiser. */
function findSuitors(state: GameState, memberId: MemberId): ActionResult {
  const check = checkSeekPartner(state, memberId)
  if (!check.ok) return check

  const draft = draftOf(state)
  const rng = createRng(draft.rngState)
  draft.suitors[memberId] = rollSuitors(draft, rng, draft.members[memberId])
  draft.rngState = rng.state
  return done(draft)
}

function marry(state: GameState, memberId: MemberId, suitorIndex: number): ActionResult {
  const check = checkMarry(state, memberId, suitorIndex)
  if (!check.ok) return check

  const draft = draftOf(state)
  const rng = createRng(draft.rngState)
  const spouse = joinFamily(draft, rng, draft.members[memberId], check.suitor)
  delete draft.suitors[memberId]
  draft.money -= check.cost
  draft.stats.totalSpent += check.cost
  draft.rngState = rng.state
  const events: GameEvent[] = [
    { type: 'married', day: draft.clock.day, memberId, partnerId: spouse.id },
  ]
  recordEvents(draft, events)
  return done(draft, events)
}

function choose(state: GameState, picks: readonly ChoicePick[]): ActionResult {
  const check = checkPicks(state, picks)
  if (!check.ok) return check

  const draft = draftOf(state)
  const rng = createRng(draft.rngState)
  const events = applyPicks(draft, rng, picks)
  draft.rngState = rng.state
  recordEvents(draft, events)
  return done(draft, events)
}

function changeSchool(state: GameState, memberId: MemberId, network: Network): ActionResult {
  const check = checkChangeSchool(state, memberId, network)
  if (!check.ok) return check

  const draft = draftOf(state)
  const school = draft.members[memberId].education.school
  if (!school) return refuse('notStudying')
  if (network === school.network) delete school.next
  else school.next = network
  return done(draft)
}

function payCourse(state: GameState, memberId: MemberId): ActionResult {
  const member = state.members[memberId]
  if (!member) return refuse('memberNotFound')
  const course = courseFor(member, state.clock.day)
  if (!course) return refuse('noCourse')
  if (state.money < course.cost) return refuse('notEnoughMoney')

  const draft = draftOf(state)
  const events = [applyCourse(draft, course)]
  recordEvents(draft, events)
  return done(draft, events)
}

function payAllCourses(state: GameState): ActionResult {
  if (availableCourses(state).length === 0) return refuse('noCourse')
  const courses = affordableCourses(state)
  if (courses.length === 0) return refuse('notEnoughMoney')

  const draft = draftOf(state)
  const events = courses.map((course) => applyCourse(draft, course))
  recordEvents(draft, events)
  return done(draft, events)
}

function buyProperty(state: GameState, id: PropertyId): ActionResult {
  const check = checkBuyProperty(state, id)
  if (!check.ok) return check

  const draft = draftOf(state)
  const events = [applyPurchase(draft, id, check.price)]
  recordEvents(draft, events)
  return done(draft, events)
}

function newMissions(state: GameState, date: string): ActionResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return refuse('invalidDate')
  if (state.missions?.date === date) return refuse('alreadyDrawn')

  const draft = draftOf(state)
  draft.missions = { date, list: drawMissions(state, date) }
  trackMissions(draft, [])
  return done(draft)
}

function claimMission(state: GameState, id: MissionId): ActionResult {
  const mission = state.missions?.list.find((candidate) => candidate.id === id)
  if (!mission) return refuse('missionNotFound')
  if (mission.claimed) return refuse('alreadyClaimed')
  if (!isMissionDone(mission)) return refuse('missionNotDone')

  const draft = draftOf(state)
  const target = draft.missions?.list.find((candidate) => candidate.id === id)
  if (target) claimReward(draft, target)
  return done(draft)
}

function setTutor(state: GameState, memberId: MemberId, active: boolean): ActionResult {
  const member = state.members[memberId]
  if (!member) return refuse('memberNotFound')
  if (!isAlive(member)) return refuse('memberDeceased')
  if (active && !canHaveTutor(member)) return refuse('notStudying')

  const draft = draftOf(state)
  applyTutor(draft.members[memberId], draft.clock.day, active)
  return done(draft)
}

function done(state: GameState, events: GameEvent[] = []): ActionResult {
  return { ok: true, state, events }
}
