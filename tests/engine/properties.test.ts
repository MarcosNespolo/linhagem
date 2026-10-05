import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import { PROPERTY_TYPES, type PropertyId } from '@/content/properties'
import {
  advance,
  applyAction,
  deserialize,
  familyRates,
  freePlaces,
  homePlaces,
  homesInUse,
  housingCost,
  isPropertyUnlocked,
  isRenting,
  livingCost,
  ownedCount,
  paybackYears,
  propertiesLeft,
  propertyPrice,
  rentedPlaces,
  rentPerMonth,
  visiblePropertyTypes,
  type GameState,
} from '@/engine'
import {
  expectClose,
  expectOk,
  founders,
  makeGame,
  setMember,
  withChild,
  withHomes,
  withMoney,
  years,
} from '../helpers'

function buy(state: GameState, ...ids: PropertyId[]): GameState {
  let current = state
  for (const propertyId of ids) {
    current = expectOk(applyAction(current, { type: 'buyProperty', propertyId })).state
  }
  return current
}

describe('imóveis', () => {
  it('são nove tipos, cada um de 3 a 6 vezes o anterior, que se pagam de 10 a 70 anos', () => {
    const state = makeGame()
    expect(PROPERTY_TYPES).toHaveLength(9)
    const paybacks = PROPERTY_TYPES.map((type) => paybackYears(state, type.id))
    expect(Math.round(paybacks[0])).toBe(10)
    expect(Math.round(paybacks.at(-1)!)).toBe(70)
    for (let i = 1; i < PROPERTY_TYPES.length; i++) {
      const ratio = PROPERTY_TYPES[i].price / PROPERTY_TYPES[i - 1].price
      expect(ratio).toBeGreaterThanOrEqual(3)
      expect(ratio).toBeLessThanOrEqual(6)
      expect(paybacks[i]).toBeGreaterThan(paybacks[i - 1])
    }
  })

  it('os de moradia custam sempre o mesmo, e o bairro tem poucos de cada', () => {
    const supply = BALANCE.properties.homeSupply
    let state = withMoney(makeGame(), 1e9)
    for (let i = 0; i < supply; i++) {
      expect(propertyPrice(state, 'kitnet')).toBe(PROPERTY_TYPES[0].price)
      expect(propertiesLeft(state, 'kitnet')).toBe(supply - i)
      state = buy(state, 'kitnet')
    }
    expect(ownedCount(state, 'kitnet')).toBe(supply)
    expect(propertiesLeft(state, 'kitnet')).toBe(0)
    expect(state.money).toBe(1e9 - supply * PROPERTY_TYPES[0].price)
    expect(applyAction(state, { type: 'buyProperty', propertyId: 'kitnet' })).toEqual({
      ok: false,
      error: 'soldOut',
    })
  })

  it('cada comercial do mesmo tipo custa 20% mais que o anterior, sem limite', () => {
    let state = withHomes(withMoney(makeGame(), 1e12), { kitnet: 1, apartamento: 1, casa: 1 })
    const prices: number[] = []
    for (let i = 0; i < 12; i++) {
      prices.push(propertyPrice(state, 'sala'))
      state = buy(state, 'sala')
    }
    const first = PROPERTY_TYPES[3].price
    expect(prices[0]).toBe(first)
    expect(prices[1]).toBe(Math.round(first * BALANCE.properties.priceGrowth))
    expect(prices[11]).toBe(Math.round(first * BALANCE.properties.priceGrowth ** 11))
    expect(propertiesLeft(state, 'sala')).toBe(Infinity)
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

  it('o aluguel dos imóveis em que a família não mora entra na renda todo mês', () => {
    const start = withMoney(makeGame(), 1e7)
    const state = buy(start, 'kitnet', 'kitnet', 'apartamento')
    // O casal mora num dos kitnets; o outro kitnet e o apartamento rendem aluguel.
    expect(homesInUse(state)).toEqual({ kitnet: 1 })
    const rent = PROPERTY_TYPES[0].rentPerMonth + PROPERTY_TYPES[1].rentPerMonth
    expect(rentPerMonth(state)).toBe(rent)
    expect(familyRates(state).rent).toBe(rent)
    expect(familyRates(state).income).toBe(familyRates(start).income + rent)

    // Um ano depois, a família tem 12 aluguéis a mais e 12 meses de moradia a menos.
    const housing = housingCost(start) - housingCost(state)
    const withRent = advance(state, years(1)).state
    const withoutRent = advance({ ...state, properties: {} }, years(1)).state
    expectClose(withRent.money - withoutRent.money, (rent + housing) * 12)
    expectClose(withRent.stats.rentEarned - state.stats.rentEarned, rent * 12)
  })

  it('quem não cabe nos imóveis da família mora de aluguel, pago por lugar', () => {
    const { rentPerPlace, rentedPlaces: maxRented } = BALANCE.housing
    const kitnet = PROPERTY_TYPES[0]
    const couple = makeGame(2)
    expect(homePlaces(couple)).toBe(maxRented)
    expect(freePlaces(couple)).toBe(maxRented - 2)
    expect(isRenting(couple)).toBe(true)
    expect(rentedPlaces(couple)).toBe(2)
    expect(housingCost(couple)).toBe(2 * rentPerPlace)
    const [first, second] = founders(couple)
    const living = livingCost(first, 0) + livingCost(second, 0)
    expect(familyRates(couple).expense).toBe(living + 2 * rentPerPlace)

    // Com um kitnet, o casal sai do aluguel e paga as contas do kitnet, que não rende.
    const owner = withHomes(couple, { kitnet: 1 })
    expect(isRenting(owner)).toBe(false)
    expect(homePlaces(owner)).toBe(maxRented + kitnet.home.places)
    expect(housingCost(owner)).toBe(kitnet.home.billsPerMonth)
    expect(rentPerMonth(owner)).toBe(0)

    // Um filho não cabe no kitnet: ele mora num lugar alugado.
    const parents = withChild(owner)
    expect(isRenting(parents)).toBe(true)
    expect(rentedPlaces(parents)).toBe(1)
    expect(housingCost(parents)).toBe(rentPerPlace + kitnet.home.billsPerMonth)
    expect(freePlaces(parents)).toBe(maxRented + kitnet.home.places - 3)

    // Com uma casa, todos moram nela; os kitnets ficam alugados.
    const house = withHomes(parents, { apartamento: 1, casa: 1 })
    expect(homesInUse(house)).toEqual({ kitnet: 1, apartamento: 1 })
    expect(isRenting(house)).toBe(false)
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
