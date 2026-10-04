'use client'

import { Pause, Play, Settings, Target, Zap } from 'lucide-react'
import { BALANCE } from '@/content/balance'
import {
  boostTicksLeft,
  calendarDate,
  claimableMissions,
  isMissionDone,
  TICKS_PER_DAY,
  type GameState,
} from '@/engine'
import { useGameStore } from '@/game/store'
import { formatAmount, formatGameSpan, formatMonthYear, formatRate } from '@/lib/format'
import { useUiStore } from './ui-store'

/**
 * Barra do topo: nome da família, data, missões do dia, dinheiro, renda por
 * mês, pausa e Ajustes. Com a renda em dobro, uma faixa mostra o tempo que falta.
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

  return (
    <header className="border-line bg-surface z-20 shrink-0 border-b px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
      <div className="mx-auto flex max-w-3xl items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => openSheet({ kind: 'rename' })}
            className="block max-w-full truncate text-left text-[19px] leading-6 font-extrabold"
            aria-label={`Família ${game.familyName}. Mudar o nome`}
          >
            Família {game.familyName}
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-ink-soft truncate text-[14px] first-letter:uppercase">
              {formatMonthYear(calendarDate(game.startDate, game.clock.day), 'short')}
            </span>
            <MissionsButton game={game} />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular flex items-baseline justify-end gap-1 text-[24px] leading-7 font-black">
            <span className="text-gold text-[16px] font-extrabold">R$</span>
            {formatAmount(game.money)}
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
        <button
          type="button"
          onClick={() => setTab(tab === 'settings' ? 'family' : 'settings')}
          aria-label="Ajustes"
          aria-current={tab === 'settings' ? 'page' : undefined}
          className={`-mr-1 grid size-9 shrink-0 place-items-center rounded-full transition active:scale-95 ${
            tab === 'settings' ? 'bg-leaf-soft text-leaf-strong' : 'text-ink-soft'
          }`}
        >
          <Settings size={21} />
        </button>
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
      ) : paused ? (
        <p className="bg-gold-soft text-gold mx-auto mt-2 max-w-3xl rounded-xl px-3 py-1.5 text-center text-[13px] font-bold">
          Tempo pausado. Ninguém envelhece e o dinheiro não entra.
        </p>
      ) : boostLeft > 0 ? (
        <p className="bg-gold-soft text-gold mx-auto mt-2 flex max-w-3xl items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-bold">
          <Zap size={14} fill="currentColor" aria-hidden="true" />
          Renda ×2 por mais{' '}
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
    return `Tempo parado: ${choices.length} ${allSchool ? 'matrículas' : 'escolhas'} esperando você.`
  }
  const name = game.members[first.memberId]?.firstName ?? 'alguém'
  switch (first.type) {
    case 'school':
      return `Tempo parado: falta a matrícula de ${name}.`
    case 'afterSchool':
      return `Tempo parado: falta decidir o que ${name} faz depois do médio.`
    case 'firstJob':
      return `Tempo parado: falta escolher o primeiro emprego de ${name}.`
    case 'concurso':
      return `Tempo parado: saiu o resultado do concurso de ${name}.`
  }
}
