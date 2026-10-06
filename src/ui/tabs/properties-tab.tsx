'use client'

import {
  Briefcase,
  Building,
  Building2,
  DoorOpen,
  House,
  Landmark,
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
  checkBuyProperty,
  extraHousingCost,
  familyRates,
  financingTerms,
  homesInUse,
  housingCost,
  isPropertyUnlocked,
  livingCount,
  loanInstallments,
  maintenanceCost,
  ownedCount,
  ownedPlaces,
  paybackYears,
  propertiesLeft,
  propertyPrice,
  purchaseCost,
  rentedPlaces,
  rentPerMonth,
  totalDebt,
  totalProperties,
  totalVacant,
  vacantUnits,
  visiblePropertyTypes,
  type GameState,
  type Loan,
} from '@/engine'
import { useGameStore } from '@/game/store'
import { formatGameSpan, formatMoney, formatSignedMoney } from '@/lib/format'
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
 * abre o painel do tipo, e a lista, com a moradia da família, o aluguel, os
 * financiamentos e um cartão por tipo.
 */
export function PropertiesTab({ game, view }: { game: GameState; view: PropertiesView }) {
  return view === 'map' ? <NeighborhoodView game={game} /> : <PropertiesList game={game} />
}

/**
 * O bairro: a moradia, o aluguel e os financiamentos em cima, a legenda e o
 * mapa, com as ruas dos tipos liberados e a do próximo, em obras.
 */
function NeighborhoodView({ game }: { game: GameState }) {
  return (
    <div className="mx-auto w-full max-w-md space-y-3 px-4 pt-4 pb-8">
      <Summary game={game} compact />
      <MapLegend />
      <div className="ring-line overflow-hidden rounded-2xl ring-1">
        <NeighborhoodMap layout={cachedNeighborhoodLayout(game)} onSelect={showLot} />
      </div>
    </div>
  )
}

/**
 * Os números da família em imóveis: o que a moradia custa, o que o aluguel
 * rende, já sem a manutenção, e as parcelas dos financiamentos. Os valores
 * ficam sem a unidade, que vai em letra menor, para caberem em meia tela.
 */
function Summary({ game, compact = false }: { game: GameState; compact?: boolean }) {
  const living = livingCount(game)
  const rent = rentPerMonth(game, living) - maintenanceCost(game, living)
  const housing = housingCost(game, living)
  const total = totalProperties(game)
  const vacant = totalVacant(game, living)
  const installments = loanInstallments(game)
  const pad = compact ? 'p-3' : 'p-4'
  const label = compact ? 'text-[13px]' : 'text-[14px]'
  const small = compact ? 'text-[13px]' : 'text-[14px]'
  return (
    <div className={compact ? 'space-y-3' : 'space-y-5'}>
      <div className="grid grid-cols-2 gap-3">
        <section className={`${card} min-w-0 ${pad}`}>
          <p className={`text-ink-soft font-semibold ${label}`}>Moradia</p>
          <Amount value={-housing} none="Nenhuma" />
          <p className={`tabular text-ink-soft ${small}`}>{rentersLine(game, living)}</p>
          <p className={`tabular text-ink-soft ${small}`}>{nextPlaceLine(game, living)}</p>
        </section>
        <section className={`${card} min-w-0 ${pad}`}>
          <p className={`text-ink-soft font-semibold ${label}`}>Aluguel</p>
          <Amount value={rent} none={total === 0 ? 'Nenhum ainda' : 'Nenhum'} />
          <p className={`tabular text-ink-soft ${small}`}>
            {total === 1 ? '1 imóvel na família' : `${total} imóveis na família`}
          </p>
          {vacant > 0 ? (
            <p className={`tabular text-expense font-semibold ${small}`}>
              {vacant === 1 ? '1 vazio' : `${vacant} vazios`}
            </p>
          ) : null}
        </section>
      </div>
      {game.loans.length > 0 ? (
        <section className={`${card} ${pad}`}>
          <p className={`text-ink-soft font-semibold ${label}`}>Financiamentos</p>
          <Amount value={-installments} none="Nenhum" />
          <p className={`tabular text-ink-soft ${small}`}>
            {game.loans.length === 1 ? '1 parcela' : `${game.loans.length} parcelas`} ·{' '}
            {formatMoney(totalDebt(game))} a pagar
          </p>
        </section>
      ) : null}
    </div>
  )
}

/**
 * Valor por mês em destaque: o sinal e o número grandes, sem quebrar a linha,
 * e "/mês" pequeno, para caber em meia tela mesmo nos celulares estreitos.
 */
function Amount({ value, none }: { value: number; none: string }) {
  if (value === 0) return <p className="text-ink-soft text-[20px] leading-7 font-black">{none}</p>
  return (
    <p
      className={`tabular text-[clamp(16px,5.6vw,20px)] leading-7 font-black whitespace-nowrap ${value < 0 ? 'text-expense' : 'text-income'}`}
    >
      {formatSignedMoney(value)}
      <span className="text-[12px] font-bold">/mês</span>
    </p>
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
 * A lista: a moradia da família, o aluguel, os financiamentos, com o botão de
 * quitar cada um, e um cartão por tipo, com quantos a família tem, em quantos
 * ela mora, quantos estão à venda, o preço, o botão de comprar à vista e o de
 * financiar. O tipo seguinte aparece bloqueado, com o preço.
 */
function PropertiesList({ game }: { game: GameState }) {
  const living = livingCount(game)
  return (
    <div className="mx-auto w-full max-w-md space-y-5 px-4 pt-5 pb-8">
      <Summary game={game} />
      {game.loans.length > 0 ? (
        <ul className="space-y-2">
          {game.loans.map((loan) => (
            <LoanRow key={loan.id} game={game} loan={loan} />
          ))}
        </ul>
      ) : null}
      <ul className="space-y-3">
        {visiblePropertyTypes(game).map((type) => (
          <PropertyCard key={type.id} game={game} type={type} living={living} />
        ))}
      </ul>
    </div>
  )
}

/** Um financiamento: o imóvel, a parcela, o que falta e o botão de quitar. */
function LoanRow({ game, loan }: { game: GameState; loan: Loan }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const type = PROPERTY_TYPES.find((candidate) => candidate.id === loan.propertyId)
  const Icon = ICONS[loan.propertyId]
  const canPay = game.money >= loan.balance
  return (
    <li className={`${card} flex items-center gap-3 p-3`}>
      <span className="bg-gold-soft text-gold grid size-10 shrink-0 place-items-center rounded-full">
        <Icon size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold">{type?.name}</span>
        <span className="tabular text-ink-soft block text-[13px]">
          {formatMoney(loan.installment)}/mês ·{' '}
          {formatGameSpan(
            Math.round((loan.monthsLeft * BALANCE.daysPerYear) / 12),
            BALANCE.daysPerYear,
          )}
          {' · '}
          {formatMoney(loan.balance)} a pagar
        </span>
      </span>
      <button
        type="button"
        className={`${button.small} tabular shrink-0`}
        disabled={!canPay}
        onClick={() => dispatch({ type: 'payOffLoan', loanId: loan.id })}
        aria-label={`Quitar o financiamento ${type?.gender === 'f' ? 'da' : 'do'} ${type?.name.toLowerCase()} por ${formatMoney(loan.balance)}`}
      >
        <Landmark size={14} />
        Quitar
      </button>
    </li>
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
  const price = propertyPrice(game, type.id)
  const cost = purchaseCost(game, type.id)
  const left = propertiesLeft(game, type.id)
  const payback = paybackLabel(Math.round(paybackYears(game, type.id)))
  const previous = PROPERTY_TYPES[PROPERTY_TYPES.findIndex((other) => other.id === type.id) - 1]
  const inUse = homesInUse(game, living)[type.id] ?? 0
  const vacant = vacantUnits(game, type.id, living)
  const rented = owned - inUse - vacant
  const terms = financingTerms(game, type.id)
  const cash = checkBuyProperty(game, type.id)
  const financed = checkBuyProperty(game, type.id, undefined, true, familyRates(game).income)

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
        <>
          <p className="tabular text-ink-soft mt-3 text-[13px]">
            {inUse > 0 ? (
              <span className="text-ink block font-bold">
                {inUse === owned
                  ? `A família mora ${owned === 1 ? 'nele' : 'em todos'}`
                  : `A família mora em ${inUse}`}
              </span>
            ) : null}
            {rented > 0 ? (
              <span className="text-income block font-bold">
                {formatSignedMoney(rented * type.rentPerMonth)}/mês de aluguel
                {vacant > 0 ? ` · ${vacant === 1 ? '1 vazio' : `${vacant} vazios`}` : ''}
              </span>
            ) : vacant > 0 ? (
              <span className="text-expense block font-bold">
                {vacant === 1 ? '1 vazio' : `${vacant} vazios`}
              </span>
            ) : null}
            {type.home
              ? left > 0
                ? `${left} à venda · se paga em ${payback} alugado`
                : 'Esgotado no bairro'
              : marketLine(game, type.id, left, payback)}
          </p>
          {left > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`${button.small} tabular flex-col gap-0 py-1.5 leading-tight`}
                disabled={!cash.ok}
                onClick={() => dispatch({ type: 'buyProperty', propertyId: type.id })}
                aria-label={`Comprar ${type.name.toLowerCase()} por ${formatMoney(cost)}, com o ITBI`}
              >
                <span>Comprar</span>
                <span className="text-[12px] font-bold opacity-90">{formatMoney(cost)}</span>
              </button>
              <button
                type="button"
                className={`${button.smallSecondary} tabular flex-col gap-0 py-1.5 leading-tight`}
                disabled={!financed.ok}
                onClick={() =>
                  dispatch({ type: 'buyProperty', propertyId: type.id, financed: true })
                }
                aria-label={`Financiar ${type.name.toLowerCase()}: ${formatMoney(terms.down + terms.tax)} de entrada e ${formatMoney(terms.installment)} por mês`}
              >
                <span>Financiar</span>
                <span className="text-[12px] font-bold opacity-90">
                  {formatMoney(terms.down + terms.tax)} + {formatMoney(terms.installment)}/mês
                </span>
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <p className="tabular text-ink-soft mt-3 text-[13px]">
          Libera com {previous?.name.toLowerCase()} · {formatMoney(price)} · se paga em {payback}
        </p>
      )}
    </li>
  )
}

/** Quem mora de aluguel, ou os lugares que sobram nos imóveis da família. */
function rentersLine(game: GameState, living: number): string {
  const rented = rentedPlaces(game, living)
  if (rented > 0) return rented === 1 ? '1 pessoa de aluguel' : `${rented} pessoas de aluguel`
  const free = ownedPlaces(game) - living
  if (free <= 0) return 'Todos em imóveis da família'
  return free === 1 ? '1 lugar livre em casa' : `${free} lugares livres em casa`
}

/** O que custa por mês o lugar de mais uma pessoa na família. */
function nextPlaceLine(game: GameState, living: number): string {
  const extra = extraHousingCost(game, 1, living)
  return extra > 0 ? `Mais um: ${formatSignedMoney(-extra)}` : 'Mais um: sem custo'
}
