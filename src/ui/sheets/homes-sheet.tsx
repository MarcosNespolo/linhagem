'use client'

import { PROPERTY_TYPES, type PropertyId } from '@/content/properties'
import {
  homeLots,
  homeUse,
  homeUseEffect,
  livesWithParents,
  livingCount,
  ownedLots,
  placesInUse,
  rentedPlaces,
  rentFor,
  type GameState,
  type HomeUse,
} from '@/engine'
import { useGameStore } from '@/game/store'
import { formatMoney, formatSignedMoney } from '@/lib/format'
import { cachedNeighborhoodLayout } from '../neighborhood/layout'
import { button, card } from '../styles'
import { useUiStore } from '../ui-store'
import { Sheet } from './sheet'

const HOME_USES: { use: HomeUse; label: string }[] = [
  { use: 'live', label: 'Morar' },
  { use: 'auto', label: 'Automático' },
  { use: 'rent', label: 'Alugar' },
]

/**
 * Onde a família mora: quantas pessoas cabem nos imóveis dela e quantas pagam
 * aluguel, e cada imóvel de moradia, com a escolha de morar, deixar no
 * automático ou alugar e o quanto o saldo do mês muda com cada uma.
 */
export function HomesSheet({ game }: { game: GameState }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const closeSheet = useUiStore((store) => store.closeSheet)
  const living = livingCount(game)
  const addresses = new Map(
    cachedNeighborhoodLayout(game)
      .rows.flatMap((row) => row.lots)
      .map((lot) => [`${lot.typeId}:${lot.lot}`, lot.address]),
  )
  const types = PROPERTY_TYPES.filter((type) => type.home && ownedLots(game, type.id).length > 0)
  const manual = Object.keys(game.homes.live).length + Object.keys(game.homes.rent).length > 0

  return (
    <Sheet title="Onde a família mora" onClose={closeSheet}>
      <section className={`${card} p-3`}>
        <p className="tabular text-[15px] font-bold">{placesLine(game, living)}</p>
        <p className="tabular text-ink-soft text-[14px]">{rentLine(game, living)}</p>
      </section>
      {manual ? (
        <button
          type="button"
          className={`${button.quiet} mt-1 w-full`}
          onClick={() => dispatch({ type: 'resetHomes' })}
        >
          Voltar tudo ao automático
        </button>
      ) : null}
      <p className="text-ink-soft mt-3 text-[13px] font-semibold">Saldo do mês com cada opção</p>
      <div className="mt-3 space-y-5">
        {types.map((type) => {
          const lived = new Set(homeLots(game, type.id, living))
          return (
            <section key={type.id}>
              <h3 className="px-1 text-[16px] font-extrabold">
                {type.plural} · {type.home?.places} lugares
              </h3>
              <ul className="mt-2 space-y-2">
                {ownedLots(game, type.id).map((lot) => (
                  <li key={lot} className={`${card} p-3`}>
                    <p className="text-[15px] font-bold">
                      {addresses.get(`${type.id}:${lot}`) ?? type.name}
                    </p>
                    <p className="tabular text-ink-soft mb-2 text-[13px]">
                      {lived.has(lot)
                        ? 'A família mora aqui'
                        : `Alugado, rende ${formatMoney(type.rentPerMonth)}/mês`}
                    </p>
                    <HomeUseControl game={game} propertyId={type.id} lot={lot} />
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </Sheet>
  )
}

/**
 * Escolha do uso de um imóvel de moradia: morar sempre, automático ou alugar
 * sempre. Cada opção mostra quanto o saldo da família muda por mês com ela
 * (sem "/mês", para caber em telas estreitas; quem usa diz que é por mês).
 */
export function HomeUseControl({
  game,
  propertyId,
  lot,
}: {
  game: GameState
  propertyId: PropertyId
  lot: number
}) {
  const dispatch = useGameStore((store) => store.dispatch)
  const current = homeUse(game, propertyId, lot)
  return (
    <div role="radiogroup" aria-label="Uso do imóvel" className="grid grid-cols-3 gap-1.5">
      {HOME_USES.map(({ use, label }) => {
        const active = use === current
        const effect = active ? 0 : homeUseEffect(game, propertyId, lot, use)
        const same = Math.abs(effect) < 0.5
        return (
          <button
            key={use}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => dispatch({ type: 'setHomeUse', propertyId, lot, use })}
            className={`rounded-xl px-1 py-1.5 text-center text-[13px] font-bold ring-1 transition active:scale-[0.98] ${
              active ? 'bg-leaf ring-leaf text-white' : 'bg-surface ring-line'
            }`}
          >
            {label}
            <span
              className={`tabular block text-[11px] font-semibold whitespace-nowrap ${
                active
                  ? 'text-white/85'
                  : same
                    ? 'text-ink-soft'
                    : effect > 0
                      ? 'text-income'
                      : 'text-expense'
              }`}
            >
              {active ? 'agora' : same ? 'igual' : formatSignedMoney(effect)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Quantas pessoas e quantos lugares nos imóveis em que a família mora. */
function placesLine(game: GameState, living: number): string {
  const people = living === 1 ? '1 pessoa' : `${living} pessoas`
  if (livesWithParents(game, living)) return `${people}, na casa dos pais`
  const places = placesInUse(game, living)
  return `${people} · ${places === 1 ? '1 lugar' : `${places} lugares`} nos imóveis da família`
}

/** Quem paga aluguel e quanto, ou os lugares que sobram em casa. */
function rentLine(game: GameState, living: number): string {
  if (livesWithParents(game, living)) return 'Os imóveis ficam alugados até sair da casa dos pais'
  const rented = rentedPlaces(game, living)
  if (rented > 0) {
    const who = rented === 1 ? '1 pessoa paga' : `${rented} pessoas pagam`
    return `${who} aluguel: ${formatMoney(rentFor(rented))}/mês`
  }
  const free = placesInUse(game, living) - living
  if (free <= 0) return 'Todos moram em imóveis da família'
  return free === 1 ? '1 lugar sobrando' : `${free} lugares sobrando`
}
