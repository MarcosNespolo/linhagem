import { BALANCE } from '../content/balance'
import { careerLevel } from '../content/careers'
import { ageOf, isAlive } from './members'
import { halfTimeCaregivers, schoolFee } from './school'
import type { GameState, Member, MemberId } from './types'

/** Salário por mês do nível atual da carreira, sem considerar idade. */
export function salaryPerMonth(member: Pick<Member, 'career'>): number {
  if (!member.career) return 0
  return careerLevel(member.career.id, member.career.level).salaryPerMonth
}

/**
 * Renda por mês: salário para quem trabalha, pensão para aposentados e zero
 * para quem ainda não tem emprego. Quem termina o médio e vai trabalhar recebe
 * desde janeiro, mesmo antes dos 18.
 */
export function memberIncome(member: Member, day: number): number {
  if (!isAlive(member) || !member.career) return 0
  const salary = salaryPerMonth(member)
  return ageOf(member, day) >= BALANCE.retirementAge ? salary * BALANCE.pensionRatio : salary
}

/**
 * Renda por mês na família de hoje: quem cuida de um filho pequeno em casa
 * trabalha meio período e ganha uma parte do salário.
 */
export function incomeOf(
  state: GameState,
  member: Member,
  caregivers: ReadonlySet<MemberId> = halfTimeCaregivers(state),
): number {
  const income = memberIncome(member, state.clock.day)
  return caregivers.has(member.id) ? income * BALANCE.school.halfTimeRatio : income
}

/**
 * Despesa por mês: crianças custam mais conforme crescem, e quem estuda em
 * escola particular paga a mensalidade.
 */
export function memberExpense(member: Member, day: number): number {
  if (!isAlive(member)) return 0
  const fee = schoolFee(member.education.school)
  const age = ageOf(member, day)
  if (age >= BALANCE.adultAge) return fee
  return BALANCE.children.expenseBase + BALANCE.children.expensePerYear * age + fee
}

export type Rates = {
  /** Renda por mês do jogo, em reais. */
  income: number
  /** Despesa por mês do jogo, em reais. */
  expense: number
  /** Renda menos despesa, por mês. */
  net: number
}

export function familyRates(state: GameState): Rates {
  const caregivers = halfTimeCaregivers(state)
  let income = 0
  let expense = 0
  for (const member of Object.values(state.members)) {
    income += incomeOf(state, member, caregivers)
    expense += memberExpense(member, state.clock.day)
  }
  return { income, expense, net: income - expense }
}
