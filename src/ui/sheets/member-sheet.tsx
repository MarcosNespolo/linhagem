'use client'

import {
  Baby,
  BookOpen,
  Briefcase,
  GraduationCap,
  Heart,
  Landmark,
  School,
  UserRoundCheck,
} from 'lucide-react'
import { useState } from 'react'
import { BALANCE } from '@/content/balance'
import { isHigherStage, techCourseName, type Network } from '@/content/schools'
import {
  agePoints,
  ageThisYear,
  aptitudeOf,
  canHaveTutor,
  calendarDate,
  checkHaveChild,
  childCost,
  childrenOf,
  courseOffer,
  incomeOf,
  isRetired,
  isUnemployed,
  livingCost,
  memberExpense,
  nextExamDay,
  partnerOf,
  schoolFee,
  schoolScore,
  stageFee,
  yearlyPoints,
  type Choice,
  type Enrollment,
  type GameState,
  type Member,
} from '@/engine'
import { useGameStore } from '@/game/store'
import { formatMoney, formatMonthYear, formatRate } from '@/lib/format'
import { PersonAvatar } from '../avatar/person-avatar'
import { showCourse, showMember } from '../flows'
import {
  ageLabel,
  byGender,
  careerLine,
  careerTitle,
  childStatus,
  courseName,
  formationLabel,
  levelTitle,
  livingCostLine,
  promotionStatus,
  relationLine,
  roleLabel,
  schoolName,
  schoolNameInSentence,
  schoolYearLabel,
  upperFirst,
} from '../labels'
import { button, card } from '../styles'
import { useUiStore } from '../ui-store'
import { Sheet } from './sheet'

export function MemberSheet({ game, member }: { game: GameState; member: Member }) {
  const closeSheet = useUiStore((store) => store.closeSheet)
  const day = game.clock.day
  const alive = member.deathDay === null
  const partner = partnerOf(game, member)
  const parents = member.parentIds.map((id) => game.members[id]).filter(Boolean)
  const children = childrenOf(game, member.id)
  const rate = incomeOf(game, member) - memberExpense(member, day)
  const school = member.education.school
  const formation = member.education.formation
  const choice = game.choices.find((open) => open.memberId === member.id)
  const career = member.career
  const working = alive && !isRetired(member, day)
  const promotion = alive && working && career ? promotionStatus(member, day) : null

  return (
    <Sheet title={member.firstName} hideTitle onClose={closeSheet}>
      <div className="-mt-6 flex items-center gap-4">
        <PersonAvatar
          person={member}
          day={day}
          size={88}
          className={`ring-canvas shrink-0 rounded-full ring-4 ${alive ? '' : 'opacity-60 grayscale'}`}
        />
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-extrabold">{member.firstName}</h2>
          <p className="text-ink-soft text-[15px]">
            {ageLabel(member, day)}
            {alive ? (
              <span className="text-ink block font-semibold">{roleLabel(member, day)}</span>
            ) : null}
          </p>
        </div>
      </div>
      <p className="text-ink-soft mt-3 text-[15px]">{relationLine(game, member)}</p>

      <dl className="divide-line bg-canvas mt-4 divide-y rounded-2xl px-4 text-[15px]">
        {alive ? (
          <Fact label={rate < 0 ? 'Despesa' : 'Renda'}>
            <span
              className={`tabular font-bold ${rate < 0 ? 'text-expense' : rate > 0 ? 'text-income' : ''}`}
            >
              {rate === 0 ? 'Nenhuma' : formatRate(rate)}
            </span>
          </Fact>
        ) : null}
        {alive ? (
          <Fact label="Custo de vida">
            <span className="tabular">{formatMoney(livingCost(member, day))}/mês</span>
            <span className="text-ink-soft block text-[13px] font-normal">
              {livingCostLine(member, day)}
            </span>
          </Fact>
        ) : null}
        {alive && school ? (
          <>
            <Fact label="Estuda">
              {schoolName(school.stage, school.network)}
              {school.course ? ` · ${techCourseName(school.course)}` : ''}
              <span className="text-ink-soft block text-[13px] font-normal">
                {schoolYearLabel(school, ageThisYear(member, game.startDate, day))}
                {schoolFee(school) > 0 ? ` · ${formatMoney(schoolFee(school))}/mês` : ' · gratuita'}
              </span>
            </Fact>
            {school.stage !== 'creche' && !isHigherStage(school.stage) ? (
              <Fact label="Nota">
                <span className="tabular">{Math.floor(schoolScore(member, day))}</span>
                <span className="text-ink-soft block text-[13px] font-normal">
                  Aptidão {aptitudeOf(member)} + {agePoints(member, day)} da idade +{' '}
                  {Math.floor(member.education.points)} de estudo
                </span>
              </Fact>
            ) : null}
          </>
        ) : null}
        {alive && member.concurso ? (
          <Fact label="Estuda">
            Para concurso
            <span className="text-ink-soft block text-[13px] font-normal">
              Prova em {formatMonthYear(calendarDate(game.startDate, nextExamDay(game)), 'short')} ·{' '}
              {formatMoney(BALANCE.concurso.fee)}/mês
            </span>
          </Fact>
        ) : null}
        {career ? (
          <Fact label={working ? 'Trabalho' : 'Trabalhou como'}>
            {careerTitle(member)}
            <span className="text-ink-soft block text-[13px] font-normal">
              {working && member.unemployedUntil !== null && isUnemployed(member, day)
                ? `${byGender(member, 'Desempregada', 'Desempregado')} até ${formatMonthYear(calendarDate(game.startDate, member.unemployedUntil), 'short')}`
                : careerLine(career.id, career.level)}
            </span>
          </Fact>
        ) : null}
        {promotion ? <Fact label="Próximo nível">{promotion}</Fact> : null}
        {formation && (!school || isHigherStage(school.stage)) ? (
          <Fact label="Formação">{formationLabel(member, formation)}</Fact>
        ) : null}
        {member.education.enem !== null ? (
          <Fact label="ENEM">
            <span className="tabular">{member.education.enem} pontos</span>
          </Fact>
        ) : null}
        <Fact label="Aptidão">
          <span className="tabular">{aptitudeOf(member)}</span>
          <span className="text-ink-soft block text-[13px] font-normal">
            {parents.length === 2
              ? `Média dos pais: ${Math.round(mean(parents.map(aptitudeOf)))}`
              : 'De nascença'}
          </span>
        </Fact>
        <Fact label="Nasceu em">
          {formatMonthYear(calendarDate(game.startDate, member.birthDay))}
        </Fact>
        {partner ? (
          <Fact
            label={
              partner.deathDay !== null && alive
                ? byGender(member, 'Viúva de', 'Viúvo de')
                : byGender(member, 'Casada com', 'Casado com')
            }
          >
            <PersonChip game={game} person={partner} />
          </Fact>
        ) : null}
        {parents.length > 0 ? (
          <Fact label="Pais">
            <div className="flex flex-wrap justify-end gap-1.5">
              {parents.map((parent) => (
                <PersonChip key={parent.id} game={game} person={parent} />
              ))}
            </div>
          </Fact>
        ) : null}
        {children.length > 0 ? (
          <Fact label={children.length === 1 ? 'Filho' : 'Filhos'}>
            <div className="flex flex-wrap justify-end gap-1.5">
              {children.map((child) => (
                <PersonChip key={child.id} game={game} person={child} />
              ))}
            </div>
          </Fact>
        ) : null}
      </dl>

      {alive && choice ? <OpenChoice choice={choice} /> : null}
      {working && !choice ? <CourseBlock game={game} member={member} /> : null}
      {alive && school && !choice ? <SchoolChange member={member} school={school} /> : null}
      {alive && !choice && canHaveTutor(member) ? <Tutor game={game} member={member} /> : null}
      {alive ? <MemberActions game={game} member={member} partner={partner} /> : null}
    </Sheet>
  )
}

/** O botão de cada escolha aberta no painel da pessoa. */
const OPEN_CHOICES = {
  school: { icon: <School size={18} />, action: 'Fazer a matrícula' },
  afterSchool: { icon: <GraduationCap size={18} />, action: 'Escolher o que vem depois do médio' },
  firstJob: { icon: <Briefcase size={18} />, action: 'Escolher o primeiro emprego' },
  concurso: { icon: <Landmark size={18} />, action: 'Ver o resultado do concurso' },
  meet: { icon: <Heart size={18} />, action: 'Ver quem apareceu' },
  propose: { icon: <Heart size={18} />, action: 'Ver o pedido de casamento' },
} satisfies Record<Choice['type'], unknown>

/** A pessoa tem uma escolha esperando, com o relógio parado. */
function OpenChoice({ choice }: { choice: Choice }) {
  const showChoices = useUiStore((store) => store.showChoices)
  const { icon, action } = OPEN_CHOICES[choice.type]
  return (
    <button type="button" className={`${button.primary} mt-5 w-full`} onClick={showChoices}>
      {icon}
      {action}
    </button>
  )
}

/**
 * Curso de promoção: o que está em andamento, com o fim e a mensalidade e o
 * botão de parar, ou o botão de começar o curso do próximo nível.
 */
function CourseBlock({ game, member }: { game: GameState; member: Member }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const [stopping, setStopping] = useState(false)
  const career = member.career
  const course = member.course
  if (!career) return null
  if (!course) {
    if (!courseOffer(member, game.clock.day, false)) return null
    return (
      <button
        type="button"
        className={`${button.primary} mt-5 w-full`}
        onClick={() => showCourse(member.id)}
      >
        <BookOpen size={18} />
        Fazer {courseName(career.level + 1)}
      </button>
    )
  }
  const next = levelTitle(member, career.id, career.level + 1)
  const end = formatMonthYear(calendarDate(game.startDate, course.until), 'short')
  return (
    <div className={`${card} mt-5 p-3`}>
      <p className="text-[15px] font-bold">
        {upperFirst(courseName(career.level + 1))}
        {course.dedicated ? ' com dedicação' : ''}
      </p>
      <p className="tabular text-ink-soft text-[14px]">
        {next} em {end} · {formatRate(-course.fee)}
      </p>
      {stopping ? (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className={`${button.danger} flex-1`}
            onClick={() => dispatch({ type: 'stopCourse', memberId: member.id })}
          >
            Parar e perder o pago
          </button>
          <button type="button" className={button.quiet} onClick={() => setStopping(false)}>
            Voltar
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={`${button.quiet} mt-1 -ml-3`}
          onClick={() => setStopping(true)}
        >
          Parar curso
        </button>
      )}
    </div>
  )
}

/**
 * Professor particular para quem está na escola ou no médio: soma pontos na
 * nota em proporção ao tempo, contados em janeiro e quando ele é dispensado.
 */
function Tutor({ game, member }: { game: GameState; member: Member }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const { fee, pointsPerYear } = BALANCE.school.tutor
  const since = member.education.tutorSince
  const toggle = (active: boolean) => dispatch({ type: 'setTutor', memberId: member.id, active })

  const terms = `${formatMoney(fee)}/mês · +${pointsPerYear} na nota por ano`

  if (since !== null) {
    return (
      <div className="mt-5 text-center">
        <p className="text-[14px] font-semibold">
          Professor particular desde {formatMonthYear(calendarDate(game.startDate, since), 'short')}
        </p>
        <p className="tabular text-ink-soft text-sm">{terms}</p>
        <button type="button" className={`${button.quiet} mt-1`} onClick={() => toggle(false)}>
          Dispensar o professor
        </button>
      </div>
    )
  }
  return (
    <div className="mt-5">
      <button type="button" className={`${button.secondary} w-full`} onClick={() => toggle(true)}>
        <UserRoundCheck size={16} />
        Contratar professor particular
      </button>
      <p className="tabular text-ink-soft mt-2 text-center text-sm">{terms}</p>
    </div>
  )
}

/** Troca entre escola pública e colégio particular, que vale na matrícula seguinte. */
function SchoolChange({ member, school }: { member: Member; school: Enrollment }) {
  const dispatch = useGameStore((store) => store.dispatch)
  if (school.stage === 'creche' || isHigherStage(school.stage) || school.network === 'federal') {
    return null
  }
  const other = school.network === 'particular' ? 'publica' : 'particular'
  const fee = stageFee(school.stage, other)
  const change = (network: Network) =>
    dispatch({ type: 'changeSchool', memberId: member.id, network })

  if (school.next) {
    return (
      <div className="mt-5 text-center">
        <p className="text-[14px] font-semibold">
          Em janeiro, {member.firstName} muda para {schoolNameInSentence(school.stage, school.next)}
          .
        </p>
        <button
          type="button"
          className={`${button.quiet} mt-1`}
          onClick={() => change(school.network)}
        >
          Desfazer
        </button>
      </div>
    )
  }
  return (
    <div className="mt-5">
      <button type="button" className={`${button.secondary} w-full`} onClick={() => change(other)}>
        <School size={16} />
        Mudar para {schoolNameInSentence(school.stage, other)} em janeiro
      </button>
      <p className="tabular text-ink-soft mt-2 text-center text-sm">
        {fee > 0 ? `${formatMoney(fee)}/mês` : 'Gratuita'} · +
        {decimal(yearlyPoints(school.stage, other))} na nota por ano
      </p>
    </div>
  )
}

function MemberActions({
  game,
  member,
  partner,
}: {
  game: GameState
  member: Member
  partner: Member | undefined
}) {
  const dispatch = useGameStore((store) => store.dispatch)

  if (member.dating) {
    const { partner: date, askDay } = member.dating
    return (
      <p className="text-ink-soft mt-5 text-center text-sm">
        Namora {date.firstName} · pedido em{' '}
        {formatMonthYear(calendarDate(game.startDate, askDay), 'short')}
      </p>
    )
  }

  if (!partner || partner.deathDay !== null) return null
  const check = checkHaveChild(game, member.id)
  if (!check.ok && check.error === 'tooOld') return null
  const cost = childCost()
  return (
    <div className="mt-5">
      <button
        type="button"
        className={`${button.primary} w-full`}
        disabled={!check.ok}
        onClick={() => dispatch({ type: 'haveChild', parentId: member.id })}
      >
        <Baby size={19} />
        Ter um filho com {partner.firstName}
      </button>
      <p className="tabular text-ink-soft mt-2 text-center text-sm">
        {childStatus(game, member, check, cost)}
      </p>
    </div>
  )
}

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length

/** Número com uma casa decimal, se tiver, e vírgula: 3,6. */
const decimal = (value: number) => String(Math.round(value * 10) / 10).replace('.', ',')

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-ink-soft shrink-0">{label}</dt>
      <dd className="min-w-0 text-right font-semibold">{children}</dd>
    </div>
  )
}

function PersonChip({ game, person }: { game: GameState; person: Member }) {
  return (
    <button
      type="button"
      onClick={() => showMember(person.id)}
      className="bg-surface ring-line inline-flex max-w-full items-center gap-1.5 rounded-full py-1 pr-3 pl-1 font-bold ring-1 transition active:scale-95"
    >
      <PersonAvatar
        person={person}
        day={game.clock.day}
        size={26}
        className={`shrink-0 rounded-full ${person.deathDay === null ? '' : 'opacity-60 grayscale'}`}
      />
      <span className="truncate text-[14px]">{person.firstName}</span>
    </button>
  )
}
