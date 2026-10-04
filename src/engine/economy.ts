import { BALANCE } from '../content/balance'
import { careerLevel, PUBLIC_CAREER } from '../content/careers'
import { isBoosted } from './boost'
import { ageOf, isAlive } from './members'
import { rentPerMonth } from './properties'
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
 * desde janeiro, mesmo antes dos 18. A aposentadoria do serviço público paga
 * uma fração maior do último salário.
 */
export function memberIncome(member: Member, day: number): number {
  if (!isAlive(member) || !member.career) return 0
  const salary = salaryPerMonth(member)
  if (ageOf(member, day) < BALANCE.retirementAge) return salary
  const ratio =
    member.career.id === PUBLIC_CAREER ? BALANCE.publicPensionRatio : BALANCE.pensionRatio
  return salary * ratio
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
 * Despesa por mês: crianças custam mais conforme crescem, quem estuda em
 * escola particular paga a mensalidade, e quem estuda para concurso, o cursinho.
 */
export function memberExpense(member: Member, day: number): number {
  if (!isAlive(member)) return 0
  const fee = schoolFee(member.education.school) + (member.concurso ? BALANCE.concurso.fee : 0)
  const age = ageOf(member, day)
  if (age >= BALANCE.adultAge) return fee
  return BALANCE.children.expenseBase + BALANCE.children.expensePerYear * age + fee
}

export type Rates = {
  /** Renda por mês do jogo, em reais: salários, pensões e aluguel. */
  income: number
  /** A parte da renda que vem do aluguel dos imóveis. */
  rent: number
  /** Despesa por mês do jogo, em reais. */
  expense: number
  /** Renda menos despesa, por mês. */
  net: number
}

/**
 * Renda, despesa e saldo da família por mês. O aluguel entra na renda, e a
 * renda inteira dobra enquanto vale o bônus das missões.
 */
export function familyRates(state: GameState): Rates {
  const caregivers = halfTimeCaregivers(state)
  const factor = isBoosted(state) ? 2 : 1
  const rent = rentPerMonth(state) * factor
  let income = 0
  let expense = 0
  for (const member of Object.values(state.members)) {
    income += incomeOf(state, member, caregivers)
    expense += memberExpense(member, state.clock.day)
  }
  income = income * factor + rent
  return { income, rent, expense, net: income - expense }
}
