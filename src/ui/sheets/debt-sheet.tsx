'use client'

import { BALANCE } from '@/content/balance'
import { familyRates, type GameState } from '@/engine'
import { useGameStore } from '@/game/store'
import { formatGameSpan, formatMoney, formatRate } from '@/lib/format'
import { button } from '../styles'
import { useUiStore } from '../ui-store'
import { Sheet } from './sheet'

/**
 * Aviso de quando a família entra no vermelho: o saldo, a renda e as
 * despesas, e o prazo para voltar ao azul antes da falência. O tempo fica
 * parado até o jogador continuar.
 */
export function DebtSheet({ game }: { game: GameState }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const setDebtSeen = useUiStore((store) => store.setDebtSeen)
  const { income, expense } = familyRates(game)
  const close = () => setDebtSeen(game.debtSince ?? game.clock.day)

  return (
    <Sheet title="No vermelho" onClose={close}>
      <p className="tabular text-expense mt-1 text-[28px] leading-9 font-black">
        {formatMoney(game.money)}
      </p>
      <p className="tabular text-ink-soft text-[15px]">
        Renda {formatRate(income)} · despesas {formatRate(-expense)}
      </p>
      <p className="mt-3 text-[15px]">
        Sem voltar ao azul em {formatGameSpan(BALANCE.debt.graceDays, BALANCE.daysPerYear)}, a
        família vai à falência.
      </p>
      <button
        type="button"
        className={`${button.primary} mt-5 w-full`}
        onClick={() => {
          close()
          dispatch({ type: 'resume' })
        }}
      >
        Continuar
      </button>
    </Sheet>
  )
}
