import { BALANCE } from '../content/balance'
import { careerLevel, PUBLIC_CAREER } from '../content/careers'
import { isBoosted } from './boost'
import { ageOf, isAlive } from './members'
import { housingCost, rentPerMonth } from './properties'
import { halfTimeCaregivers, schoolFee } from './school'
import type { GameState, Member, MemberId } from './types'

/** Salário por mês do nível atual da carreira, sem considerar idade. */
export function salaryPerMonth(member: Pick<Member, 'career'>): number {
  if (!member.career) return 0
  return careerLevel(member.career.id, member.career.level).salaryPerMonth
}

/**
 * Renda por mês: salário para quem trabalha, pensão para aposentados e zero
 * para quem ainda não tem emprego ou foi demitido. Quem termina o médio e vai
 * trabalhar recebe desde janeiro, mesmo antes dos 18. A aposentadoria do
 * serviço público paga uma fração maior do último salário.
 */
export function memberIncome(member: Member, day: number): number {
  if (!isAlive(member) || !member.career) return 0
  const salary = salaryPerMonth(member)
  if (ageOf(member, day) < BALANCE.retirementAge) {
    return isUnemployed(member, day) ? unemploymentPay(salary) : salary
  }
  const ratio =
    member.career.id === PUBLIC_CAREER ? BALANCE.publicPensionRatio : BALANCE.pensionRatio
  return salary * ratio
}

/** Seguro-desemprego por mês de quem foi demitido: uma parte do salário, até um teto. */
export function unemploymentPay(salary: number): number {
  const { share, max } = BALANCE.mishaps.layoff.unemploymentPay
  return Math.min(salary * share, max)
}

/** Demitido e ainda procurando outro emprego. */
export function isUnemployed(member: Pick<Member, 'unemployedUntil'>, day: number): boolean {
  return member.unemployedUntil !== null && day < member.unemployedUntil
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
 * Custo de vida por mês, sem a moradia. Criança: alimentação, roupas, saúde e
 * lazer, mais caros a cada ano. Adulto: mercado e contas, plano de saúde para
 * quem ganha a partir de `planFromSalary` (mais caro para idosos; os outros
 * usam o SUS) e transporte, de carro para quem ganha a partir de
 * `carFromSalary` e de ônibus para os outros.
 */
export function livingCost(member: Member, day: number): number {
  const age = ageOf(member, day)
  if (age < BALANCE.adultAge) {
    return BALANCE.children.expenseBase + BALANCE.children.expensePerYear * age
  }
  const { adult, transport } = BALANCE.living
  return adult + healthPlanCost(member, day) + (hasCar(member, day) ? transport.car : transport.bus)
}

/** Plano de saúde por mês: zero para quem usa o SUS, por ganhar menos que `planFromSalary`. */
export function healthPlanCost(member: Member, day: number): number {
  const { health, seniorAge } = BALANCE.living
  if (memberIncome(member, day) < health.planFromSalary) return 0
  return ageOf(member, day) >= seniorAge ? health.senior : health.adult
}

/** Tem carro: ganha a partir do salário em que o transporte deixa de ser de ônibus. */
export function hasCar(member: Member, day: number): boolean {
  return memberIncome(member, day) >= BALANCE.living.transport.carFromSalary
}

/**
 * Despesa por mês da pessoa: o custo de vida, a mensalidade da escola
 * particular, o professor particular, o cursinho de quem estuda para concurso e
 * o curso de promoção, que fica trancado, sem mensalidade, enquanto a pessoa
 * está demitida. A moradia é da família inteira (`housingCost`).
 */
export function memberExpense(member: Member, day: number): number {
  if (!isAlive(member)) return 0
  const fee =
    schoolFee(member.education.school) +
    (member.education.tutorSince !== null ? BALANCE.school.tutor.fee : 0) +
    (member.concurso ? BALANCE.concurso.fee : 0) +
    (member.course && !isUnemployed(member, day) ? member.course.fee : 0)
  return livingCost(member, day) + fee
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
 * Fecha o mês: na virada para o dia 1º, entram os salários, as pensões e os
 * aluguéis e saem as despesas, pelas taxas da família nesse momento, com a
 * renda em dobro se o bônus estiver valendo. O saldo pode ficar negativo: a
 * virada do dia confere a dívida. Altera o rascunho.
 */
export function settleMonth(
  draft: GameState,
  members: readonly Member[] = Object.values(draft.members),
): void {
  const { income, expense, rent } = familyRates(draft, members)
  draft.money += income - expense
  draft.stats.totalEarned += income
  draft.stats.totalSpent += expense
  draft.stats.rentEarned += rent
}

/**
 * Renda, despesa e saldo da família por mês. O aluguel dos imóveis entra na
 * renda, e a renda inteira dobra enquanto vale o bônus das missões. A despesa
 * soma o custo de cada pessoa e a moradia: o aluguel dos lugares de quem não
 * cabe nos imóveis da família e as contas dos imóveis em que ela mora.
 * `members` pode trazer só as pessoas vivas, para não passar pelos
 * antepassados.
 */
export function familyRates(
  state: GameState,
  members: readonly Member[] = Object.values(state.members),
): Rates {
  const caregivers = halfTimeCaregivers(state, members)
  const factor = isBoosted(state) ? 2 : 1
  let living = 0
  let income = 0
  let expense = 0
  for (const member of members) {
    if (!isAlive(member)) continue
    living += 1
    income += incomeOf(state, member, caregivers)
    expense += memberExpense(member, state.clock.day)
  }
  const rent = rentPerMonth(state, living) * factor
  income = income * factor + rent
  expense += housingCost(state, living)
  return { income, rent, expense, net: income - expense }
}
