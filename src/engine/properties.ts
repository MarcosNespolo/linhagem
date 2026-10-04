import { BALANCE } from '../content/balance'
import {
  PROPERTY_IDS,
  PROPERTY_TYPES,
  propertyType,
  type PropertyId,
  type PropertyType,
} from '../content/properties'
import { refuse, type Refusal } from './errors'
import type { GameEvent, GameState } from './types'

/** Quantos imóveis do tipo a família tem. */
export function ownedCount(state: GameState, id: PropertyId): number {
  return state.properties[id] ?? 0
}

/** Preço do próximo imóvel do tipo: cada um custa mais que o anterior. */
export function propertyPrice(state: GameState, id: PropertyId): number {
  const { price } = propertyType(id)
  return Math.round(price * BALANCE.properties.priceGrowth ** ownedCount(state, id))
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

/** Aluguel por mês de todos os imóveis da família. Não depende de quem está vivo. */
export function rentPerMonth(state: GameState): number {
  let rent = 0
  for (const type of PROPERTY_TYPES) rent += ownedCount(state, type.id) * type.rentPerMonth
  return rent
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
