'use client'

import { BALANCE } from '@/content/balance'
import { isLogEvent, type GameState } from '@/engine'
import { useGameStore, type AwaySummary } from '@/game/store'
import { formatGameSpan, formatMoney } from '@/lib/format'
import { describeEvent } from '../labels'
import { button } from '../styles'
import { Sheet } from './sheet'

const EVENTS_SHOWN = 6

/** Resumo do que aconteceu enquanto o jogo esteve fechado ou em segundo plano. */
export function AwaySheet({ game, away }: { game: GameState; away: AwaySummary }) {
  const dismiss = useGameStore((store) => store.dismissAway)
  // O 13º já entra na soma do dinheiro; a lista fica com o que aconteceu às pessoas.
  const events = away.events.filter(isLogEvent)
  const shown = events.slice(-EVENTS_SHOWN).reverse()
  const hidden = events.length - shown.length

  return (
    <Sheet title="Enquanto você esteve fora" onClose={dismiss}>
      <p className="tabular mt-2 text-[16px]">
        <strong>{formatGameSpan(away.days, BALANCE.daysPerYear)}</strong> · entraram{' '}
        <strong className="text-gold">{formatMoney(away.earned)}</strong>
        {away.rent > 0 ? <> ({formatMoney(away.rent)} de aluguel)</> : null}
      </p>
      {away.waiting ? (
        <p className="text-ink-soft mt-2 text-[14px]">Tempo parado numa escolha</p>
      ) : away.capped ? (
        <p className="text-ink-soft mt-2 text-[14px]">
          Máximo de {BALANCE.offlineCapYears} anos com o jogo fechado
        </p>
      ) : null}
      {shown.length > 0 ? (
        <ul className="bg-canvas mt-4 space-y-2 rounded-2xl p-4 text-[15px]">
          {shown.map((event, index) => (
            <li key={`${event.type}-${event.day}-${index}`}>{describeEvent(game, event)}</li>
          ))}
          {hidden > 0 ? <li className="text-ink-soft">E mais {hidden} no histórico</li> : null}
        </ul>
      ) : null}
      <button type="button" className={`${button.primary} mt-5 w-full`} onClick={dismiss}>
        Continuar
      </button>
    </Sheet>
  )
}
