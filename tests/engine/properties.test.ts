import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import { PROPERTY_TYPES, type PropertyId } from '@/content/properties'
import {
  advance,
  affordableProperties,
  applyAction,
  deserialize,
  extraHousingCost,
  familyRates,
  homesInUse,
  housingCost,
  initialMarket,
  isPropertyUnlocked,
  isRenting,
  livingCost,
  lotsForSale,
  nextListingDay,
  ownedCount,
  ownedLots,
  paybackYears,
  placeRent,
  propertiesLeft,
  propertyPrice,
  rentedPlaces,
  rentFor,
  rentPerMonth,
  visiblePropertyTypes,
  type GameState,
} from '@/engine'
import {
  days,
  expectClose,
  expectOk,
  founders,
  makeGame,
  play,
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
    expect(PROPERTY_TYPES).toHaveLength(9)
    const paybacks = PROPERTY_TYPES.map((type) => paybackYears(type.id))
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
    const supply = PROPERTY_TYPES[0].lots
    let state = withMoney(makeGame(), 1e9)
    for (let i = 0; i < supply; i++) {
      expect(propertyPrice('kitnet')).toBe(PROPERTY_TYPES[0].price)
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

  it('os comerciais têm preço fixo, e poucos ficam à venda de cada vez', () => {
    const max = BALANCE.properties.maxForSale
    const start = withHomes(withMoney(makeGame(), 1e12), { kitnet: 1, apartamento: 1, casa: 1 })
    for (const type of PROPERTY_TYPES) {
      expect(propertiesLeft(start, type.id)).toBe(
        type.market ? max : type.lots - (start.properties[type.id] ?? 0),
      )
    }
    expect(start.market).toEqual(initialMarket())

    let state = start
    for (let i = 0; i < max; i++) {
      expect(propertyPrice('sala')).toBe(PROPERTY_TYPES[3].price)
      state = buy(state, 'sala')
    }
    expect(ownedCount(state, 'sala')).toBe(max)
    expect(state.money).toBe(start.money - max * PROPERTY_TYPES[3].price)
    expect(propertiesLeft(state, 'sala')).toBe(0)
    expect(affordableProperties(state)).not.toContain('sala')
    expect(applyAction(state, { type: 'buyProperty', propertyId: 'sala' })).toEqual({
      ok: false,
      error: 'soldOut',
    })
  })

  it('cada imóvel é um lote: a família compra o que escolher, ou o primeiro à venda', () => {
    let state = withMoney(makeGame(), 1e9)
    expect(lotsForSale(state, 'kitnet')).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    state = expectOk(
      applyAction(state, { type: 'buyProperty', propertyId: 'kitnet', lot: 6 }),
    ).state
    expect(ownedLots(state, 'kitnet')).toEqual([6])
    expect(ownedCount(state, 'kitnet')).toBe(1)
    expect(lotsForSale(state, 'kitnet')).not.toContain(6)
    for (const lot of [6, 10, -1]) {
      expect(applyAction(state, { type: 'buyProperty', propertyId: 'kitnet', lot })).toEqual({
        ok: false,
        error: 'lotNotForSale',
      })
    }
    state = buy(state, 'kitnet')
    expect(ownedLots(state, 'kitnet')).toEqual([0, 6])
  })

  it('nos comerciais, os anúncios ficam nos primeiros lotes livres, e com a rua cheia a compra fica fora dela', () => {
    const start = withHomes(withMoney(makeGame(), 1e12), { kitnet: 1, apartamento: 1, casa: 1 })
    expect(lotsForSale(start, 'sala')).toEqual([0, 1])
    const state = expectOk(
      applyAction(start, { type: 'buyProperty', propertyId: 'sala', lot: 1 }),
    ).state
    expect(ownedLots(state, 'sala')).toEqual([1])
    expect(lotsForSale(state, 'sala')).toEqual([0])
    expect(applyAction(state, { type: 'buyProperty', propertyId: 'sala', lot: 3 })).toEqual({
      ok: false,
      error: 'lotNotForSale',
    })

    const full: GameState = {
      ...state,
      properties: { ...state.properties, sala: 5 },
      lots: { ...state.lots, sala: [0, 1, 2, 3, 4] },
      market: { ...state.market, sala: 1 },
    }
    expect(lotsForSale(full, 'sala')).toEqual([])
    const more = buy(full, 'sala')
    expect(ownedCount(more, 'sala')).toBe(6)
    expect(ownedLots(more, 'sala')).toEqual([0, 1, 2, 3, 4])
    expect(propertiesLeft(more, 'sala')).toBe(0)
  })

  it('um comercial novo fica à venda a cada poucos anos, até o máximo', () => {
    const max = BALANCE.properties.maxForSale
    const start = withHomes(withMoney(makeGame(), 1e12), { kitnet: 1, apartamento: 1, casa: 1 })
    const soldOut = buy(start, ...Array.from({ length: max }, () => 'sala' as const))
    const every = PROPERTY_TYPES[3].market.everyYears * BALANCE.daysPerYear
    const next = nextListingDay(soldOut, 'sala')!
    expect(next % every).toBe(0)
    expect(next).toBeGreaterThan(soldOut.clock.day)
    expect(nextListingDay(soldOut, 'kitnet')).toBeNull()

    const dayBefore = play(soldOut, days(next - soldOut.clock.day - 1))
    expect(propertiesLeft(dayBefore, 'sala')).toBe(0)
    const listed = play(dayBefore, days(1))
    expect(propertiesLeft(listed, 'sala')).toBe(1)
    expect(nextListingDay(listed, 'sala')).toBe(next + every)
    // Com o anúncio cheio, o imóvel novo não aparece.
    const full = play(listed, days(2 * every))
    expect(propertiesLeft(full, 'sala')).toBe(max)
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

  it('quem não cabe nos imóveis da família mora de aluguel, pago por lugar e sem limite', () => {
    const { rentPerPlace } = BALANCE.housing
    const kitnet = PROPERTY_TYPES[0]
    const couple = makeGame(2)
    expect(isRenting(couple)).toBe(true)
    expect(rentedPlaces(couple)).toBe(2)
    expect(housingCost(couple)).toBe(2 * rentPerPlace)
    const [first, second] = founders(couple)
    const living = livingCost(first, 0) + livingCost(second, 0)
    expect(familyRates(couple).expense).toBe(living + 2 * rentPerPlace)

    // Com um kitnet, o casal sai do aluguel e paga as contas do kitnet, que não rende.
    const owner = withHomes(couple, { kitnet: 1 })
    expect(isRenting(owner)).toBe(false)
    expect(housingCost(owner)).toBe(kitnet.home.billsPerMonth)
    expect(rentPerMonth(owner)).toBe(0)

    // Um filho não cabe no kitnet: ele mora num lugar alugado.
    const parents = withChild(owner)
    expect(isRenting(parents)).toBe(true)
    expect(rentedPlaces(parents)).toBe(1)
    expect(housingCost(parents)).toBe(rentPerPlace + kitnet.home.billsPerMonth)

    // Com uma casa, todos moram nela; os kitnets ficam alugados.
    const house = withHomes(parents, { apartamento: 1, casa: 1 })
    expect(homesInUse(house)).toEqual({ kitnet: 1, apartamento: 1 })
    expect(isRenting(house)).toBe(false)
  })

  it('o aluguel de cada lugar sobe depois dos primeiros, sem limite de lugares', () => {
    const { rentPerPlace, basePlaces, rentGrowth } = BALANCE.housing
    expect(placeRent(1)).toBe(rentPerPlace)
    expect(placeRent(basePlaces)).toBe(rentPerPlace)
    expectClose(placeRent(basePlaces + 1), rentPerPlace * (1 + rentGrowth))
    expectClose(placeRent(basePlaces + 2), placeRent(basePlaces + 1) * (1 + rentGrowth))
    // O aluguel de vários lugares é a soma do preço de cada um.
    for (const places of [0, 1, basePlaces, basePlaces + 1, basePlaces + 10]) {
      let sum = 0
      for (let place = 1; place <= places; place++) sum += placeRent(place)
      expectClose(rentFor(places), sum)
    }

    // Sem imóveis, todo mundo mora de aluguel, e quem chega paga o próximo lugar.
    const couple = makeGame(2)
    const living = basePlaces + 4
    expectClose(housingCost(couple, living), rentFor(living))
    expectClose(extraHousingCost(couple, 1, living), placeRent(living + 1))
    expectClose(extraHousingCost(couple, 2, living), placeRent(living + 1) + placeRent(living + 2))

    // Com lugar sobrando em casa, quem chega não paga aluguel; com a casa cheia, paga o primeiro lugar.
    expect(extraHousingCost(withHomes(couple, { casa: 1 }))).toBe(0)
    expect(extraHousingCost(withHomes(couple, { kitnet: 1 }))).toBe(rentPerPlace)
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
