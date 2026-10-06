import { BALANCE } from '../content/balance'
import type { PropertyId } from '../content/properties'
import type { GameEvent, GameState, Loan } from './types'

const { financing } = BALANCE.properties

/** Quantas parcelas tem um financiamento. */
export function loanMonths(): number {
  return financing.years * 12
}

/**
 * Parcela fixa por mês de um financiamento de `principal` reais, pela tabela
 * Price: juros de `monthlyRate` sobre o saldo e o resto da parcela abatendo o
 * saldo, até zerar na última.
 */
export function loanInstallment(principal: number): number {
  const rate: number = financing.monthlyRate
  const months = loanMonths()
  if (rate <= 0) return principal / months
  return (principal * rate) / (1 - (1 + rate) ** -months)
}

/** O que a família paga ao banco por mês: a soma das parcelas em aberto. */
export function loanInstallments(state: Pick<GameState, 'loans'>): number {
  let total = 0
  for (const loan of state.loans) total += loan.installment
  return total
}

/** O que a família ainda deve aos bancos. */
export function totalDebt(state: Pick<GameState, 'loans'>): number {
  let total = 0
  for (const loan of state.loans) total += loan.balance
  return total
}

/**
 * Teto das parcelas: o banco só financia enquanto todas as parcelas, com a
 * nova, cabem em `maxInstallmentShare` da renda por mês da família.
 */
export function installmentCap(income: number): number {
  return financing.maxInstallmentShare * income
}

/** Abre um financiamento no rascunho e devolve a parcela. */
export function openLoan(draft: GameState, propertyId: PropertyId, principal: number): Loan {
  const id = draft.loans.reduce((max, loan) => Math.max(max, loan.id), 0) + 1
  const loan: Loan = {
    id,
    propertyId,
    balance: principal,
    installment: loanInstallment(principal),
    monthsLeft: loanMonths(),
    since: draft.clock.day,
  }
  draft.loans = [...draft.loans, loan]
  return loan
}

/**
 * Fecha o mês dos financiamentos: cobra cada parcela, contando os juros sobre
 * o saldo e abatendo o resto. A última parcela leva o que sobrar do saldo, para
 * o arredondamento não deixar centavos. Altera o rascunho e devolve os
 * acontecimentos das últimas parcelas.
 */
export function payLoans(draft: GameState): GameEvent[] {
  if (draft.loans.length === 0) return []
  const events: GameEvent[] = []
  const day = draft.clock.day
  const remaining: Loan[] = []
  let paid = 0
  let interestPaid = 0
  for (const loan of draft.loans) {
    const interest = loan.balance * financing.monthlyRate
    const last = loan.monthsLeft <= 1
    const installment = last ? loan.balance + interest : loan.installment
    const balance = last ? 0 : Math.max(0, loan.balance + interest - installment)
    paid += installment
    interestPaid += interest
    if (last) {
      events.push({ type: 'loanPaid', day, propertyId: loan.propertyId })
    } else {
      remaining.push({ ...loan, balance, monthsLeft: loan.monthsLeft - 1 })
    }
  }
  draft.loans = remaining
  draft.money -= paid
  draft.stats.totalSpent += paid
  draft.stats.interestPaid += interestPaid
  return events
}

/** Quita um financiamento: paga o saldo de uma vez. Altera o rascunho. */
export function settleLoan(draft: GameState, loan: Loan): GameEvent {
  draft.loans = draft.loans.filter((open) => open.id !== loan.id)
  draft.money -= loan.balance
  draft.stats.totalSpent += loan.balance
  return { type: 'loanPaid', day: draft.clock.day, propertyId: loan.propertyId }
}
