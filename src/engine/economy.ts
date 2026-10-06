import { BALANCE } from '../content/balance'
import { careerLevel, isPublicCareer } from '../content/careers'
import { boostFactor } from './boost'
import { loanInstallments, payLoans } from './financing'
import { ageOf, isAlive } from './members'
import { housingCost, maintenanceCost, rentPerMonth } from './properties'
import { halfTimeCaregivers, schoolFee } from './school'
import type { GameEvent, GameState, Member, MemberId } from './types'

/** Salário por mês do nível atual da carreira, sem considerar idade. */
export function salaryPerMonth(member: Pick<Member, 'career'>): number {
  if (!member.career) return 0
  return careerLevel(member.career.id, member.career.level).salaryPerMonth
}

/**
 * Renda por mês, antes do imposto: salário para quem trabalha, pensão para
 * aposentados e zero para quem ainda não tem emprego ou foi demitido. Quem
 * termina o médio e vai trabalhar recebe desde janeiro, mesmo antes dos 18. A
 * aposentadoria do serviço público paga uma fração maior do último salário.
 */
export function memberIncome(member: Member, day: number): number {
  if (!isAlive(member) || !member.career) return 0
  const salary = salaryPerMonth(member)
  if (ageOf(member, day) < BALANCE.retirementAge) {
    return isUnemployed(member, day) ? unemploymentPay(salary) : salary
  }
  const ratio = isPublicCareer(member.career.id) ? BALANCE.publicPensionRatio : BALANCE.pensionRatio
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
 * Renda por mês na família de hoje, antes do imposto: quem cuida de um filho
 * pequeno em casa trabalha meio período e ganha uma parte do salário.
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
 * Imposto de renda e INSS sobre uma renda por mês, por faixas: cada alíquota
 * vale só para a parte da renda que cai na faixa.
 */
export function incomeTax(income: number): number {
  let tax = 0
  let from = 0
  for (const { upTo, rate } of BALANCE.tax.brackets) {
    if (income <= from) break
    tax += (Math.min(income, upTo) - from) * rate
    from = upTo
  }
  return tax
}

/** O imposto da pessoa no mês, sobre a renda dela na família de hoje. */
export function taxOf(
  state: GameState,
  member: Member,
  caregivers: ReadonlySet<MemberId> = halfTimeCaregivers(state),
): number {
  return incomeTax(incomeOf(state, member, caregivers))
}

/**
 * Padrão de vida de um adulto por mês: mercado e contas, ou uma parte da
 * renda, o que for maior. Quem ganha mais gasta mais, então a sobra não cresce
 * na mesma proporção que o salário.
 */
export function lifestyleCost(member: Member, day: number): number {
  const { adult, lifestyleShare } = BALANCE.living
  return Math.max(adult, lifestyleShare * memberIncome(member, day))
}

/**
 * Custo de vida por mês, sem a moradia nem o imposto. Criança: alimentação,
 * roupas, saúde e lazer, mais caros a cada ano. Adulto: o padrão de vida, o
 * plano de saúde para quem ganha a partir de `planFromSalary` (mais caro para
 * idosos; os outros usam o SUS) e o transporte, de carro para quem ganha a
 * partir de `carFromSalary` e de ônibus para os outros.
 */
export function livingCost(member: Member, day: number): number {
  const age = ageOf(member, day)
  if (age < BALANCE.adultAge) {
    return BALANCE.children.expenseBase + BALANCE.children.expensePerYear * age
  }
  const { transport } = BALANCE.living
  return (
    lifestyleCost(member, day) +
    healthPlanCost(member, day) +
    (hasCar(member, day) ? transport.car : transport.bus)
  )
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
 * Mensalidades da pessoa: a escola particular, o professor particular, o
 * cursinho de quem estuda para concurso e o curso de promoção, que fica
 * trancado, sem mensalidade, enquanto a pessoa está demitida.
 */
export function feesOf(member: Member, day: number): number {
  return (
    schoolFee(member.education.school) +
    (member.education.tutorSince !== null ? BALANCE.school.tutor.fee : 0) +
    (member.concurso ? BALANCE.concurso.fee : 0) +
    (member.course && !isUnemployed(member, day) ? member.course.fee : 0)
  )
}

/**
 * Despesa por mês da pessoa, sem o imposto: o custo de vida e as mensalidades.
 * A moradia é da família inteira (`housingCost`).
 */
export function memberExpense(member: Member, day: number): number {
  if (!isAlive(member)) return 0
  return livingCost(member, day) + feesOf(member, day)
}

export type Rates = {
  /** Renda por mês do jogo, em reais: salários, pensões e aluguel, antes do imposto. */
  income: number
  /** A parte da renda que vem do aluguel dos imóveis, já sem a manutenção. */
  rent: number
  /** Despesa por mês do jogo, em reais, com o imposto, a moradia e as parcelas. */
  expense: number
  /** A parte da despesa que é imposto de renda e INSS. */
  tax: number
  /** A parte da despesa que são as parcelas dos financiamentos. */
  installments: number
  /** Renda menos despesa, por mês. */
  net: number
}

/**
 * Fecha o mês: na virada para o dia 1º, entram os salários, as pensões e os
 * aluguéis e saem as despesas, pelas taxas da família nesse momento, com o
 * bônus das missões na renda se estiver valendo, e os bancos cobram as
 * parcelas. O saldo pode ficar negativo: a virada do dia confere a dívida.
 * Altera o rascunho e devolve os acontecimentos das últimas parcelas.
 */
export function settleMonth(
  draft: GameState,
  members: readonly Member[] = Object.values(draft.members),
): GameEvent[] {
  const { income, expense, rent, installments } = familyRates(draft, members)
  draft.money += income - (expense - installments)
  draft.stats.totalEarned += income
  draft.stats.totalSpent += expense - installments
  draft.stats.rentEarned += rent
  return payLoans(draft)
}

/**
 * Renda, despesa e saldo da família por mês. O aluguel dos imóveis entra na
 * renda, e a renda inteira ganha o bônus enquanto ele vale. A despesa soma o
 * custo de cada pessoa, o imposto de cada uma, a moradia (o aluguel dos
 * lugares de quem não cabe nos imóveis da família e as contas dos imóveis em
 * que ela mora ou que estão vazios) e as parcelas dos financiamentos.
 * `members` pode trazer só as pessoas vivas, para não passar pelos
 * antepassados.
 */
export function familyRates(
  state: GameState,
  members: readonly Member[] = Object.values(state.members),
): Rates {
  const caregivers = halfTimeCaregivers(state, members)
  const factor = boostFactor(state)
  const day = state.clock.day
  let living = 0
  let income = 0
  let expense = 0
  let tax = 0
  for (const member of members) {
    if (!isAlive(member)) continue
    living += 1
    const earned = incomeOf(state, member, caregivers)
    income += earned
    tax += incomeTax(earned)
    expense += memberExpense(member, day)
  }
  const rent = (rentPerMonth(state, living) - maintenanceCost(state, living)) * factor
  income = income * factor + rent
  const installments = loanInstallments(state)
  expense += tax + housingCost(state, living) + installments
  return { income, rent, expense, tax, installments, net: income - expense }
}
