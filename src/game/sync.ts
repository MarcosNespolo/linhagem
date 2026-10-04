/**
 * Regras da sincronização com a nuvem. Funções puras: a store busca o que está na nuvem, pergunta
 * aqui o que fazer e executa.
 *
 * Cada gravação na nuvem sobe a revisão do save. O aparelho guarda a revisão em que o save dele se
 * baseia e se o jogador mudou algo desde então. Tempo passando não conta como mudança: a simulação
 * é determinística, então qualquer aparelho que avance o mesmo save chega ao mesmo lugar.
 */

/** O que este aparelho sabe da última sincronização. Fica guardado no aparelho. */
export type SyncMeta = {
  /** Conta da nuvem a que a família deste aparelho está ligada. */
  userId: string
  /** Revisão da nuvem igual ao save deste aparelho, ou null se ainda não sincronizou. */
  revision: number | null
  /** Seed da família que estava na nuvem na última sincronização. */
  familySeed: number | null
  /** O jogador mudou algo que a nuvem ainda não tem. */
  dirty: boolean
  /** A família deste aparelho começou com a conta conectada e substitui a da nuvem. */
  replace: boolean
}

/**
 * - create: a nuvem está vazia; envia a família deste aparelho.
 * - update: a nuvem não mudou desde a última sincronização; envia o que mudou aqui.
 * - replace: grava a família deste aparelho por cima da nuvem.
 * - adopt: outro aparelho gravou depois e aqui nada mudou; continua de lá.
 * - ask: os dois lados mudaram, ou são famílias diferentes; o jogador escolhe.
 * - none: nada a fazer.
 */
export type SyncStep = 'create' | 'update' | 'replace' | 'adopt' | 'ask' | 'none'

/** Ponto de partida de um aparelho que nunca sincronizou com esta conta. */
export function freshMeta(userId: string): SyncMeta {
  return { userId, revision: null, familySeed: null, dirty: true, replace: false }
}

/**
 * Decide o próximo passo comparando a família deste aparelho (null na tela de criar família), o que
 * ele sabe da última sincronização e a revisão que está na nuvem (null se não há save).
 */
export function nextStep(
  local: { seed: number } | null,
  meta: SyncMeta,
  cloudRevision: number | null,
): SyncStep {
  if (cloudRevision === null) return local ? 'create' : 'none'
  if (!local) return 'adopt'
  if (meta.replace) return 'replace'
  if (meta.revision === null) return 'ask'
  if (cloudRevision !== meta.revision) return meta.dirty ? 'ask' : 'adopt'
  if (local.seed !== meta.familySeed) return 'ask'
  return meta.dirty ? 'update' : 'none'
}

/** Lê o que o aparelho guardou. Devolve null se não houver nada válido. */
export function parseSyncMeta(raw: string | null): SyncMeta | null {
  if (raw === null) return null
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null) return null
  const meta = value as Record<string, unknown>
  const valid =
    typeof meta.userId === 'string' &&
    (meta.revision === null || Number.isInteger(meta.revision)) &&
    (meta.familySeed === null || typeof meta.familySeed === 'number') &&
    typeof meta.dirty === 'boolean' &&
    typeof meta.replace === 'boolean'
  return valid ? (meta as SyncMeta) : null
}
