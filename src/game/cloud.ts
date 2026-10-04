import {
  createClient,
  isAuthRetryableFetchError,
  type AuthError,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js'
import type { GameState } from '@/engine'
import type { Database, Json } from './database'
import { deviceId } from './persistence'

/** Conta do jogador na nuvem. */
export type CloudUser = { id: string; email: string | null }

/** Save guardado na nuvem. O estado vem como o banco devolveu: ainda não foi migrado nem validado. */
export type CloudSave = {
  state: unknown
  revision: number
  /** Instante da gravação, pelo relógio do servidor (ISO 8601). */
  savedAt: string
}

/** Por que uma operação com a nuvem não deu certo. */
export type CloudProblem =
  | 'offline'
  | 'rateLimited'
  | 'invalidEmail'
  | 'notAuthorized'
  | 'wrongCode'
  | 'unavailable'
  | 'unknown'

export type CloudResult<T> =
  { ok: true; value: T } | { ok: false; problem: CloudProblem; message: string }

/** Operações com a nuvem que o jogo usa. Só a store chama. */
export type CloudApi = {
  /**
   * Avisa quando a conta entra ou sai, inclusive a sessão que já estava aberta neste navegador e o
   * login pelo link do e-mail. Devolve a função que para de avisar.
   */
  onUserChange(listener: (user: CloudUser | null) => void): () => void
  /** Manda para o e-mail um código de acesso e um link. Cria a conta se ela ainda não existe. */
  sendCode(email: string): Promise<CloudResult<null>>
  verifyCode(email: string, code: string): Promise<CloudResult<CloudUser>>
  /** Encerra a sessão neste navegador. */
  signOut(): Promise<CloudResult<null>>
  /** Revisão do save na nuvem, ou null se ainda não há save. */
  fetchRevision(userId: string): Promise<CloudResult<number | null>>
  fetchSave(userId: string): Promise<CloudResult<CloudSave | null>>
  /** Cria o save e devolve a revisão, ou null se outro aparelho criou antes. */
  createSave(userId: string, state: GameState): Promise<CloudResult<number | null>>
  /**
   * Grava se a revisão na nuvem ainda for `base`. Devolve a revisão nova, ou null se outro
   * aparelho gravou antes.
   */
  updateSave(userId: string, state: GameState, base: number): Promise<CloudResult<number | null>>
  /** Grava por cima do que houver na nuvem e devolve a revisão nova. */
  replaceSave(userId: string, state: GameState): Promise<CloudResult<number>>
}

const SAVES = 'linhagem_saves'
/** Código do Postgres para chave duplicada: o save já existe. */
const UNIQUE_VIOLATION = '23505'

let cloud: CloudApi | null | undefined

/**
 * Acesso à nuvem, ou null quando o build não tem as variáveis do Supabase. Só existe no navegador:
 * o jogo roda inteiro lá.
 */
export function getCloud(): CloudApi | null {
  if (typeof window === 'undefined') return null
  if (cloud === undefined) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    cloud =
      url && key
        ? supabaseCloud(
            createClient<Database>(url, key, {
              auth: { flowType: 'pkce', storageKey: 'linhagem:sessao' },
            }),
          )
        : null
  }
  return cloud
}

function supabaseCloud(client: SupabaseClient<Database>): CloudApi {
  return {
    onUserChange(listener) {
      const { data } = client.auth.onAuthStateChange((_event, session) =>
        listener(toUser(session?.user ?? null)),
      )
      return () => data.subscription.unsubscribe()
    },

    async sendCode(email) {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/jogar`,
          // O projeto do Supabase é compartilhado: marca as contas que vieram do jogo.
          data: { app: 'linhagem' },
        },
      })
      return error ? authFailure(error) : { ok: true, value: null }
    },

    async verifyCode(email, code) {
      const { data, error } = await client.auth.verifyOtp({ email, token: code, type: 'email' })
      if (error) {
        const failure = authFailure(error)
        return failure.problem === 'offline' || failure.problem === 'rateLimited'
          ? failure
          : { ...failure, problem: 'wrongCode' }
      }
      const user = toUser(data.user)
      return user ? { ok: true, value: user } : unknownFailure('Login sem conta')
    },

    async signOut() {
      const { error } = await client.auth.signOut({ scope: 'local' })
      return error ? authFailure(error) : { ok: true, value: null }
    },

    async fetchRevision(userId) {
      const { data, error, status } = await client
        .from(SAVES)
        .select('revision')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) return dataFailure(error.message, status)
      return { ok: true, value: data?.revision ?? null }
    },

    async fetchSave(userId) {
      const { data, error, status } = await client
        .from(SAVES)
        .select('state, revision, saved_at')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) return dataFailure(error.message, status)
      const save = data
        ? { state: data.state, revision: data.revision, savedAt: data.saved_at }
        : null
      return { ok: true, value: save }
    },

    async createSave(userId, state) {
      const { data, error, status } = await client
        .from(SAVES)
        .insert({ user_id: userId, ...saveColumns(state) })
        .select('revision')
        .single()
      if (error?.code === UNIQUE_VIOLATION) return { ok: true, value: null }
      if (error) return dataFailure(error.message, status)
      return { ok: true, value: data.revision }
    },

    async updateSave(userId, state, base) {
      const { data, error, status } = await client
        .from(SAVES)
        .update(saveColumns(state))
        .eq('user_id', userId)
        .eq('revision', base)
        .select('revision')
      if (error) return dataFailure(error.message, status)
      return { ok: true, value: data[0]?.revision ?? null }
    },

    async replaceSave(userId, state) {
      const { data, error, status } = await client
        .from(SAVES)
        .upsert({ user_id: userId, ...saveColumns(state) }, { onConflict: 'user_id' })
        .select('revision')
        .single()
      if (error) return dataFailure(error.message, status)
      return { ok: true, value: data.revision }
    },
  }
}

/** Colunas gravadas a cada envio. A revisão, a hora e o save anterior ficam por conta do banco. */
function saveColumns(state: GameState) {
  return {
    state: state as unknown as Json,
    schema_version: state.schemaVersion,
    game_time_seconds: state.stats.simulatedMs / 1000,
    device_id: deviceId(),
  }
}

function toUser(user: User | null): CloudUser | null {
  return user ? { id: user.id, email: user.email ?? null } : null
}

function authFailure(error: AuthError): { ok: false; problem: CloudProblem; message: string } {
  const failure = (problem: CloudProblem) => ({
    ok: false as const,
    problem,
    message: error.message,
  })
  if (isAuthRetryableFetchError(error)) return failure('offline')
  switch (error.code) {
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return failure('rateLimited')
    case 'email_address_invalid':
    case 'validation_failed':
      return failure('invalidEmail')
    case 'email_address_not_authorized':
      return failure('notAuthorized')
    case 'otp_expired':
      return failure('wrongCode')
    case 'signup_disabled':
    case 'email_provider_disabled':
    case 'otp_disabled':
      return failure('unavailable')
    default:
      return failure('unknown')
  }
}

/** Falha numa leitura ou gravação do save. Status 0 é a requisição que nem chegou ao servidor. */
function dataFailure(
  message: string,
  status: number,
): { ok: false; problem: CloudProblem; message: string } {
  return { ok: false, problem: status === 0 ? 'offline' : 'unknown', message }
}

function unknownFailure(message: string): { ok: false; problem: CloudProblem; message: string } {
  return { ok: false, problem: 'unknown', message }
}
