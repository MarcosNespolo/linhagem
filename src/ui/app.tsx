'use client'

import { useEffect } from 'react'
import { useGameStore } from '@/game/store'
import { useGameLoop } from '@/game/use-game-loop'
import { NewFamily } from './new-family'
import { Shell } from './shell'
import { button } from './styles'
import { loadUiPrefs } from './ui-store'

/** Raiz do jogo no navegador: liga o relógio e escolhe a tela certa. */
export function Game() {
  useGameLoop()
  useEffect(() => loadUiPrefs(), [])
  const game = useGameStore((store) => store.game)
  const blocked = useGameStore((store) => store.blocked)
  const setup = useGameStore((store) => store.setup)

  if (blocked) return <BlockedScreen />
  if (setup) return <NewFamily draft={setup} current={game} />
  if (!game) {
    return <div className="text-ink-soft grid min-h-dvh place-items-center">Abrindo a família…</div>
  }
  return <Shell game={game} />
}

function BlockedScreen() {
  const notice = useGameStore((store) => store.notice)
  return (
    <div className="mx-auto grid min-h-dvh max-w-md place-items-center px-6 text-center">
      <div className="space-y-4">
        <p className="text-lg font-bold">{notice}</p>
        <button type="button" onClick={() => window.location.reload()} className={button.primary}>
          Recarregar
        </button>
      </div>
    </div>
  )
}
