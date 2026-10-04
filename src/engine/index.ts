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
export { advance, advanceTo, isWaiting, type AdvanceResult } from './advance'
export { inheritAppearance, rollAppearance } from './appearance'
export { bestOffer, offerSalary, suggestedPicks, type ChoicePick } from './choices'
export { FAMILY_NAME_MAX_LENGTH } from './constants'
export {
  familyRates,
  incomeOf,
  memberExpense,
  memberIncome,
  salaryPerMonth,
  type Rates,
} from './economy'
export {
  ageThisYear,
  homeCareCost,
  homeCaregiver,
  isEnrollmentDay,
  retiredGrandparents,
} from './enrollment'
export { isMemberEvent, LOG_LIMIT } from './log'
export { checkMarry, checkSeekPartner, weddingCost, type MarriageCheck } from './marriage'
export { ageOf, childrenOf, isAdult, isAlive, isRetired, livingMembers, partnerOf } from './members'
export {
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
  migrate,
  REAIS_PER_DOLLAR,
  SaveError,
  type Migration,
  type SaveErrorCode,
} from './migrations'
export { newGame, type NewGameOptions } from './new-game'
export { createRng, hashString, pickWeighted, type Rng } from './rng'
export { deserialize, serialize } from './save'
export {
  aptitudeOf,
  halfTimeCaregivers,
  schoolFee,
  schoolScore,
  stageFee,
  stageForAge,
  stagePoints,
  stageYears,
  yearlyPoints,
} from './school'
export {
  ageInYears,
  calendarDate,
  daysToMs,
  daysToSeconds,
  lastDayOfYear,
  msToTicks,
  OFFLINE_CAP_MS,
  TICKS_PER_DAY,
  TICKS_PER_MONTH,
  TICKS_PER_MS,
  ticksToMonths,
} from './time'
export type * from './types'
