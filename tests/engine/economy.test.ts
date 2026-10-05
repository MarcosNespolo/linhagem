import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import {
  ageOf,
  familyRates,
  hasCar,
  livingCost,
  memberExpense,
  memberIncome,
  salaryPerMonth,
} from '@/engine'
import { founders, lastMember, makeGame, setMember, withChild } from '../helpers'

describe('economia', () => {
  it('soma o salário de quem trabalha e cobra o custo de vida e o aluguel dos dois lugares', () => {
    const state = makeGame(3)
    const [first, second] = founders(state)
    const income = salaryPerMonth(first) + salaryPerMonth(second)
    const expense = livingCost(first, 0) + livingCost(second, 0) + 2 * BALANCE.housing.rentPerPlace
    expect(familyRates(state)).toEqual({ income, rent: 0, expense, net: income - expense })
  })

  it('o custo de vida do adulto soma mercado, plano de saúde e transporte', () => {
    const state = makeGame(3)
    const [first] = founders(state)
    const { adult, health, seniorAge, transport } = BALANCE.living
    const bus = setMember(state, first.id, { career: { id: 'comercio', level: 0, levelSince: 0 } })
    const rider = bus.members[first.id]
    expect(hasCar(rider, 0)).toBe(false)
    expect(livingCost(rider, 0)).toBe(adult + health.adult + transport.bus)

    const car = setMember(state, first.id, { career: { id: 'direito', level: 4, levelSince: 0 } })
    const driver = car.members[first.id]
    expect(salaryPerMonth(driver)).toBeGreaterThanOrEqual(transport.carFromSalary)
    expect(hasCar(driver, 0)).toBe(true)
    expect(livingCost(driver, 0)).toBe(adult + health.adult + transport.car)

    // O plano de saúde fica mais caro com a idade; a pensão continua pagando o carro.
    const senior = driver.birthDay + seniorAge * BALANCE.daysPerYear
    expect(livingCost(driver, senior)).toBe(adult + health.senior + transport.car)
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
    expect(memberIncome(first, retirementDay - 1)).toBe(salaryPerMonth(first))
    expect(memberIncome(first, retirementDay)).toBe(salaryPerMonth(first) * BALANCE.pensionRatio)
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
