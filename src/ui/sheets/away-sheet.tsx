'use client'

import { BALANCE } from '@/content/balance'
import { isMemberEvent, type GameState } from '@/engine'
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
  const events = away.events.filter(isMemberEvent)
  const shown = events.slice(-EVENTS_SHOWN).reverse()
  const hidden = events.length - shown.length

  return (
    <Sheet title="Enquanto você esteve fora" onClose={dismiss}>
      <p className="mt-2 text-[16px]">
        Passaram <strong>{formatGameSpan(away.days, BALANCE.daysPerYear)}</strong> na família e
        entraram <strong className="tabular text-gold">{formatMoney(away.earned)}</strong>.
      </p>
      {away.waiting ? (
        <p className="text-ink-soft mt-2 text-[14px]">
          O tempo parou numa escolha e está esperando você.
        </p>
      ) : away.capped ? (
        <p className="text-ink-soft mt-2 text-[14px]">
          Com o jogo fechado, o tempo anda no máximo {BALANCE.offlineCapYears} anos.
        </p>
      ) : null}
      {shown.length > 0 ? (
        <ul className="bg-canvas mt-4 space-y-2 rounded-2xl p-4 text-[15px]">
          {shown.map((event, index) => (
            <li key={`${event.type}-${event.memberId}-${index}`}>{describeEvent(game, event)}</li>
          ))}
          {hidden > 0 ? <li className="text-ink-soft">E mais {hidden} no histórico.</li> : null}
        </ul>
      ) : null}
      <button type="button" className={`${button.primary} mt-5 w-full`} onClick={dismiss}>
        Continuar
      </button>
    </Sheet>
  )
}
