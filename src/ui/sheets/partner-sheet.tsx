'use client'

import { Heart, Shuffle } from 'lucide-react'
import { careerLevel } from '@/content/careers'
import { BALANCE } from '@/content/balance'
import { weddingCost, type GameState, type Member } from '@/engine'
import { useGameStore } from '@/game/store'
import { formatAge, formatMoney, formatRate } from '@/lib/format'
import { PersonAvatar } from '../avatar/person-avatar'
import { byGender } from '../labels'
import { button, card } from '../styles'
import { useUiStore } from '../ui-store'
import { Sheet } from './sheet'

/** Escolha de par: pessoas de fora da família sugeridas para casar. */
export function PartnerSheet({ game, member }: { game: GameState; member: Member }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const openSheet = useUiStore((store) => store.openSheet)
  const closeSheet = useUiStore((store) => store.closeSheet)
  const suitors = game.suitors[member.id] ?? []
  const cost = weddingCost(game)
  const missing = cost - game.money
  const day = game.clock.day

  const marry = (suitorIndex: number) => {
    const result = dispatch({ type: 'marry', memberId: member.id, suitorIndex })
    if (result.ok) openSheet({ kind: 'member', memberId: member.id })
  }

  return (
    <Sheet title={`Um par para ${member.firstName}`} onClose={closeSheet}>
      <p className="tabular text-ink-soft mt-1 text-[15px]">
        {missing > 0
          ? `O casamento custa ${formatMoney(cost)}. Faltam ${formatMoney(missing)}.`
          : `O casamento custa ${formatMoney(cost)}.`}
      </p>

      <ul className="mt-4 space-y-3">
        {suitors.map((suitor, index) => {
          const age = Math.floor((day - suitor.birthDay) / BALANCE.daysPerYear)
          const level = careerLevel(suitor.career.id, suitor.career.level)
          return (
            <li
              key={`${suitor.firstName}-${index}`}
              className={`${card} flex items-center gap-3 p-3`}
            >
              <PersonAvatar person={suitor} day={day} size={60} className="shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-extrabold">
                  {suitor.firstName}, {formatAge(age)}
                </p>
                <p className="text-ink-soft truncate text-[14px]">{level.title[suitor.gender]}</p>
                <p className="tabular text-income text-[13px] font-bold">
                  {formatRate(level.salaryPerSecond)}
                </p>
              </div>
              <button
                type="button"
                className={button.smallLove}
                disabled={missing > 0}
                onClick={() => marry(index)}
                aria-label={`Casar ${member.firstName} com ${suitor.firstName}`}
              >
                <Heart size={14} fill="currentColor" />
                Casar
              </button>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        className={`${button.secondary} mt-4 w-full`}
        onClick={() => dispatch({ type: 'findSuitors', memberId: member.id })}
      >
        <Shuffle size={16} />
        Conhecer outras pessoas
      </button>
      <p className="text-ink-soft mt-3 text-center text-[13px]">
        Quem casa entra na família, trabalha e soma na renda. {byGender(member, 'Ela', 'Ele')} e o
        par vão poder ter filhos.
      </p>
    </Sheet>
  )
}
