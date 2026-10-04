'use client'

import { Coins, Pause, Pencil, Play } from 'lucide-react'
import { calendarDate, type GameState } from '@/engine'
import { useGameStore } from '@/game/store'
import { formatMoney, formatMonthYear, formatRate } from '@/lib/format'
import { useUiStore } from './ui-store'

/** Barra do topo: nome da família, data, dinheiro, renda por segundo e pausa. */
export function Hud({ game, net }: { game: GameState; net: number }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const openSheet = useUiStore((store) => store.openSheet)
  const paused = game.clock.paused

  return (
    <header className="border-line bg-surface z-20 shrink-0 border-b px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <button
          type="button"
          onClick={() => openSheet({ kind: 'rename' })}
          className="min-w-0 flex-1 text-left"
          aria-label={`Família ${game.familyName}. Mudar o nome`}
        >
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[19px] leading-6 font-extrabold">
              Família {game.familyName}
            </span>
            <Pencil size={14} className="text-ink-soft shrink-0" aria-hidden="true" />
          </span>
          <span className="text-ink-soft block text-[14px] first-letter:uppercase">
            {formatMonthYear(calendarDate(game.startDate, game.clock.day))}
          </span>
        </button>
        <div className="shrink-0 text-right">
          <p className="tabular flex items-center justify-end gap-1.5 text-[24px] leading-7 font-black">
            <Coins size={20} className="text-gold" aria-hidden="true" />
            {formatMoney(game.money)}
          </p>
          <p
            className={`tabular text-[14px] font-bold ${net < 0 ? 'text-expense' : 'text-income'}`}
          >
            {formatRate(net)}
          </p>
        </div>
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
      </div>
      {paused ? (
        <p className="bg-gold-soft text-gold mx-auto mt-2 max-w-3xl rounded-xl px-3 py-1.5 text-center text-[13px] font-bold">
          Tempo pausado. Ninguém envelhece e o dinheiro não entra.
        </p>
      ) : null}
    </header>
  )
}
