'use client'

import { useState } from 'react'
import { FAMILY_NAME_MAX_LENGTH, type GameState } from '@/engine'
import { useGameStore } from '@/game/store'
import { button } from '../styles'
import { useUiStore } from '../ui-store'
import { Sheet } from './sheet'

export function RenameSheet({ game }: { game: GameState }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const closeSheet = useUiStore((store) => store.closeSheet)
  const [name, setName] = useState(game.familyName)
  const trimmed = name.trim()

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    const result = dispatch({ type: 'renameFamily', name: trimmed })
    if (result.ok) closeSheet()
  }

  return (
    <Sheet title="Nome da família" onClose={closeSheet}>
      <form onSubmit={save} className="mt-3">
        <label htmlFor="family-name" className="text-ink-soft text-[15px]">
          Sobrenome que aparece no topo do jogo
        </label>
        <input
          id="family-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={FAMILY_NAME_MAX_LENGTH}
          autoComplete="off"
          autoCapitalize="words"
          className="bg-canvas ring-line focus:ring-leaf mt-2 w-full rounded-2xl px-4 py-3 text-lg font-bold ring-1 outline-none focus:ring-2"
        />
        <button
          type="submit"
          className={`${button.primary} mt-4 w-full`}
          disabled={trimmed.length === 0}
        >
          Salvar nome
        </button>
      </form>
    </Sheet>
  )
}
