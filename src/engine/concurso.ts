import { BALANCE } from '../content/balance'
import { PUBLIC_CAREER } from '../content/careers'
import { openFirstJobChoice } from './jobs'
import type { Rng } from './rng'
import { schoolScore } from './school'
import { calendarDate } from './time'
import type { Choice, ConcursoOption, ConcursoStudy, GameEvent, GameState, Member } from './types'

type ConcursoChoice = Extract<Choice, { type: 'concurso' }>

/** Começa a estudar para concurso: sem salário, com o cursinho. Altera o rascunho. */
export function startConcurso(member: Member, day: number): GameEvent {
  member.concurso = { since: day, exams: 0, lastScore: null }
  return { type: 'concursoStarted', day, memberId: member.id }
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

/** Cargo mais alto que a formação permite: analista (1) com faculdade, técnico (0) sem. */
export function highestCargo(member: Member): number {
  return member.education.formation?.level === 'superior' ? 1 : 0
}

/** Nível do cargo mais alto em que a nota passa, ou null. */
export function passedLevel(member: Member, score: number): number | null {
  const { cutoffs } = BALANCE.concurso
  for (let level = highestCargo(member); level >= 0; level--) {
    if (score >= cutoffs[level]) return level
  }
  return null
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
 * escolha do resultado; quem faz a última prova da tentativa sem passar volta
 * à escolha de emprego. Altera o rascunho e devolve true quando alguém fez prova.
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
    const level = passedLevel(member, score)
    if (level !== null) {
      events.push({ type: 'concurso', day, memberId: member.id, score, level })
      draft.choices.push({
        type: 'concurso',
        memberId: member.id,
        day,
        score,
        options: resultOptions(member, study, level),
        suggested: 0,
      })
    } else if (study.exams >= BALANCE.concurso.maxExams) {
      member.concurso = null
      events.push({ type: 'concurso', day, memberId: member.id, score, level: null })
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
 * Opções de quem passou: tomar posse no cargo, continuar estudando para o cargo
 * de nível superior enquanto houver provas na tentativa, ou desistir do cargo.
 */
function resultOptions(member: Member, study: ConcursoStudy, level: number): ConcursoOption[] {
  const options: ConcursoOption[] = [{ kind: 'posse', level }]
  if (level < highestCargo(member) && study.exams < BALANCE.concurso.maxExams) {
    options.push({ kind: 'estudar' })
  }
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
      member.career = { id: PUBLIC_CAREER, level: picked.level, levelSince: day }
      return [
        {
          type: 'firstJob',
          day,
          memberId: member.id,
          careerId: PUBLIC_CAREER,
          level: picked.level,
        },
      ]
    case 'estudar':
      return []
    case 'privada':
      member.concurso = null
      openFirstJobChoice(draft, rng, member, false)
      return []
  }
}
