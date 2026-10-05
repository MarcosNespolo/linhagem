'use client'

import {
  PROPERTY_TYPES,
  propertyType,
  type PropertyId,
  type PropertyType,
} from '@/content/properties'
import {
  lotsForSale,
  nextListingDay,
  propertiesLeft,
  propertyPrice,
  type GameState,
} from '@/engine'
import { useGameStore } from '@/game/store'
import { formatGameSpan, formatMoney } from '@/lib/format'
import { BALANCE } from '@/content/balance'
import { BuildingPreview } from '../neighborhood/building-preview'
import { COLORS } from '../neighborhood/buildings'
import { cachedNeighborhoodLayout, type MapLot } from '../neighborhood/layout'
import { button } from '../styles'
import { useUiStore } from '../ui-store'
import { Sheet } from './sheet'

/**
 * Painel do imóvel tocado no bairro: o desenho e o endereço daquele lote e o
 * que ele é para a família. À venda, o botão compra exatamente esse lote.
 */
export function LotSheet({
  game,
  propertyId,
  lot,
}: {
  game: GameState
  propertyId: PropertyId
  lot: number
}) {
  const closeSheet = useUiStore((store) => store.closeSheet)
  const type = propertyType(propertyId)
  const mapLot = cachedNeighborhoodLayout(game)
    .rows.flatMap((row) => row.lots)
    .find((candidate) => candidate.typeId === propertyId && candidate.lot === lot)

  return (
    <Sheet title={type.name} onClose={closeSheet}>
      {mapLot ? (
        <>
          <p className="text-ink-soft text-[14px]">
            {mapLot.state === 'locked' ? 'Em obras' : mapLot.address}
          </p>
          <div className="mt-3 overflow-hidden rounded-2xl" style={{ background: COLORS.grass }}>
            <BuildingPreview lot={mapLot} />
          </div>
          <LotStatus game={game} type={type} lot={mapLot} />
        </>
      ) : null}
    </Sheet>
  )
}

function LotStatus({ game, type, lot }: { game: GameState; type: PropertyType; lot: MapLot }) {
  const rent = formatMoney(type.rentPerMonth)
  switch (lot.state) {
    case 'home':
      return (
        <Status
          title="A família mora aqui"
          line={`${type.home?.places} lugares · contas de ${formatMoney(type.home?.billsPerMonth ?? 0)} por mês`}
        />
      )
    case 'rented':
      return lot.count ? (
        <>
          <Status
            title={`A família tem ${lot.count} ${type.plural.toLowerCase()}`}
            line={`Rendem ${formatMoney(lot.count * type.rentPerMonth)} por mês`}
          />
          <BuyElsewhere game={game} type={type} />
        </>
      ) : (
        <Status
          title={`É da família e está ${type.gender === 'f' ? 'alugada' : 'alugado'}`}
          line={`Rende ${rent} por mês`}
        />
      )
    case 'forSale':
      return (
        <>
          <Status
            title={`À venda por ${formatMoney(propertyPrice(type.id))}`}
            line={
              type.home
                ? `${type.home.places} lugares · alugado, rende ${rent} por mês`
                : `Alugado, rende ${rent} por mês`
            }
          />
          <BuyButton game={game} type={type} lot={lot.lot} />
        </>
      )
    case 'neighbor':
      return <Status title="É de um vizinho" line={neighborLine(game, type)} />
    case 'locked':
      return <Status title="Em obras" line={lockedLine(type)} />
  }
}

function Status({ title, line }: { title: string; line: string }) {
  return (
    <div className="mt-3">
      <p className="tabular text-[18px] leading-6 font-extrabold">{title}</p>
      <p className="tabular text-ink-soft mt-0.5 text-[15px]">{line}</p>
    </div>
  )
}

/** Compra o lote que está aberto no painel. */
function BuyButton({ game, type, lot }: { game: GameState; type: PropertyType; lot?: number }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const price = propertyPrice(type.id)
  const missing = price - game.money
  return (
    <>
      <button
        type="button"
        className={`${button.primary} tabular mt-4 w-full`}
        disabled={missing > 0}
        onClick={() => dispatch({ type: 'buyProperty', propertyId: type.id, lot })}
      >
        Comprar por {formatMoney(price)}
      </button>
      {missing > 0 ? (
        <p className="tabular text-ink-soft mt-2 text-center text-[13px]">
          Faltam {formatMoney(missing)}
        </p>
      ) : null}
    </>
  )
}

/**
 * Com todos os lotes da rua, os comerciais à venda ficam fora dela: o lote que
 * mostra o total da família compra mais um.
 */
function BuyElsewhere({ game, type }: { game: GameState; type: PropertyType }) {
  const left = propertiesLeft(game, type.id)
  if (left <= 0 || lotsForSale(game, type.id).length > 0) return null
  return (
    <>
      <p className="text-ink-soft mt-3 text-[15px]">
        {left === 1 ? 'Mais 1 à venda na cidade' : `Mais ${left} à venda na cidade`}
      </p>
      <BuyButton game={game} type={type} />
    </>
  )
}

function neighborLine(game: GameState, type: PropertyType): string {
  const next = nextListingDay(game, type.id)
  if (next === null) return 'Não está à venda'
  return `Não está à venda · próximo em ${formatGameSpan(next - game.clock.day, BALANCE.daysPerYear)}`
}

/** O que falta para o tipo sair das obras: a primeira compra do tipo anterior. */
function lockedLine(type: PropertyType): string {
  const previous = PROPERTY_TYPES[PROPERTY_TYPES.findIndex((other) => other.id === type.id) - 1]
  const first = previous?.gender === 'f' ? 'a primeira' : 'o primeiro'
  const price = formatMoney(propertyPrice(type.id))
  if (!previous) return price
  return `Libera ao comprar ${first} ${previous.name.toLowerCase()} · ${price}`
}
