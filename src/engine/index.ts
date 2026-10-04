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
export { boostTicksLeft, clockPosition, isBoosted } from './boost'
export { optionCount, suggestedPicks, type ChoicePick } from './choices'
export { rollEnem } from './college'
export {
  concursoBase,
  expectedConcursoScore,
  highestCargo,
  isExamDay,
  monthsStudied,
  nextExamDay,
  passedLevel,
} from './concurso'
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
export {
  areaOffer,
  bestOffer,
  canStudyForConcurso,
  formationCareer,
  offerSalary,
  rollJobOffers,
} from './jobs'
export { isLogEvent, isMemberEvent, LOG_LIMIT } from './log'
export { claimableMissions, incomeReward, isMissionDone } from './missions'
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
export {
  checkBuyProperty,
  isPropertyUnlocked,
  ownedCount,
  paybackYears,
  propertyPrice,
  rentPerMonth,
  totalProperties,
  visiblePropertyTypes,
  type PropertyCheck,
} from './properties'
export {
  affordableCourses,
  availableCourses,
  courseCost,
  courseFor,
  needsCourse,
  promotionDay,
  type CourseOffer,
} from './promotions'
export { createRng, hashString, pickWeighted, type Rng } from './rng'
export { deserialize, serialize } from './save'
export { canHaveTutor, tutorPoints } from './tutor'
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
