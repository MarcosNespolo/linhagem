import { BALANCE } from '@/content/balance'
import { careerLevel } from '@/content/careers'
import { techCourseName, type Network, type SchoolStage } from '@/content/schools'
import {
  ageOf,
  calendarDate,
  childCooldownDaysLeft,
  daysToSeconds,
  isAlive,
  type ChildCheck,
  type Formation,
  type GameEvent,
  type GameState,
  type Member,
} from '@/engine'
import { formatAge, formatDuration, formatMoney } from '@/lib/format'

/** Escolhe a palavra conforme o gênero do membro. */
export function byGender(member: Pick<Member, 'gender'>, female: string, male: string): string {
  return member.gender === 'f' ? female : male
}

/** Primeira letra minúscula, para usar um cargo no meio da frase. */
function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

export function careerTitle(member: Pick<Member, 'career' | 'gender'>): string | null {
  if (!member.career) return null
  return careerLevel(member.career.id, member.career.level).title[member.gender]
}

/** O que a pessoa é ou faz hoje: "Bebê", "Criança", "Enfermeira", "Aposentado". */
export function roleLabel(member: Member, day: number): string {
  const age = ageOf(member, day)
  if (age < 3) return 'Bebê'
  if (age < 13) return 'Criança'
  if (age < BALANCE.adultAge) return 'Adolescente'
  if (age >= BALANCE.retirementAge) return byGender(member, 'Aposentada', 'Aposentado')
  return careerTitle(member) ?? 'Procurando o primeiro emprego'
}

/** Idade em texto, com "Faleceu aos" para quem já morreu. */
export function ageLabel(member: Member, day: number): string {
  const age = ageOf(member, day)
  if (!isAlive(member)) return `Faleceu aos ${formatAge(age)}`
  if (age === 0) return 'Menos de 1 ano'
  return formatAge(age)
}

/** Como a pessoa se liga à família: filha de quem, com quem casou, se fundou. */
export function relationLine(state: GameState, member: Member): string {
  const partner = member.partnerId ? state.members[member.partnerId] : undefined
  if (member.origin === 'founder') {
    return byGender(member, 'Fundadora da família', 'Fundador da família')
  }
  if (member.origin === 'married') {
    const name = partner?.firstName ?? 'alguém da família'
    return `Entrou na família ao casar com ${name}`
  }
  const parents = member.parentIds.map((id) => state.members[id]?.firstName).filter(Boolean)
  return `${byGender(member, 'Filha', 'Filho')} de ${parents.join(' e ')}`
}

/** Geração em palavras, contando a partir dos fundadores. */
export function generationLabel(generation: number): string {
  const labels = ['Fundadores', 'Filhos', 'Netos', 'Bisnetos', 'Trinetos', 'Tetranetos']
  return labels[generation] ?? `${generation}ª geração`
}

/** Frase curta sobre um acontecimento, para avisos e para o histórico. */
export function describeEvent(state: GameState, event: GameEvent): string {
  if (event.type === 'thirteenth') return `Chegou o 13º salário: ${formatMoney(event.amount)}`
  const member = state.members[event.memberId]
  const name = member?.firstName ?? 'Alguém'
  switch (event.type) {
    case 'born':
      return `${name} nasceu`
    case 'becameAdult':
      return `${name} fez ${BALANCE.adultAge} anos`
    case 'firstJob': {
      const title = careerLevel(event.careerId, 0).title[member?.gender ?? 'f']
      return `${name} começou a trabalhar como ${lowerFirst(title)}`
    }
    case 'married': {
      const partner = state.members[event.partnerId]
      return `${name} casou com ${partner?.firstName ?? 'alguém'}`
    }
    case 'retired':
      return `${name} se aposentou`
    case 'died':
      return `${name} faleceu aos ${formatAge(event.age)}`
    case 'schoolStarted':
      return `${name} ${schoolStartText(event.stage, event.network)}${
        event.course ? `, técnico em ${techCourseName(event.course)}` : ''
      }`
    case 'schoolChanged':
      return event.network === 'particular'
        ? `${name} mudou para um colégio particular`
        : `${name} mudou para a escola pública`
    case 'schoolFinished':
      return event.formation.level === 'tecnico'
        ? `${name} se formou ${member ? formationLabel(member, event.formation).toLowerCase() : 'no técnico'} no instituto federal`
        : `${name} terminou o ensino médio`
  }
}

/** O que a pessoa começou na matrícula, para o histórico. */
function schoolStartText(stage: SchoolStage, network: Network): string {
  switch (stage) {
    case 'creche':
      if (network === 'avos') return 'vai ficar com os avós até a escola'
      if (network === 'casa') return 'vai ficar em casa até a escola'
      return network === 'publica' ? 'entrou na creche pública' : 'entrou numa creche particular'
    case 'escola':
      return network === 'particular'
        ? 'começou a escola num colégio particular'
        : 'começou a escola na rede municipal'
    case 'medio':
      if (network === 'federal') return 'começou o ensino médio no instituto federal'
      return network === 'particular'
        ? 'começou o ensino médio num colégio particular'
        : 'começou o ensino médio na escola estadual'
  }
}

/** Nome da rede numa etapa: "Creche pública", "Escola municipal", "Instituto federal". */
export function schoolName(stage: SchoolStage, network: Network): string {
  switch (network) {
    case 'publica':
      return stage === 'creche'
        ? 'Creche pública'
        : stage === 'escola'
          ? 'Escola municipal'
          : 'Escola estadual'
    case 'particular':
      return stage === 'creche' ? 'Creche particular' : 'Colégio particular'
    case 'federal':
      return 'Instituto federal'
    case 'avos':
      return 'Com os avós'
    case 'casa':
      return 'Em casa'
  }
}

/** Nome da rede com artigo, para o meio da frase: "a escola municipal", "o colégio particular". */
export function schoolNameInSentence(stage: SchoolStage, network: Network): string {
  const name = schoolName(stage, network).toLowerCase()
  if (network === 'avos' || network === 'casa') return name
  return name.startsWith('colégio') || name.startsWith('instituto') ? `o ${name}` : `a ${name}`
}

/** Ano escolar pela idade que a criança faz no ano: "Pré-escola", "3º ano do fundamental". */
export function gradeLabel(stage: SchoolStage, ageThisYear: number): string {
  if (stage === 'creche') return 'Creche'
  if (stage === 'medio') return `${ageThisYear - 14}º ano do médio`
  return ageThisYear <= 5 ? 'Pré-escola' : `${ageThisYear - 5}º ano do fundamental`
}

/** Formação em palavras: "Ensino médio", "Técnica em Informática". */
export function formationLabel(member: Pick<Member, 'gender'>, formation: Formation): string {
  if (formation.level === 'medio') return 'Ensino médio'
  return `${byGender(member, 'Técnica', 'Técnico')} em ${techCourseName(formation.course)}`
}

/** Ano do calendário em que um acontecimento aconteceu. */
export function eventYear(state: GameState, event: GameEvent): string {
  return calendarDate(state.startDate, event.day).slice(0, 4)
}

/** Status do casal para ter um filho: o custo, ou o que falta para poder. */
export function childStatus(
  state: GameState,
  parent: Member,
  check: ChildCheck,
  cost: number,
): string {
  if (check.ok) return `Custa ${formatMoney(cost)}`
  switch (check.error) {
    case 'tooYoung':
      return `Os dois precisam ter ${BALANCE.children.minParentAge} anos`
    case 'tooOld':
      return 'Passaram da idade de ter filhos'
    case 'cooldown': {
      const days = childCooldownDaysLeft(state, parent.id)
      return `Próximo filho em ${formatDuration(daysToSeconds(days))}`
    }
    case 'notEnoughMoney':
      return `Custa ${formatMoney(cost)}, faltam ${formatMoney(cost - state.money)}`
    default:
      return ''
  }
}
