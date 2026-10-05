import { memo, type KeyboardEvent, type ReactNode } from 'react'
import { propertyType, type PropertyId } from '@/content/properties'
import {
  BUILDINGS,
  Car,
  COLORS,
  Crane,
  DEPTH,
  ForSaleSign,
  Hoarding,
  ObraBoard,
  Palm,
  Pin,
  Shrub,
  Terreno,
  Tractor,
  Tree,
} from './buildings'
import {
  STREETS,
  type MapLot,
  type MapRow,
  type MapStreet,
  type NeighborhoodLayout,
} from './layout'

type Props = {
  layout: NeighborhoodLayout
  onSelect?: (lot: MapLot) => void
}

/** Tipos com calçadão na frente dos prédios, no lugar do gramado. */
const PAVED: ReadonlySet<PropertyId> = new Set(['sala', 'loja', 'predio', 'shopping'])

/**
 * O bairro desenhado: as ruas de moradia em cima, depois o comércio, os
 * galpões, o centro, a fazenda e o shopping, até o próximo tipo, que aparece
 * em obras. Cada lote abre o painel do tipo dele. A família marca com um
 * coração os imóveis em que mora e com uma moeda os que rendem aluguel.
 */
export const NeighborhoodMap = memo(function NeighborhoodMap({ layout, onSelect }: Props) {
  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className="block h-auto w-full select-none"
      role="group"
      aria-label="Bairro da família"
    >
      <rect width={layout.width} height={layout.height} fill={COLORS.grass} />
      <GrassTufts width={layout.width} height={layout.height} />
      {layout.rows.map((row, index) => (
        <Row
          key={row.lots[0].key}
          row={row}
          index={index}
          width={layout.width}
          onSelect={onSelect}
        />
      ))}
      <g pointerEvents="none">
        {layout.rows.flatMap((row) =>
          row.lots
            .filter((lot) => lot.state === 'home' || lot.state === 'rented')
            .map((lot) => (
              <Pin
                key={lot.key}
                x={lot.x + DEPTH.x / 2}
                y={lot.y - BUILDINGS[lot.typeId].top(lot.variant) - 1}
                kind={lot.state === 'home' ? 'home' : 'rented'}
                count={lot.count}
              />
            )),
        )}
      </g>
    </svg>
  )
})

function Row({
  row,
  index,
  width,
  onSelect,
}: {
  row: MapRow
  index: number
  width: number
  onSelect?: (lot: MapLot) => void
}) {
  const spacing = row.lots.length > 1 ? row.lots[1].x - row.lots[0].x : width
  const paved = PAVED.has(row.typeId) && !row.locked
  return (
    <g>
      {row.locked ? null : (
        <rect
          x={0}
          y={row.top}
          width={width}
          height={row.base - row.top}
          fill={COLORS.yard}
          opacity={0.6}
        />
      )}
      {paved ? <Plaza y={row.base - 18} width={width} /> : null}
      {row.locked ? (
        <LockedLots row={row} spacing={spacing} onSelect={onSelect} />
      ) : (
        <>
          <Greenery row={row} spacing={spacing} index={index} width={width} />
          {row.lots.map((lot) => (
            <Lot key={lot.key} lot={lot} spacing={spacing} onSelect={onSelect} />
          ))}
        </>
      )}
      <Street street={row.street} width={width} index={index} />
    </g>
  )
}

/** Calçadão de lajotas na frente do comércio. */
function Plaza({ y, width }: { y: number; width: number }) {
  const joints: ReactNode[] = []
  for (let x = 9; x < width; x += 18) {
    joints.push(<rect key={x} x={x} y={y} width={0.7} height={18} fill={COLORS.pavedLine} />)
  }
  return (
    <g>
      <rect x={0} y={y} width={width} height={18} fill={COLORS.paved} />
      <rect x={0} y={y + 9} width={width} height={0.7} fill={COLORS.pavedLine} />
      {joints}
    </g>
  )
}

/** Árvores entre os lotes; palmeiras na frente do shopping. */
function Greenery({
  row,
  spacing,
  index,
  width,
}: {
  row: MapRow
  spacing: number
  index: number
  width: number
}) {
  if (row.typeId === 'shopping') {
    return (
      <g>
        <Palm x={9} y={row.base - 2} />
        <Palm x={width - 9} y={row.base - 2} />
      </g>
    )
  }
  if (row.typeId === 'fazenda') return null
  const trees: ReactNode[] = []
  for (let i = 0; i < row.lots.length - 1; i++) {
    trees.push(
      <Tree
        key={i}
        x={row.lots[i].x + spacing / 2 + 2}
        y={row.base - 3}
        variant={index * 2 + i}
        size={0.85}
      />,
    )
  }
  return <g>{trees}</g>
}

function Lot({
  lot,
  spacing,
  onSelect,
}: {
  lot: MapLot
  spacing: number
  onSelect?: (lot: MapLot) => void
}) {
  const building = BUILDINGS[lot.typeId]
  const top = building.top(lot.variant)
  return (
    <g {...pressable(lotLabel(lot), onSelect && (() => onSelect(lot)))}>
      <rect
        className="lot-hit"
        x={lot.x - spacing / 2 + 2}
        y={lot.y - top - 4}
        width={spacing - 4}
        height={top + 8}
        rx={6}
        fill="transparent"
      />
      <g transform={`translate(${lot.x} ${lot.y})`}>{building.draw(lot.variant)}</g>
      {lot.state === 'forSale' ? (
        <ForSaleSign x={lot.x + Math.min(building.width / 2 - 2, spacing / 2 - 14)} y={lot.y + 3} />
      ) : null}
    </g>
  )
}

/** Terrenos do próximo tipo, com tapume, guindaste e a placa da obra. */
function LockedLots({
  row,
  spacing,
  onSelect,
}: {
  row: MapRow
  spacing: number
  onSelect?: (lot: MapLot) => void
}) {
  const select = onSelect && (() => onSelect(row.lots[0]))
  const board = row.lots[Math.min(1, row.lots.length - 1)]
  return (
    <g {...pressable(`${propertyType(row.typeId).name}: em obras`, select)}>
      <rect
        className="lot-hit"
        x={4}
        y={row.top + 2}
        width={row.lots.at(-1)!.x + spacing / 2 - 6}
        height={row.base - row.top}
        rx={8}
        fill="transparent"
      />
      {row.lots.map((lot, slot) => (
        <g key={lot.key}>
          <Terreno x={lot.x - 5} y={lot.y - 2} width={spacing - 18} variant={slot + 1} />
          {slot % 2 === 0 ? <Hoarding x={lot.x} y={lot.y - 1} width={spacing - 16} /> : null}
        </g>
      ))}
      <Crane x={row.lots[0].x + 4} y={row.base - 14} />
      <ObraBoard x={board.x} y={row.base + 2} typeId={row.typeId} />
    </g>
  )
}

/** Lote que abre o painel do tipo ao tocar ou com Enter. */
function pressable(label: string, select: (() => void) | undefined) {
  if (!select) return { 'aria-label': label }
  return {
    role: 'button',
    tabIndex: 0,
    'aria-label': label,
    className: 'lot',
    onClick: select,
    onKeyDown: (event: KeyboardEvent<SVGGElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      select()
    },
  }
}

function lotLabel(lot: MapLot): string {
  const type = propertyType(lot.typeId)
  const rented = type.gender === 'f' ? 'alugada' : 'alugado'
  const where = lot.address
  switch (lot.state) {
    case 'home':
      return `${type.name} onde a família mora, ${where}`
    case 'rented':
      return lot.count
        ? `${type.name} da família, ${rented}, ${where}. A família tem ${lot.count}`
        : `${type.name} da família, ${rented}, ${where}`
    case 'forSale':
      return `${type.name} à venda, ${where}`
    case 'neighbor':
      return `${type.name} de um vizinho, ${where}`
    case 'locked':
      return `${type.name}: em obras`
  }
}

/** Largura aproximada do nome da rua, para as faixas e os carros não passarem por cima. */
function labelEnd(name: string): number {
  return 10 + name.length * 4.3 + 10
}

/** Posição fixa, mas com cara de sorteio, entre `from` e `to`. */
function spread(from: number, to: number, seed: number): number {
  return from + (((seed * 7919) % 997) / 997) * Math.max(0, to - from)
}

function Street({ street, width, index }: { street: MapStreet; width: number; index: number }) {
  if (street.kind === 'dirt') return <DirtRoad street={street} width={width} index={index} />
  const { sidewalk, road: roadH } = STREETS[street.kind]
  const avenue = street.kind === 'avenue'
  const road = street.y + sidewalk
  const bottom = road + roadH
  const nameEnd = labelEnd(street.name)
  const crossing = width - 34
  const median = road + roadH / 2 - 3

  const tiles: ReactNode[] = []
  for (let x = 10; x < width; x += 14) {
    tiles.push(
      <rect
        key={`a${x}`}
        x={x}
        y={street.y}
        width={0.8}
        height={sidewalk}
        fill={COLORS.sidewalkLine}
      />,
    )
    tiles.push(
      <rect
        key={`b${x}`}
        x={x + 7}
        y={bottom}
        width={0.8}
        height={sidewalk}
        fill={COLORS.sidewalkLine}
      />,
    )
  }
  const dashes: ReactNode[] = []
  if (!avenue) {
    for (let x = nameEnd; x < width - 6; x += 22) {
      if (Math.abs(x + 5.5 - crossing) < 16) continue
      dashes.push(
        <rect
          key={x}
          x={x}
          y={road + roadH / 2 - 0.7}
          width={11}
          height={1.4}
          rx={0.7}
          fill={COLORS.roadLine}
        />,
      )
    }
  }
  const stripes: ReactNode[] = []
  for (let y = road + 2.5; y < bottom - 2; y += 4.2) {
    if (avenue && y > median - 2 && y < median + 6) continue
    stripes.push(
      <rect key={y} x={crossing - 6} y={y} width={12} height={2.3} fill={COLORS.roadLine} />,
    )
  }
  const shrubs: ReactNode[] = []
  if (avenue) {
    for (let x = 12; x < width - 8; x += 20) {
      if (Math.abs(x - crossing) < 14) continue
      shrubs.push(<Shrub key={x} x={x} y={median + 4.6} variant={Math.floor(x / 20) + index} />)
    }
  }
  const nameY = avenue ? road + 10 : road + roadH / 2 + 2.6
  const topCar = spread(nameEnd + 12, crossing - 20, index + 3)
  const bottomCar = avenue
    ? spread(20, crossing - 20, index + 11)
    : spread(nameEnd + 12, crossing - 20, index + 17)

  return (
    <g>
      <rect x={0} y={street.y} width={width} height={sidewalk} fill={COLORS.sidewalk} />
      <rect x={0} y={road} width={width} height={roadH} fill={COLORS.road} />
      <rect x={0} y={road} width={width} height={1.2} fill="rgba(31, 42, 35, 0.12)" />
      <rect x={0} y={bottom} width={width} height={sidewalk} fill={COLORS.sidewalk} />
      {tiles}
      {dashes}
      {avenue ? (
        <>
          <rect x={0} y={median} width={crossing - 9} height={6} rx={3} fill={COLORS.median} />
          <rect
            x={crossing + 9}
            y={median}
            width={width - crossing - 9}
            height={6}
            rx={3}
            fill={COLORS.median}
          />
          {shrubs}
        </>
      ) : null}
      {stripes}
      <text x={10} y={nameY} fontSize={7.4} fontWeight={800} fill="#FFFFFF" letterSpacing={0.3}>
        {street.name}
      </text>
      <Car x={topCar} y={avenue ? road + 12.5 : road + 11} variant={index} flip />
      <Car x={bottomCar} y={bottom - 1.6} variant={index + 3} />
    </g>
  )
}

/** Estrada de terra da zona rural, com o trator. */
function DirtRoad({ street, width, index }: { street: MapStreet; width: number; index: number }) {
  const { sidewalk, road: roadH } = STREETS.dirt
  const road = street.y + sidewalk
  const nameEnd = labelEnd(street.name)
  return (
    <g>
      <rect x={0} y={street.y} width={width} height={sidewalk} fill={COLORS.grassDark} />
      <rect x={0} y={road} width={width} height={roadH} fill={COLORS.dirt} />
      <rect x={nameEnd} y={road + 5} width={width - nameEnd} height={1.2} fill={COLORS.dirtDark} />
      <rect
        x={nameEnd}
        y={road + roadH - 6}
        width={width - nameEnd}
        height={1.2}
        fill={COLORS.dirtDark}
      />
      <rect x={0} y={road + roadH} width={width} height={sidewalk} fill={COLORS.grassDark} />
      <text
        x={10}
        y={road + roadH / 2 + 2.6}
        fontSize={7.4}
        fontWeight={800}
        fill={COLORS.bark}
        letterSpacing={0.3}
      >
        {street.name}
      </text>
      <Tractor x={spread(nameEnd + 16, width - 20, index + 7)} y={road + roadH - 3} />
    </g>
  )
}

/** Tufos de grama espalhados, sempre nos mesmos lugares. */
function GrassTufts({ width, height }: { width: number; height: number }) {
  const tufts: ReactNode[] = []
  let seed = 7
  const next = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let i = 0; i < Math.round((width * height) / 1800); i++) {
    const x = next() * width
    const y = next() * height
    tufts.push(
      <path
        key={i}
        d={`M${x},${y} l1.2,-3 M${x + 2},${y} l0,-3.6 M${x + 4},${y} l-1.2,-3`}
        stroke={COLORS.grassDark}
        strokeWidth={0.9}
        strokeLinecap="round"
      />,
    )
  }
  return <g>{tufts}</g>
}
