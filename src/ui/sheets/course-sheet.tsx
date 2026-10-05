'use client'

import { BookOpen, Check, Clock, Zap } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { BALANCE } from '@/content/balance'
import { careerLevel } from '@/content/careers'
import {
  calendarDate,
  courseOffer,
  familyRates,
  type CourseOffer,
  type GameState,
  type Member,
} from '@/engine'
import { useGameStore } from '@/game/store'
import { formatGameSpan, formatMonthYear, formatRate } from '@/lib/format'
import { courseName, levelTitle, upperFirst } from '../labels'
import { button, card } from '../styles'
import { useUiStore } from '../ui-store'
import { Sheet } from './sheet'

/**
 * Curso para o próximo nível: no ritmo normal ou com dedicação, que termina na
 * metade do tempo e custa o dobro por mês, sem namoro nem filho até terminar.
 */
export function CourseSheet({ game, member }: { game: GameState; member: Member }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const closeSheet = useUiStore((store) => store.closeSheet)
  const [dedicated, setDedicated] = useState(false)
  const day = game.clock.day
  const normal = courseOffer(member, day, false)
  const fast = courseOffer(member, day, true)
  const career = member.career
  if (!normal || !fast || !career) return null

  const chosen = dedicated ? fast : normal
  const raise =
    careerLevel(career.id, normal.level).salaryPerMonth -
    careerLevel(career.id, career.level).salaryPerMonth
  const { net } = familyRates(game)
  const start = () => {
    dispatch({ type: 'startCourse', memberId: member.id, dedicated })
    closeSheet()
  }

  return (
    <Sheet
      title={`${upperFirst(courseName(normal.level))} de ${member.firstName}`}
      onClose={closeSheet}
    >
      <p className="text-[16px] font-bold">{levelTitle(member, career.id, normal.level)}</p>
      <p className="tabular text-income text-[15px] font-bold">{formatRate(raise)} no salário</p>
      <div role="radiogroup" aria-label="Ritmo do curso" className="mt-4 space-y-2">
        <PaceOption
          game={game}
          offer={normal}
          active={!dedicated}
          icon={<Clock size={17} />}
          title="Ritmo normal"
          onSelect={() => setDedicated(false)}
        />
        <PaceOption
          game={game}
          offer={fast}
          active={dedicated}
          icon={<Zap size={17} />}
          title="Com dedicação"
          note="Sem namoro nem filho até terminar"
          onSelect={() => setDedicated(true)}
        />
      </div>
      <p className="tabular text-ink-soft mt-3 text-[14px]">
        Saldo da família: {formatRate(net)} → {formatRate(net - chosen.fee)}
      </p>
      <button type="button" className={`${button.primary} mt-5 w-full`} onClick={start}>
        <BookOpen size={18} />
        Começar curso
      </button>
    </Sheet>
  )
}

function PaceOption({
  game,
  offer,
  active,
  icon,
  title,
  note,
  onSelect,
}: {
  game: GameState
  offer: CourseOffer
  active: boolean
  icon: ReactNode
  title: string
  note?: string
  onSelect: () => void
}) {
  const end = formatMonthYear(calendarDate(game.startDate, game.clock.day + offer.days), 'short')
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={`${card} flex w-full items-center gap-3 p-3 text-left transition active:scale-[0.99] ${
        active ? 'ring-leaf ring-2' : ''
      }`}
    >
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-full ${
          active ? 'bg-leaf text-white' : 'bg-leaf-soft text-leaf-strong'
        }`}
      >
        {active ? <Check size={18} /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] leading-snug font-bold">{title}</span>
        <span className="text-ink-soft block text-[13px]">
          {formatGameSpan(offer.days, BALANCE.daysPerYear)} · até {end}
        </span>
        {note ? <span className="text-rose block text-[13px] font-semibold">{note}</span> : null}
      </span>
      <span className="tabular text-expense shrink-0 text-right text-[14px] font-bold">
        {formatRate(-offer.fee)}
      </span>
    </button>
  )
}
