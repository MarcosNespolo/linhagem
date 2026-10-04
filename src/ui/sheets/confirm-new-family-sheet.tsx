'use client'

import type { GameState } from '@/engine'
import { useGameStore } from '@/game/store'
import { button } from '../styles'
import { useUiStore } from '../ui-store'
import { Sheet } from './sheet'

export function ConfirmNewFamilySheet({ game }: { game: GameState }) {
  const closeSheet = useUiStore((store) => store.closeSheet)
  const openSetup = useGameStore((store) => store.openSetup)
  const signedIn = useGameStore((store) => store.cloud.mode === 'signedIn')
  return (
    <Sheet title="Começar outra família?" onClose={closeSheet}>
      <p className="text-ink-soft mt-2 text-[15px]">
        A família {game.familyName} será substituída{' '}
        {signedIn ? 'neste aparelho e na nuvem' : 'neste aparelho'} quando a nova começar. Não dá
        para voltar atrás.
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          className={button.danger}
          onClick={() => {
            closeSheet()
            openSetup()
          }}
        >
          Escolher a nova família
        </button>
        <button type="button" className={button.quiet} onClick={closeSheet}>
          Continuar com os {game.familyName}
        </button>
      </div>
    </Sheet>
  )
}
