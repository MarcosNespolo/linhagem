import { BALANCE } from '../content/balance'
import { SURNAMES } from '../content/names'
import { rollAppearance } from './appearance'
import { FAMILY_NAME_MAX_LENGTH } from './constants'
import { rollFounderCareer } from './jobs'
import { addMember } from './members'
import { CURRENT_SCHEMA_VERSION } from './migrations'
import { initialMarket } from './properties'
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

/**
 * Cria uma partida nova com uma pessoa só: 18 anos, ensino médio, o primeiro
 * emprego de uma carreira de quem tem o médio e nenhum dinheiro. O par vem
 * depois, pelo namoro.
 */
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
    debtSince: null,
    bankruptDay: null,
    members: {},
    nextMemberId: 1,
    choices: [],
    properties: {},
    market: initialMarket(),
    lots: {},
    vacancies: {},
    loans: [],
    missions: null,
    boosts: { incomeUntil: 0 },
    log: [],
    stats: {
      simulatedMs: 0,
      totalEarned: 0,
      totalSpent: 0,
      rentEarned: 0,
      interestPaid: 0,
      archived: 0,
    },
  }

  addFounder(draft, rng, rng.chance(0.5) ? 'f' : 'm')
  draft.rngState = rng.state
  return draft
}

function addFounder(draft: GameState, rng: Rng, gender: Gender): Member {
  // 18 anos feitos, com o aniversário num dia qualquer do ano que vem pela frente.
  const birthDay = -(BALANCE.adultAge * BALANCE.daysPerYear + rng.int(0, BALANCE.daysPerYear - 1))
  const appearance = rollAppearance(rng, gender)
  return addMember(draft, rng, {
    gender,
    birthDay,
    generation: 0,
    parentIds: [],
    origin: 'founder',
    appearance,
    career: rollFounderCareer(rng, birthDay, 0),
    education: newEducation({ level: 'medio' }),
  })
}
