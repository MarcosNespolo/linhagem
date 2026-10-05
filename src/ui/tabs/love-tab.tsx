'use client'

import { Baby, Heart } from 'lucide-react'
import { ageOf, freePlaces, type GameState } from '@/engine'
import { useGameStore } from '@/game/store'
import { formatAge, formatMoney } from '@/lib/format'
import { PersonAvatar } from '../avatar/person-avatar'
import { seekPartner, showMember } from '../flows'
import { childStatus } from '../labels'
import type { LoveActions } from '../selectors'
import { button, card } from '../styles'

/** Aba Amor: quem pode casar e quais casais podem ter filhos. */
export function LoveTab({ game, actions }: { game: GameState; actions: LoveActions }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const day = game.clock.day
  const canAffordWedding = game.money >= actions.weddingCost
  const empty = actions.seekers.length === 0 && actions.couples.length === 0

  return (
    <div className="mx-auto w-full max-w-md space-y-7 px-4 pt-5 pb-8">
      {empty ? (
        <div className={`${card} p-5 text-center`}>
          <p className="text-[16px] font-bold">Ninguém para casar ou ter filhos agora</p>
          <p className="text-ink-soft mt-1 text-[15px]">
            Os filhos podem procurar um par a partir dos 18 anos. Casais têm filhos até os 45.
          </p>
        </div>
      ) : null}

      {actions.seekers.length > 0 ? (
        <section>
          <h2 className="px-1 text-lg font-extrabold">Podem casar</h2>
          <p className="tabular text-ink-soft px-1 text-[14px]">
            Casamento: {formatMoney(actions.weddingCost)}
            {canAffordWedding ? '' : `, faltam ${formatMoney(actions.weddingCost - game.money)}`}
          </p>
          {freePlaces(game) < 1 ? (
            <p className="text-ink-soft px-1 text-[14px]">
              Sem lugar em casa: quem casar agora vai formar a própria família e sai das contas.
            </p>
          ) : null}
          <ul className="mt-3 space-y-2">
            {actions.seekers.map((member) => (
              <li key={member.id} className={`${card} flex items-center gap-3 p-2.5`}>
                <button
                  type="button"
                  onClick={() => showMember(member.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <PersonAvatar
                    person={member}
                    day={day}
                    size={48}
                    className="shrink-0 rounded-full"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[16px] font-bold">{member.firstName}</span>
                    <span className="text-ink-soft block text-[14px]">
                      {formatAge(ageOf(member, day))}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className={button.smallLove}
                  onClick={() => seekPartner(member.id)}
                >
                  <Heart size={14} fill="currentColor" />
                  Procurar par
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
