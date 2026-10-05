'use client'

import { calendarDate, livingMembers, type GameState } from '@/engine'
import { useGameStore, type CloudConflict } from '@/game/store'
import { formatDuration, formatMonthYear } from '@/lib/format'
import { button } from '../styles'
import { Sheet } from './sheet'

/** A nuvem e este aparelho divergem: o jogador escolhe qual versão da família continuar. */
export function ConflictSheet({ game, conflict }: { game: GameState; conflict: CloudConflict }) {
  const resolveConflict = useGameStore((store) => store.resolveConflict)
  const setConflictHidden = useGameStore((store) => store.setConflictHidden)
  const sameFamily = conflict.cloud.seed === game.seed
  // O relógio do jogo anda a cada segundo e serve de "agora" sem deixar o desenho impuro.
  const savedAgo = formatDuration((game.lastSimulatedAt - Date.parse(conflict.savedAt)) / 1_000)

  return (
    <Sheet title="Qual família continuar?" onClose={() => setConflictHidden(true)}>
      <p className="text-ink-soft mt-2 text-[15px]">
        {sameFamily
          ? 'A família mudou aqui e em outro aparelho.'
          : 'Este aparelho e a nuvem têm famílias diferentes.'}{' '}
        A outra fica como cópia de segurança.
      </p>
      <div className="mt-4 space-y-3">
        <Version title="Na nuvem" state={conflict.cloud} note={`Salva há ${savedAgo}`} />
        <Version title="Neste aparelho" state={game} />
      </div>
      <div className="mt-5 flex flex-col gap-2">
        <button type="button" className={button.primary} onClick={() => resolveConflict('cloud')}>
          Continuar a da nuvem
        </button>
        <button type="button" className={button.secondary} onClick={() => resolveConflict('local')}>
          Ficar com a deste aparelho
        </button>
      </div>
    </Sheet>
  )
}

function Version({ title, state, note }: { title: string; state: GameState; note?: string }) {
  const living = livingMembers(state).length
  const generations =
    Math.max(...Object.values(state.members).map((member) => member.generation)) + 1
  const date = formatMonthYear(calendarDate(state.startDate, state.clock.day))
  return (
    <div className="bg-canvas rounded-2xl p-4">
      <p className="text-ink-soft text-[13px] font-bold tracking-wide uppercase">{title}</p>
      <p className="mt-0.5 text-[17px] font-extrabold">Família {state.familyName}</p>
      <p className="text-ink-soft text-[14px]">
        <span className="inline-block first-letter:uppercase">{date}</span> ·{' '}
        {living === 1 ? '1 pessoa viva' : `${living} pessoas vivas`} ·{' '}
        {generations === 1 ? '1 geração' : `${generations} gerações`}
      </p>
      {note ? <p className="text-ink-soft text-[14px]">{note}</p> : null}
    </div>
  )
}
