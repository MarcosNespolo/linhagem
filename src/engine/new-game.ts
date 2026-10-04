import { BALANCE } from '../content/balance'
import { SURNAMES } from '../content/names'
import { FAMILY_NAME_MAX_LENGTH } from './constants'
import { addMember, rollStarterCareer } from './members'
import { CURRENT_SCHEMA_VERSION } from './migrations'
import { createRng, type Rng } from './rng'
import type { GameState } from './types'

export type NewGameOptions = {
  /** Semente do gerador aleatório: mesma seed, mesma partida. */
  seed: number
  /** Instante real do início da partida (epoch em ms). */
  now: number
  /** Data do calendário no dia 0 (AAAA-MM-DD). */
  startDate: string
  /** Nome da família. Sem nome, um sobrenome é sorteado. */
  familyName?: string
}

/** Cria uma partida nova com o casal fundador. */
export function newGame({ seed, now, startDate, familyName }: NewGameOptions): GameState {
  const rng = createRng(seed)
  const chosenName = familyName?.trim().slice(0, FAMILY_NAME_MAX_LENGTH)
  const draft: GameState = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    seed: seed >>> 0,
    rngState: 0,
    familyName: chosenName || rng.pick(SURNAMES),
    startDate,
    clock: { day: 0, tickOfDay: 0, paused: false },
    lastSimulatedAt: now,
    money: BALANCE.startingMoney,
    members: {},
    nextMemberId: 1,
    stats: { simulatedMs: 0, totalEarned: 0, totalSpent: 0 },
  }

  const first = addMember(draft, rng, {
    gender: 'f',
    birthDay: rollAdultBirthDay(rng),
    generation: 0,
    parentIds: [],
    career: rollStarterCareer(rng),
  })
  const second = addMember(draft, rng, {
    gender: 'm',
    birthDay: rollAdultBirthDay(rng),
    generation: 0,
    parentIds: [],
    career: rollStarterCareer(rng),
  })
  first.partnerId = second.id
  second.partnerId = first.id

  draft.rngState = rng.state
  return draft
}

/** Dia de nascimento de alguém do casal fundador, com aniversário num dia qualquer do ano. */
function rollAdultBirthDay(rng: Rng): number {
  const { min, max } = BALANCE.startingAge
  const age = rng.int(min, max)
  return -(age * BALANCE.daysPerYear + rng.int(0, BALANCE.daysPerYear - 1))
}
