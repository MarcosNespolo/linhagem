'use client'

import { Baby, Briefcase, Heart, School } from 'lucide-react'
import { isHigherStage, techCourseName, type Network } from '@/content/schools'
import {
  ageThisYear,
  calendarDate,
  checkHaveChild,
  checkSeekPartner,
  childCost,
  childrenOf,
  incomeOf,
  memberExpense,
  partnerOf,
  schoolFee,
  schoolScore,
  weddingCost,
  type Choice,
  type Enrollment,
  type GameState,
  type Member,
} from '@/engine'
import { useGameStore } from '@/game/store'
import { formatMoney, formatMonthYear, formatRate } from '@/lib/format'
import { PersonAvatar } from '../avatar/person-avatar'
import { seekPartner, showMember } from '../flows'
import {
  ageLabel,
  byGender,
  childStatus,
  formationLabel,
  relationLine,
  roleLabel,
  schoolName,
  schoolNameInSentence,
  schoolYearLabel,
} from '../labels'
import { button } from '../styles'
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
                <span className="tabular">{Math.floor(schoolScore(member))}</span>
              </Fact>
            ) : null}
          </>
        ) : null}
        {formation && (!school || isHigherStage(school.stage)) ? (
          <Fact label="Formação">{formationLabel(member, formation)}</Fact>
        ) : null}
        {member.education.enem !== null ? (
          <Fact label="ENEM">
            <span className="tabular">{member.education.enem} pontos</span>
          </Fact>
        ) : null}
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

      {alive && choice ? <OpenChoice member={member} choice={choice} /> : null}
      {alive && school && !choice ? <SchoolChange member={member} school={school} /> : null}
      {alive ? <MemberActions game={game} member={member} partner={partner} /> : null}
    </Sheet>
  )
}

/** A pessoa tem uma escolha esperando, e o relógio também. */
function OpenChoice({ member, choice }: { member: Member; choice: Choice }) {
  const showChoices = useUiStore((store) => store.showChoices)
  const school = choice.type === 'school'
  return (
    <div className="mt-5">
      <button type="button" className={`${button.primary} w-full`} onClick={showChoices}>
        {school ? <School size={18} /> : <Briefcase size={18} />}
        {school ? 'Fazer a matrícula' : 'Escolher o primeiro emprego'}
      </button>
      <p className="text-ink-soft mt-2 text-center text-sm">
        {school
          ? `O tempo parou até a matrícula de ${member.firstName}.`
          : `O tempo parou até ${member.firstName} ter um emprego.`}
      </p>
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
      <p className="text-ink-soft mt-2 text-center text-sm">
        {other === 'particular'
          ? `A mensalidade é de ${formatMoney(schoolFee({ stage: school.stage, network: other }))} e soma pontos na nota.`
          : 'A escola pública é gratuita, mas não soma pontos na nota.'}
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

  const seek = checkSeekPartner(game, member.id)
  if (seek.ok) {
    const cost = weddingCost(game)
    return (
      <div className="mt-5">
        <button
          type="button"
          className={`${button.love} w-full`}
          onClick={() => seekPartner(member.id)}
        >
          <Heart size={18} fill="currentColor" />
          Procurar um par
        </button>
        <p className="tabular text-ink-soft mt-2 text-center text-sm">
          O casamento custa {formatMoney(cost)}
        </p>
      </div>
    )
  }
  if (seek.error === 'tooYoung') {
    return (
      <p className="text-ink-soft mt-5 text-center text-sm">
        Aos 18 anos, {member.firstName} vai poder procurar um par.
      </p>
    )
  }

  if (!partner || partner.deathDay !== null) return null
  const check = checkHaveChild(game, member.id)
  if (!check.ok && check.error === 'tooOld') return null
  const cost = childCost(game, member.id, partner.id)
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
