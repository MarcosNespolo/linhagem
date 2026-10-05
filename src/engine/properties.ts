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

/**
 * Preço do próximo imóvel do tipo. O de moradia custa sempre o mesmo; o
 * comercial custa `BALANCE.properties.priceGrowth` vezes o anterior.
 */
export function propertyPrice(state: GameState, id: PropertyId): number {
  const { price, home } = propertyType(id)
  if (home) return price
  return Math.round(price * BALANCE.properties.priceGrowth ** ownedCount(state, id))
}

/** Quantos do tipo ainda estão à venda: os de moradia são poucos no bairro; os comerciais, sem limite. */
export function propertiesLeft(state: GameState, id: PropertyId): number {
  if (!propertyType(id).home) return Infinity
  return Math.max(0, BALANCE.properties.homeSupply - ownedCount(state, id))
}

/** Anos do jogo que o próximo imóvel do tipo leva para se pagar com o aluguel. */
export function paybackYears(state: GameState, id: PropertyId): number {
  return propertyPrice(state, id) / propertyType(id).rentPerMonth / 12
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

/**
 * Lugares em casa: os dos imóveis de moradia da família mais os que ela
 * consegue alugar para quem não cabe neles.
 */
export function homePlaces(state: GameState): number {
  return ownedPlaces(state) + BALANCE.housing.rentedPlaces
}

/** Lugares livres em casa para mais uma pessoa: um filho ou quem casa. */
export function freePlaces(state: GameState, living: number = livingCount(state)): number {
  return Math.max(0, homePlaces(state) - living)
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

/** Lugares alugados: os de quem não cabe nos imóveis de moradia da família. */
export function rentedPlaces(state: GameState, living: number = livingCount(state)): number {
  return Math.min(BALANCE.housing.rentedPlaces, Math.max(0, living - ownedPlaces(state)))
}

/**
 * Custo da moradia por mês: as contas dos imóveis em que a família mora e o
 * aluguel dos lugares de quem não cabe neles.
 */
export function housingCost(state: GameState, living: number = livingCount(state)): number {
  const inUse = homesInUse(state, living)
  let cost = rentedPlaces(state, living) * BALANCE.housing.rentPerPlace
  for (const type of HOME_TYPES) cost += (inUse[type.id] ?? 0) * type.home!.billsPerMonth
  return cost
}

/** Quantos imóveis a família tem, de todos os tipos. */
export function totalProperties(state: GameState): number {
  return PROPERTY_IDS.reduce((sum, id) => sum + ownedCount(state, id), 0)
}

export type PropertyCheck = { ok: true; price: number } | Refusal

/** Diz se a família pode comprar agora um imóvel do tipo e por quanto. */
export function checkBuyProperty(state: GameState, id: PropertyId): PropertyCheck {
  if (!(PROPERTY_IDS as readonly string[]).includes(id)) return refuse('propertyNotFound')
  if (!isPropertyUnlocked(state, id)) return refuse('propertyLocked')
  if (propertiesLeft(state, id) <= 0) return refuse('soldOut')
  const price = propertyPrice(state, id)
  if (state.money < price) return refuse('notEnoughMoney')
  return { ok: true, price }
}

/** Compra um imóvel já conferido. Altera o rascunho e devolve o acontecimento. */
export function buyProperty(draft: GameState, id: PropertyId, price: number): GameEvent {
  const count = ownedCount(draft, id) + 1
  draft.properties = { ...draft.properties, [id]: count }
  draft.money -= price
  draft.stats.totalSpent += price
  return { type: 'propertyBought', day: draft.clock.day, propertyId: id, count }
}
