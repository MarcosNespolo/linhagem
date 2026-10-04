import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import { ageOf, familyRates, memberExpense, memberIncome, salaryPerSecond } from '@/engine'
import { founders, lastMember, makeGame, setMember, withChild } from '../helpers'

describe('economia', () => {
  it('soma o salário de quem trabalha', () => {
    const state = makeGame(3)
    const [first, second] = founders(state)
    const income = salaryPerSecond(first) + salaryPerSecond(second)
    expect(familyRates(state)).toEqual({ income, expense: 0, net: income })
  })

  it('cobra das crianças uma despesa que cresce com a idade', () => {
    const state = withChild(makeGame(3))
    const child = lastMember(state)
    const { expenseBase, expensePerYear } = BALANCE.children
    const tenYearsLater = child.birthDay + 10 * BALANCE.daysPerYear
    expect(memberExpense(child, child.birthDay)).toBe(expenseBase)
    expect(memberExpense(child, tenYearsLater)).toBe(expenseBase + 10 * expensePerYear)
    expect(memberIncome(child, tenYearsLater)).toBe(0)
  })

  it('paga pensão a quem passou da idade de aposentadoria', () => {
    const [first] = founders(makeGame(3))
    const retirementDay = first.birthDay + BALANCE.retirementAge * BALANCE.daysPerYear
    expect(memberIncome(first, retirementDay - 1)).toBe(salaryPerSecond(first))
    expect(memberIncome(first, retirementDay)).toBe(salaryPerSecond(first) * BALANCE.pensionRatio)
  })

  it('não conta quem morreu, e a idade dele para de contar', () => {
    const state = makeGame(3)
    const [first] = founders(state)
    const after = setMember(state, first.id, { deathDay: 10 })
    const dead = after.members[first.id]
    expect(memberIncome(dead, 10)).toBe(0)
    expect(ageOf(dead, 10_000)).toBe(ageOf(dead, 10))
  })
})
