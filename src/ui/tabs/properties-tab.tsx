'use client'

import {
  Briefcase,
  Building,
  Building2,
  DoorOpen,
  House,
  Lock,
  ShoppingBag,
  Store,
  Tractor,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import { BALANCE } from '@/content/balance'
import { PROPERTY_TYPES, type PropertyId, type PropertyType } from '@/content/properties'
import {
  homePlaces,
  homesInUse,
  housingCost,
  isPropertyUnlocked,
  livingCount,
  ownedCount,
  paybackYears,
  propertiesLeft,
  propertyPrice,
  rentedPlaces,
  rentPerMonth,
  totalProperties,
  visiblePropertyTypes,
  type GameState,
} from '@/engine'
import { useGameStore } from '@/game/store'
import { formatMoney, formatRate } from '@/lib/format'
import { showLot } from '../flows'
import { marketLine, paybackLabel } from '../labels'
import { Pin } from '../neighborhood/buildings'
import { cachedNeighborhoodLayout } from '../neighborhood/layout'
import { NeighborhoodMap } from '../neighborhood/neighborhood-map'
import { button, card } from '../styles'
import type { PropertiesView } from '../ui-store'

const ICONS: Record<PropertyId, LucideIcon> = {
  kitnet: DoorOpen,
  apartamento: Building,
  casa: House,
  sala: Briefcase,
  loja: Store,
  galpao: Warehouse,
  predio: Building2,
  fazenda: Tractor,
  shopping: ShoppingBag,
}

/**
 * Aba Imóveis, em duas vistas: o bairro desenhado, em que tocar num prédio
 * abre o painel do tipo, e a lista, com a moradia da família, o aluguel e um
 * cartão por tipo.
 */
export function PropertiesTab({ game, view }: { game: GameState; view: PropertiesView }) {
  return view === 'map' ? <NeighborhoodView game={game} /> : <PropertiesList game={game} />
}

/**
 * O bairro: os lugares em casa e o aluguel em cima, a legenda e o mapa, com
 * as ruas dos tipos liberados e a do próximo, em obras.
 */
function NeighborhoodView({ game }: { game: GameState }) {
  const living = livingCount(game)
  const rent = rentPerMonth(game, living)
  const housing = housingCost(game, living)
  const total = totalProperties(game)

  return (
    <div className="mx-auto w-full max-w-md space-y-3 px-4 pt-4 pb-8">
      <div className="grid grid-cols-2 gap-3">
        <section className={`${card} p-3`}>
          <p className="text-ink-soft text-[13px] font-semibold">Lugares em casa</p>
          <p className="tabular text-[20px] leading-7 font-black">
            {living} de {homePlaces(game)}
          </p>
          <p className="tabular text-ink-soft text-[13px]">
            Moradia{' '}
            <span className="whitespace-nowrap">
              {housing > 0 ? formatRate(-housing) : 'sem custo'}
            </span>
          </p>
        </section>
        <section className={`${card} p-3`}>
          <p className="text-ink-soft text-[13px] font-semibold">Aluguel</p>
          <p className="tabular text-income text-[20px] leading-7 font-black">
            {rent > 0 ? formatRate(rent) : 'Nenhum'}
          </p>
          <p className="tabular text-ink-soft text-[13px]">
            {total === 1 ? '1 imóvel na família' : `${total} imóveis na família`}
          </p>
        </section>
      </div>
      <MapLegend />
      <div className="ring-line overflow-hidden rounded-2xl ring-1">
        <NeighborhoodMap layout={cachedNeighborhoodLayout(game)} onSelect={showLot} />
      </div>
    </div>
  )
}

/** Legenda dos alfinetes e da placa, com a dica de tocar nos prédios. */
function MapLegend() {
  return (
    <div className="text-ink-soft px-1 text-[13px]">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 font-semibold">
        <li className="flex items-center gap-1">
          <LegendPin kind="home" />A família mora
        </li>
        <li className="flex items-center gap-1">
          <LegendPin kind="rented" />
          Rende aluguel
        </li>
        <li className="flex items-center gap-1.5">
          <span className="border-rose text-rose rounded border px-1 text-[10px] leading-4 font-black">
            VENDE
          </span>
          À venda
        </li>
      </ul>
      <p className="mt-1">Toque num prédio para abrir.</p>
    </div>
  )
}

function LegendPin({ kind }: { kind: 'home' | 'rented' }) {
  return (
    <svg viewBox="-8 -21 16 19" className="h-5 w-4 shrink-0" aria-hidden="true">
      <Pin x={0} y={0} kind={kind} />
    </svg>
  )
}

/**
 * A lista: a moradia da família (lugares em casa, aluguel ou contas), o
 * aluguel que os imóveis rendem e um cartão por tipo, com quantos a família
 * tem, em quantos ela mora, quantos estão à venda e o preço. O tipo seguinte
 * aparece bloqueado, com o preço.
 */
function PropertiesList({ game }: { game: GameState }) {
  const living = livingCount(game)
  const rent = rentPerMonth(game, living)
  const total = totalProperties(game)
  const places = homePlaces(game)
  const rented = rentedPlaces(game, living)
  const housing = housingCost(game, living)
  const { rentPerPlace, rentedPlaces: maxRented } = BALANCE.housing

  return (
    <div className="mx-auto w-full max-w-md space-y-5 px-4 pt-5 pb-8">
      <section className={`${card} p-4`}>
        <p className="text-ink-soft text-[14px] font-semibold">Lugares em casa</p>
        <p className="tabular text-[24px] leading-8 font-black">
          {living} de {places}
        </p>
        <p className="tabular text-ink-soft text-[14px]">
          {rented > 0
            ? `Moradia: ${formatRate(-housing)}, com ${rented === 1 ? '1 lugar alugado' : `${rented} lugares alugados`}`
            : `Moradia: ${formatRate(-housing)} de contas das casas da família`}
        </p>
        <p className="text-ink-soft mt-2 text-[13px]">
          Cada pessoa precisa de um lugar: kitnet tem 2, apartamento 4 e casa 6. Quem não cabe nos
          imóveis da família mora de aluguel, a {formatMoney(rentPerPlace)} por lugar por mês, até{' '}
          {maxRented} lugares. Sem lugar livre, não dá para ter filho, e quem casa vai formar a
          própria família.
        </p>
      </section>

      <section className={`${card} p-4`}>
        <p className="text-ink-soft text-[14px] font-semibold">Aluguel</p>
        <p className="tabular text-income text-[24px] leading-8 font-black">
          {rent > 0 ? formatRate(rent) : 'Nenhum ainda'}
        </p>
        <p className="tabular text-ink-soft text-[14px]">
          {total === 0
            ? 'A família ainda não tem imóveis.'
            : total === 1
              ? '1 imóvel na família'
              : `${total} imóveis na família`}
        </p>
        <p className="text-ink-soft mt-2 text-[13px]">
          Os imóveis em que a família não mora rendem aluguel todo mês e ficam com ela, mesmo quando
          as pessoas morrem. Todos têm preço fixo. O bairro tem {PROPERTY_TYPES[0].lots} kitnets,
          apartamentos e casas, e os comerciais ficam à venda poucos de cada vez: até{' '}
          {BALANCE.properties.maxForSale} de cada tipo, e um novo aparece de tempos em tempos. Cada
          tipo libera com a primeira compra do anterior.
        </p>
      </section>

      <ul className="space-y-3">
        {visiblePropertyTypes(game).map((type) => (
          <PropertyCard key={type.id} game={game} type={type} living={living} />
        ))}
      </ul>
    </div>
  )
}

function PropertyCard({
  game,
  type,
  living,
}: {
  game: GameState
  type: PropertyType
  living: number
}) {
  const dispatch = useGameStore((store) => store.dispatch)
  const Icon = ICONS[type.id]
  const unlocked = isPropertyUnlocked(game, type.id)
  const owned = ownedCount(game, type.id)
  const price = propertyPrice(type.id)
  const left = propertiesLeft(game, type.id)
  const payback = paybackLabel(Math.round(paybackYears(type.id)))
  const previous = PROPERTY_TYPES[PROPERTY_TYPES.findIndex((other) => other.id === type.id) - 1]
  const inUse = homesInUse(game, living)[type.id] ?? 0
  const rented = owned - inUse

  return (
    <li className={`${card} p-3.5 ${unlocked ? '' : 'opacity-70'}`}>
      <div className="flex items-center gap-3">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-full ${
            unlocked ? 'bg-gold-soft text-gold' : 'bg-line text-ink-soft'
          }`}
        >
          {unlocked ? <Icon size={21} /> : <Lock size={19} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-extrabold">{type.name}</span>
          <span className="tabular text-ink-soft block text-[13px]">
            {type.home
              ? `${type.home.places} lugares · ${formatMoney(type.rentPerMonth)}/mês se alugado`
              : `${formatMoney(type.rentPerMonth)}/mês de aluguel cada`}
          </span>
        </span>
        {unlocked ? (
          <span className="shrink-0 text-right">
            <span className="tabular block text-[18px] leading-6 font-black">{owned}</span>
            <span className="text-ink-soft block text-[12px]">na família</span>
          </span>
        ) : null}
      </div>

      {unlocked ? (
        <div className="mt-3 flex items-center gap-3">
          <p className="tabular text-ink-soft min-w-0 flex-1 text-[13px]">
            {inUse > 0 ? (
              <span className="text-ink block font-bold">
                {inUse === owned
                  ? `A família mora ${owned === 1 ? 'nele' : 'em todos'}`
                  : `A família mora em ${inUse}`}
              </span>
            ) : null}
            {rented > 0 ? (
              <span className="text-income block font-bold">
                {formatRate(rented * type.rentPerMonth)} de aluguel
              </span>
            ) : null}
            {type.home
              ? left > 0
                ? `${left} à venda no bairro · se paga em ${payback} alugado`
                : 'Não há mais à venda no bairro'
              : marketLine(game, type.id, left, payback)}
          </p>
          <button
            type="button"
            className={`${button.small} tabular shrink-0`}
            disabled={left <= 0 || game.money < price}
            onClick={() => dispatch({ type: 'buyProperty', propertyId: type.id })}
            aria-label={`Comprar ${type.name.toLowerCase()} por ${formatMoney(price)}`}
          >
            {left <= 0 ? 'Esgotado' : `Comprar · ${formatMoney(price)}`}
          </button>
        </div>
      ) : (
        <p className="tabular text-ink-soft mt-3 text-[13px]">
          Libera com a primeira compra de {previous?.name.toLowerCase()}. Custa {formatMoney(price)}{' '}
          e se paga em {payback}.
        </p>
      )}
    </li>
  )
}
