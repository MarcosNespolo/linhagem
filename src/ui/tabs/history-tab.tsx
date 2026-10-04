'use client'

import {
  Baby,
  Briefcase,
  Cake,
  FileText,
  GraduationCap,
  Heart,
  Leaf,
  School,
  Sun,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { calendarDate, LOG_LIMIT, type GameState, type MemberEvent } from '@/engine'
import { formatShortMonth } from '@/lib/format'
import { describeEvent } from '../labels'
import { card } from '../styles'

const ICONS: Record<MemberEvent['type'], ReactNode> = {
  born: <Baby size={16} />,
  becameAdult: <Cake size={16} />,
  firstJob: <Briefcase size={16} />,
  married: <Heart size={15} fill="currentColor" />,
  retired: <Sun size={16} />,
  died: <Leaf size={16} />,
  schoolStarted: <School size={16} />,
  schoolChanged: <School size={16} />,
  schoolFinished: <GraduationCap size={17} />,
  enem: <FileText size={16} />,
}

const TONES: Record<MemberEvent['type'], string> = {
  born: 'bg-leaf-soft text-leaf-strong',
  becameAdult: 'bg-gold-soft text-gold',
  firstJob: 'bg-gold-soft text-gold',
  married: 'bg-rose-soft text-rose',
  retired: 'bg-gold-soft text-gold',
  died: 'bg-line text-ink-soft',
  schoolStarted: 'bg-leaf-soft text-leaf-strong',
  schoolChanged: 'bg-leaf-soft text-leaf-strong',
  schoolFinished: 'bg-gold-soft text-gold',
  enem: 'bg-leaf-soft text-leaf-strong',
}

/** Aba Histórico: os acontecimentos da família, do mais recente para o mais antigo. */
export function HistoryTab({ game }: { game: GameState }) {
  const events = game.log.slice().reverse()
  if (events.length === 0) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pt-5">
        <div className={`${card} p-5 text-center`}>
          <p className="text-[16px] font-bold">A história da família começa agora</p>
          <p className="text-ink-soft mt-1 text-[15px]">
            Nascimentos, casamentos e aniversários importantes aparecem aqui.
          </p>
        </div>
      </div>
    )
  }

  const years: { year: string; items: { event: MemberEvent; date: string }[] }[] = []
  for (const event of events) {
    const date = calendarDate(game.startDate, event.day)
    const year = date.slice(0, 4)
    const group = years.at(-1)
    if (group?.year === year) group.items.push({ event, date })
    else years.push({ year, items: [{ event, date }] })
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-5 pb-8">
      {years.map(({ year, items }) => (
        <section key={year} className="mb-5">
          <h2 className="tabular px-1 text-lg font-extrabold">{year}</h2>
          <ul className={`${card} divide-line mt-2 divide-y`}>
            {items.map(({ event, date }, index) => (
              <li
                key={`${event.type}-${event.memberId}-${event.day}-${index}`}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full ${TONES[event.type]}`}
                >
                  {ICONS[event.type]}
                </span>
                <span className="min-w-0 flex-1 text-[15px]">{describeEvent(game, event)}</span>
                <span className="text-ink-soft shrink-0 text-[13px]">{formatShortMonth(date)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {game.log.length >= LOG_LIMIT ? (
        <p className="text-ink-soft px-1 text-center text-[13px]">
          O histórico guarda os {LOG_LIMIT} acontecimentos mais recentes.
        </p>
      ) : null}
    </div>
  )
}
