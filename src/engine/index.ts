/**
 * API pública da engine. Simulação pura em TypeScript: não conhece React,
 * navegador nem rede, e roda igual no jogo, nos testes e no script de
 * balanceamento.
 */
export {
  applyAction,
  checkHaveChild,
  childCooldownDaysLeft,
  childCost,
  type Action,
  type ActionError,
  type ActionResult,
  type ChildCheck,
} from './actions'
export { advance, advanceTo, type AdvanceResult } from './advance'
export { inheritAppearance, rollAppearance } from './appearance'
export { FAMILY_NAME_MAX_LENGTH } from './constants'
export { familyRates, memberExpense, memberIncome, salaryPerSecond, type Rates } from './economy'
export { LOG_LIMIT } from './log'
export { checkMarry, checkSeekPartner, weddingCost, type MarriageCheck } from './marriage'
export { ageOf, childrenOf, isAdult, isAlive, isRetired, livingMembers, partnerOf } from './members'
export {
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
  migrate,
  SaveError,
  type Migration,
  type SaveErrorCode,
} from './migrations'
export { newGame, type NewGameOptions } from './new-game'
export { createRng, hashString, pickWeighted, type Rng } from './rng'
export { deserialize, serialize } from './save'
export {
  ageInYears,
  calendarDate,
  daysToMs,
  daysToSeconds,
  msToTicks,
  OFFLINE_CAP_MS,
  TICKS_PER_DAY,
  TICKS_PER_MS,
  ticksToSeconds,
} from './time'
export type * from './types'
