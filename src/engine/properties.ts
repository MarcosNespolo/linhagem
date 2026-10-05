import { BALANCE } from '../content/balance'
import {
  PROPERTY_IDS,
  PROPERTY_TYPES,
  propertyType,
  type PropertyId,
  type PropertyType,
} from '../content/properties'
import { refuse, type Refusal } from './errors'
import { livingCount } from './members'
import type { GameEvent, GameState } from './types'

/** Quantos imóveis do tipo a família tem. */
export function ownedCount(state: GameState, id: PropertyId): number {
  return state.properties[id] ?? 0
}

/** Preço de um imóvel do tipo, sempre o mesmo. */
export function propertyPrice(id: PropertyId): number {
  return propertyType(id).price
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

/** Anos do jogo que um imóvel do tipo leva para se pagar com o aluguel. */
export function paybackYears(id: PropertyId): number {
  const { price, rentPerMonth } = propertyType(id)
  return price / rentPerMonth / 12
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

/**
 * Aluguel por mês que os imóveis da família rendem. Os imóveis em que a família
 * mora não rendem aluguel.
 */
export function rentPerMonth(state: GameState, living: number = livingCount(state)): number {
  const inUse = homesInUse(state, living)
  let rent = 0
  for (const type of PROPERTY_TYPES) {
    rent += (ownedCount(state, type.id) - (inUse[type.id] ?? 0)) * type.rentPerMonth
  }
  return rent
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
 * Custo da moradia por mês: as contas dos imóveis em que a família mora e o
 * aluguel dos lugares de quem não cabe neles.
 */
export function housingCost(state: GameState, living: number = livingCount(state)): number {
  const inUse = homesInUse(state, living)
  let cost = rentFor(rentedPlaces(state, living))
  for (const type of HOME_TYPES) cost += (inUse[type.id] ?? 0) * type.home!.billsPerMonth
  return cost
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

/** Tipos liberados com algum imóvel à venda que cabe no dinheiro da família agora. */
export function affordableProperties(state: GameState): PropertyId[] {
  return PROPERTY_IDS.filter((id) => checkBuyProperty(state, id).ok)
}

/** Quantos imóveis a família tem, de todos os tipos. */
export function totalProperties(state: GameState): number {
  return PROPERTY_IDS.reduce((sum, id) => sum + ownedCount(state, id), 0)
}

export type PropertyCheck = { ok: true; price: number; lot: number | null } | Refusal

/**
 * Diz se a família pode comprar agora um imóvel do tipo, por quanto e qual
 * lote ela leva. Com `lot`, é aquele lote, que precisa estar à venda; sem ele,
 * o primeiro lote à venda, ou nenhum, quando o anúncio comercial está fora da
 * rua.
 */
export function checkBuyProperty(state: GameState, id: PropertyId, lot?: number): PropertyCheck {
  if (!(PROPERTY_IDS as readonly string[]).includes(id)) return refuse('propertyNotFound')
  if (!isPropertyUnlocked(state, id)) return refuse('propertyLocked')
  if (propertiesLeft(state, id) <= 0) return refuse('soldOut')
  const forSale = lotsForSale(state, id)
  if (lot !== undefined && !forSale.includes(lot)) return refuse('lotNotForSale')
  const price = propertyPrice(id)
  if (state.money < price) return refuse('notEnoughMoney')
  return { ok: true, price, lot: lot ?? forSale[0] ?? null }
}

/** Compra um imóvel já conferido. Altera o rascunho e devolve o acontecimento. */
export function buyProperty(
  draft: GameState,
  id: PropertyId,
  price: number,
  lot: number | null,
): GameEvent {
  const count = ownedCount(draft, id) + 1
  draft.properties = { ...draft.properties, [id]: count }
  if (lot !== null) {
    draft.lots = { ...draft.lots, [id]: [...ownedLots(draft, id), lot].sort((a, b) => a - b) }
  }
  if (propertyType(id).market) {
    draft.market = { ...draft.market, [id]: propertiesLeft(draft, id) - 1 }
  }
  draft.money -= price
  draft.stats.totalSpent += price
  return { type: 'propertyBought', day: draft.clock.day, propertyId: id, count }
}
