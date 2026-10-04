import { BALANCE } from '../content/balance'
import { careerLevel } from '../content/careers'
import { ageOf, isAlive } from './members'
import type { GameState, Member } from './types'

/** Salário por segundo do nível atual da carreira, sem considerar idade. */
export function salaryPerSecond(member: Member): number {
  if (!member.career) return 0
  return careerLevel(member.career.id, member.career.level).salaryPerSecond
}

/** Renda por segundo: salário para adultos, pensão para aposentados, zero para crianças. */
export function memberIncome(member: Member, day: number): number {
  if (!isAlive(member)) return 0
  const age = ageOf(member, day)
  if (age < BALANCE.adultAge) return 0
  const salary = salaryPerSecond(member)
  return age >= BALANCE.retirementAge ? salary * BALANCE.pensionRatio : salary
}

/** Despesa por segundo. Só crianças custam dinheiro, e custam mais conforme crescem. */
export function memberExpense(member: Member, day: number): number {
  if (!isAlive(member)) return 0
  const age = ageOf(member, day)
  if (age >= BALANCE.adultAge) return 0
  return BALANCE.children.expenseBase + BALANCE.children.expensePerYear * age
}

export type Rates = {
  income: number
  expense: number
  /** Renda menos despesa, por segundo. */
  net: number
}

export function familyRates(state: GameState): Rates {
  let income = 0
  let expense = 0
  for (const member of Object.values(state.members)) {
    income += memberIncome(member, state.clock.day)
    expense += memberExpense(member, state.clock.day)
  }
  return { income, expense, net: income - expense }
}
