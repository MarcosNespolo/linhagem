'use client'

import { Briefcase, Check, GraduationCap, School } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { BALANCE } from '@/content/balance'
import { careerLevel, getCareer } from '@/content/careers'
import { degree, DEGREES, techCourseName } from '@/content/schools'
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
  type PathOption,
  type SchoolOption,
} from '@/engine'
import { useGameStore } from '@/game/store'
import { formatMoney, formatRate } from '@/lib/format'
import { PersonAvatar } from '../avatar/person-avatar'
import { ageLabel, formationLabel, schoolName } from '../labels'
import { button, card } from '../styles'
import { Sheet } from './sheet'

type SchoolChoice = Extract<Choice, { type: 'school' }>
type JobChoice = Extract<Choice, { type: 'firstJob' }>
type PathChoice = Extract<Choice, { type: 'afterSchool' }>

/** Uma escolha por tipo e pessoa: trabalhar depois do médio abre a do emprego para a mesma pessoa. */
const keyOf = (choice: Choice) => `${choice.type}:${choice.memberId}`

/**
 * Escolhas que esperam o jogador, com a sugestão de cada uma já marcada. O
 * relógio fica parado até confirmar; fechar o painel deixa para depois.
 */
export function ChoiceSheet({ game, onHide }: { game: GameState; onHide: () => void }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const [picked, setPicked] = useState<Record<string, number>>({})
  const optionOf = (choice: Choice) => picked[keyOf(choice)] ?? choice.suggested
  const select = (choice: Choice) => (option: number) =>
    setPicked({ ...picked, [keyOf(choice)]: option })

  const confirm = () => {
    const picks = game.choices.map((choice) => ({
      memberId: choice.memberId,
      option: optionOf(choice),
    }))
    dispatch({ type: 'choose', picks })
    setPicked({})
  }

  return (
    <Sheet title={sheetTitle(game)} onClose={onHide}>
      <p className="text-ink-soft mt-1 text-[15px]">
        O tempo parou até você escolher. A sugestão já vem marcada.
      </p>
      <div className="mt-4 space-y-6">
        {game.choices.map((choice) => {
          const key = keyOf(choice)
          const common = { game, selected: optionOf(choice), onSelect: select(choice) }
          switch (choice.type) {
            case 'school':
              return <SchoolChoiceCard key={key} {...common} choice={choice} />
            case 'afterSchool':
              return <PathChoiceCard key={key} {...common} choice={choice} />
            case 'firstJob':
              return <JobChoiceCard key={key} {...common} choice={choice} />
          }
        })}
      </div>
      <button type="button" className={`${button.primary} mt-5 w-full`} onClick={confirm}>
        {game.choices.length === 1 ? 'Confirmar escolha' : 'Confirmar escolhas'}
      </button>
    </Sheet>
  )
}

function sheetTitle(game: GameState): string {
  const jobs = game.choices.filter((choice) => choice.type === 'firstJob').length
  if (game.choices.every((choice) => choice.type === 'afterSchool')) {
    return 'Depois do ensino médio'
  }
  if (jobs === 0) {
    return `Matrículas de ${calendarDate(game.startDate, game.clock.day).slice(0, 4)}`
  }
  if (jobs < game.choices.length) return 'Hora de escolher'
  return jobs === 1 ? 'Primeiro emprego' : 'Primeiros empregos'
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
  const { formation } = member.education
  const question = 'Qual vai ser o primeiro emprego?'
  return (
    <ChoiceCard
      game={game}
      member={member}
      heading={`${member.firstName}, ${ageLabel(member, game.clock.day).toLowerCase()}`}
      question={formation ? `${formationLabel(member, formation)}. ${question}` : question}
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

type PathGroup = 'federal' | 'particular' | 'tecnico' | 'cursinho' | 'trabalho'

const PATH_GROUPS: PathGroup[] = ['federal', 'particular', 'tecnico', 'cursinho', 'trabalho']

function groupOf(option: PathOption): PathGroup {
  if (option.path === 'faculdade') return option.network === 'federal' ? 'federal' : 'particular'
  return option.path
}

/** Depois do médio: um caminho por linha e, no caminho escolhido, os cursos dele. */
function PathChoiceCard({
  game,
  choice,
  selected,
  onSelect,
}: {
  game: GameState
  choice: PathChoice
  selected: number
  onSelect: (option: number) => void
}) {
  const member = game.members[choice.memberId]
  if (!member) return null
  const current = choice.options[selected]
  const currentGroup = current ? groupOf(current) : null
  return (
    <ChoiceCard
      game={game}
      member={member}
      heading={`${member.firstName} terminou ${member.education.past.cursinho ? 'o cursinho' : 'o ensino médio'}`}
      question={`ENEM: ${choice.enem} pontos. O que vem agora?`}
      label={`Depois do médio de ${member.firstName}`}
    >
      {PATH_GROUPS.map((group) => {
        const entries = choice.options
          .map((option, index) => ({ option, index }))
          .filter(({ option }) => groupOf(option) === group)
        if (entries.length === 0) return null
        const active = group === currentGroup
        const enabled = entries.some(({ option }) => option.available)
        const text = describeGroup(
          group,
          entries.map(({ option }) => option),
          choice,
          active ? current : undefined,
        )
        return (
          <div key={group}>
            <OptionButton
              active={active}
              disabled={!enabled}
              icon={group === 'trabalho' ? <Briefcase size={17} /> : <GraduationCap size={17} />}
              title={text.title}
              detail={`${text.detail}${entries.some(({ index }) => index === choice.suggested) ? ' · sugestão' : ''}`}
              value={text.value}
              note={text.note}
              expense={text.expense}
              onSelect={() => onSelect(defaultIn(group, entries, choice.suggested))}
            />
            {active && entries.length > 1 ? (
              <div
                role="radiogroup"
                aria-label="Curso"
                className="mt-2 mb-1 flex flex-wrap gap-2 pl-1"
              >
                {entries.map(({ option, index }) => (
                  <CourseChip
                    key={index}
                    option={option}
                    active={index === selected}
                    onSelect={() => onSelect(index)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </ChoiceCard>
  )
}

/** Opção marcada ao tocar num caminho: a sugestão, se for dele, senão a primeira que dá. */
function defaultIn(
  group: PathGroup,
  entries: { option: PathOption; index: number }[],
  suggested: number,
): number {
  if (entries.some(({ index }) => index === suggested)) return suggested
  const available = entries.filter(({ option }) => option.available)
  if (group === 'particular') {
    // Na particular, começa pelo curso de mensalidade mais baixa.
    const cheapest = [...available].sort((a, b) => courseFee(a.option) - courseFee(b.option))[0]
    if (cheapest) return cheapest.index
  }
  return available[0]?.index ?? entries[0].index
}

function courseFee(option: PathOption): number {
  return option.path === 'faculdade' ? degree(option.degree).fee : 0
}

function describeGroup(
  group: PathGroup,
  options: PathOption[],
  choice: PathChoice,
  selected?: PathOption,
): { title: string; detail: string; value: string; note?: string; expense?: boolean } {
  switch (group) {
    case 'federal': {
      const passed = options.filter((option) => option.available).length
      const lowest = Math.min(...DEGREES.map((course) => course.cutoff))
      return {
        title: 'Universidade federal',
        detail:
          passed > 0
            ? `${passed === 1 ? '1 curso' : `${passed} cursos`} que a nota alcança`
            : `A nota não alcança nenhum curso: o corte mais baixo é ${lowest}`,
        value: 'Gratuita',
      }
    }
    case 'particular': {
      // Marcada, mostra a mensalidade do curso escolhido; senão, a mais baixa.
      const fee = selected ? courseFee(selected) : Math.min(...DEGREES.map((course) => course.fee))
      return {
        title: 'Faculdade particular',
        detail: 'Qualquer curso, sem nota de corte',
        value: `${formatMoney(fee)}/mês`,
        note: selected ? undefined : 'desde',
        expense: true,
      }
    }
    case 'tecnico': {
      const federal = options.some(
        (option) => option.path === 'tecnico' && option.network === 'federal',
      )
      const years = BALANCE.college.technical.years
      return {
        title: 'Curso técnico',
        detail: federal
          ? `${years} anos no instituto federal`
          : `${years} anos; para o federal, precisava de ${BALANCE.college.federalTechCutoff} no ENEM`,
        value: federal ? 'Gratuito' : `${formatMoney(BALANCE.college.technical.fee)}/mês`,
        expense: !federal,
      }
    }
    case 'cursinho':
      return {
        title: 'Cursinho',
        detail: `1 ano e o ENEM de novo, com +${BALANCE.college.prep.points} na nota (hoje ${choice.enem})`,
        value: `${formatMoney(BALANCE.college.prep.fee)}/mês`,
        expense: true,
      }
    case 'trabalho':
      return {
        title: 'Trabalhar agora',
        detail: `Escolher entre ${BALANCE.jobs.offersPerChoice} vagas`,
        value: 'Salário',
      }
  }
}

function CourseChip({
  option,
  active,
  onSelect,
}: {
  option: PathOption
  active: boolean
  onSelect: () => void
}) {
  let label = ''
  let note = ''
  if (option.path === 'faculdade') {
    const course = degree(option.degree)
    label = course.name
    note =
      option.network === 'federal' ? `corte ${course.cutoff}` : `${formatMoney(course.fee)}/mês`
    note = `${note} · ${course.years} anos`
  } else if (option.path === 'tecnico') {
    label = techCourseName(option.course)
  }
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={!option.available}
      onClick={onSelect}
      className={`rounded-2xl px-3 py-1.5 text-left text-[14px] font-bold ring-1 transition active:scale-[0.98] disabled:opacity-45 ${
        active ? 'bg-leaf ring-leaf text-white' : 'bg-surface ring-line'
      }`}
    >
      {label}
      {note ? (
        <span
          className={`block text-[12px] font-semibold ${active ? 'text-white/85' : 'text-ink-soft'}`}
        >
          {note}
        </span>
      ) : null}
    </button>
  )
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
  note,
  expense = false,
  onSelect,
}: {
  active: boolean
  disabled?: boolean
  icon: ReactNode
  title: string
  detail: string
  value: string
  /** Texto pequeno em cima do valor, como "desde". */
  note?: string
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
        <span className="block text-[16px] leading-snug font-bold">{title}</span>
        <span className="text-ink-soft block text-[13px]">{detail}</span>
      </span>
      <span
        className={`tabular shrink-0 text-right text-[14px] font-bold ${expense ? 'text-expense' : 'text-income'}`}
      >
        {note ? (
          <span className="text-ink-soft block text-[12px] font-semibold">{note}</span>
        ) : null}
        {value}
      </span>
    </button>
  )
}
