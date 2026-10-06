'use client'

import {
  BookOpen,
  Briefcase,
  Check,
  Clock,
  GraduationCap,
  Heart,
  HeartCrack,
  Info,
  Landmark,
  School,
  X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { BALANCE } from '@/content/balance'
import { careerLevel, concursoOf, getCareer } from '@/content/careers'
import { degree, DEGREES, techCourseName } from '@/content/schools'
import {
  allowedCargos,
  calendarDate,
  highestCargo,
  homeCareCost,
  homeCaregiver,
  MEET_OPTIONS,
  nextCargo,
  offerSalary,
  PROPOSE_OPTIONS,
  retiredGrandparents,
  schoolScore,
  stageFee,
  stagePoints,
  weddingCost,
  type Choice,
  type ConcursoOption,
  type GameState,
  type Member,
  type PathOption,
  type SchoolOption,
  type Suitor,
} from '@/engine'
import { useGameStore } from '@/game/store'
import { formatAge, formatGameSpan, formatMoney, formatMonthYear, formatRate } from '@/lib/format'
import { PersonAvatar } from '../avatar/person-avatar'
import { MemberStats } from '../member-stats'
import {
  ageLabel,
  careerLine,
  cargoLabel,
  extraHousingLabel,
  formationLabel,
  levelTitle,
  lowerFirst,
  schoolName,
} from '../labels'
import { button, card } from '../styles'
import { Sheet } from './sheet'

type SchoolChoice = Extract<Choice, { type: 'school' }>
type JobChoice = Extract<Choice, { type: 'firstJob' }>
type PathChoice = Extract<Choice, { type: 'afterSchool' }>
type ConcursoChoice = Extract<Choice, { type: 'concurso' }>
type MeetChoice = Extract<Choice, { type: 'meet' }>
type ProposeChoice = Extract<Choice, { type: 'propose' }>

/** Uma escolha por tipo e pessoa: trabalhar depois do médio abre a do emprego para a mesma pessoa. */
const keyOf = (choice: Choice) => `${choice.type}:${choice.memberId}`

/** O detalhe de uma opção, com "sugestão" no fim quando for a sugerida. */
const withSuggestion = (detail: string | undefined, suggested: boolean) =>
  [detail, suggested ? 'sugestão' : ''].filter(Boolean).join(' · ')

/**
 * Escolhas que esperam o jogador, com a sugestão de cada uma já marcada. O
 * relógio fica parado até confirmar; fechar o painel deixa para depois.
 */
export function ChoiceSheet({ game, onHide }: { game: GameState; onHide: () => void }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const [picked, setPicked] = useState<Record<string, number>>({})
  const rows = markedOptions(game, picked)
  const select = (choice: Choice) => (option: number) =>
    setPicked(
      choice.type === 'propose' && option === PROPOSE_OPTIONS.marry
        ? marryFirst(game, picked, choice)
        : { ...picked, [keyOf(choice)]: option },
    )

  const confirm = () => {
    const picks = rows.map(({ choice, option }) => ({ memberId: choice.memberId, option }))
    dispatch({ type: 'choose', picks })
    setPicked({})
  }

  return (
    <Sheet title={sheetTitle(game)} onClose={onHide}>
      <div className="mt-3 space-y-6">
        {rows.map(({ choice, option }) => {
          const key = keyOf(choice)
          const common = { game, selected: option, onSelect: select(choice) }
          switch (choice.type) {
            case 'school':
              return <SchoolChoiceCard key={key} {...common} choice={choice} />
            case 'afterSchool':
              return <PathChoiceCard key={key} {...common} choice={choice} />
            case 'firstJob':
              return <JobChoiceCard key={key} {...common} choice={choice} />
            case 'concurso':
              return <ConcursoChoiceCard key={key} {...common} choice={choice} />
            case 'meet':
              return <MeetChoiceCard key={key} {...common} choice={choice} />
            case 'propose':
              return <ProposeChoiceCard key={key} {...common} choice={choice} />
          }
        })}
      </div>
      <button type="button" className={`${button.primary} mt-5 w-full`} onClick={confirm}>
        {game.choices.length === 1 ? 'Confirmar escolha' : 'Confirmar escolhas'}
      </button>
    </Sheet>
  )
}

/**
 * A opção marcada em cada escolha, em ordem: a do jogador ou a sugestão. Os
 * casamentos marcados saem do dinheiro um depois do outro, e casar só fica
 * marcado enquanto o que sobra cobre o casamento; senão, esperar.
 */
function markedOptions(game: GameState, picked: Record<string, number>) {
  let money = game.money
  return game.choices.map((choice) => {
    let option = picked[keyOf(choice)] ?? choice.suggested
    if (choice.type === 'propose' && option === PROPOSE_OPTIONS.marry) {
      if (money >= weddingCost()) money -= weddingCost()
      else option = PROPOSE_OPTIONS.wait
    }
    return { choice, option }
  })
}

/**
 * Marca casar no pedido escolhido. Quando o dinheiro não cobre todos os
 * casamentos marcados, os outros pedidos passam para esperar.
 */
function marryFirst(game: GameState, picked: Record<string, number>, chosen: Choice) {
  const next = { ...picked, [keyOf(chosen)]: PROPOSE_OPTIONS.marry }
  let money = game.money - weddingCost()
  for (const choice of game.choices) {
    if (choice === chosen || choice.type !== 'propose') continue
    if ((next[keyOf(choice)] ?? choice.suggested) !== PROPOSE_OPTIONS.marry) continue
    if (money >= weddingCost()) money -= weddingCost()
    else next[keyOf(choice)] = PROPOSE_OPTIONS.wait
  }
  return next
}

function sheetTitle(game: GameState): string {
  const { choices } = game
  const count = (type: Choice['type']) => choices.filter((choice) => choice.type === type).length
  const love = count('meet') + count('propose')
  if (love === choices.length) return count('meet') === 0 ? 'Pedido de casamento' : 'Namoro'
  const jobs = count('firstJob')
  if (count('afterSchool') === choices.length) return 'Depois do ensino médio'
  if (count('concurso') === choices.length) return 'Resultado do concurso'
  if (count('school') + count('afterSchool') === choices.length) {
    return `Matrículas de ${calendarDate(game.startDate, game.clock.day).slice(0, 4)}`
  }
  if (jobs < choices.length) return 'Hora de escolher'
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
  return (
    <ChoiceCard
      game={game}
      member={member}
      heading={`${member.firstName}, ${ageLabel(member, game.clock.day).toLowerCase()}`}
      question={formation ? formationLabel(member, formation) : 'Sem formação'}
      label={`Primeiro emprego de ${member.firstName}`}
    >
      {choice.offers.map((offer, index) => (
        <OptionButton
          key={offer.careerId}
          active={index === selected}
          icon={<Briefcase size={17} />}
          title={levelTitle(member, offer.careerId, offer.level)}
          detail={withSuggestion(
            careerLine(offer.careerId, offer.level),
            index === choice.suggested,
          )}
          value={formatRate(offerSalary(offer))}
          onSelect={() => onSelect(index)}
        />
      ))}
      {choice.concurso ? (
        <OptionButton
          active={selected === choice.offers.length}
          icon={<BookOpen size={17} />}
          title={member.concurso ? 'Continuar estudando para concurso' : 'Estudar para concurso'}
          detail={concursoDetail(member)}
          value={formatRate(-BALANCE.concurso.fee)}
          expense
          onSelect={() => onSelect(choice.offers.length)}
        />
      ) : null}
    </ChoiceCard>
  )
}

/**
 * O concurso para a pessoa: sem salário, uma prova a cada três meses, e os
 * cargos que a formação permite, do corte mais baixo ao mais alto, com o
 * salário de cada um.
 */
function concursoDetail(member: Member): string {
  const cargos = allowedCargos(member)
  const first = cargos[0]
  const last = cargos[cargos.length - 1]
  const salary = (id: typeof first) => formatMoney(careerLevel(id, 0).salaryPerMonth)
  return `Sem salário, prova a cada 3 meses · de ${cargoLabel(first)}, ${salary(first)}/mês, a ${cargoLabel(last)}, ${salary(last)}/mês`
}

/** Resultado do concurso: tomar posse, continuar estudando ou procurar outro emprego. */
function ConcursoChoiceCard({
  game,
  choice,
  selected,
  onSelect,
}: {
  game: GameState
  choice: ConcursoChoice
  selected: number
  onSelect: (option: number) => void
}) {
  const member = game.members[choice.memberId]
  if (!member) return null
  return (
    <ChoiceCard
      game={game}
      member={member}
      heading={`${member.firstName} passou no concurso`}
      question={`Nota ${choice.score}`}
      label={`Concurso de ${member.firstName}`}
    >
      {choice.options.map((option, index) => (
        <OptionButton
          key={option.kind}
          active={index === selected}
          icon={option.kind === 'posse' ? <Landmark size={17} /> : <Briefcase size={17} />}
          {...describeConcursoOption(member, option, choice.options, index === choice.suggested)}
          onSelect={() => onSelect(index)}
        />
      ))}
    </ChoiceCard>
  )
}

function describeConcursoOption(
  member: Member,
  option: ConcursoOption,
  options: readonly ConcursoOption[],
  suggested: boolean,
): { title: string; detail: string; value: string; expense?: boolean } {
  switch (option.kind) {
    case 'posse':
      return {
        title: `Tomar posse como ${lowerFirst(levelTitle(member, option.careerId, 0))}`,
        detail: withSuggestion(careerLine(option.careerId, 0), suggested),
        value: formatRate(careerLevel(option.careerId, 0).salaryPerMonth),
      }
    case 'estudar': {
      const passed = options.find((other) => other.kind === 'posse')
      const next = passed?.kind === 'posse' ? nextCargo(member, passed.careerId) : null
      const target = next ?? highestCargo(member)
      const salary = formatMoney(careerLevel(target, 0).salaryPerMonth)
      return {
        title: `Continuar estudando para ${getCareer(target).name.toLowerCase()}`,
        detail: withSuggestion(
          `Nota ${concursoOf(target).cutoff} · ${salary}/mês · até ${cargoLabel(highestCargo(member))}`,
          suggested,
        ),
        value: formatRate(-BALANCE.concurso.fee),
        expense: true,
      }
    }
    case 'privada':
      return {
        title: 'Procurar outro emprego',
        detail: withSuggestion(`${BALANCE.jobs.offersPerChoice} vagas`, suggested),
        value: 'Salário',
      }
  }
}

const QUESTIONS = {
  creche: 'Até a escola',
  escola: 'Começa a escola',
  medio: 'Começa o ensino médio',
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
      question={QUESTIONS[choice.stage]}
      label={`Matrícula de ${member.firstName}`}
    >
      {choice.options.map((option, index) => {
        const { title, detail, value, expense } = describeOption(game, member, choice, option)
        return (
          <OptionButton
            key={`${option.network}-${option.course ?? ''}`}
            active={index === selected}
            disabled={!option.available}
            icon={<School size={17} />}
            title={title}
            detail={withSuggestion(detail, index === choice.suggested)}
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
  const withBonus = (text: string) => [text, bonus].filter(Boolean).join(' · ')
  const title = schoolName(stage, option.network)

  if (option.network === 'federal') {
    if (!option.available) {
      const score = Math.floor(schoolScore(member, game.clock.day))
      return {
        title,
        detail: `Nota ${score} · corte ${BALANCE.school.federalCutoff}`,
        value: 'Gratuito',
      }
    }
    const course = option.course ? `Técnico em ${techCourseName(option.course)}` : 'Técnico'
    return { title, detail: withBonus(course), value: 'Gratuito' }
  }
  if (option.network === 'avos') {
    const names = retiredGrandparents(game, member).map((person) => person.firstName)
    return { title, detail: withBonus(`Com ${names.join(' e ')}`), value: 'Gratuito' }
  }
  if (option.network === 'casa') {
    const caregiver = homeCaregiver(game, member)
    const cost = homeCareCost(game, member)
    if (!caregiver || cost === 0) {
      return { title, detail: withBonus('Sem perder renda'), value: 'Sem custo' }
    }
    return {
      title,
      detail: withBonus(`${caregiver.firstName} trabalha meio período`),
      value: `-${formatMoney(cost)}/mês`,
      expense: true,
    }
  }
  if (option.network === 'publica' && !option.available) {
    return { title, detail: 'Sem vaga', value: 'Gratuita' }
  }
  return { title, detail: bonus, value: price, expense: fee > 0 }
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
      question={`ENEM ${choice.enem}`}
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
              detail={withSuggestion(
                text.detail,
                entries.some(({ index }) => index === choice.suggested),
              )}
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
            ? `${passed === 1 ? '1 curso' : `${passed} cursos`} pela nota`
            : `Corte a partir de ${lowest}`,
        value: 'Gratuita',
      }
    }
    case 'particular': {
      // Marcada, mostra a mensalidade do curso escolhido; senão, a mais baixa.
      const fee = selected ? courseFee(selected) : Math.min(...DEGREES.map((course) => course.fee))
      return {
        title: 'Faculdade particular',
        detail: 'Sem nota de corte',
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
          ? `${years} anos · instituto federal`
          : `${years} anos · federal: corte ${BALANCE.college.federalTechCutoff}`,
        value: federal ? 'Gratuito' : `${formatMoney(BALANCE.college.technical.fee)}/mês`,
        expense: !federal,
      }
    }
    case 'cursinho':
      return {
        title: 'Cursinho',
        detail: `1 ano · +${BALANCE.college.prep.points} no ENEM`,
        value: `${formatMoney(BALANCE.college.prep.fee)}/mês`,
        expense: true,
      }
    case 'trabalho':
      return {
        title: 'Trabalhar agora',
        detail: `${BALANCE.jobs.offersPerChoice} vagas`,
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

/** Quem o membro conheceu: namorar ou não. */
function MeetChoiceCard({
  game,
  choice,
  selected,
  onSelect,
}: {
  game: GameState
  choice: MeetChoice
  selected: number
  onSelect: (option: number) => void
}) {
  const member = game.members[choice.memberId]
  if (!member) return null
  return (
    <ChoiceCard
      game={game}
      member={member}
      heading={`${member.firstName} conheceu alguém`}
      question="Namorar?"
      label={`Namoro de ${member.firstName}`}
      extra={<PersonCard game={game} person={choice.person} />}
    >
      <OptionButton
        active={selected === MEET_OPTIONS.date}
        icon={<Heart size={17} />}
        title="Namorar"
        detail={`Pedido em ${formatGameSpan(BALANCE.dating.yearsToPropose * BALANCE.daysPerYear, BALANCE.daysPerYear)}`}
        value=""
        onSelect={() => onSelect(MEET_OPTIONS.date)}
      />
      <OptionButton
        active={selected === MEET_OPTIONS.decline}
        icon={<X size={17} />}
        title="Agora não"
        value=""
        onSelect={() => onSelect(MEET_OPTIONS.decline)}
      />
    </ChoiceCard>
  )
}

/**
 * Pedido de casamento depois do namoro: casar, esperar mais um ano ou terminar.
 * Com outros pedidos abertos, casar aqui pode passar os outros para esperar.
 */
function ProposeChoiceCard({
  game,
  choice,
  selected,
  onSelect,
}: {
  game: GameState
  choice: ProposeChoice
  selected: number
  onSelect: (option: number) => void
}) {
  const member = game.members[choice.memberId]
  const dating = member?.dating
  if (!member || !dating) return null
  const cost = weddingCost()
  const missing = cost - game.money
  const since = formatMonthYear(calendarDate(game.startDate, dating.since), 'short')
  return (
    <ChoiceCard
      game={game}
      member={member}
      heading={`${member.firstName} e ${dating.partner.firstName}`}
      question={`Namoram desde ${since}`}
      label={`Pedido de casamento de ${member.firstName}`}
      extra={<PersonCard game={game} person={dating.partner} />}
    >
      <OptionButton
        active={selected === PROPOSE_OPTIONS.marry}
        disabled={missing > 0}
        icon={<Heart size={17} />}
        title="Casar"
        detail={missing > 0 ? `Faltam ${formatMoney(missing)}` : extraHousingLabel(game)}
        value={formatMoney(cost)}
        expense
        onSelect={() => onSelect(PROPOSE_OPTIONS.marry)}
      />
      <OptionButton
        active={selected === PROPOSE_OPTIONS.wait}
        icon={<Clock size={17} />}
        title="Esperar mais um ano"
        value=""
        onSelect={() => onSelect(PROPOSE_OPTIONS.wait)}
      />
      <OptionButton
        active={selected === PROPOSE_OPTIONS.breakUp}
        icon={<HeartCrack size={17} />}
        title="Terminar"
        value=""
        onSelect={() => onSelect(PROPOSE_OPTIONS.breakUp)}
      />
    </ChoiceCard>
  )
}

/** Quem é de fora da família: a foto, a idade, o emprego, a formação e o salário. */
function PersonCard({ game, person }: { game: GameState; person: Suitor }) {
  const day = game.clock.day
  const age = Math.floor((day - person.birthDay) / BALANCE.daysPerYear)
  const level = careerLevel(person.career.id, person.career.level)
  return (
    <div className={`${card} flex items-center gap-3 p-3`}>
      <PersonAvatar person={person} day={day} size={56} className="shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-extrabold">
          {person.firstName}, {formatAge(age)}
        </p>
        <p className="truncate text-[14px] font-semibold">{level.title[person.gender]}</p>
        <p className="text-ink-soft truncate text-[13px]">
          {formationLabel(person, person.formation)}
        </p>
      </div>
      <span className="tabular text-income shrink-0 text-[14px] font-bold">
        {formatRate(level.salaryPerMonth)}
      </span>
    </div>
  )
}

function ChoiceCard({
  game,
  member,
  heading,
  question,
  label,
  extra,
  children,
}: {
  game: GameState
  member: Member
  heading: string
  question: string
  label: string
  /** Mostrado entre a pergunta e as opções, como a pessoa que apareceu. */
  extra?: ReactNode
  children: ReactNode
}) {
  const [showStats, setShowStats] = useState(false)
  return (
    <section>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowStats(!showStats)}
          aria-expanded={showStats}
          aria-label={`${showStats ? 'Esconder' : 'Ver'} a nota de ${member.firstName}`}
          className="relative shrink-0 rounded-full transition active:scale-95"
        >
          <PersonAvatar person={member} day={game.clock.day} size={48} className="rounded-full" />
          <span className="bg-leaf ring-surface absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full text-white ring-2">
            <Info size={12} aria-hidden="true" />
          </span>
        </button>
        <div className="min-w-0">
          <p className="truncate text-[16px] font-extrabold">{heading}</p>
          <p className="text-ink-soft text-[14px]">{question}</p>
        </div>
      </div>
      {showStats ? (
        <div className="mt-3">
          <MemberStats game={game} member={member} />
        </div>
      ) : null}
      {extra ? <div className="mt-3">{extra}</div> : null}
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
  detail?: string
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
        {detail ? <span className="text-ink-soft block text-[13px]">{detail}</span> : null}
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
