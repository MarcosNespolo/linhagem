'use client'

import { Briefcase, Check, Repeat } from 'lucide-react'
import { useState } from 'react'
import { getCareer, isPublicCareer, topLevel } from '@/content/careers'
import {
  applyAction,
  areaOffer,
  careerOptions,
  familyRates,
  offerSalary,
  salaryPerMonth,
  topSalary,
  type GameState,
  type JobOffer,
  type Member,
} from '@/engine'
import { useGameStore } from '@/game/store'
import { formatMoney, formatRate } from '@/lib/format'
import { careerTitle, levelLabel, levelTitle, lowerFirst } from '../labels'
import { button, card } from '../styles'
import { useUiStore } from '../ui-store'
import { Sheet } from './sheet'

/**
 * Mudar de carreira: as carreiras que a formação permite, cada uma com a vaga
 * de entrada, o salário dela e o do topo, que é o motivo de trocar. A pessoa
 * recomeça do nível de entrada, com o tempo no nível contando de novo; o curso
 * em andamento para e quem é servidor deixa o serviço público.
 */
export function CareerSheet({ game, member }: { game: GameState; member: Member }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const closeSheet = useUiStore((store) => store.closeSheet)
  const options = careerOptions(member)
  const [picked, setPicked] = useState(0)
  const career = member.career
  if (!career || options.length === 0) return null

  const chosen = options[Math.min(picked, options.length - 1)]
  const area = areaOffer(member.education.formation)?.careerId
  const after = applyAction(game, {
    type: 'changeCareer',
    memberId: member.id,
    careerId: chosen.careerId,
  })
  const net = familyRates(game).net
  const warnings = [
    member.course ? 'Para o curso em andamento' : '',
    isPublicCareer(career.id) ? 'Deixa o serviço público' : '',
  ].filter(Boolean)
  const confirm = () => {
    dispatch({ type: 'changeCareer', memberId: member.id, careerId: chosen.careerId })
    closeSheet()
  }

  return (
    <Sheet title={`Nova carreira para ${member.firstName}`} onClose={closeSheet}>
      <p className="tabular text-ink-soft text-[15px]">
        Hoje: {careerTitle(member)}, {formatRate(salaryPerMonth(member))} · recomeça do nível de
        entrada
      </p>
      <div role="radiogroup" aria-label="Carreira nova" className="mt-4 space-y-2">
        {options.map((offer, index) => (
          <CareerOption
            key={offer.careerId}
            member={member}
            offer={offer}
            area={offer.careerId === area}
            active={offer === chosen}
            onSelect={() => setPicked(index)}
          />
        ))}
      </div>
      {warnings.map((warning) => (
        <p key={warning} className="text-rose mt-3 text-[14px] font-semibold">
          {warning}
        </p>
      ))}
      {after.ok ? (
        <p className="tabular text-ink-soft mt-3 text-[14px]">
          Saldo da família: {formatRate(net)} → {formatRate(familyRates(after.state).net)}
        </p>
      ) : null}
      <button type="button" className={`${button.primary} mt-5 w-full`} onClick={confirm}>
        <Repeat size={18} />
        Recomeçar como {lowerFirst(levelTitle(member, chosen.careerId, chosen.level))}
      </button>
    </Sheet>
  )
}

function CareerOption({
  member,
  offer,
  area,
  active,
  onSelect,
}: {
  member: Member
  offer: JobOffer
  area: boolean
  active: boolean
  onSelect: () => void
}) {
  const top = levelTitle(member, offer.careerId, topLevel(offer.careerId))
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
        {active ? <Check size={18} /> : <Briefcase size={17} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] leading-snug font-bold">
          {levelTitle(member, offer.careerId, offer.level)}
        </span>
        <span className="text-ink-soft block text-[13px]">
          {getCareer(offer.careerId).name} · {levelLabel(offer.level)}
          {area ? ' · da formação' : ''}
        </span>
        <span className="tabular text-ink-soft block text-[13px]">
          Chega a {lowerFirst(top)}, {formatMoney(topSalary(offer.careerId))}/mês
        </span>
      </span>
      <span className="tabular text-income shrink-0 text-right text-[14px] font-bold">
        {formatRate(offerSalary(offer))}
      </span>
    </button>
  )
}
