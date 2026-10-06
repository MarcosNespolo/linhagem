import { BALANCE } from '../content/balance'
import type { MissionId } from '../content/missions'
import { inheritAppearance } from './appearance'
import type { PropertyId } from '../content/properties'
import type { Network } from '../content/schools'
import { applyPicks, checkPicks, type ChoicePick } from './choices'
import { checkStudyForConcurso, quitToStudy } from './concurso'
import { acceptJobOffer, hasJobOffer } from './jobs'
import { FAMILY_NAME_MAX_LENGTH } from './constants'
import { draftOf } from './draft'
import { familyRates } from './economy'
import { checkChangeSchool } from './enrollment'
import { refuse, type ActionError, type Refusal } from './errors'
import { settleLoan } from './financing'
import { recordEvents } from './log'
import { addMember, ageOf, isAlive } from './members'
import { claimReward, drawMissions, isMissionDone, trackMissions } from './missions'
import { beginCourse, courseOffer } from './promotions'
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
  /** Responde escolhas abertas. Quando não sobra nenhuma, o relógio volta a andar. */
  | { type: 'choose'; picks: ChoicePick[] }
  /** Troca a rede da escola ou do ensino médio na próxima matrícula. A mesma rede desfaz o pedido. */
  | { type: 'changeSchool'; memberId: MemberId; network: Network }
  /**
   * Começa o curso do próximo nível, pago por mês enquanto a pessoa trabalha.
   * Com dedicação, dura a metade e custa o dobro por mês.
   */
  | { type: 'startCourse'; memberId: MemberId; dedicated: boolean }
  /** Para o curso em andamento. O que já foi pago não volta. */
  | { type: 'stopCourse'; memberId: MemberId }
  /** Compra um imóvel do tipo, de um em um, à vista ou financiado. */
  | { type: 'buyProperty'; propertyId: PropertyId; lot?: number; financed?: boolean }
  /** Quita um financiamento, pagando o saldo de uma vez. */
  | { type: 'payOffLoan'; loanId: number }
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
  /** Larga o emprego para estudar para concurso. */
  | { type: 'studyForConcurso'; memberId: MemberId }
  /** Responde a proposta de outra empresa: aceita e troca de carreira, ou recusa. */
  | { type: 'answerJobOffer'; memberId: MemberId; accept: boolean }

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
    case 'choose':
      return choose(state, action.picks)
    case 'changeSchool':
      return changeSchool(state, action.memberId, action.network)
    case 'startCourse':
      return startCourse(state, action.memberId, action.dedicated)
    case 'stopCourse':
      return stopCourse(state, action.memberId)
    case 'buyProperty':
      return buyProperty(state, action.propertyId, action.lot, action.financed ?? false)
    case 'payOffLoan':
      return payOffLoan(state, action.loanId)
    case 'drawMissions':
      return newMissions(state, action.date)
    case 'claimMission':
      return claimMission(state, action.missionId)
    case 'setTutor':
      return setTutor(state, action.memberId, action.active)
    case 'studyForConcurso':
      return studyForConcurso(state, action.memberId)
    case 'answerJobOffer':
      return answerJobOffer(state, action.memberId, action.accept)
  }
}

export type ChildCheck = { ok: true; cost: number; partnerId: MemberId } | Refusal

/** Custo de ter um filho: parto e enxoval, sempre o mesmo. */
export function childCost(): number {
  return BALANCE.children.birthCost
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
  // Com dedicação ao curso, não sobra tempo para um filho até terminar.
  if (parent.course?.dedicated || partner.course?.dedicated) return refuse('dedicated')

  const cost = childCost()
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

function startCourse(state: GameState, memberId: MemberId, dedicated: boolean): ActionResult {
  const member = state.members[memberId]
  if (!member) return refuse('memberNotFound')
  if (!isAlive(member)) return refuse('memberDeceased')
  const offer = courseOffer(member, state.clock.day, dedicated)
  if (!offer) return refuse('noCourse')

  const draft = draftOf(state)
  beginCourse(draft.members[memberId], offer, draft.clock.day)
  return done(draft)
}

function stopCourse(state: GameState, memberId: MemberId): ActionResult {
  const member = state.members[memberId]
  if (!member) return refuse('memberNotFound')
  if (!member.course) return refuse('noCourse')

  const draft = draftOf(state)
  draft.members[memberId].course = null
  return done(draft)
}

function buyProperty(
  state: GameState,
  id: PropertyId,
  lot: number | undefined,
  financed: boolean,
): ActionResult {
  const income = financed ? familyRates(state).income : 0
  const check = checkBuyProperty(state, id, lot, financed, income)
  if (!check.ok) return check

  const draft = draftOf(state)
  const events = [applyPurchase(draft, id, check)]
  recordEvents(draft, events)
  return done(draft, events)
}

function payOffLoan(state: GameState, loanId: number): ActionResult {
  const loan = state.loans.find((open) => open.id === loanId)
  if (!loan) return refuse('loanNotFound')
  if (state.money < loan.balance) return refuse('notEnoughMoney')

  const draft = draftOf(state)
  const events = [settleLoan(draft, loan)]
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

function studyForConcurso(state: GameState, memberId: MemberId): ActionResult {
  const check = checkStudyForConcurso(state, memberId)
  if (!check.ok) return check

  const draft = draftOf(state)
  const events = quitToStudy(draft.members[memberId], draft.clock.day)
  recordEvents(draft, events)
  return done(draft, events)
}

function answerJobOffer(state: GameState, memberId: MemberId, accept: boolean): ActionResult {
  const member = state.members[memberId]
  if (!member) return refuse('memberNotFound')
  if (!isAlive(member)) return refuse('memberDeceased')
  if (!hasJobOffer(member, state.clock.day)) return refuse('noJobOffer')

  const draft = draftOf(state)
  const target = draft.members[memberId]
  if (!accept) {
    target.jobOffer = null
    return done(draft)
  }
  const events = [acceptJobOffer(target, draft.clock.day)]
  recordEvents(draft, events)
  return done(draft, events)
}

function done(state: GameState, events: GameEvent[] = []): ActionResult {
  return { ok: true, state, events }
}
