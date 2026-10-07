'use client'

import { BALANCE } from '@/content/balance'
import { isHigherStage, techCourseName, type Stage } from '@/content/schools'
import {
  ageOf,
  ageThisYear,
  livingMembers,
  paidSchoolFee,
  schoolFee,
  schoolScore,
  type GameState,
  type Member,
} from '@/engine'
import { formatAge, formatMoney } from '@/lib/format'
import { PersonAvatar } from '../avatar/person-avatar'
import { showMember } from '../flows'
import {
  higherCourseName,
  higherStudyLine,
  lowerFirst,
  schoolName,
  schoolYearLabel,
} from '../labels'
import { card } from '../styles'

const SECTIONS: { stage: Stage; title: string }[] = [
  { stage: 'faculdade', title: 'Faculdade' },
  { stage: 'tecnico', title: 'Curso técnico' },
  { stage: 'cursinho', title: 'Cursinho' },
  { stage: 'medio', title: 'Ensino médio' },
  { stage: 'escola', title: 'Escola' },
  { stage: 'creche', title: 'Creche' },
]

/** Mensalidade da escola mais o professor particular, por mês. */
function studyFee(member: Member): number {
  const tutor = member.education.tutorSince !== null ? BALANCE.school.tutor.fee : 0
  return schoolFee(member.education.school) + tutor
}

/** O que a família paga hoje: sem a mensalidade de quem só começa as aulas em janeiro. */
function paidStudyFee(member: Member, day: number): number {
  const tutor = member.education.tutorSince !== null ? BALANCE.school.tutor.fee : 0
  return paidSchoolFee(member.education.school, day) + tutor
}

/** Aba Estudos: quem estuda, onde, quanto custa e a nota de cada um. */
export function StudiesTab({ game }: { game: GameState }) {
  const students = livingMembers(game)
    .filter((member) => member.education.school !== null)
    .sort((a, b) => a.birthDay - b.birthDay)
  const fees = students.reduce((sum, member) => sum + paidStudyFee(member, game.clock.day), 0)

  if (students.length === 0) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pt-5">
        <div className={`${card} p-5 text-center`}>
          <p className="text-[16px] font-bold">Ninguém estudando agora</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-7 px-4 pt-5 pb-8">
      <section className={`${card} p-4`}>
        <p className="text-[16px] font-bold">
          {students.length === 1 ? '1 pessoa estudando' : `${students.length} pessoas estudando`}
        </p>
        <p className="tabular text-ink-soft text-[14px]">
          Mensalidades: {fees > 0 ? `${formatMoney(fees)} por mês` : 'nenhuma'}
        </p>
      </section>

      {SECTIONS.map(({ stage, title }) => {
        const group = students.filter((member) => member.education.school?.stage === stage)
        if (group.length === 0) return null
        return (
          <section key={stage}>
            <h2 className="px-1 text-lg font-extrabold">{title}</h2>
            <ul className="mt-3 space-y-2">
              {group.map((member) => (
                <StudentRow key={member.id} game={game} member={member} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function StudentRow({ game, member }: { game: GameState; member: Member }) {
  const school = member.education.school
  if (!school) return null
  const day = game.clock.day
  const fee = studyFee(member)
  const tutor = member.education.tutorSince !== null
  const higher = isHigherStage(school.stage)
  const grade = higher
    ? lowerFirst(higherStudyLine(game, school))
    : schoolYearLabel(school, ageThisYear(member, game.startDate, day))
  // No técnico e na faculdade, a seção já diz a etapa: fica o curso e a rede ("Direito,
  // federal"). No médio, o curso do integrado vai junto com a escola.
  const course = higher ? higherCourseName(school) : null
  const place = course
    ? `${course}, ${school.network === 'federal' ? 'federal' : 'particular'}`
    : school.course
      ? `${schoolName(school.stage, school.network)} · ${techCourseName(school.course)}`
      : schoolName(school.stage, school.network)

  return (
    <li>
      <button
        type="button"
        onClick={() => showMember(member.id)}
        className={`${card} flex w-full items-center gap-3 p-2.5 text-left transition active:scale-[0.99]`}
      >
        <PersonAvatar person={member} day={day} size={48} className="shrink-0 rounded-full" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-bold">{member.firstName}</span>
          <span className="text-ink-soft block text-[13px]">
            {formatAge(ageOf(member, day))} · {grade}
          </span>
          <span className="block text-[14px] font-semibold">{place}</span>
          {tutor ? (
            <span className="text-leaf-strong block text-[12px] font-bold">
              Com professor particular
            </span>
          ) : null}
          {school.night ? (
            <span className="text-leaf-strong block text-[12px] font-bold">
              À noite, sem largar o emprego
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-right">
          <span
            className={`tabular block text-[14px] font-bold ${fee > 0 ? 'text-expense' : 'text-ink-soft'}`}
          >
            {fee > 0 ? `${formatMoney(fee)}/mês` : 'Gratuita'}
          </span>
          {higher && member.education.enem !== null ? (
            <span className="tabular text-ink-soft block text-[13px]">
              ENEM {member.education.enem}
            </span>
          ) : school.stage !== 'creche' && !higher ? (
            <span className="tabular text-ink-soft block text-[13px]">
              Nota {Math.floor(schoolScore(member, game.clock.day))}
            </span>
          ) : null}
          {school.next ? (
            <span className="text-leaf-strong block text-[12px] font-bold">Muda em janeiro</span>
          ) : null}
        </span>
      </button>
    </li>
  )
}
