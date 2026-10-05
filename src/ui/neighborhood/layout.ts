import { BALANCE } from '@/content/balance'
import { PROPERTY_IDS, PROPERTY_TYPES, type PropertyId } from '@/content/properties'
import {
  homesInUse,
  isPropertyUnlocked,
  livingCount,
  ownedCount,
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
  /** Centro da base do prédio, onde ele encosta na calçada. */
  x: number
  y: number
  state: LotState
  /** Escolhe o modelo e as cores do prédio: 10 × fileira + posição na fileira. */
  variant: number
  /** Placa de "vende" na frente. Nos de moradia, só no próximo que a família compraria. */
  sign: boolean
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
 * terrenos em obras para o próximo, então o bairro cresce com a família. Nos
 * de moradia, cada um dos 10 do bairro tem um lote: os primeiros são da
 * família (os em que ela mora antes) e os outros estão à venda. Nos
 * comerciais, a fileira mostra os da família, os à venda e, no resto, os de
 * vizinhos; quando a família tem mais do que cabe, o primeiro lote mostra o
 * total.
 */
export function neighborhoodLayout(state: GameState): NeighborhoodLayout {
  const inUse = homesInUse(state, livingCount(state))
  const next = PROPERTY_TYPES.find((type) => !isPropertyUnlocked(state, type.id))?.id
  const rows: MapRow[] = []
  const homeIndex: Partial<Record<PropertyId, number>> = {}
  let y = TOP

  ROWS.forEach((spec, specIndex) => {
    const locked = !isPropertyUnlocked(state, spec.typeId)
    if (locked && (spec.typeId !== next || rows.some((row) => row.typeId === spec.typeId))) return
    const top = y
    const base = top + (locked ? LOCKED_HEIGHT : spec.height)
    const spacing = (MAP_WIDTH - MARGIN * 2) / spec.slots
    const lots = (locked ? lockedLots(spec) : lotsOf(state, spec, inUse, homeIndex)).map(
      (lot, slot): MapLot => ({
        key: `${specIndex}-${slot}`,
        typeId: spec.typeId,
        x: MARGIN + spacing * (slot + 0.5),
        y: base,
        variant: specIndex * 10 + slot,
        ...lot,
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

/** O que muda o desenho: quantos a família tem de cada tipo, em quantos mora e quantos estão à venda. */
function layoutKey(state: GameState): string {
  const inUse = homesInUse(state, livingCount(state))
  return PROPERTY_IDS.map(
    (id) => `${ownedCount(state, id)}:${inUse[id] ?? 0}:${propertiesLeft(state, id)}`,
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

type LotInfo = Pick<MapLot, 'state' | 'sign' | 'count'>

function lockedLots(spec: RowSpec): LotInfo[] {
  return Array.from({ length: spec.slots }, () => ({ state: 'locked', sign: false }))
}

function isHome(id: PropertyId): boolean {
  return PROPERTY_TYPES.find((type) => type.id === id)?.home != null
}

/**
 * Situação de cada lote de uma fileira liberada. Moradia: a fileira continua a
 * contagem da anterior do mesmo tipo, então os 10 lotes do tipo são os 10 do
 * bairro. Comercial: os da família, até deixar lugar para os à venda, depois
 * os à venda e os de vizinhos.
 */
function lotsOf(
  state: GameState,
  spec: RowSpec,
  inUse: Partial<Record<PropertyId, number>>,
  homeIndex: Partial<Record<PropertyId, number>>,
): LotInfo[] {
  const owned = ownedCount(state, spec.typeId)
  if (isHome(spec.typeId)) {
    const start = homeIndex[spec.typeId] ?? 0
    homeIndex[spec.typeId] = start + spec.slots
    const living = inUse[spec.typeId] ?? 0
    return Array.from({ length: spec.slots }, (_, slot): LotInfo => {
      const index = start + slot
      if (index < living) return { state: 'home', sign: false }
      if (index < owned) return { state: 'rented', sign: false }
      if (index < BALANCE.properties.homeSupply) return { state: 'forSale', sign: index === owned }
      return { state: 'neighbor', sign: false }
    })
  }
  const left = propertiesLeft(state, spec.typeId)
  const forSale = Math.min(left, spec.slots - (owned > 0 ? 1 : 0))
  const family = Math.min(owned, spec.slots - forSale)
  return Array.from({ length: spec.slots }, (_, slot): LotInfo => {
    if (slot < family) {
      return {
        state: 'rented',
        sign: false,
        count: slot === 0 && owned > family ? owned : undefined,
      }
    }
    if (slot < family + forSale) return { state: 'forSale', sign: true }
    return { state: 'neighbor', sign: false }
  })
}
