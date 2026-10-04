import { BALANCE } from '../content/balance'
import { SURNAMES } from '../content/names'
import { rollAppearance } from './appearance'
import { FAMILY_NAME_MAX_LENGTH } from './constants'
import { rollFounderCareer } from './jobs'
import { addMember } from './members'
import { CURRENT_SCHEMA_VERSION } from './migrations'
import { createRng, type Rng } from './rng'
import { newEducation } from './school'
import type { GameState, Gender, Member } from './types'

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
    suitors: {},
    choices: [],
    properties: {},
    missions: null,
    boosts: { incomeUntil: 0 },
    log: [],
    stats: { simulatedMs: 0, totalEarned: 0, totalSpent: 0, rentEarned: 0 },
  }

  const first = addFounder(draft, rng, 'f')
  const second = addFounder(draft, rng, 'm')
  first.partnerId = second.id
  second.partnerId = first.id
  first.marriedDay = 0
  second.marriedDay = 0

  draft.rngState = rng.state
  return draft
}

function addFounder(draft: GameState, rng: Rng, gender: Gender): Member {
  const birthDay = rollAdultBirthDay(rng)
  const appearance = rollAppearance(rng, gender)
  return addMember(draft, rng, {
    gender,
    birthDay,
    generation: 0,
    parentIds: [],
    origin: 'founder',
    appearance,
    career: rollFounderCareer(rng, 0),
    education: newEducation({ level: 'medio' }),
  })
}

/** Dia de nascimento de alguém do casal fundador, com aniversário num dia qualquer do ano. */
function rollAdultBirthDay(rng: Rng): number {
  const { min, max } = BALANCE.startingAge
  const age = rng.int(min, max)
  return -(age * BALANCE.daysPerYear + rng.int(0, BALANCE.daysPerYear - 1))
}
