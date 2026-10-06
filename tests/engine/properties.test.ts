import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BALANCE } from '@/content/balance'
import { PROPERTY_TYPES, type PropertyId } from '@/content/properties'
import {
  advance,
  affordableProperties,
  applyAction,
  checkBuyProperty,
  deserialize,
  extraHousingCost,
  familyRates,
  financingTerms,
  homesInUse,
  housingCost,
  incomeOf,
  incomeTax,
  initialMarket,
  isPropertyUnlocked,
  isRenting,
  livingCost,
  loanInstallment,
  loanInstallments,
  lotsForSale,
  maintenanceCost,
  netRent,
  nextListingDay,
  ownedCount,
  ownedLots,
  paybackYears,
  placeRent,
  propertiesLeft,
  propertyPrice,
  purchaseCost,
  rentedPlaces,
  rentFor,
  rentPerMonth,
  totalDebt,
  totalVacant,
  transferTaxOf,
  vacantUnits,
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
  it('são nove tipos, cada um de 3 a 6 vezes o anterior, que se pagam de 19 a 78 anos', () => {
    expect(PROPERTY_TYPES).toHaveLength(9)
    const start = makeGame()
    const paybacks = PROPERTY_TYPES.map((type) => paybackYears(start, type.id))
    expect(Math.round(paybacks[0])).toBe(19)
    expect(Math.round(paybacks.at(-1)!)).toBe(78)
    for (let i = 1; i < PROPERTY_TYPES.length; i++) {
      const ratio = PROPERTY_TYPES[i].price / PROPERTY_TYPES[i - 1].price
      expect(ratio).toBeGreaterThanOrEqual(3)
      expect(ratio).toBeLessThanOrEqual(6)
      expect(paybacks[i]).toBeGreaterThan(paybacks[i - 1])
    }
    // Os de moradia rendem perto de 6% do preço por ano, antes da manutenção.
    for (const type of PROPERTY_TYPES.filter((candidate) => candidate.home)) {
      expect((type.rentPerMonth * 12) / type.price).toBeCloseTo(0.06, 2)
      expect(netRent(type.id)).toBe(type.rentPerMonth * (1 - BALANCE.properties.maintenanceShare))
    }
  })

  it('cada moradia comprada deixa a próxima do tipo mais cara, toda compra paga o ITBI, e o bairro tem poucos de cada', () => {
    const { priceGrowth, transferTax } = BALANCE.properties
    const supply = PROPERTY_TYPES[0].lots
    const base = PROPERTY_TYPES[0].price
    let state = withMoney(makeGame(), 1e9)
    let spent = 0
    for (let i = 0; i < supply; i++) {
      const price = Math.round(base * (1 + priceGrowth) ** i)
      expect(propertyPrice(state, 'kitnet')).toBe(price)
      expect(transferTaxOf(price)).toBe(Math.round(price * transferTax))
      expect(purchaseCost(state, 'kitnet')).toBe(price + transferTaxOf(price))
      expect(propertiesLeft(state, 'kitnet')).toBe(supply - i)
      spent += purchaseCost(state, 'kitnet')
      state = buy(state, 'kitnet')
    }
    expect(ownedCount(state, 'kitnet')).toBe(supply)
    expect(propertiesLeft(state, 'kitnet')).toBe(0)
    expect(state.money).toBe(1e9 - spent)
    expect(propertyPrice(state, 'kitnet')).toBeGreaterThan(2 * base)
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
      expect(propertyPrice(state, 'sala')).toBe(PROPERTY_TYPES[3].price)
      state = buy(state, 'sala')
    }
    expect(ownedCount(state, 'sala')).toBe(max)
    expect(state.money).toBe(start.money - max * purchaseCost(start, 'sala'))
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

  it('sem dinheiro para o preço e o ITBI, a compra é recusada; comprada, entra no histórico', () => {
    const cost = purchaseCost(makeGame(), 'kitnet')
    expect(cost).toBe(PROPERTY_TYPES[0].price + transferTaxOf(PROPERTY_TYPES[0].price))
    const short = applyAction(withMoney(makeGame(), cost - 1), {
      type: 'buyProperty',
      propertyId: 'kitnet',
    })
    expect(short).toEqual({ ok: false, error: 'notEnoughMoney' })

    const bought = expectOk(
      applyAction(withMoney(makeGame(), cost), { type: 'buyProperty', propertyId: 'kitnet' }),
    )
    const event = { type: 'propertyBought', day: 0, propertyId: 'kitnet', count: 1 }
    expect(bought.events).toEqual([event])
    expect(bought.state.log.at(-1)).toEqual(event)
    expect(bought.state.money).toBe(0)
    expect(bought.state.stats.totalSpent).toBe(cost)
    expect(bought.state.loans).toEqual([])
  })

  it('o aluguel dos imóveis em que a família não mora entra na renda todo mês, menos a manutenção', () => {
    const { maintenanceShare } = BALANCE.properties
    const gross = PROPERTY_TYPES[0].rentPerMonth + PROPERTY_TYPES[1].rentPerMonth
    const rent = gross * (1 - maintenanceShare)
    // Um ano em que nenhum inquilino sai: a primeira seed em que entram os 12 aluguéis inteiros.
    const quiet = [1, 2, 3, 4, 5, 6, 7, 8]
      .map((seed) => {
        const start = withMoney(makeGame(seed), 1e7)
        const state = buy(start, 'kitnet', 'kitnet', 'apartamento')
        return { start, state, later: advance(state, years(1)).state }
      })
      .find(({ state, later }) => later.stats.rentEarned - state.stats.rentEarned === rent * 12)
    if (!quiet) throw new Error('Nenhuma seed passou um ano sem inquilino saindo')
    const { start, state, later } = quiet
    // O casal mora num dos kitnets; o outro kitnet e o apartamento rendem aluguel.
    expect(homesInUse(state)).toEqual({ kitnet: 1 })
    expect(rentPerMonth(state)).toBe(gross)
    expect(maintenanceCost(state)).toBeCloseTo(gross * maintenanceShare)
    expect(familyRates(state).rent).toBeCloseTo(rent)
    expect(familyRates(state).income).toBeCloseTo(familyRates(start).income + rent)

    // Um ano depois, a família tem 12 aluguéis a mais e 12 meses de moradia a menos.
    const housing = housingCost(start) - housingCost(state)
    const withoutRent = advance({ ...state, properties: {} }, years(1)).state
    expectClose(later.money - withoutRent.money, (rent + housing) * 12)
  })

  it('de vez em quando o inquilino sai, e o imóvel fica vazio por alguns meses, pagando as contas', () => {
    const { min, max } = BALANCE.properties.vacancy.months
    const kitnet = PROPERTY_TYPES[0]
    const start = withHomes(withMoney(makeGame(), 1e9), { kitnet: kitnet.lots })
    // O casal mora num kitnet; os outros rendem.
    const rented = kitnet.lots - 1
    expect(homesInUse(start)).toEqual({ kitnet: 1 })
    expect(rentPerMonth(start)).toBe(rented * kitnet.rentPerMonth)

    // Anda ano a ano até algum kitnet ficar vazio.
    let state = start
    for (let year = 0; year < 20 && totalVacant(state) === 0; year++) {
      state = advance(state, years(1)).state
    }
    const vacant = vacantUnits(state, 'kitnet', 2)
    expect(vacant).toBeGreaterThan(0)
    expect(totalVacant(state)).toBe(vacant)
    expect(rentPerMonth(state)).toBe((rented - vacant) * kitnet.rentPerMonth)
    expect(housingCost(state)).toBe((1 + vacant) * kitnet.billsPerMonth)
    const until = state.vacancies.kitnet ?? []
    expect(until).toHaveLength(vacant)
    const monthDays = BALANCE.daysPerYear / 12
    for (const day of until) {
      expect(day - state.clock.day).toBeGreaterThan(0)
      expect(day - state.clock.day).toBeLessThanOrEqual(Math.round(max * monthDays))
      expect(day - state.clock.day).toBeGreaterThanOrEqual(Math.round(min * monthDays) - 365)
    }

    // No dia marcado, o inquilino novo chega e o imóvel volta a render.
    const soonest = Math.min(...until)
    const back = advance(state, days(soonest - state.clock.day)).state
    expect(back.vacancies.kitnet ?? []).not.toContain(soonest)

    // Se a família passa a morar num imóvel que estava vazio, ele deixa de contar como vazio.
    expect(vacantUnits({ ...state, properties: { kitnet: vacant } }, 'kitnet', 2 * vacant)).toBe(0)
    expect(totalVacant({ ...state, properties: { kitnet: vacant } }, 2 * vacant)).toBe(0)

    // O mesmo de uma vez ou aos poucos.
    const atOnce = advance(start, years(5)).state
    let stepwise = start
    for (let i = 0; i < 5; i++) stepwise = advance(stepwise, years(1)).state
    expect(atOnce.vacancies).toEqual(stepwise.vacancies)
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
    const tax = incomeTax(incomeOf(couple, first)) + incomeTax(incomeOf(couple, second))
    expect(familyRates(couple).expense).toBeCloseTo(living + tax + 2 * rentPerPlace)

    // Com um kitnet, o casal sai do aluguel e paga as contas do kitnet, que não rende.
    const owner = withHomes(couple, { kitnet: 1 })
    expect(isRenting(owner)).toBe(false)
    expect(housingCost(owner)).toBe(kitnet.billsPerMonth)
    expect(rentPerMonth(owner)).toBe(0)

    // Um filho não cabe no kitnet: ele mora num lugar alugado.
    const parents = withChild(owner)
    expect(isRenting(parents)).toBe(true)
    expect(rentedPlaces(parents)).toBe(1)
    expect(housingCost(parents)).toBe(rentPerPlace + kitnet.billsPerMonth)

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
    expect(familyRates(state).income).toBeCloseTo(netRent('kitnet'))
  })

  it('o save da versão 6 começa sem imóveis, sem vazios e sem financiamento', () => {
    const json = readFileSync(new URL('../fixtures/save-v6.json', import.meta.url), 'utf8')
    const state = deserialize(json)
    expect(state.properties).toEqual({})
    expect(rentPerMonth(state)).toBe(0)
    expect(state.vacancies).toEqual({})
    expect(state.loans).toEqual([])
    expect(state.stats.interestPaid).toBe(0)
  })
})

describe('financiamento', () => {
  const { downShare, monthlyRate, years: term, maxInstallmentShare } = BALANCE.properties.financing
  const months = term * 12

  it('a parcela segue a tabela Price: fixa, com os juros sobre o saldo', () => {
    const principal = 64_000
    const installment = loanInstallment(principal)
    expect(installment).toBeCloseTo((principal * monthlyRate) / (1 - (1 + monthlyRate) ** -months))
    // Pagando a parcela todo mês, o saldo zera na última.
    let balance = principal
    for (let i = 0; i < months; i++) balance = balance * (1 + monthlyRate) - installment
    expect(balance).toBeCloseTo(0, 3)
  })

  it('financiar paga a entrada e o ITBI, deve o resto ao banco e cobra a parcela todo mês', () => {
    const start = withMoney(makeGame(), 100_000)
    const income = familyRates(start).income
    const terms = financingTerms(start, 'kitnet')
    const price = PROPERTY_TYPES[0].price
    expect(terms).toEqual({
      price,
      tax: transferTaxOf(price),
      down: price * downShare,
      principal: price * (1 - downShare),
      installment: loanInstallment(price * (1 - downShare)),
      months,
    })
    expect(checkBuyProperty(start, 'kitnet', undefined, true, income)).toMatchObject({
      ok: true,
      cost: terms.down + terms.tax,
      financing: terms,
    })

    const bought = expectOk(
      applyAction(start, { type: 'buyProperty', propertyId: 'kitnet', financed: true }),
    )
    const day = bought.state.clock.day
    expect(bought.events).toEqual([
      { type: 'propertyBought', day, propertyId: 'kitnet', count: 1, financed: true },
    ])
    expect(bought.state.money).toBe(100_000 - terms.down - terms.tax)
    expect(bought.state.loans).toEqual([
      {
        id: 1,
        propertyId: 'kitnet',
        balance: terms.principal,
        installment: terms.installment,
        monthsLeft: months,
        since: day,
      },
    ])
    expect(ownedCount(bought.state, 'kitnet')).toBe(1)
    expect(loanInstallments(bought.state)).toBe(terms.installment)
    expect(totalDebt(bought.state)).toBe(terms.principal)
    expect(familyRates(bought.state).installments).toBe(terms.installment)
    expect(familyRates(bought.state).expense).toBeCloseTo(
      familyRates({ ...bought.state, loans: [] }).expense + terms.installment,
    )

    // Um mês depois: a parcela saiu do caixa, os juros do saldo foram pagos e o resto abateu o saldo.
    const later = advance(bought.state, years(1)).state
    const [loan] = later.loans
    expect(loan.monthsLeft).toBe(months - 12)
    let balance = terms.principal
    for (let i = 0; i < 12; i++) balance = balance * (1 + monthlyRate) - terms.installment
    expect(loan.balance).toBeCloseTo(balance)
    expect(later.stats.interestPaid).toBeGreaterThan(0)
    expect(later.stats.interestPaid).toBeLessThan(12 * terms.installment)
    const withoutLoan = advance({ ...bought.state, loans: [] }, years(1)).state
    expectClose(withoutLoan.money - later.money, 12 * terms.installment)
    expectClose(withoutLoan.stats.totalSpent, later.stats.totalSpent - 12 * terms.installment)
  })

  it('sem a entrada, ou com as parcelas acima do teto da renda, o banco não financia', () => {
    const terms = financingTerms(makeGame(), 'kitnet')
    const poor = withMoney(makeGame(), terms.down + terms.tax - 1)
    expect(
      applyAction(poor, { type: 'buyProperty', propertyId: 'kitnet', financed: true }),
    ).toEqual({ ok: false, error: 'notEnoughMoney' })

    const rich = withMoney(makeGame(), 1e6)
    const income = familyRates(rich).income
    // Quantos kitnets as parcelas cabem na renda: a partir daí, recusa.
    let state = rich
    let bought = 0
    for (;;) {
      const result = applyAction(state, {
        type: 'buyProperty',
        propertyId: 'kitnet',
        financed: true,
      })
      if (!result.ok) {
        expect(result.error).toBe('loanTooBig')
        break
      }
      state = result.state
      bought += 1
    }
    expect(bought).toBeGreaterThan(0)
    expect(loanInstallments(state)).toBeLessThanOrEqual(maxInstallmentShare * income)
    // À vista continua valendo, e o teto conta a renda com os aluguéis.
    expect(applyAction(state, { type: 'buyProperty', propertyId: 'kitnet' }).ok).toBe(true)
  })

  it('quitar paga o saldo de uma vez; a última parcela encerra o financiamento com aviso', () => {
    const start = withMoney(makeGame(), 1e6)
    const bought = expectOk(
      applyAction(start, { type: 'buyProperty', propertyId: 'kitnet', financed: true }),
    ).state
    const [loan] = bought.loans
    expect(applyAction(bought, { type: 'payOffLoan', loanId: 99 })).toEqual({
      ok: false,
      error: 'loanNotFound',
    })
    expect(
      applyAction(withMoney(bought, loan.balance - 1), { type: 'payOffLoan', loanId: loan.id }),
    ).toEqual({ ok: false, error: 'notEnoughMoney' })

    const paid = expectOk(applyAction(bought, { type: 'payOffLoan', loanId: loan.id }))
    expect(paid.events).toEqual([{ type: 'loanPaid', day: 0, propertyId: 'kitnet' }])
    expect(paid.state.loans).toEqual([])
    expect(paid.state.money).toBe(bought.money - loan.balance)
    expect(ownedCount(paid.state, 'kitnet')).toBe(1)

    // Deixando correr, a última parcela, no mês seguinte aos 20 anos, zera o saldo e avisa.
    const { state: done, events } = advance(bought, years(term) + days(31))
    expect(done.loans).toEqual([])
    expect(events).toContainEqual({
      type: 'loanPaid',
      day: expect.any(Number),
      propertyId: 'kitnet',
    })
    expect(done.log.some((event) => event.type === 'loanPaid')).toBe(true)
  })
})
