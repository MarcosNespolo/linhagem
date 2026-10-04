'use client'

import { Briefcase, Check } from 'lucide-react'
import { useState } from 'react'
import { careerLevel, getCareer } from '@/content/careers'
import { offerSalary, type Choice, type GameState, type MemberId } from '@/engine'
import { useGameStore } from '@/game/store'
import { formatRate } from '@/lib/format'
import { PersonAvatar } from '../avatar/person-avatar'
import { button, card } from '../styles'
import { Sheet } from './sheet'

/**
 * Escolhas que esperam o jogador, com a sugestão de cada uma já marcada. O
 * relógio fica parado até confirmar; fechar o painel deixa para depois.
 */
export function ChoiceSheet({ game, onHide }: { game: GameState; onHide: () => void }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const [picked, setPicked] = useState<Record<MemberId, number>>({})
  const optionOf = (choice: Choice) => picked[choice.memberId] ?? choice.suggested
  const single = game.choices.length === 1

  const confirm = () => {
    const picks = game.choices.map((choice) => ({
      memberId: choice.memberId,
      option: optionOf(choice),
    }))
    dispatch({ type: 'choose', picks })
  }

  return (
    <Sheet title={single ? 'Primeiro emprego' : 'Hora de escolher'} onClose={onHide}>
      <p className="text-ink-soft mt-1 text-[15px]">
        O tempo parou até você escolher. A sugestão já vem marcada.
      </p>
      <div className="mt-4 space-y-5">
        {game.choices.map((choice) => (
          <FirstJobChoice
            key={choice.memberId}
            game={game}
            choice={choice}
            selected={optionOf(choice)}
            onSelect={(option) => setPicked({ ...picked, [choice.memberId]: option })}
          />
        ))}
      </div>
      <button type="button" className={`${button.primary} mt-5 w-full`} onClick={confirm}>
        {single ? 'Confirmar escolha' : 'Confirmar escolhas'}
      </button>
    </Sheet>
  )
}

function FirstJobChoice({
  game,
  choice,
  selected,
  onSelect,
}: {
  game: GameState
  choice: Choice
  selected: number
  onSelect: (option: number) => void
}) {
  const member = game.members[choice.memberId]
  if (!member) return null
  return (
    <section>
      <div className="flex items-center gap-3">
        <PersonAvatar
          person={member}
          day={game.clock.day}
          size={48}
          className="shrink-0 rounded-full"
        />
        <div className="min-w-0">
          <p className="truncate text-[16px] font-extrabold">{member.firstName} fez 18 anos</p>
          <p className="text-ink-soft text-[14px]">Qual vai ser o primeiro emprego?</p>
        </div>
      </div>
      <div
        role="radiogroup"
        aria-label={`Primeiro emprego de ${member.firstName}`}
        className="mt-3 space-y-2"
      >
        {choice.offers.map((offer, index) => {
          const active = index === selected
          const title = careerLevel(offer.careerId, 0).title[member.gender]
          return (
            <button
              key={offer.careerId}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(index)}
              className={`${card} flex w-full items-center gap-3 p-3 text-left transition active:scale-[0.99] ${
                active ? 'ring-leaf ring-2' : ''
              }`}
            >
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-full ${
                  active ? 'bg-leaf text-white' : 'bg-leaf-soft text-leaf-strong'
                }`}
              >
                {active ? <Check size={18} /> : <Briefcase size={17} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-bold">{title}</span>
                <span className="text-ink-soft block text-[13px]">
                  {getCareer(offer.careerId).name}
                  {index === choice.suggested ? ' · sugestão' : ''}
                </span>
              </span>
              <span className="tabular text-income shrink-0 text-[14px] font-bold">
                {formatRate(offerSalary(offer))}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
