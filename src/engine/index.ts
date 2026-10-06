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
export { archiveMembers } from './archive'
export { boostFactor, boostTicksLeft, clockPosition, isBoosted } from './boost'
export { optionCount, suggestedPicks, type ChoicePick } from './choices'
export { rollEnem } from './college'
export {
  allowedCargos,
  checkStudyForConcurso,
  concursoBase,
  expectedConcursoScore,
  highestCargo,
  isExamDay,
  monthsStudied,
  nextCargo,
  nextExamDay,
  passedCargo,
} from './concurso'
export { FAMILY_NAME_MAX_LENGTH } from './constants'
export {
  familyRates,
  feesOf,
  hasCar,
  incomeOf,
  incomeTax,
  isUnemployed,
  unemploymentPay,
  healthPlanCost,
  lifestyleCost,
  livingCost,
  memberExpense,
  memberIncome,
  salaryPerMonth,
  taxOf,
  type Rates,
} from './economy'
export {
  installmentCap,
  loanInstallment,
  loanInstallments,
  loanMonths,
  totalDebt,
} from './financing'
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
  betterCareers,
  canStudyForConcurso,
  formationCareer,
  hasJobOffer,
  membersWithJobOffer,
  offerSalary,
  rollJobOffers,
} from './jobs'
export { isLogEvent, isMemberEvent, LOG_LIMIT } from './log'
export { claimableMissions, incomeReward, isMissionDone } from './missions'
export { MEET_OPTIONS, PROPOSE_OPTIONS } from './dating'
export { canMeet, joinFamily, rollSuitor, weddingCost } from './marriage'
export {
  ageOf,
  childrenOf,
  isAdult,
  isAlive,
  isRetired,
  livingCount,
  livingMembers,
  partnerOf,
} from './members'
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
  affordableProperties,
  checkBuyProperty,
  extraHousingCost,
  financingTerms,
  homesInUse,
  housingCost,
  initialMarket,
  isPropertyUnlocked,
  isRenting,
  livesWithParents,
  lotsForSale,
  maintenanceCost,
  netRent,
  nextListingDay,
  ownedCount,
  ownedLots,
  ownedPlaces,
  paybackYears,
  placeRent,
  propertiesLeft,
  propertyPrice,
  purchaseCost,
  rentedPlaces,
  rentedUnits,
  rentFor,
  rentPerMonth,
  totalProperties,
  totalVacant,
  transferTaxOf,
  vacantUnits,
  visiblePropertyTypes,
  type FinancingTerms,
  type PropertyCheck,
} from './properties'
export {
  courseAvailableDay,
  courseCandidates,
  courseOffer,
  promotesByTime,
  promotionDay,
  type CourseOffer,
} from './promotions'
export { daysToBankruptcy } from './debt'
export { createRng, hashString, hashUnit, mix32, pickWeighted, type Rng } from './rng'
export { deserialize, serialize } from './save'
export { canHaveTutor, tutorPoints } from './tutor'
export {
  agePoints,
  aptitudeOf,
  baseAptitude,
  halfTimeCaregivers,
  inheritAptitude,
  schoolFee,
  schoolScore,
  stageFee,
  stageForAge,
  stagePoints,
  stageYears,
  suitorAptitude,
  yearlyPoints,
} from './school'
export {
  ageInYears,
  calendarDate,
  daysToMs,
  daysToSeconds,
  elapsedToGameMs,
  lastDayOfYear,
  msToTicks,
  OFFLINE_CAP_MS,
  TICKS_PER_DAY,
  TICKS_PER_MONTH,
  TICKS_PER_MS,
  ticksToMonths,
} from './time'
export type * from './types'
