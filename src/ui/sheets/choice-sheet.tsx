'use client'

import { Briefcase, Check, School } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { BALANCE } from '@/content/balance'
import { careerLevel, getCareer } from '@/content/careers'
import { techCourseName } from '@/content/schools'
import {
  calendarDate,
  homeCareCost,
  homeCaregiver,
  offerSalary,
  retiredGrandparents,
  schoolScore,
  stageFee,
  stagePoints,
  type Choice,
  type GameState,
  type Member,
  type MemberId,
  type SchoolOption,
} from '@/engine'
import { useGameStore } from '@/game/store'
import { formatMoney, formatRate } from '@/lib/format'
import { PersonAvatar } from '../avatar/person-avatar'
import { ageLabel, schoolName } from '../labels'
import { button, card } from '../styles'
import { Sheet } from './sheet'

type SchoolChoice = Extract<Choice, { type: 'school' }>
type JobChoice = Extract<Choice, { type: 'firstJob' }>

/**
 * Escolhas que esperam o jogador, com a sugestão de cada uma já marcada. O
 * relógio fica parado até confirmar; fechar o painel deixa para depois.
 */
export function ChoiceSheet({ game, onHide }: { game: GameState; onHide: () => void }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const [picked, setPicked] = useState<Record<MemberId, number>>({})
  const optionOf = (choice: Choice) => picked[choice.memberId] ?? choice.suggested
  const select = (choice: Choice) => (option: number) =>
    setPicked({ ...picked, [choice.memberId]: option })

  const confirm = () => {
    const picks = game.choices.map((choice) => ({
      memberId: choice.memberId,
      option: optionOf(choice),
    }))
    dispatch({ type: 'choose', picks })
  }

  return (
    <Sheet title={sheetTitle(game)} onClose={onHide}>
      <p className="text-ink-soft mt-1 text-[15px]">
        O tempo parou até você escolher. A sugestão já vem marcada.
      </p>
      <div className="mt-4 space-y-6">
        {game.choices.map((choice) =>
          choice.type === 'school' ? (
            <SchoolChoiceCard
              key={choice.memberId}
              game={game}
              choice={choice}
              selected={optionOf(choice)}
              onSelect={select(choice)}
            />
          ) : (
            <JobChoiceCard
              key={choice.memberId}
              game={game}
              choice={choice}
              selected={optionOf(choice)}
              onSelect={select(choice)}
            />
          ),
        )}
      </div>
      <button type="button" className={`${button.primary} mt-5 w-full`} onClick={confirm}>
        {game.choices.length === 1 ? 'Confirmar escolha' : 'Confirmar escolhas'}
      </button>
    </Sheet>
  )
}

function sheetTitle(game: GameState): string {
  const types = new Set(game.choices.map((choice) => choice.type))
  if (types.size > 1) return 'Hora de escolher'
  if (types.has('school')) {
    return `Matrículas de ${calendarDate(game.startDate, game.clock.day).slice(0, 4)}`
  }
  return game.choices.length === 1 ? 'Primeiro emprego' : 'Primeiros empregos'
}

function JobChoiceCard({
  game,
  choice,
  selected,
  onSelect,
}: {
  game: GameState
  choice: JobChoice
  selected: number
  onSelect: (option: number) => void
}) {
  const member = game.members[choice.memberId]
  if (!member) return null
  return (
    <ChoiceCard
      game={game}
      member={member}
      heading={`${member.firstName} fez ${BALANCE.adultAge} anos`}
      question="Qual vai ser o primeiro emprego?"
      label={`Primeiro emprego de ${member.firstName}`}
    >
      {choice.offers.map((offer, index) => (
        <OptionButton
          key={offer.careerId}
          active={index === selected}
          icon={<Briefcase size={17} />}
          title={careerLevel(offer.careerId, 0).title[member.gender]}
          detail={`${getCareer(offer.careerId).name}${index === choice.suggested ? ' · sugestão' : ''}`}
          value={formatRate(offerSalary(offer))}
          onSelect={() => onSelect(index)}
        />
      ))}
    </ChoiceCard>
  )
}

const QUESTIONS = {
  creche: (name: string) => `Quem cuida de ${name} até a escola?`,
  escola: (name: string) => `${name} começa a escola. Onde vai estudar?`,
  medio: (name: string) => `${name} começa o ensino médio. Onde vai estudar?`,
}

function SchoolChoiceCard({
  game,
  choice,
  selected,
  onSelect,
}: {
  game: GameState
  choice: SchoolChoice
  selected: number
  onSelect: (option: number) => void
}) {
  const member = game.members[choice.memberId]
  if (!member) return null
  return (
    <ChoiceCard
      game={game}
      member={member}
      heading={`${member.firstName}, ${ageLabel(member, game.clock.day).toLowerCase()}`}
      question={QUESTIONS[choice.stage](member.firstName)}
      label={`Matrícula de ${member.firstName}`}
    >
      {choice.options.map((option, index) => {
        const { title, detail, value, expense } = describeOption(game, member, choice, option)
        const suggestion = index === choice.suggested ? ' · sugestão' : ''
        return (
          <OptionButton
            key={`${option.network}-${option.course ?? ''}`}
            active={index === selected}
            disabled={!option.available}
            icon={<School size={17} />}
            title={title}
            detail={`${detail}${suggestion}`}
            value={value}
            expense={expense}
            onSelect={() => onSelect(index)}
          />
        )
      })}
    </ChoiceCard>
  )
}

/** Textos de uma opção de matrícula: nome, detalhe e o quanto custa por mês. */
function describeOption(
  game: GameState,
  member: Member,
  choice: SchoolChoice,
  option: SchoolOption,
): { title: string; detail: string; value: string; expense?: boolean } {
  const { stage } = choice
  const fee = stageFee(stage, option.network)
  const points = stagePoints(stage, option.network)
  const price = fee > 0 ? `${formatMoney(fee)}/mês` : 'Gratuita'
  const bonus = points > 0 ? `+${points} na nota` : ''
  const title = schoolName(stage, option.network)

  if (option.network === 'federal') {
    if (!option.available) {
      const score = Math.floor(schoolScore(member))
      return {
        title,
        detail: `Nota ${score} na prova; precisava de ${BALANCE.school.federalCutoff}`,
        value: 'Gratuito',
      }
    }
    const course = option.course ? `Técnico em ${techCourseName(option.course)}` : 'Técnico'
    return { title, detail: [course, bonus].filter(Boolean).join(' · '), value: 'Gratuito' }
  }
  if (option.network === 'avos') {
    const names = retiredGrandparents(game, member).map((person) => person.firstName)
    return { title, detail: `Com ${names.join(' e ')}`, value: 'Gratuito' }
  }
  if (option.network === 'casa') {
    const caregiver = homeCaregiver(game, member)
    const cost = homeCareCost(game, member)
    if (!caregiver || cost === 0) {
      return { title, detail: 'Sem perder renda', value: 'Sem custo' }
    }
    return {
      title,
      detail: `${caregiver.firstName} trabalha meio período`,
      value: `-${formatMoney(cost)}/mês`,
      expense: true,
    }
  }
  if (option.network === 'publica' && !option.available) {
    return { title, detail: 'Não saiu vaga este ano', value: 'Gratuita' }
  }
  return { title, detail: bonus || 'Sem pontos na nota', value: price, expense: fee > 0 }
}

function ChoiceCard({
  game,
  member,
  heading,
  question,
  label,
  children,
}: {
  game: GameState
  member: Member
  heading: string
  question: string
  label: string
  children: ReactNode
}) {
  return (
    <section>
      <div className="flex items-center gap-3">
        <PersonAvatar
          person={member}
          day={game.clock.day}
          size={48}
          className="shrink-0 rounded-full"
        />
        <div className="min-w-0">
          <p className="truncate text-[16px] font-extrabold">{heading}</p>
          <p className="text-ink-soft text-[14px]">{question}</p>
        </div>
      </div>
      <div role="radiogroup" aria-label={label} className="mt-3 space-y-2">
        {children}
      </div>
    </section>
  )
}

function OptionButton({
  active,
  disabled = false,
  icon,
  title,
  detail,
  value,
  expense = false,
  onSelect,
}: {
  active: boolean
  disabled?: boolean
  icon: ReactNode
  title: string
  detail: string
  value: string
  expense?: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onSelect}
      className={`${card} flex w-full items-center gap-3 p-3 text-left transition active:scale-[0.99] disabled:opacity-55 ${
        active ? 'ring-leaf ring-2' : ''
      }`}
    >
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-full ${
          active ? 'bg-leaf text-white' : 'bg-leaf-soft text-leaf-strong'
        }`}
      >
        {active ? <Check size={18} /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-bold">{title}</span>
        <span className="text-ink-soft block text-[13px]">{detail}</span>
      </span>
      <span
        className={`tabular shrink-0 text-[14px] font-bold ${expense ? 'text-expense' : 'text-income'}`}
      >
        {value}
      </span>
    </button>
  )
}
