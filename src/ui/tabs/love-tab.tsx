'use client'

import { Baby, Heart } from 'lucide-react'
import { ageOf, calendarDate, type GameState } from '@/engine'
import { useGameStore } from '@/game/store'
import { formatAge, formatMonthYear } from '@/lib/format'
import { PersonAvatar } from '../avatar/person-avatar'
import { showMember } from '../flows'
import { childStatus } from '../labels'
import type { LoveActions } from '../selectors'
import { button, card } from '../styles'

/** Aba Amor: quem namora, quem está solteiro e quais casais podem ter filhos. */
export function LoveTab({ game, actions }: { game: GameState; actions: LoveActions }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const day = game.clock.day
  const empty =
    actions.dating.length === 0 && actions.singles.length === 0 && actions.couples.length === 0

  return (
    <div className="mx-auto w-full max-w-md space-y-7 px-4 pt-5 pb-8">
      {empty ? (
        <div className={`${card} p-5 text-center`}>
          <p className="text-[16px] font-bold">Ninguém para namorar ou ter filhos agora</p>
        </div>
      ) : null}

      {actions.dating.length > 0 ? (
        <section>
          <h2 className="px-1 text-lg font-extrabold">Namorando</h2>
          <ul className="mt-3 space-y-2">
            {actions.dating.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => showMember(member.id)}
                  className={`${card} flex w-full items-center gap-3 p-2.5 text-left`}
                >
                  <span className="flex shrink-0 -space-x-3">
                    <PersonAvatar
                      person={member}
                      day={day}
                      size={44}
                      className="ring-surface rounded-full ring-2"
                    />
                    <PersonAvatar
                      person={member.dating!.partner}
                      day={day}
                      size={44}
                      className="ring-surface rounded-full ring-2"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[16px] font-bold">
                      {member.firstName} e {member.dating!.partner.firstName}
                    </span>
                    <span className="tabular text-ink-soft block text-[13px]">
                      Pedido em{' '}
                      {formatMonthYear(
                        calendarDate(game.startDate, member.dating!.askDay),
                        'short',
                      )}
                    </span>
                  </span>
                  <Heart size={18} className="text-rose ml-auto shrink-0" fill="currentColor" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {actions.singles.length > 0 ? (
        <section>
          <h2 className="px-1 text-lg font-extrabold">Solteiros</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {actions.singles.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => showMember(member.id)}
                  className="bg-surface ring-line inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1 font-bold ring-1 transition active:scale-95"
                >
                  <PersonAvatar
                    person={member}
                    day={day}
                    size={30}
                    className="shrink-0 rounded-full"
                  />
                  <span className="text-[14px]">
                    {member.firstName}, {formatAge(ageOf(member, day))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {actions.couples.length > 0 ? (
        <section>
          <h2 className="px-1 text-lg font-extrabold">Casais</h2>
          <ul className="mt-3 space-y-2">
            {actions.couples.map(({ lead, partner, check, cost }) => (
              <li key={lead.id} className={`${card} flex items-center gap-3 p-2.5`}>
                <button
                  type="button"
                  onClick={() => showMember(lead.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="flex shrink-0 -space-x-3">
                    <PersonAvatar
                      person={lead}
                      day={day}
                      size={44}
                      className="ring-surface rounded-full ring-2"
                    />
                    <PersonAvatar
                      person={partner}
                      day={day}
                      size={44}
                      className="ring-surface rounded-full ring-2"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[16px] font-bold">
                      {lead.firstName} e {partner.firstName}
                    </span>
                    <span className="tabular text-ink-soft block text-[13px]">
                      {childStatus(game, lead, check, cost)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className={button.small}
                  disabled={!check.ok}
                  onClick={() => dispatch({ type: 'haveChild', parentId: lead.id })}
                  aria-label={`Ter um filho de ${lead.firstName} e ${partner.firstName}`}
                >
                  <Baby size={15} />
                  Filho
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
