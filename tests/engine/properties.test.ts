import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import { PROPERTY_TYPES, type PropertyId } from '@/content/properties'
import {
  advance,
  applyAction,
  deserialize,
  familyRates,
  isPropertyUnlocked,
  ownedCount,
  paybackYears,
  propertyPrice,
  rentPerMonth,
  visiblePropertyTypes,
  type GameState,
} from '@/engine'
import { expectClose, expectOk, founders, makeGame, setMember, withMoney, years } from '../helpers'

function buy(state: GameState, ...ids: PropertyId[]): GameState {
  let current = state
  for (const propertyId of ids) {
    current = expectOk(applyAction(current, { type: 'buyProperty', propertyId })).state
  }
  return current
}

describe('imóveis', () => {
  it('são nove tipos, cada um de 3 a 4,5 vezes o anterior, que se pagam de 10 a 32 anos', () => {
    const state = makeGame()
    expect(PROPERTY_TYPES).toHaveLength(9)
    const paybacks = PROPERTY_TYPES.map((type) => paybackYears(state, type.id))
    expect(paybacks[0]).toBeCloseTo(10)
    expect(Math.round(paybacks.at(-1)!)).toBe(32)
    for (let i = 1; i < PROPERTY_TYPES.length; i++) {
      const ratio = PROPERTY_TYPES[i].price / PROPERTY_TYPES[i - 1].price
      expect(ratio).toBeGreaterThanOrEqual(3)
      expect(ratio).toBeLessThanOrEqual(4.5)
      expect(paybacks[i]).toBeGreaterThan(paybacks[i - 1])
    }
  })

  it('cada imóvel do mesmo tipo custa 15% mais que o anterior', () => {
    let state = withMoney(makeGame(), 1e9)
    const prices: number[] = []
    for (let i = 0; i < 10; i++) {
      prices.push(propertyPrice(state, 'kitnet'))
      state = buy(state, 'kitnet')
    }
    expect(prices[0]).toBe(PROPERTY_TYPES[0].price)
    expect(prices[1]).toBe(Math.round(PROPERTY_TYPES[0].price * BALANCE.properties.priceGrowth))
    // O décimo kitnet custa cerca de R$ 420 mil.
    expect(Math.round(prices[9] / 10_000)).toBe(42)
    expect(ownedCount(state, 'kitnet')).toBe(10)
    expect(state.money).toBe(1e9 - prices.reduce((sum, price) => sum + price, 0))
  })

  it('os tipos liberam em ordem, e o próximo aparece bloqueado', () => {
    let state = withMoney(makeGame(), 1e7)
    expect(visiblePropertyTypes(state).map((type) => type.id)).toEqual(['kitnet', 'apartamento'])
    expect(isPropertyUnlocked(state, 'apartamento')).toBe(false)
    expect(applyAction(state, { type: 'buyProperty', propertyId: 'apartamento' })).toEqual({
      ok: false,
      error: 'propertyLocked',
    })
    state = buy(state, 'kitnet')
    expect(isPropertyUnlocked(state, 'apartamento')).toBe(true)
    expect(visiblePropertyTypes(state).map((type) => type.id)).toEqual([
      'kitnet',
      'apartamento',
      'casa',
    ])
  })

  it('sem dinheiro, a compra é recusada; comprada, entra no histórico', () => {
    const price = PROPERTY_TYPES[0].price
    const short = applyAction(withMoney(makeGame(), price - 1), {
      type: 'buyProperty',
      propertyId: 'kitnet',
    })
    expect(short).toEqual({ ok: false, error: 'notEnoughMoney' })

    const bought = expectOk(
      applyAction(withMoney(makeGame(), price), { type: 'buyProperty', propertyId: 'kitnet' }),
    )
    const event = { type: 'propertyBought', day: 0, propertyId: 'kitnet', count: 1 }
    expect(bought.events).toEqual([event])
    expect(bought.state.log.at(-1)).toEqual(event)
    expect(bought.state.money).toBe(0)
    expect(bought.state.stats.totalSpent).toBe(price)
  })

  it('o aluguel entra na renda da família todo mês', () => {
    const start = withMoney(makeGame(), 1e7)
    const state = buy(start, 'kitnet', 'kitnet', 'apartamento')
    const rent = 2 * PROPERTY_TYPES[0].rentPerMonth + PROPERTY_TYPES[1].rentPerMonth
    expect(rentPerMonth(state)).toBe(rent)
    expect(familyRates(state).rent).toBe(rent)
    expect(familyRates(state).income).toBe(familyRates(start).income + rent)

    // Um ano depois, a família tem 12 aluguéis a mais do que teria sem os imóveis.
    const withRent = advance(state, years(1)).state
    const withoutRent = advance({ ...state, properties: {} }, years(1)).state
    expectClose(withRent.money - withoutRent.money, rent * 12)
    expectClose(withRent.stats.rentEarned - state.stats.rentEarned, rent * 12)
  })

  it('os imóveis ficam com a família quando as pessoas morrem', () => {
    let state = buy(withMoney(makeGame(), 1e7), 'kitnet')
    for (const member of founders(state)) state = setMember(state, member.id, { deathDay: 0 })
    expect(familyRates(state).income).toBe(PROPERTY_TYPES[0].rentPerMonth)
  })

  it('o save da versão 6 começa sem imóveis', () => {
    const json = readFileSync(new URL('../fixtures/save-v6.json', import.meta.url), 'utf8')
    const state = deserialize(json)
    expect(state.properties).toEqual({})
    expect(rentPerMonth(state)).toBe(0)
  })
})
