'use client'

import { BALANCE } from '@/content/balance'
import { PROPERTY_TYPES, propertyType, type PropertyId } from '@/content/properties'
import {
  homesInUse,
  isPropertyUnlocked,
  livingCount,
  ownedCount,
  paybackYears,
  propertiesLeft,
  propertyPrice,
  type GameState,
} from '@/engine'
import { useGameStore } from '@/game/store'
import { formatMoney, formatRate } from '@/lib/format'
import { marketLine, paybackLabel } from '../labels'
import { BuildingPreview } from '../neighborhood/building-preview'
import { COLORS } from '../neighborhood/buildings'
import { cachedNeighborhoodLayout } from '../neighborhood/layout'
import { button } from '../styles'
import { useUiStore } from '../ui-store'
import { Sheet } from './sheet'

/**
 * Painel de um tipo de imóvel, aberto pelo bairro: o desenho do próximo à
 * venda, quantos a família tem, em quantos mora, o aluguel que rendem,
 * quantos estão à venda e o botão de compra. Fica aberto depois da compra,
 * para comprar outro. O tipo em obras mostra o que falta para liberar.
 */
export function PropertySheet({ game, propertyId }: { game: GameState; propertyId: PropertyId }) {
  const closeSheet = useUiStore((store) => store.closeSheet)
  const dispatch = useGameStore((store) => store.dispatch)
  const type = propertyType(propertyId)
  const lots = cachedNeighborhoodLayout(game)
    .rows.flatMap((row) => row.lots)
    .filter((lot) => lot.typeId === propertyId)
  const lot = lots.find((candidate) => candidate.sign) ?? lots[0]
  const unlocked = isPropertyUnlocked(game, propertyId)
  const owned = ownedCount(game, propertyId)
  const inUse = homesInUse(game, livingCount(game))[propertyId] ?? 0
  const rent = (owned - inUse) * type.rentPerMonth
  const left = propertiesLeft(game, propertyId)
  const price = propertyPrice(propertyId)
  const payback = paybackLabel(Math.round(paybackYears(propertyId)))
  const previous = PROPERTY_TYPES[PROPERTY_TYPES.findIndex((other) => other.id === propertyId) - 1]
  const { rentPerPlace, rentedPlaces: maxRented } = BALANCE.housing

  return (
    <Sheet title={type.name} onClose={closeSheet}>
      {lot ? (
        <div className="mt-2 overflow-hidden rounded-2xl" style={{ background: COLORS.grass }}>
          <BuildingPreview lot={lot} />
        </div>
      ) : null}
      <p className="tabular text-ink-soft mt-3 text-[15px]">
        {type.home
          ? `${type.home.places} lugares para a família · ${formatMoney(type.rentPerMonth)}/mês se alugado`
          : `${formatMoney(type.rentPerMonth)}/mês de aluguel cada`}
      </p>

      {unlocked ? (
        <>
          <dl className={`mt-3 grid gap-2 ${type.home ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <Stat label="Na família" value={String(owned)} />
            {type.home ? (
              <Stat label="A família mora" value={inUse === 1 ? 'em 1' : `em ${inUse}`} />
            ) : null}
            <Stat
              label="Aluguel"
              value={rent > 0 ? formatRate(rent) : 'Nenhum'}
              income={rent > 0}
            />
          </dl>
          <p className="tabular text-ink-soft mt-3 text-[14px]">
            {type.home
              ? left > 0
                ? `${left} à venda no bairro · se paga em ${payback} alugado`
                : 'Não há mais à venda no bairro'
              : marketLine(game, propertyId, left, payback)}
          </p>
          <button
            type="button"
            className={`${button.primary} tabular mt-4 w-full`}
            disabled={left <= 0 || game.money < price}
            onClick={() => dispatch({ type: 'buyProperty', propertyId })}
          >
            {left <= 0 ? 'Esgotado' : `Comprar · ${formatMoney(price)}`}
          </button>
          {left > 0 && game.money < price ? (
            <p className="tabular text-ink-soft mt-2 text-center text-[13px]">
              Faltam {formatMoney(price - game.money)}
            </p>
          ) : null}
          {type.home ? (
            <p className="text-ink-soft mt-3 text-[13px]">
              Cada pessoa precisa de um lugar em casa. Quem não cabe nos imóveis da família mora de
              aluguel, a {formatMoney(rentPerPlace)} por lugar por mês, até {maxRented} lugares. Os
              imóveis em que ninguém mora rendem aluguel.
            </p>
          ) : null}
        </>
      ) : (
        <p className="tabular mt-3 text-[15px]">
          Em obras. Libera com a primeira compra de {previous?.name.toLowerCase()}. Custa{' '}
          {formatMoney(price)} e se paga em {payback}.
        </p>
      )}
    </Sheet>
  )
}

function Stat({
  label,
  value,
  income = false,
}: {
  label: string
  value: string
  income?: boolean
}) {
  return (
    <div className="bg-canvas rounded-xl px-2.5 py-2">
      <dt className="text-ink-soft text-[12px] font-semibold">{label}</dt>
      <dd className={`tabular text-[16px] leading-6 font-black ${income ? 'text-income' : ''}`}>
        {value}
      </dd>
    </div>
  )
}
