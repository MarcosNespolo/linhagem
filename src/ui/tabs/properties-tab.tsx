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
  isPropertyUnlocked,
  ownedCount,
  paybackYears,
  propertyPrice,
  rentPerMonth,
  totalProperties,
  visiblePropertyTypes,
  type GameState,
} from '@/engine'
import { useGameStore } from '@/game/store'
import { formatMoney, formatRate } from '@/lib/format'
import { button, card } from '../styles'

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
 * Aba Imóveis: o aluguel total no topo e um cartão por tipo, com quantos a
 * família tem, o aluguel e o preço do próximo. O tipo seguinte aparece
 * bloqueado, com o preço.
 */
export function PropertiesTab({ game }: { game: GameState }) {
  const rent = rentPerMonth(game)
  const total = totalProperties(game)
  const growth = Math.round((BALANCE.properties.priceGrowth - 1) * 100)

  return (
    <div className="mx-auto w-full max-w-md space-y-5 px-4 pt-5 pb-8">
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
          Imóveis rendem aluguel todo mês e ficam com a família, mesmo quando as pessoas morrem.
          Cada um custa {growth}% a mais que o anterior do mesmo tipo, e o tipo seguinte libera com
          a primeira compra.
        </p>
      </section>

      <ul className="space-y-3">
        {visiblePropertyTypes(game).map((type) => (
          <PropertyCard key={type.id} game={game} type={type} />
        ))}
      </ul>
    </div>
  )
}

function PropertyCard({ game, type }: { game: GameState; type: PropertyType }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const Icon = ICONS[type.id]
  const unlocked = isPropertyUnlocked(game, type.id)
  const owned = ownedCount(game, type.id)
  const price = propertyPrice(game, type.id)
  const years = Math.round(paybackYears(game, type.id))
  const previous = PROPERTY_TYPES[PROPERTY_TYPES.findIndex((other) => other.id === type.id) - 1]

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
            {formatMoney(type.rentPerMonth)}/mês de aluguel cada
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
            {owned > 0 ? (
              <span className="text-income block font-bold">
                {formatRate(owned * type.rentPerMonth)} no total
              </span>
            ) : null}
            {owned > 0 ? 'O próximo' : 'O primeiro'} se paga em {years} anos
          </p>
          <button
            type="button"
            className={`${button.small} tabular shrink-0`}
            disabled={game.money < price}
            onClick={() => dispatch({ type: 'buyProperty', propertyId: type.id })}
            aria-label={`Comprar ${type.name.toLowerCase()} por ${formatMoney(price)}`}
          >
            Comprar · {formatMoney(price)}
          </button>
        </div>
      ) : (
        <p className="tabular text-ink-soft mt-3 text-[13px]">
          Libera com a primeira compra de {previous?.name.toLowerCase()}. Custa {formatMoney(price)}{' '}
          e se paga em {years} anos.
        </p>
      )}
    </li>
  )
}
