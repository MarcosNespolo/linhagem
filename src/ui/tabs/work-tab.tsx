'use client'

import { GraduationCap } from 'lucide-react'
import { BALANCE } from '@/content/balance'
import { concursoOf, getCareer } from '@/content/careers'
import {
  allowedCargos,
  calendarDate,
  courseCandidates,
  courseOffer,
  expectedConcursoScore,
  halfTimeCaregivers,
  incomeOf,
  isRetired,
  livingMembers,
  nextExamDay,
  type GameState,
  type Member,
} from '@/engine'
import { formatMoney, formatMonthYear, formatRate } from '@/lib/format'
import { PersonAvatar } from '../avatar/person-avatar'
import { showCourse, showMember } from '../flows'
import {
  byGender,
  careerLine,
  careerTitle,
  courseName,
  levelTitle,
  lowerFirst,
  promotionStatus,
  upperFirst,
} from '../labels'
import { button, card } from '../styles'

/**
 * Aba Trabalho: quem pode começar um curso de promoção, quem estuda para
 * concurso e quem trabalha, com a carreira, o nível, o salário e o curso ou a
 * próxima promoção.
 */
export function WorkTab({ game }: { game: GameState }) {
  const day = game.clock.day
  const living = livingMembers(game)
  const caregivers = halfTimeCaregivers(game)
  const workers = living
    .filter((member) => member.career && !isRetired(member, day))
    .sort((a, b) => incomeOf(game, b, caregivers) - incomeOf(game, a, caregivers))
  const retired = living.filter((member) => member.career && isRetired(member, day))
  const studying = living.filter((member) => member.concurso)
  const salaries = workers.reduce((sum, member) => sum + incomeOf(game, member, caregivers), 0)
  const pensions = retired.reduce((sum, member) => sum + incomeOf(game, member, caregivers), 0)
  const courseFees = living.reduce((sum, member) => sum + (member.course?.fee ?? 0), 0)

  return (
    <div className="mx-auto w-full max-w-md space-y-7 px-4 pt-5 pb-8">
      <section className={`${card} p-4`}>
        <p className="text-[16px] font-bold">
          {workers.length === 1 ? '1 pessoa trabalhando' : `${workers.length} pessoas trabalhando`}
        </p>
        <p className="tabular text-ink-soft text-[14px]">
          Salários: {salaries > 0 ? `${formatMoney(salaries)} por mês` : 'nenhum'}
          {pensions > 0 ? ` · aposentadorias: ${formatMoney(pensions)} por mês` : ''}
          {courseFees > 0 ? ` · cursos: ${formatMoney(courseFees)} por mês` : ''}
        </p>
      </section>

      <Courses game={game} />

      {studying.length > 0 ? (
        <section>
          <h2 className="px-1 text-lg font-extrabold">Estudando para concurso</h2>
          <ul className="mt-3 space-y-2">
            {studying.map((member) => (
              <ConcursoRow key={member.id} game={game} member={member} />
            ))}
          </ul>
        </section>
      ) : null}

      {workers.length > 0 ? (
        <section>
          <h2 className="px-1 text-lg font-extrabold">Trabalhando</h2>
          <ul className="mt-3 space-y-2">
            {workers.map((member) => (
              <WorkerRow
                key={member.id}
                game={game}
                member={member}
                income={incomeOf(game, member, caregivers)}
                halfTime={caregivers.has(member.id)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {retired.length > 0 ? (
        <section>
          <h2 className="px-1 text-lg font-extrabold">Aposentados</h2>
          <ul className="mt-3 space-y-2">
            {retired.map((member) => (
              <PersonRow
                key={member.id}
                game={game}
                member={member}
                title={byGender(member, 'Aposentada', 'Aposentado')}
                detail={member.career ? (careerTitle(member) ?? '') : ''}
                value={formatRate(incomeOf(game, member, caregivers))}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

/** Quem pode começar o curso do próximo nível, com a mensalidade no ritmo normal. */
function Courses({ game }: { game: GameState }) {
  const candidates = courseCandidates(game)
  if (candidates.length === 0) return null
  return (
    <section>
      <h2 className="px-1 text-lg font-extrabold">Podem fazer curso</h2>
      <ul className="mt-3 space-y-2">
        {candidates.map((member) => (
          <CourseRow key={member.id} game={game} member={member} />
        ))}
      </ul>
    </section>
  )
}

function CourseRow({ game, member }: { game: GameState; member: Member }) {
  const offer = courseOffer(member, game.clock.day, false)
  if (!offer || !member.career) return null
  const next = levelTitle(member, member.career.id, offer.level)
  return (
    <li className={`${card} flex items-center gap-3 p-2.5`}>
      <button
        type="button"
        onClick={() => showMember(member.id)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <PersonAvatar
          person={member}
          day={game.clock.day}
          size={44}
          className="shrink-0 rounded-full"
        />
        <span className="min-w-0">
          <span className="block truncate text-[16px] font-bold">{member.firstName}</span>
          <span className="text-ink-soft block text-[13px]">
            {upperFirst(courseName(offer.level))} → {lowerFirst(next)}
          </span>
          <span className="tabular text-expense block text-[13px] font-bold">
            {formatRate(-offer.fee)}
          </span>
        </span>
      </button>
      <button
        type="button"
        className={`${button.small} shrink-0`}
        onClick={() => showCourse(member.id)}
        aria-label={`Escolher o curso de ${member.firstName}`}
      >
        <GraduationCap size={15} />
        Curso
      </button>
    </li>
  )
}

function ConcursoRow({ game, member }: { game: GameState; member: Member }) {
  const study = member.concurso
  if (!study) return null
  const exam = nextExamDay(game)
  const expected = expectedConcursoScore(member, exam)
  const month = formatMonthYear(calendarDate(game.startDate, exam))
  const left = Math.max(1, BALANCE.concurso.maxExams - study.exams)
  // O próximo cargo que a nota esperada ainda não alcança, ou o mais alto que a formação permite.
  const cargos = allowedCargos(member)
  const target = cargos.find((id) => concursoOf(id).cutoff > expected) ?? cargos[cargos.length - 1]
  const cargo = `${getCareer(target).name.toLowerCase()}: ${concursoOf(target).cutoff}`
  return (
    <PersonRow
      game={game}
      member={member}
      title={`Prova em ${month}`}
      detail={`Nota ${expected} · ${cargo} · ${left === 1 ? 'última prova' : `${left} provas`}`}
      value={formatRate(-BALANCE.concurso.fee)}
      expense
    />
  )
}

function WorkerRow({
  game,
  member,
  income,
  halfTime,
}: {
  game: GameState
  member: Member
  income: number
  halfTime: boolean
}) {
  const career = member.career
  if (!career) return null
  const status = promotionStatus(member, game.clock.day)
  return (
    <PersonRow
      game={game}
      member={member}
      title={careerTitle(member) ?? ''}
      detail={`${careerLine(career.id, career.level)}${halfTime ? ' · meio período' : ''}`}
      value={formatRate(income)}
      note={status}
      highlight={status === 'Curso disponível'}
    />
  )
}

function PersonRow({
  game,
  member,
  title,
  detail,
  value,
  note,
  expense = false,
  highlight = false,
}: {
  game: GameState
  member: Member
  title: string
  detail: string
  value: string
  note?: string | null
  expense?: boolean
  highlight?: boolean
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => showMember(member.id)}
        className={`${card} flex w-full items-center gap-3 p-2.5 text-left transition active:scale-[0.99]`}
      >
        <PersonAvatar
          person={member}
          day={game.clock.day}
          size={48}
          className="shrink-0 rounded-full"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-bold">{member.firstName}</span>
          <span className="block text-[14px] leading-snug font-semibold">{title}</span>
          <span className="text-ink-soft block text-[13px]">{detail}</span>
          {note ? (
            <span
              className={`block text-[13px] font-bold ${highlight ? 'text-gold' : 'text-leaf-strong'}`}
            >
              {note}
            </span>
          ) : null}
        </span>
        <span
          className={`tabular shrink-0 text-right text-[14px] font-bold ${expense ? 'text-expense' : 'text-income'}`}
        >
          {value}
        </span>
      </button>
    </li>
  )
}
