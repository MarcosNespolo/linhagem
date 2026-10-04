'use client'

import { GraduationCap } from 'lucide-react'
import { BALANCE } from '@/content/balance'
import { PUBLIC_CAREER } from '@/content/careers'
import {
  affordableCourses,
  availableCourses,
  calendarDate,
  expectedConcursoScore,
  halfTimeCaregivers,
  highestCargo,
  incomeOf,
  isRetired,
  livingMembers,
  nextExamDay,
  type CourseOffer,
  type GameState,
  type Member,
} from '@/engine'
import { useGameStore } from '@/game/store'
import { formatMoney, formatMonthYear, formatRate } from '@/lib/format'
import { PersonAvatar } from '../avatar/person-avatar'
import { showMember } from '../flows'
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
 * Aba Trabalho: os cursos de promoção para pagar, quem estuda para concurso e
 * quem trabalha, com a carreira, o nível, o salário e a próxima promoção.
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

  return (
    <div className="mx-auto w-full max-w-md space-y-7 px-4 pt-5 pb-8">
      <section className={`${card} p-4`}>
        <p className="text-[16px] font-bold">
          {workers.length === 1 ? '1 pessoa trabalhando' : `${workers.length} pessoas trabalhando`}
        </p>
        <p className="tabular text-ink-soft text-[14px]">
          Salários: {salaries > 0 ? `${formatMoney(salaries)} por mês` : 'nenhum'}
          {pensions > 0 ? ` · aposentadorias: ${formatMoney(pensions)} por mês` : ''}
        </p>
        <p className="text-ink-soft mt-2 text-[13px]">
          Até o 3º nível, a promoção vem com o tempo. Para o 4º e o 5º, a família paga um curso, que
          custa {BALANCE.careers.courseMonths} meses do aumento. No serviço público, tudo vem com o
          tempo.
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

/** Cursos de promoção prontos para pagar, com o botão de pagar todos. */
function Courses({ game }: { game: GameState }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const courses = availableCourses(game)
  if (courses.length === 0) return null
  const affordable = affordableCourses(game)
  const total = affordable.reduce((sum, course) => sum + course.cost, 0)
  const missing = courses[0].cost - game.money

  return (
    <section>
      <h2 className="px-1 text-lg font-extrabold">Cursos de promoção</h2>
      <p className="text-ink-soft px-1 text-[14px]">
        {affordable.length === courses.length
          ? 'Todos cabem no dinheiro.'
          : `${affordable.length} de ${courses.length} cabem no dinheiro.`}
      </p>
      <button
        type="button"
        className={`${button.primary} mt-3 w-full`}
        disabled={affordable.length === 0}
        onClick={() => dispatch({ type: 'payAllCourses' })}
      >
        <GraduationCap size={18} />
        {affordable.length > 0
          ? `Pagar ${affordable.length === 1 ? 'o curso' : `${affordable.length} cursos`} · ${formatMoney(total)}`
          : `Faltam ${formatMoney(missing)} para o mais barato`}
      </button>
      <ul className="mt-3 space-y-2">
        {courses.map((course) => (
          <CourseRow key={course.memberId} game={game} course={course} />
        ))}
      </ul>
    </section>
  )
}

function CourseRow({ game, course }: { game: GameState; course: CourseOffer }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const member = game.members[course.memberId]
  if (!member?.career) return null
  const next = levelTitle(member, member.career.id, course.level)
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
            {upperFirst(courseName(course.level))} para virar {lowerFirst(next)}
          </span>
        </span>
      </button>
      <button
        type="button"
        className={`${button.small} tabular shrink-0`}
        disabled={course.cost > game.money}
        onClick={() => dispatch({ type: 'payCourse', memberId: member.id })}
        aria-label={`Pagar o curso de ${member.firstName}: ${formatMoney(course.cost)}`}
      >
        {formatMoney(course.cost)}
      </button>
    </li>
  )
}

function ConcursoRow({ game, member }: { game: GameState; member: Member }) {
  const study = member.concurso
  if (!study) return null
  const exam = nextExamDay(game)
  const expected = expectedConcursoScore(member, exam)
  const cutoff = BALANCE.concurso.cutoffs[highestCargo(member)]
  const cargo = lowerFirst(levelTitle(member, PUBLIC_CAREER, highestCargo(member)))
  const month = formatMonthYear(calendarDate(game.startDate, exam))
  const left = BALANCE.concurso.maxExams - study.exams
  return (
    <PersonRow
      game={game}
      member={member}
      title={`Prova em ${month}`}
      detail={`Nota esperada ${expected}; ${cargo} pede ${cutoff}. ${left === 1 ? 'Última prova' : `${left} provas pela frente`}${study.lastScore !== null ? `, a última deu ${study.lastScore}` : ''}.`}
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
      highlight={status?.startsWith('Curso disponível') ?? false}
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
