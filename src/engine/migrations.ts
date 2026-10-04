import { BALANCE } from '../content/balance'
import { rollAppearance } from './appearance'
import { createRng, hashString } from './rng'
import { stageForAge } from './school'
import { ageInYears, lastDayOfYear } from './time'
import type { GameState } from './types'

/** Versão atual do formato do save. Sobe a cada migração nova. */
export const CURRENT_SCHEMA_VERSION = 6

export type SaveErrorCode = 'corrupt' | 'futureVersion' | 'missingMigration'

export class SaveError extends Error {
  readonly code: SaveErrorCode

  constructor(code: SaveErrorCode, message: string) {
    super(message)
    this.name = 'SaveError'
    this.code = code
  }
}

type RawSave = Record<string, unknown>

/** Leva um save da versão N para a N + 1. */
export type Migration = (save: RawSave) => RawSave

/**
 * Versão 1 para 2: aparência herdável, origem de cada membro, data de
 * casamento, pessoas sugeridas como par e histórico de acontecimentos. Quem já
 * existia ganha uma aparência sorteada a partir da própria semente, então o
 * mesmo save sempre migra para os mesmos rostos.
 */
const toVersion2: Migration = (save) => {
  const members = isRecord(save.members) ? save.members : {}
  const upgraded: RawSave = {}
  for (const [id, member] of Object.entries(members)) {
    if (!isRecord(member)) {
      upgraded[id] = member
      continue
    }
    const rng = createRng(hashString(`${String(member.avatarSeed)}:${id}`))
    upgraded[id] = {
      ...member,
      origin: member.generation === 0 ? 'founder' : 'born',
      marriedDay: member.generation === 0 && member.partnerId ? 0 : null,
      appearance: rollAppearance(rng, member.gender === 'm' ? 'm' : 'f'),
    }
  }
  return { ...save, members: upgraded, suitors: {}, log: [] }
}

/** Reais por dólar na versão 3: a conta que levou os salários de dólares por segundo a reais por mês. */
export const REAIS_PER_DOLLAR = 180

/**
 * Versão 2 para 3: o dinheiro passa a ser em reais, com renda e despesa por
 * mês do jogo. Saldo e totais mudam pela mesma conta dos salários, então a
 * família continua podendo pagar o mesmo que antes. Entram também as escolhas
 * que esperam o jogador, começando sem nenhuma. O relógio não muda: no ritmo
 * novo, o dia tem as mesmas unidades.
 */
const toVersion3: Migration = (save) => {
  const stats = isRecord(save.stats) ? save.stats : {}
  return {
    ...save,
    money: inReais(save.money),
    stats: {
      ...stats,
      totalEarned: inReais(stats.totalEarned),
      totalSpent: inReais(stats.totalSpent),
    },
    choices: [],
  }
}

function inReais(value: unknown): unknown {
  return typeof value === 'number' ? value * REAIS_PER_DOLLAR : value
}

/**
 * Versão 3 para 4: cada pessoa ganha a vida escolar. Quem já terminou a idade
 * da escola fica com ensino médio; crianças e jovens entram na rede pública da
 * etapa da idade e seguem dali nas próximas matrículas, sem pontos somados.
 */
const toVersion4: Migration = (save) => {
  const members = isRecord(save.members) ? save.members : {}
  const clock = isRecord(save.clock) ? save.clock : {}
  const day = typeof clock.day === 'number' ? clock.day : 0
  const startDate = typeof save.startDate === 'string' ? save.startDate : '2026-01-01'
  const yearEnd = lastDayOfYear(startDate, day)
  const upgraded: RawSave = {}
  for (const [id, member] of Object.entries(members)) {
    if (!isRecord(member) || typeof member.birthDay !== 'number') {
      upgraded[id] = member
      continue
    }
    const age = ageInYears(member.birthDay, yearEnd)
    const stage = member.deathDay === null ? stageForAge(age) : null
    upgraded[id] = {
      ...member,
      education: {
        school: stage ? { stage, network: 'publica' } : null,
        points: 0,
        past: {},
        formation: age >= BALANCE.adultAge ? { level: 'medio' } : null,
      },
    }
  }
  return { ...save, members: upgraded }
}

/** Versão 4 para 5: entra a nota do ENEM, vazia para todos até o próximo ENEM. */
const toVersion5: Migration = (save) => {
  const members = isRecord(save.members) ? save.members : {}
  const upgraded: RawSave = {}
  for (const [id, member] of Object.entries(members)) {
    upgraded[id] =
      isRecord(member) && isRecord(member.education)
        ? { ...member, education: { ...member.education, enem: null } }
        : member
  }
  return { ...save, members: upgraded }
}

/**
 * Versão 5 para 6: carreiras com promoção e concurso público. O tempo no nível
 * passa a contar do dia da migração, no lugar da experiência, que nunca foi
 * usada. Ninguém está estudando para concurso. Quem já era sugerido como par
 * fica com ensino médio, e as vagas abertas guardam o nível de entrada, o
 * primeiro, e ganham a opção do concurso para quem terminou o médio.
 */
const toVersion6: Migration = (save) => {
  const clock = isRecord(save.clock) ? save.clock : {}
  const day = typeof clock.day === 'number' ? clock.day : 0
  const members = isRecord(save.members) ? save.members : {}
  const upgraded: RawSave = {}
  for (const [id, member] of Object.entries(members)) {
    upgraded[id] = isRecord(member)
      ? { ...member, career: careerSince(member.career, day), concurso: null }
      : member
  }

  const suitors: RawSave = {}
  for (const [id, list] of Object.entries(isRecord(save.suitors) ? save.suitors : {})) {
    suitors[id] = Array.isArray(list)
      ? list.map((suitor) =>
          isRecord(suitor)
            ? { ...suitor, formation: { level: 'medio' }, career: careerSince(suitor.career, day) }
            : suitor,
        )
      : list
  }

  const choices = Array.isArray(save.choices) ? save.choices : []
  return {
    ...save,
    members: upgraded,
    suitors,
    choices: choices.map((choice) => {
      if (!isRecord(choice) || choice.type !== 'firstJob' || !Array.isArray(choice.offers)) {
        return choice
      }
      const member = upgraded[String(choice.memberId)]
      const education = isRecord(member) && isRecord(member.education) ? member.education : {}
      return {
        ...choice,
        offers: choice.offers.map((offer) => (isRecord(offer) ? { ...offer, level: 0 } : offer)),
        concurso: isRecord(education.formation),
      }
    }),
  }
}

/** Carreira da versão 6: o nível conta a partir de `day`, sem o campo de experiência. */
function careerSince(career: unknown, day: number): unknown {
  if (!isRecord(career)) return career
  const upgraded: RawSave = { ...career, levelSince: day }
  delete upgraded.xp
  return upgraded
}

/**
 * Migrações, indexadas pela versão de origem. São sempre aditivas: criam
 * campos novos com valores padrão e nunca apagam dados do jogador; uma troca
 * de unidade, como a do dinheiro na versão 3, converte o valor sem perder
 * nada. Antes de subir a versão, rode `npm run fixture:save` para guardar um
 * save de exemplo da versão atual em tests/fixtures; os testes carregam todos
 * eles.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: toVersion2,
  2: toVersion3,
  3: toVersion4,
  4: toVersion5,
  5: toVersion6,
}

/** Valida um save lido de JSON e o leva até a versão atual. */
export function migrate(
  raw: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  target: number = CURRENT_SCHEMA_VERSION,
): GameState {
  if (!isRecord(raw) || !Number.isInteger(raw.schemaVersion)) {
    throw new SaveError('corrupt', 'O save não tem versão de formato')
  }
  let version = raw.schemaVersion as number
  if (version > target) {
    throw new SaveError(
      'futureVersion',
      `O save é da versão ${version}, mais nova que a do jogo (${target})`,
    )
  }
  let save: RawSave = raw
  while (version < target) {
    const step = migrations[version]
    if (!step) throw new SaveError('missingMigration', `Falta a migração da versão ${version}`)
    version += 1
    save = { ...step(save), schemaVersion: version }
  }
  assertGameState(save)
  return save
}

function isRecord(value: unknown): value is RawSave {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Checagem estrutural leve: pega saves truncados ou editados à mão. */
function assertGameState(save: RawSave): asserts save is RawSave & GameState {
  const { clock, members, stats } = save
  const valid =
    typeof save.seed === 'number' &&
    typeof save.rngState === 'number' &&
    typeof save.familyName === 'string' &&
    typeof save.startDate === 'string' &&
    typeof save.lastSimulatedAt === 'number' &&
    typeof save.money === 'number' &&
    Number.isFinite(save.money) &&
    typeof save.nextMemberId === 'number' &&
    isRecord(save.suitors) &&
    Array.isArray(save.choices) &&
    Array.isArray(save.log) &&
    isRecord(clock) &&
    typeof clock.day === 'number' &&
    typeof clock.tickOfDay === 'number' &&
    typeof clock.paused === 'boolean' &&
    isRecord(stats) &&
    isRecord(members) &&
    Object.values(members).every(
      (member) =>
        isRecord(member) &&
        typeof member.id === 'string' &&
        typeof member.birthDay === 'number' &&
        typeof member.origin === 'string' &&
        isRecord(member.appearance) &&
        isRecord(member.education),
    )
  if (!valid) throw new SaveError('corrupt', 'O save tem campos faltando ou inválidos')
}
