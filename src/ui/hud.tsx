'use client'

import { Pause, Play, Settings, Target, Zap } from 'lucide-react'
import { BALANCE } from '@/content/balance'
import {
  boostTicksLeft,
  calendarDate,
  claimableMissions,
  daysToBankruptcy,
  isMissionDone,
  TICKS_PER_DAY,
  type GameState,
} from '@/engine'
import { useGameStore } from '@/game/store'
import { formatAmount, formatGameSpan, formatMonthYear, formatRate } from '@/lib/format'
import { boostLabel } from './labels'
import { useUiStore } from './ui-store'

/**
 * Barra do topo: o nome da família numa linha só dele, com Ajustes; embaixo,
 * data, missões do dia, dinheiro, renda por mês e pausa. Uma faixa no fim
 * mostra as escolhas abertas, o prazo para a falência no vermelho, o tempo
 * pausado ou o que falta do bônus na renda.
 */
export function Hud({ game, net }: { game: GameState; net: number }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const openSheet = useUiStore((store) => store.openSheet)
  const showChoices = useUiStore((store) => store.showChoices)
  const tab = useUiStore((store) => store.tab)
  const setTab = useUiStore((store) => store.setTab)
  const paused = game.clock.paused
  const waiting = waitingText(game)
  const boostLeft = boostTicksLeft(game)
  const debtLeft = daysToBankruptcy(game)
  const ended = game.bankruptDay !== null

  return (
    <header className="border-line bg-surface z-20 shrink-0 border-b px-4 pt-[max(env(safe-area-inset-top),0.625rem)] pb-2.5">
      {/* O nome da família tem quase a linha inteira, para caber mesmo quando é longo. */}
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        <button
          type="button"
          onClick={() => openSheet({ kind: 'rename' })}
          className="line-clamp-2 block min-w-0 flex-1 text-left text-[18px] leading-[22px] font-extrabold break-words"
          aria-label={`Família ${game.familyName}. Mudar o nome`}
        >
          Família {game.familyName}
        </button>
        <MissionsButton game={game} />
        <button
          type="button"
          onClick={() => setTab(tab === 'settings' ? 'family' : 'settings')}
          aria-label="Ajustes"
          aria-current={tab === 'settings' ? 'page' : undefined}
          className={`-mr-1.5 grid size-9 shrink-0 place-items-center rounded-full transition active:scale-95 ${
            tab === 'settings' ? 'bg-leaf-soft text-leaf-strong' : 'text-ink-soft'
          }`}
        >
          <Settings size={21} />
        </button>
      </div>
      <div className="mx-auto mt-0.5 flex max-w-3xl items-center gap-2.5">
        <span className="text-ink-soft min-w-0 flex-1 truncate text-[14px] first-letter:uppercase">
          {formatMonthYear(calendarDate(game.startDate, game.clock.day), 'short')}
        </span>
        <div className="min-w-0 shrink-0 text-right whitespace-nowrap">
          <p
            className={`tabular flex items-baseline justify-end gap-1 text-[clamp(18px,6vw,22px)] leading-7 font-black ${game.money < 0 ? 'text-expense' : ''}`}
          >
            <span
              className={`text-[15px] font-extrabold ${game.money < 0 ? 'text-expense' : 'text-gold'}`}
            >
              R$
            </span>
            {formatAmount(game.money)}
          </p>
          <p
            className={`tabular text-[14px] leading-5 font-bold ${net < 0 ? 'text-expense' : 'text-income'}`}
          >
            {formatRate(net)}
          </p>
        </div>
        {ended ? null : (
          <button
            type="button"
            onClick={() => dispatch({ type: paused ? 'resume' : 'pause' })}
            aria-label={paused ? 'Continuar o tempo' : 'Pausar o tempo'}
            className={`grid size-11 shrink-0 place-items-center rounded-full transition active:scale-95 ${
              paused ? 'bg-gold text-white' : 'bg-leaf-soft text-leaf-strong'
            }`}
          >
            {paused ? (
              <Play size={20} fill="currentColor" />
            ) : (
              <Pause size={20} fill="currentColor" />
            )}
          </button>
        )}
      </div>
      {waiting ? (
        <div className="bg-gold-soft text-gold mx-auto mt-2 flex max-w-3xl items-center gap-3 rounded-xl py-1 pr-1 pl-3 text-[13px] font-bold">
          <p className="min-w-0 flex-1">{waiting}</p>
          <button
            type="button"
            onClick={showChoices}
            className="bg-gold shrink-0 rounded-full px-3 py-1.5 text-white transition active:scale-95"
          >
            Escolher
          </button>
        </div>
      ) : debtLeft !== null && !ended ? (
        <p className="bg-rose-soft text-expense mx-auto mt-2 max-w-3xl rounded-xl px-3 py-1.5 text-center text-[13px] font-bold">
          No vermelho: falência em {formatGameSpan(debtLeft, BALANCE.daysPerYear)}
          {paused ? ' · tempo pausado' : ''}
        </p>
      ) : paused && !ended ? (
        <p className="bg-gold-soft text-gold mx-auto mt-2 max-w-3xl rounded-xl px-3 py-1.5 text-center text-[13px] font-bold">
          Tempo pausado
        </p>
      ) : boostLeft > 0 ? (
        <p className="bg-gold-soft text-gold mx-auto mt-2 flex max-w-3xl items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-bold">
          <Zap size={14} fill="currentColor" aria-hidden="true" />
          Renda {boostLabel()} por mais{' '}
          {formatGameSpan(Math.ceil(boostLeft / TICKS_PER_DAY), BALANCE.daysPerYear)}
        </p>
      ) : null}
    </header>
  )
}

/** Botão das missões do dia, com um selo quando há recompensa para pegar. */
function MissionsButton({ game }: { game: GameState }) {
  const openSheet = useUiStore((store) => store.openSheet)
  const missions = game.missions
  if (!missions) return null
  const done = missions.list.filter(isMissionDone).length
  const ready = claimableMissions(game).length
  return (
    <button
      type="button"
      onClick={() => openSheet({ kind: 'missions' })}
      className="bg-gold-soft text-gold relative inline-flex shrink-0 items-center gap-1 rounded-full py-0.5 pr-2 pl-1.5 text-[12px] font-extrabold transition active:scale-95"
      aria-label={`Missões do dia: ${done} de ${missions.list.length} cumpridas${ready > 0 ? `, ${ready} para pegar a recompensa` : ''}`}
    >
      <Target size={14} aria-hidden="true" />
      <span className="tabular">
        {done}/{missions.list.length}
      </span>
      {ready > 0 ? (
        <span className="bg-rose ring-surface absolute -top-1 -right-1 size-2.5 rounded-full ring-2" />
      ) : null}
    </button>
  )
}

/** Aviso de tempo parado por escolhas abertas, ou null quando não há nenhuma. */
function waitingText(game: GameState): string | null {
  const { choices } = game
  const [first] = choices
  if (!first) return null
  if (choices.length > 1) {
    const allSchool = choices.every(
      (choice) => choice.type === 'school' || choice.type === 'afterSchool',
    )
    return `Tempo parado: ${choices.length} ${allSchool ? 'matrículas' : 'escolhas'}`
  }
  const name = game.members[first.memberId]?.firstName ?? 'alguém'
  switch (first.type) {
    case 'school':
      return `Tempo parado: matrícula de ${name}`
    case 'afterSchool':
      return game.members[first.memberId]?.career
        ? `Tempo parado: ${name} quer voltar a estudar`
        : `Tempo parado: ${name} terminou o médio`
    case 'firstJob':
      return `Tempo parado: primeiro emprego de ${name}`
    case 'concurso':
      return `Tempo parado: concurso de ${name}`
    case 'meet':
      return `Tempo parado: ${name} conheceu alguém`
    case 'propose':
      return `Tempo parado: pedido de casamento de ${name}`
    case 'graduation':
      return `Tempo parado: ${name} se formou`
  }
}
