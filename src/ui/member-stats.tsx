'use client'

import { BALANCE } from '@/content/balance'
import {
  ageThisYear,
  aptitudeOf,
  schoolFee,
  schoolScore,
  type GameState,
  type Member,
} from '@/engine'
import { formatMoney } from '@/lib/format'
import { formationLabel, schoolName, schoolYearLabel } from './labels'

/**
 * Ficha da pessoa para decidir os estudos: a nota da escola e de onde ela vem
 * (a aptidão de nascença mais o que os estudos somaram), o ENEM, a formação e
 * onde estuda.
 */
export function MemberStats({ game, member }: { game: GameState; member: Member }) {
  const { education } = member
  const aptitude = aptitudeOf(member)
  const studied = Math.floor(education.points)
  const school = education.school

  return (
    <dl className="bg-canvas divide-line divide-y rounded-2xl px-3.5 text-[14px]">
      <Row label="Nota da escola">
        <span className="tabular font-bold">{Math.floor(schoolScore(member))}</span>
        <span className="text-ink-soft block text-[12px] font-normal">
          Aptidão {aptitude} + {studied} de estudo
        </span>
      </Row>
      {education.enem !== null ? (
        <Row label="ENEM">
          <span className="tabular font-bold">{education.enem}</span>
        </Row>
      ) : null}
      {school ? (
        <Row label="Estuda">
          {schoolName(school.stage, school.network)}
          <span className="text-ink-soft block text-[12px] font-normal">
            {schoolYearLabel(school, ageThisYear(member, game.startDate, game.clock.day))}
            {schoolFee(school) > 0 ? ` · ${formatMoney(schoolFee(school))}/mês` : ''}
          </span>
        </Row>
      ) : null}
      {education.tutorSince !== null ? (
        <Row label="Professor particular">+{BALANCE.school.tutor.pointsPerYear} por ano</Row>
      ) : null}
      {education.formation ? (
        <Row label="Formação">{formationLabel(member, education.formation)}</Row>
      ) : null}
    </dl>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="text-ink-soft shrink-0">{label}</dt>
      <dd className="min-w-0 text-right font-semibold">{children}</dd>
    </div>
  )
}
