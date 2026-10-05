import { BUILDINGS, COLORS, Crane, Hoarding, ObraBoard, Terreno, Tree } from './buildings'
import type { MapLot } from './layout'

/**
 * O lote em tamanho grande, para o painel do tipo: o prédio na calçada, entre
 * duas árvores. O tipo em obras mostra o terreno com o tapume, o guindaste e
 * a placa da obra.
 */
export function BuildingPreview({ lot }: { lot: MapLot }) {
  const building = BUILDINGS[lot.typeId]
  const locked = lot.state === 'locked'
  const top = locked ? 66 : building.top(lot.variant)
  const width = Math.max(building.width + 64, locked ? 170 : 150)
  const height = top + 24
  const base = height - 9
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mx-auto block h-auto max-h-56 w-full"
      aria-hidden="true"
    >
      <rect width={width} height={height} fill={COLORS.grass} />
      <rect y={base} width={width} height={height - base} fill={COLORS.sidewalk} />
      <Tree x={16} y={base - 1} variant={lot.variant} />
      <Tree x={width - 14} y={base - 1} variant={lot.variant + 1} />
      <g transform={`translate(${width / 2} ${base})`}>
        {locked ? (
          <>
            <Terreno x={-14} y={-1} width={60} variant={1} />
            <Crane x={-30} y={-8} />
            <Hoarding x={-22} y={0} width={44} />
            <ObraBoard x={30} y={2} typeId={lot.typeId} />
          </>
        ) : (
          building.draw(lot.variant)
        )}
      </g>
    </svg>
  )
}
