import { BALANCE } from '../content/balance'
import {
  PROPERTY_IDS,
  PROPERTY_TYPES,
  propertyType,
  type PropertyId,
  type PropertyType,
} from '../content/properties'
import { refuse, type Refusal } from './errors'
import { installmentCap, loanInstallment, loanInstallments, openLoan } from './financing'
import { livingCount } from './members'
import { hashUnit } from './rng'
import type { GameEvent, GameState } from './types'

const { priceGrowth, transferTax, maintenanceShare, vacancy, financing } = BALANCE.properties

/** Quantos imóveis do tipo a família tem. */
export function ownedCount(state: GameState, id: PropertyId): number {
  return state.properties[id] ?? 0
}

/**
 * Preço do próximo imóvel do tipo: nos de moradia, cada um que a família já
 * tem deixa o próximo `priceGrowth` mais caro; nos comerciais, sempre o mesmo.
 */
export function propertyPrice(state: GameState, id: PropertyId): number {
  const type = propertyType(id)
  if (!type.home) return type.price
  return Math.round(type.price * (1 + priceGrowth) ** ownedCount(state, id))
}

/** ITBI: o imposto da compra, sobre o preço. */
export function transferTaxOf(price: number): number {
  return Math.round(price * transferTax)
}

/** O que sai do caixa numa compra à vista: o preço mais o ITBI. */
export function purchaseCost(state: GameState, id: PropertyId): number {
  const price = propertyPrice(state, id)
  return price + transferTaxOf(price)
}

/** As contas de um financiamento do próximo imóvel do tipo. */
export type FinancingTerms = {
  price: number
  /** O ITBI, pago na hora. */
  tax: number
  /** A entrada, paga na hora. */
  down: number
  /** O que o banco empresta. */
  principal: number
  /** A parcela fixa por mês. */
  installment: number
  months: number
}

export function financingTerms(state: GameState, id: PropertyId): FinancingTerms {
  const price = propertyPrice(state, id)
  const down = Math.round(price * financing.downShare)
  const principal = price - down
  return {
    price,
    tax: transferTaxOf(price),
    down,
    principal,
    installment: loanInstallment(principal),
    months: financing.years * 12,
  }
}

/**
 * Quantos do tipo estão à venda no bairro: dos de moradia, os que a família
 * ainda não comprou; dos comerciais, os anunciados que ainda ninguém levou.
 */
export function propertiesLeft(state: GameState, id: PropertyId): number {
  const type = propertyType(id)
  if (type.home) return Math.max(0, type.lots - ownedCount(state, id))
  return state.market[id] ?? 0
}

/** Lotes do tipo que são da família, em ordem. */
export function ownedLots(state: GameState, id: PropertyId): readonly number[] {
  return state.lots[id] ?? []
}

/**
 * Lotes do tipo à venda, em ordem. Nos de moradia, todos os que não são da
 * família. Nos comerciais, um lote para cada anúncio, nos primeiros que não
 * são da família; com todos os lotes da família, os anúncios ficam fora da
 * rua.
 */
export function lotsForSale(state: GameState, id: PropertyId): number[] {
  const owned = new Set(ownedLots(state, id))
  const free: number[] = []
  for (let lot = 0; lot < propertyType(id).lots; lot++) {
    if (!owned.has(lot)) free.push(lot)
  }
  return propertyType(id).home ? free : free.slice(0, propertiesLeft(state, id))
}

/** O que um imóvel alugado do tipo rende por mês, já sem a manutenção. */
export function netRent(id: PropertyId): number {
  return propertyType(id).rentPerMonth * (1 - maintenanceShare)
}

/** Anos do jogo que o próximo imóvel do tipo leva para se pagar com o aluguel. */
export function paybackYears(state: GameState, id: PropertyId): number {
  return propertyPrice(state, id) / netRent(id) / 12
}

/** Comerciais à venda no começo da partida: o máximo de cada tipo. */
export function initialMarket(): Partial<Record<PropertyId, number>> {
  const market: Partial<Record<PropertyId, number>> = {}
  for (const type of PROPERTY_TYPES) {
    if (type.market) market[type.id] = BALANCE.properties.maxForSale
  }
  return market
}

/** Dias do jogo entre um anúncio e outro de um tipo comercial. */
function listingDays(everyYears: number): number {
  return everyYears * BALANCE.daysPerYear
}

/**
 * Dia em que o próximo imóvel comercial do tipo fica à venda: os anúncios
 * saem a cada `market.everyYears` anos, contados do dia 0. Null para os de
 * moradia, que não têm anúncios novos.
 */
export function nextListingDay(state: GameState, id: PropertyId): number | null {
  const { market } = propertyType(id)
  if (!market) return null
  const every = listingDays(market.everyYears)
  return (Math.floor(state.clock.day / every) + 1) * every
}

/**
 * Anúncios do dia: cada tipo comercial ganha mais um à venda no seu dia, até
 * `BALANCE.properties.maxForSale`. Sem lugar no anúncio, o imóvel novo não
 * aparece. Altera o rascunho.
 */
export function processMarket(draft: GameState): void {
  const day = draft.clock.day
  if (day <= 0) return
  for (const type of PROPERTY_TYPES) {
    if (!type.market || day % listingDays(type.market.everyYears) !== 0) continue
    const forSale = draft.market[type.id] ?? 0
    if (forSale < BALANCE.properties.maxForSale) {
      draft.market = { ...draft.market, [type.id]: forSale + 1 }
    }
  }
}

/** O tipo libera depois da primeira compra do anterior. O primeiro está sempre liberado. */
export function isPropertyUnlocked(state: GameState, id: PropertyId): boolean {
  const index = PROPERTY_IDS.indexOf(id)
  return index <= 0 || ownedCount(state, PROPERTY_IDS[index - 1]) > 0
}

/** Tipos liberados e o próximo bloqueado, que aparece com o preço. */
export function visiblePropertyTypes(state: GameState): PropertyType[] {
  const unlocked = PROPERTY_TYPES.filter((type) => isPropertyUnlocked(state, type.id))
  const next = PROPERTY_TYPES[unlocked.length]
  return next ? [...unlocked, next] : unlocked
}

/** Imóveis do tipo que a família não usa para morar: alugados ou vazios. */
export function rentedUnits(state: GameState, id: PropertyId, living: number): number {
  const inUse = propertyType(id).home ? (homesInUse(state, living)[id] ?? 0) : 0
  return Math.max(0, ownedCount(state, id) - inUse)
}

/**
 * Imóveis do tipo que estão vazios, sem inquilino. Quando a família passa a
 * morar num imóvel que estava vazio, ele deixa de contar.
 */
export function vacantUnits(state: GameState, id: PropertyId, living: number): number {
  return Math.min(state.vacancies[id]?.length ?? 0, rentedUnits(state, id, living))
}

/** Quantos imóveis da família estão vazios, de todos os tipos. */
export function totalVacant(state: GameState, living: number = livingCount(state)): number {
  return PROPERTY_IDS.reduce((sum, id) => sum + vacantUnits(state, id, living), 0)
}

/**
 * Aluguel por mês que os imóveis da família rendem, antes da manutenção. Os
 * imóveis em que a família mora e os vazios não rendem.
 */
export function rentPerMonth(state: GameState, living: number = livingCount(state)): number {
  let rent = 0
  for (const type of PROPERTY_TYPES) {
    const earning = rentedUnits(state, type.id, living) - vacantUnits(state, type.id, living)
    rent += earning * type.rentPerMonth
  }
  return rent
}

/** Manutenção por mês dos imóveis alugados: uma parte do aluguel que rendem. */
export function maintenanceCost(state: GameState, living: number = livingCount(state)): number {
  return rentPerMonth(state, living) * maintenanceShare
}

/** Tipos de moradia, do que perde menos aluguel por lugar ao virar casa da família ao que perde mais. */
const HOME_TYPES = PROPERTY_TYPES.filter((type) => type.home !== null).sort(
  (a, b) => a.rentPerMonth / a.home!.places - b.rentPerMonth / b.home!.places,
)

/** Lugares em casa nos imóveis de moradia da família, sem a casa alugada. */
export function ownedPlaces(state: GameState): number {
  let places = 0
  for (const type of HOME_TYPES) places += ownedCount(state, type.id) * type.home!.places
  return places
}

/** A família ainda mora de aluguel: os imóveis dela não têm lugar para todos. */
export function isRenting(state: GameState, living: number = livingCount(state)): boolean {
  return ownedPlaces(state) < living
}

/**
 * Imóveis de moradia em que a família mora, por tipo: os que perdem menos
 * aluguel por lugar primeiro (kitnets, depois apartamentos e casas), até caber
 * todo mundo. Os outros ficam alugados e rendem.
 */
export function homesInUse(
  state: GameState,
  living: number = livingCount(state),
): Partial<Record<PropertyId, number>> {
  const used: Partial<Record<PropertyId, number>> = {}
  let need = living
  for (const type of HOME_TYPES) {
    if (need <= 0) break
    const units = Math.min(ownedCount(state, type.id), Math.ceil(need / type.home!.places))
    if (units === 0) continue
    used[type.id] = units
    need -= units * type.home!.places
  }
  return used
}

/** Lugares alugados: os de quem não cabe nos imóveis de moradia da família, sem limite. */
export function rentedPlaces(state: GameState, living: number = livingCount(state)): number {
  return Math.max(0, living - ownedPlaces(state))
}

/**
 * Aluguel por mês do lugar alugado número `place`, a contar de 1: o preço base
 * até `basePlaces`, e daí em diante `rentGrowth` a mais que o lugar anterior.
 */
export function placeRent(place: number): number {
  const { rentPerPlace, basePlaces, rentGrowth } = BALANCE.housing
  return rentPerPlace * (1 + rentGrowth) ** Math.max(0, place - basePlaces)
}

/** Aluguel por mês de `places` lugares alugados, somando o preço de cada um. */
export function rentFor(places: number): number {
  const { rentPerPlace, basePlaces, rentGrowth } = BALANCE.housing
  const base = Math.min(places, basePlaces) * rentPerPlace
  const extra = Math.max(0, places - basePlaces)
  if (extra === 0) return base
  // Soma da progressão: o 1º lugar acima da base custa rentPerPlace × (1 + rentGrowth).
  const growth = 1 + rentGrowth
  return base + (rentPerPlace * growth * (growth ** extra - 1)) / rentGrowth
}

/**
 * Custo da moradia por mês: o aluguel dos lugares de quem não cabe nos
 * imóveis da família e as contas dos imóveis em que ela mora e dos que estão
 * vazios.
 */
export function housingCost(state: GameState, living: number = livingCount(state)): number {
  const inUse = homesInUse(state, living)
  let cost = rentFor(rentedPlaces(state, living))
  for (const type of PROPERTY_TYPES) {
    const paying = (inUse[type.id] ?? 0) + vacantUnits(state, type.id, living)
    cost += paying * type.billsPerMonth
  }
  return cost
}

/** Sorteios de cada imóvel por dia: o de o inquilino sair e o de quanto tempo fica vazio. */
const ROLL = { leave: 1, months: 2 }

/** Chance por dia de o inquilino de um imóvel sair. */
const LEAVE_CHANCE = vacancy.perYear / BALANCE.daysPerYear

/**
 * Vacância do dia: quem achou inquilino volta a render, e cada imóvel alugado
 * tem uma chance pequena de o inquilino sair, ficando vazio por alguns meses.
 * O sorteio depende só da seed, do dia, do tipo e da posição do imóvel, sem
 * gastar o gerador do jogo, então dá o mesmo resultado avançando de uma vez ou
 * aos poucos. Altera o rascunho e devolve true quando o aluguel mudou.
 */
export function processVacancies(draft: GameState, living: number): boolean {
  const day = draft.clock.day
  let changed = false
  PROPERTY_TYPES.forEach((type, index) => {
    const open = draft.vacancies[type.id] ?? []
    const staying = open.filter((until) => until > day)
    let typeChanged = staying.length !== open.length
    const earning = Math.max(0, rentedUnits(draft, type.id, living) - staying.length)
    const seed = draft.seed ^ (index << 8)
    for (let unit = 0; unit < earning; unit++) {
      if (hashUnit(seed, day, unit, ROLL.leave) >= LEAVE_CHANCE) continue
      const { min, max } = vacancy.months
      const months = min + Math.floor(hashUnit(seed, day, unit, ROLL.months) * (max - min + 1))
      staying.push(day + Math.round((months * BALANCE.daysPerYear) / 12))
      typeChanged = true
    }
    if (!typeChanged) return
    changed = true
    const vacancies = { ...draft.vacancies }
    if (staying.length === 0) delete vacancies[type.id]
    else vacancies[type.id] = staying
    draft.vacancies = vacancies
  })
  return changed
}

/**
 * Quanto a moradia da família sobe por mês com `extra` pessoas a mais: o
 * aluguel dos lugares novos, ou as contas de um imóvel da família que passa a
 * ter gente morando.
 */
export function extraHousingCost(
  state: GameState,
  extra: number = 1,
  living: number = livingCount(state),
): number {
  return housingCost(state, living + extra) - housingCost(state, living)
}

/** Tipos liberados com algum imóvel à venda que cabe no dinheiro da família agora, à vista. */
export function affordableProperties(state: GameState): PropertyId[] {
  return PROPERTY_IDS.filter((id) => checkBuyProperty(state, id).ok)
}

/** Quantos imóveis a família tem, de todos os tipos. */
export function totalProperties(state: GameState): number {
  return PROPERTY_IDS.reduce((sum, id) => sum + ownedCount(state, id), 0)
}

export type PropertyCheck =
  | {
      ok: true
      /** O preço do imóvel. */
      price: number
      /** O que sai do caixa agora: o preço e o ITBI à vista, ou a entrada e o ITBI no financiamento. */
      cost: number
      lot: number | null
      /** As contas do financiamento, quando a compra é financiada. */
      financing: FinancingTerms | null
    }
  | Refusal

/**
 * Diz se a família pode comprar agora um imóvel do tipo, por quanto e qual
 * lote ela leva. Com `lot`, é aquele lote, que precisa estar à venda; sem ele,
 * o primeiro lote à venda, ou nenhum, quando o anúncio comercial está fora da
 * rua. À vista, o caixa precisa cobrir o preço e o ITBI. Financiado, a entrada
 * e o ITBI, e as parcelas de todos os financiamentos precisam caber no teto
 * da renda da família (`familyIncome`, a renda por mês antes do imposto).
 */
export function checkBuyProperty(
  state: GameState,
  id: PropertyId,
  lot?: number,
  financed: boolean = false,
  familyIncome: number = 0,
): PropertyCheck {
  if (!(PROPERTY_IDS as readonly string[]).includes(id)) return refuse('propertyNotFound')
  if (!isPropertyUnlocked(state, id)) return refuse('propertyLocked')
  if (propertiesLeft(state, id) <= 0) return refuse('soldOut')
  const forSale = lotsForSale(state, id)
  if (lot !== undefined && !forSale.includes(lot)) return refuse('lotNotForSale')
  const chosen = lot ?? forSale[0] ?? null
  if (!financed) {
    const price = propertyPrice(state, id)
    const cost = price + transferTaxOf(price)
    if (state.money < cost) return refuse('notEnoughMoney')
    return { ok: true, price, cost, lot: chosen, financing: null }
  }
  const terms = financingTerms(state, id)
  const cost = terms.down + terms.tax
  if (state.money < cost) return refuse('notEnoughMoney')
  if (loanInstallments(state) + terms.installment > installmentCap(familyIncome)) {
    return refuse('loanTooBig')
  }
  return { ok: true, price: terms.price, cost, lot: chosen, financing: terms }
}

/**
 * Compra um imóvel já conferido: paga o que sai do caixa, abre o financiamento
 * quando houver e dá o lote à família. Altera o rascunho e devolve o
 * acontecimento.
 */
export function buyProperty(
  draft: GameState,
  id: PropertyId,
  check: Extract<PropertyCheck, { ok: true }>,
): GameEvent {
  const count = ownedCount(draft, id) + 1
  draft.properties = { ...draft.properties, [id]: count }
  if (check.lot !== null) {
    draft.lots = { ...draft.lots, [id]: [...ownedLots(draft, id), check.lot].sort((a, b) => a - b) }
  }
  if (propertyType(id).market) {
    draft.market = { ...draft.market, [id]: propertiesLeft(draft, id) - 1 }
  }
  draft.money -= check.cost
  draft.stats.totalSpent += check.cost
  if (check.financing) openLoan(draft, id, check.financing.principal)
  const event: GameEvent = { type: 'propertyBought', day: draft.clock.day, propertyId: id, count }
  return check.financing ? { ...event, financed: true } : event
}
