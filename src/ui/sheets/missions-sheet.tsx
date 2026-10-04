'use client'

import { Check, Gift, Zap } from 'lucide-react'
import { BALANCE } from '@/content/balance'
import { missionInfo } from '@/content/missions'
import {
  boostTicksLeft,
  incomeReward,
  isMissionDone,
  TICKS_PER_DAY,
  type GameState,
  type MissionState,
} from '@/engine'
import { useGameStore } from '@/game/store'
import { formatGameSpan, formatMoney } from '@/lib/format'
import { button, card } from '../styles'
import { useUiStore } from '../ui-store'
import { Sheet } from './sheet'

/**
 * Painel das missões do dia: o progresso de cada uma e o botão para pegar a
 * recompensa. As missões valem até a meia-noite do aparelho.
 */
export function MissionsSheet({ game }: { game: GameState }) {
  const closeSheet = useUiStore((store) => store.closeSheet)
  const missions = game.missions?.list ?? []
  const boostLeft = boostTicksLeft(game)

  return (
    <Sheet title="Missões de hoje" onClose={closeSheet}>
      <p className="text-ink-soft mt-1 text-[15px]">
        Valem até a meia-noite e contam o que acontece depois que aparecem. A recompensa é para
        pegar no mesmo dia.
      </p>
      {boostLeft > 0 ? (
        <p className="bg-gold-soft text-gold mt-3 flex items-center gap-2 rounded-2xl px-3 py-2 text-[14px] font-bold">
          <Zap size={16} fill="currentColor" aria-hidden="true" />
          Renda em dobro por mais{' '}
          {formatGameSpan(Math.ceil(boostLeft / TICKS_PER_DAY), BALANCE.daysPerYear)} do jogo
        </p>
      ) : null}
      <ul className="mt-4 space-y-3">
        {missions.map((mission) => (
          <MissionCard key={mission.id} game={game} mission={mission} />
        ))}
      </ul>
    </Sheet>
  )
}

function MissionCard({ game, mission }: { game: GameState; mission: MissionState }) {
  const dispatch = useGameStore((store) => store.dispatch)
  const info = missionInfo(mission.id)
  const done = isMissionDone(mission)
  const share = mission.goal > 0 ? Math.min(1, mission.progress / mission.goal) : 1
  const progress =
    mission.id === 'peDeMeia'
      ? `${formatMoney(mission.progress)} de ${formatMoney(mission.goal)}`
      : `${mission.progress} de ${mission.goal}`
  const reward =
    info.reward.kind === 'boost'
      ? `Renda em dobro por ${info.reward.years} anos do jogo`
      : `${info.reward.months === 12 ? '1 ano' : `${info.reward.months} meses`} de renda: ${formatMoney(incomeReward(game, info.reward.months))}`

  return (
    <li className={`${card} p-3.5`}>
      <div className="flex items-start gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-extrabold">{info.name}</span>
          <span className="text-ink-soft block text-[14px]">{info.text}</span>
        </span>
        {mission.claimed ? (
          <span className="text-leaf-strong inline-flex shrink-0 items-center gap-1 text-[13px] font-bold">
            <Check size={15} aria-hidden="true" />
            Pega
          </span>
        ) : done ? (
          <button
            type="button"
            className={`${button.small} shrink-0`}
            onClick={() => dispatch({ type: 'claimMission', missionId: mission.id })}
          >
            <Gift size={14} aria-hidden="true" />
            Pegar
          </button>
        ) : null}
      </div>
      <div
        className="bg-line mt-3 h-2 overflow-hidden rounded-full"
        role="progressbar"
        aria-label={`Progresso de ${info.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(share * 100)}
      >
        <div
          className={`h-full rounded-full ${done ? 'bg-leaf' : 'bg-gold'}`}
          style={{ width: `${share * 100}%` }}
        />
      </div>
      <p className="tabular text-ink-soft mt-1.5 flex justify-between gap-3 text-[13px]">
        <span>{progress}</span>
        <span className="text-right font-semibold">{reward}</span>
      </p>
    </li>
  )
}
