import { BALANCE } from '../content/balance'
import { concursoOf, PUBLIC_CAREERS, type CareerId } from '../content/careers'
import { refuse, type Refusal } from './errors'
import { canStudyForConcurso, openFirstJobChoice } from './jobs'
import { ageOf, isAlive } from './members'
import type { Rng } from './rng'
import { schoolScore } from './school'
import { calendarDate } from './time'
import type { Choice, ConcursoOption, ConcursoStudy, GameEvent, GameState, Member } from './types'

type ConcursoChoice = Extract<Choice, { type: 'concurso' }>

/**
 * Começa a estudar para concurso: sem salário, com o cursinho. Quem já estava
 * estudando continua de onde parou, com a nota que juntou, numa tentativa
 * nova. Altera o rascunho.
 */
export function startConcurso(member: Member, day: number): GameEvent[] {
  if (member.concurso) {
    member.concurso = { ...member.concurso, exams: 0 }
    return []
  }
  member.concurso = { since: day, exams: 0, lastScore: null }
  return [{ type: 'concursoStarted', day, memberId: member.id }]
}

export type ConcursoCheck = { ok: true } | Refusal

/**
 * Diz se a pessoa pode largar o emprego para estudar para concurso: viva,
 * adulta, trabalhando (antes da aposentadoria), com pelo menos o ensino
 * médio, fora da faculdade, do técnico e do cursinho, sem curso de promoção em
 * andamento e sem escolha aberta.
 */
export function checkStudyForConcurso(state: GameState, memberId: string): ConcursoCheck {
  const member = state.members[memberId]
  if (!member) return refuse('memberNotFound')
  if (!isAlive(member)) return refuse('memberDeceased')
  const day = state.clock.day
  if (!member.career || ageOf(member, day) >= BALANCE.retirementAge) return refuse('notWorking')
  if (!canStudyForConcurso(member)) return refuse('notStudying')
  if (member.education.school) return refuse('alreadyStudying')
  if (member.course) return refuse('inCourse')
  if (state.choices.some((choice) => choice.memberId === memberId)) return refuse('choiceOpen')
  return { ok: true }
}

/**
 * Larga o emprego e começa a estudar para concurso: sem salário, com o
 * cursinho, a partir da nota de hoje. Quem desistir depois procura outro
 * emprego do zero. Altera o rascunho.
 */
export function quitToStudy(member: Member, day: number): GameEvent[] {
  member.career = null
  member.unemployedUntil = null
  return [{ type: 'quitJob', day, memberId: member.id }, ...startConcurso(member, day)]
}

/** Nota de partida: a do ENEM, ou a da escola no dia para quem não fez o ENEM. */
export function concursoBase(member: Member, day: number): number {
  return member.education.enem ?? Math.round(schoolScore(member, day))
}

/** Meses completos de estudo até o dia. */
export function monthsStudied(study: ConcursoStudy, day: number): number {
  return Math.floor((day - study.since) / (BALANCE.daysPerYear / 12))
}

/** Nota esperada numa prova no dia, sem o sorteio: a de partida mais os meses de estudo. */
export function expectedConcursoScore(member: Member, day: number): number {
  const study = member.concurso
  const months = study ? monthsStudied(study, day) : 0
  return Math.min(1000, concursoBase(member, day) + months * BALANCE.concurso.pointsPerMonth)
}

/** Cargos que a formação da pessoa permite, da nota de corte mais baixa à mais alta. */
export function allowedCargos(member: Pick<Member, 'education'>): CareerId[] {
  const superior = member.education.formation?.level === 'superior'
  return PUBLIC_CAREERS.filter((id) => superior || concursoOf(id).formation === 'medio')
}

/** O cargo de nota mais alta que a formação permite. */
export function highestCargo(member: Pick<Member, 'education'>): CareerId {
  const cargos = allowedCargos(member)
  return cargos[cargos.length - 1]
}

/** O cargo de nota mais alta em que a nota passa, entre os que a formação permite, ou null. */
export function passedCargo(member: Pick<Member, 'education'>, score: number): CareerId | null {
  let passed: CareerId | null = null
  for (const id of allowedCargos(member)) {
    if (score >= concursoOf(id).cutoff) passed = id
  }
  return passed
}

/** O cargo seguinte ao informado entre os que a formação permite, ou null no mais alto. */
export function nextCargo(member: Pick<Member, 'education'>, passed: CareerId): CareerId | null {
  const cargos = allowedCargos(member)
  return cargos[cargos.indexOf(passed) + 1] ?? null
}

/** Dia do calendário com resultado de prova de concurso. */
export function isExamDay(state: GameState, day: number = state.clock.day): boolean {
  const date = calendarDate(state.startDate, day).slice(5)
  return (BALANCE.concurso.examDates as readonly string[]).includes(date)
}

/** Próximo dia de prova a partir de amanhã. */
export function nextExamDay(state: GameState): number {
  let day = state.clock.day + 1
  while (!isExamDay(state, day)) day += 1
  return day
}

/**
 * No dia da prova, quem estuda para concurso faz a prova. Quem passa ganha a
 * escolha do resultado; quem faz a última prova da tentativa sem passar ganha
 * a escolha de emprego, em que pode continuar estudando. Altera o rascunho e
 * devolve true quando alguém fez prova.
 */
export function takeExams(draft: GameState, rng: Rng, events: GameEvent[]): boolean {
  if (!isExamDay(draft)) return false
  const day = draft.clock.day
  let taken = false
  for (const member of Object.values(draft.members)) {
    const study = member.concurso
    if (member.deathDay !== null || !study) continue
    taken = true
    const score = rollConcursoScore(rng, member, day)
    study.exams += 1
    study.lastScore = score
    const careerId = passedCargo(member, score)
    if (careerId !== null) {
      events.push({ type: 'concurso', day, memberId: member.id, score, careerId })
      draft.choices.push({
        type: 'concurso',
        memberId: member.id,
        day,
        score,
        options: resultOptions(member, careerId),
        suggested: 0,
      })
    } else if (study.exams >= BALANCE.concurso.maxExams) {
      events.push({ type: 'concurso', day, memberId: member.id, score, careerId: null })
      openFirstJobChoice(draft, rng, member)
    }
  }
  return taken
}

/** Nota da prova: a esperada para o dia mais um sorteio, entre 0 e 1.000. */
function rollConcursoScore(rng: Rng, member: Member, day: number): number {
  const spread = BALANCE.concurso.spread
  const score = expectedConcursoScore(member, day) + rng.int(-spread, spread)
  return Math.min(1000, Math.max(0, score))
}

/**
 * Opções de quem passou: tomar posse no cargo, continuar estudando para um
 * cargo de nota mais alta, quando a formação permite, ou desistir do cargo.
 */
function resultOptions(member: Member, passed: CareerId): ConcursoOption[] {
  const options: ConcursoOption[] = [{ kind: 'posse', careerId: passed }]
  if (nextCargo(member, passed) !== null) options.push({ kind: 'estudar' })
  options.push({ kind: 'privada' })
  return options
}

/** Aplica no rascunho a resposta ao resultado do concurso. */
export function applyConcursoPick(
  draft: GameState,
  rng: Rng,
  choice: ConcursoChoice,
  option: number,
): GameEvent[] {
  const member = draft.members[choice.memberId]
  const picked = choice.options[option]
  const day = draft.clock.day
  switch (picked.kind) {
    case 'posse':
      member.concurso = null
      member.career = { id: picked.careerId, level: 0, levelSince: day }
      return [{ type: 'firstJob', day, memberId: member.id, careerId: picked.careerId, level: 0 }]
    case 'estudar':
      return []
    case 'privada':
      member.concurso = null
      openFirstJobChoice(draft, rng, member, false)
      return []
  }
}
