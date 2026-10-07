import { PROPERTY_IDS, PROPERTY_TYPES, type PropertyId } from '@/content/properties'
import {
  homeLots,
  isPropertyUnlocked,
  livingCount,
  lotsForSale,
  ownedCount,
  ownedLots,
  propertiesLeft,
  type GameState,
} from '@/engine'

/**
 * Situação de um lote do bairro: a família mora nele, ele é da família e está
 * alugado, está à venda, é de um vizinho ou é um terreno em obras (o tipo
 * ainda não liberou).
 */
export type LotState = 'home' | 'rented' | 'forSale' | 'neighbor' | 'locked'

export type MapLot = {
  key: string
  typeId: PropertyId
  /** Número do lote no tipo, de 0 a `lots - 1`: o mesmo que a engine guarda e compra. */
  lot: number
  /** Endereço: a rua do lote e o número dele, ou o quilômetro, na estrada. */
  address: string
  /** Centro da base do prédio, onde ele encosta na calçada. */
  x: number
  y: number
  state: LotState
  /** Escolhe o modelo e as cores do prédio: 10 × fileira + posição na fileira. */
  variant: number
  /** Quantos a família tem do tipo, no primeiro lote dela, quando são mais do que os lotes. */
  count?: number
}

export type StreetKind = 'street' | 'avenue' | 'dirt'

export type MapStreet = {
  /** Topo da calçada de cima. */
  y: number
  name: string
  kind: StreetKind
}

export type MapRow = {
  typeId: PropertyId
  /** Topo da faixa dos lotes. */
  top: number
  /** Base dos prédios, colada na calçada. */
  base: number
  /** Fileira de terrenos em obras, do próximo tipo a liberar. */
  locked: boolean
  lots: MapLot[]
  street: MapStreet
}

export type NeighborhoodLayout = {
  width: number
  height: number
  rows: MapRow[]
}

/** Largura do desenho. A altura cresce com as ruas. */
export const MAP_WIDTH = 360

/** Calçada e pista de cada tipo de rua. A avenida tem canteiro no meio; a estrada é de terra. */
export const STREETS: Record<StreetKind, { sidewalk: number; road: number }> = {
  street: { sidewalk: 7, road: 24 },
  avenue: { sidewalk: 7, road: 34 },
  dirt: { sidewalk: 5, road: 20 },
}

export function streetHeight(kind: StreetKind): number {
  return STREETS[kind].sidewalk * 2 + STREETS[kind].road
}

type RowSpec = {
  typeId: PropertyId
  /** Altura da faixa dos lotes: cabe o prédio mais alto do tipo e quase todo o alfinete. */
  height: number
  /** Lotes na fileira. */
  slots: number
  street: string
  kind: StreetKind
}

/**
 * Fileiras do bairro, de cima para baixo, na ordem em que os tipos liberam:
 * as ruas de moradia, com os 10 imóveis de cada tipo em duas fileiras, o
 * comércio, os galpões, o centro, a zona rural e, por último, o shopping.
 */
const ROWS: readonly RowSpec[] = [
  { typeId: 'kitnet', height: 64, slots: 5, street: 'Rua dos Ipês', kind: 'street' },
  { typeId: 'kitnet', height: 64, slots: 5, street: 'Rua das Acácias', kind: 'street' },
  { typeId: 'apartamento', height: 107, slots: 5, street: 'Rua das Palmeiras', kind: 'street' },
  { typeId: 'apartamento', height: 107, slots: 5, street: 'Rua dos Jacarandás', kind: 'street' },
  { typeId: 'casa', height: 71, slots: 5, street: 'Rua das Mangueiras', kind: 'street' },
  { typeId: 'casa', height: 71, slots: 5, street: 'Rua dos Cajueiros', kind: 'street' },
  { typeId: 'sala', height: 126, slots: 5, street: 'Avenida Brasil', kind: 'avenue' },
  { typeId: 'loja', height: 64, slots: 5, street: 'Rua do Comércio', kind: 'street' },
  { typeId: 'galpao', height: 64, slots: 3, street: 'Rua da Indústria', kind: 'street' },
  { typeId: 'predio', height: 178, slots: 4, street: 'Avenida Central', kind: 'avenue' },
  { typeId: 'fazenda', height: 60, slots: 2, street: 'Estrada do Campo', kind: 'dirt' },
  { typeId: 'shopping', height: 98, slots: 2, street: 'Avenida dos Shoppings', kind: 'avenue' },
]

/** Altura da fileira de terrenos em obras: cabe o guindaste. */
const LOCKED_HEIGHT = 76
const MARGIN = 12
const TOP = 12
const BOTTOM = 6

/**
 * Monta o bairro a partir do estado: as fileiras dos tipos liberados e uma de
 * terrenos em obras para o próximo, então o bairro cresce com a família. Cada
 * lote é um imóvel com número: da família (alugado ou com ela morando), à
 * venda ou de um vizinho. Quando a família tem mais comerciais do que os
 * lotes da rua, o primeiro lote dela mostra o total.
 */
export function neighborhoodLayout(state: GameState): NeighborhoodLayout {
  const living = livingCount(state)
  const next = PROPERTY_TYPES.find((type) => !isPropertyUnlocked(state, type.id))?.id
  const rows: MapRow[] = []
  const firstLot: Partial<Record<PropertyId, number>> = {}
  let y = TOP

  ROWS.forEach((spec, specIndex) => {
    const locked = !isPropertyUnlocked(state, spec.typeId)
    if (locked && (spec.typeId !== next || rows.some((row) => row.typeId === spec.typeId))) return
    const top = y
    const base = top + (locked ? LOCKED_HEIGHT : spec.height)
    const spacing = (MAP_WIDTH - MARGIN * 2) / spec.slots
    const start = firstLot[spec.typeId] ?? 0
    firstLot[spec.typeId] = start + spec.slots
    const lots = (locked ? lockedLots(spec) : lotsOf(state, spec, start, living)).map(
      (info, slot): MapLot => ({
        key: `${specIndex}-${slot}`,
        typeId: spec.typeId,
        lot: start + slot,
        address: addressOf(spec, slot),
        x: MARGIN + spacing * (slot + 0.5),
        y: base,
        variant: specIndex * 10 + slot,
        ...info,
      }),
    )
    rows.push({
      typeId: spec.typeId,
      top,
      base,
      locked,
      lots,
      street: { y: base, name: spec.street, kind: spec.kind },
    })
    y = base + streetHeight(spec.kind)
  })
  return { width: MAP_WIDTH, height: y + BOTTOM, rows }
}

/**
 * O que muda o desenho: quantos a família tem de cada tipo, quais lotes, em
 * quais ela mora e quantos estão à venda.
 */
function layoutKey(state: GameState): string {
  const living = livingCount(state)
  return PROPERTY_IDS.map(
    (id) =>
      `${ownedCount(state, id)}:${ownedLots(state, id).join(',')}:${homeLots(state, id, living).join(',')}:${propertiesLeft(state, id)}`,
  ).join('|')
}

let cached: { key: string; layout: NeighborhoodLayout } | null = null

/**
 * O mesmo desenho enquanto nada que aparece nele muda. O estado do jogo muda
 * a cada segundo, e assim o mapa só se desenha de novo quando o bairro muda.
 */
export function cachedNeighborhoodLayout(state: GameState): NeighborhoodLayout {
  const key = layoutKey(state)
  if (cached?.key !== key) cached = { key, layout: neighborhoodLayout(state) }
  return cached.layout
}

type LotInfo = Pick<MapLot, 'state' | 'count'>

function lockedLots(spec: RowSpec): LotInfo[] {
  return Array.from({ length: spec.slots }, () => ({ state: 'locked' }))
}

/** Número do prédio na rua: 10, 30, 50… Na estrada de terra, o quilômetro. */
function addressOf(spec: RowSpec, slot: number): string {
  if (spec.kind === 'dirt') return `${spec.street}, km ${slot * 4 + 3}`
  return `${spec.street}, ${slot * 20 + 10}`
}

/**
 * Situação de cada lote de uma fileira liberada, a partir do lote `start` do
 * tipo: a família mora nos lotes que a engine diz (os escolhidos e, no
 * automático, os primeiros dela) e aluga os outros; os à venda e os de
 * vizinhos também vêm da engine.
 */
function lotsOf(state: GameState, spec: RowSpec, start: number, living: number): LotInfo[] {
  const owned = ownedLots(state, spec.typeId)
  const lived = new Set(homeLots(state, spec.typeId, living))
  const family = new Set(owned)
  const forSale = new Set(lotsForSale(state, spec.typeId))
  const total = ownedCount(state, spec.typeId)
  return Array.from({ length: spec.slots }, (_, slot): LotInfo => {
    const lot = start + slot
    if (lived.has(lot)) return { state: 'home' }
    if (family.has(lot)) {
      return {
        state: 'rented',
        count: lot === owned[0] && total > owned.length ? total : undefined,
      }
    }
    return { state: forSale.has(lot) ? 'forSale' : 'neighbor' }
  })
}

/** Lotes de cada tipo nas fileiras, para conferir com o número de lotes do tipo. */
export function rowLots(id: PropertyId): number {
  return ROWS.filter((row) => row.typeId === id).reduce((sum, row) => sum + row.slots, 0)
}
