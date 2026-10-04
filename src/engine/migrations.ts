import type { GameState } from './types'

/** Versão atual do formato do save. Sobe a cada migração nova. */
export const CURRENT_SCHEMA_VERSION = 1

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
 * Migrações, indexadas pela versão de origem. São sempre aditivas: criam
 * campos novos com valores padrão e nunca apagam dados do jogador. Antes de
 * subir a versão, rode `npm run fixture:save` para guardar um save de exemplo
 * da versão atual em tests/fixtures; os testes carregam todos eles.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {}

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
    isRecord(clock) &&
    typeof clock.day === 'number' &&
    typeof clock.tickOfDay === 'number' &&
    typeof clock.paused === 'boolean' &&
    isRecord(stats) &&
    isRecord(members) &&
    Object.values(members).every(
      (member) =>
        isRecord(member) && typeof member.id === 'string' && typeof member.birthDay === 'number',
    )
  if (!valid) throw new SaveError('corrupt', 'O save tem campos faltando ou inválidos')
}
