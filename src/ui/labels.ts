import { BALANCE } from '@/content/balance'
import { careerLevel } from '@/content/careers'
import {
  ageOf,
  childCooldownDaysLeft,
  daysToSeconds,
  isAlive,
  type ChildCheck,
  type GameEvent,
  type GameState,
  type Member,
} from '@/engine'
import { formatDuration, formatMoney } from '@/lib/format'

/** Até esta idade, o membro aparece como criança; depois, como adolescente. */
const CHILDHOOD_END = 12

export function careerTitle(member: Member): string | null {
  if (!member.career) return null
  return careerLevel(member.career.id, member.career.level).title[member.gender]
}

/** Uma linha sobre o membro: idade e o que faz da vida. */
export function describeMember(member: Member, day: number): string {
  const age = ageOf(member, day)
  if (!isAlive(member)) return `Faleceu aos ${age} anos`
  if (age === 0) return 'Bebê'
  if (age < BALANCE.adultAge) {
    const years = age === 1 ? '1 ano' : `${age} anos`
    return `${years} · ${age < CHILDHOOD_END ? 'Criança' : 'Adolescente'}`
  }
  if (age >= BALANCE.retirementAge) {
    return `${age} anos · ${member.gender === 'f' ? 'Aposentada' : 'Aposentado'}`
  }
  return `${age} anos · ${careerTitle(member) ?? 'Sem trabalho'}`
}

export function generationLabel(generation: number): string {
  const labels = ['Fundadores', 'Filhos', 'Netos', 'Bisnetos', 'Trinetos']
  return labels[generation] ?? `${generation}ª geração`
}

export function describeEvent(state: GameState, event: GameEvent): string {
  const member = state.members[event.memberId]
  const name = member?.firstName ?? 'Alguém'
  switch (event.type) {
    case 'born':
      return `${name} nasceu`
    case 'becameAdult':
      return `${name} fez ${BALANCE.adultAge} anos`
    case 'firstJob': {
      const title = careerLevel(event.careerId, 0).title[member?.gender ?? 'f']
      return `${name} conseguiu o primeiro emprego: ${title}`
    }
    case 'retired':
      return `${name} se aposentou`
    case 'died':
      return `${name} faleceu aos ${event.age} anos`
  }
}

/** Segunda linha do botão de ter filho: custo, ou o que falta para poder. */
export function childStatus(state: GameState, parent: Member, check: ChildCheck, cost: number) {
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
      return `Faltam ${formatMoney(cost - state.money)}`
    default:
      return ''
  }
}
