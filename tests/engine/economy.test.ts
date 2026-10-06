import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import {
  ageOf,
  familyRates,
  hasCar,
  healthPlanCost,
  incomeOf,
  incomeTax,
  lifestyleCost,
  livingCost,
  memberExpense,
  memberIncome,
  salaryPerMonth,
  taxOf,
} from '@/engine'
import { founders, lastMember, makeGame, setMember, withChild } from '../helpers'

describe('economia', () => {
  it('soma o salário de quem trabalha e cobra o custo de vida, o imposto e o aluguel dos dois lugares', () => {
    const state = makeGame(3)
    const [first, second] = founders(state)
    const income = salaryPerMonth(first) + salaryPerMonth(second)
    const tax = incomeTax(salaryPerMonth(first)) + incomeTax(salaryPerMonth(second))
    const expense =
      livingCost(first, 0) + livingCost(second, 0) + tax + 2 * BALANCE.housing.rentPerPlace
    expect(familyRates(state)).toEqual({
      income,
      rent: 0,
      expense,
      tax,
      installments: 0,
      net: income - expense,
    })
    expect(taxOf(state, first)).toBe(incomeTax(incomeOf(state, first)))
  })

  it('o imposto e o INSS vêm por faixas, cada alíquota só sobre a parte da renda que cai nela', () => {
    const { brackets } = BALANCE.tax
    expect(incomeTax(0)).toBe(0)
    expect(incomeTax(brackets[0].upTo)).toBe(0)
    expect(incomeTax(brackets[0].upTo + 1000)).toBeCloseTo(1000 * brackets[1].rate)
    let expected = 0
    let from = 0
    for (const { upTo, rate } of brackets.slice(0, -1)) {
      expected += (upTo - from) * rate
      from = upTo
    }
    expect(incomeTax(from)).toBeCloseTo(expected)
    expect(incomeTax(from + 10_000)).toBeCloseTo(expected + 10_000 * brackets.at(-1)!.rate)
    // Quem ganha mais paga uma parte maior.
    expect(incomeTax(30_000) / 30_000).toBeGreaterThan(incomeTax(6_000) / 6_000)
  })

  it('o custo de vida do adulto soma o padrão de vida, o plano de saúde e o transporte', () => {
    const state = makeGame(3)
    const [first] = founders(state)
    const { adult, lifestyleShare, health, seniorAge, transport } = BALANCE.living
    // Quem ganha pouco anda de ônibus, usa o SUS e gasta o mínimo de mercado e contas.
    const sus = setMember(state, first.id, { career: { id: 'comercio', level: 0, levelSince: 0 } })
    const poor = sus.members[first.id]
    expect(salaryPerMonth(poor)).toBeLessThan(health.planFromSalary)
    expect(salaryPerMonth(poor) * lifestyleShare).toBeLessThan(adult)
    expect(lifestyleCost(poor, 0)).toBe(adult)
    expect(healthPlanCost(poor, 0)).toBe(0)
    expect(livingCost(poor, 0)).toBe(adult + transport.bus)

    // A partir de planFromSalary, paga o plano de saúde, e o padrão de vida acompanha a renda.
    const bus = setMember(state, first.id, { career: { id: 'comercio', level: 1, levelSince: 0 } })
    const rider = bus.members[first.id]
    expect(salaryPerMonth(rider)).toBeGreaterThanOrEqual(health.planFromSalary)
    expect(hasCar(rider, 0)).toBe(false)
    const lifestyle = Math.max(adult, salaryPerMonth(rider) * lifestyleShare)
    expect(lifestyleCost(rider, 0)).toBe(lifestyle)
    expect(livingCost(rider, 0)).toBe(lifestyle + health.adult + transport.bus)

    const car = setMember(state, first.id, { career: { id: 'direito', level: 4, levelSince: 0 } })
    const driver = car.members[first.id]
    expect(salaryPerMonth(driver)).toBeGreaterThanOrEqual(transport.carFromSalary)
    expect(hasCar(driver, 0)).toBe(true)
    const rich = salaryPerMonth(driver) * lifestyleShare
    expect(livingCost(driver, 0)).toBe(rich + health.adult + transport.car)

    // O plano de saúde fica mais caro com a idade; a pensão continua pagando o carro, e o
    // padrão de vida segue a pensão.
    const senior = driver.birthDay + seniorAge * BALANCE.daysPerYear
    const pension = salaryPerMonth(driver) * BALANCE.pensionRatio
    expect(livingCost(driver, senior)).toBe(
      pension * lifestyleShare + health.senior + transport.car,
    )
  })

  it('quanto mais se ganha, menor a parte que sobra', () => {
    const state = makeGame(3)
    const [first] = founders(state)
    const leftover = (id: 'comercio' | 'direito', level: number) => {
      const member = setMember(state, first.id, { career: { id, level, levelSince: 0 } }).members[
        first.id
      ]
      const income = salaryPerMonth(member)
      return (income - livingCost(member, 0) - incomeTax(income)) / income
    }
    expect(leftover('comercio', 0)).toBeGreaterThan(leftover('comercio', 4))
    expect(leftover('comercio', 4)).toBeGreaterThan(leftover('direito', 4))
    expect(leftover('direito', 4)).toBeGreaterThan(0.25)
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
