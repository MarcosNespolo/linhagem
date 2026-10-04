import type { CareerId } from '../content/careers'

export type MemberId = string
export type Gender = 'f' | 'm'

export type CareerState = {
  id: CareerId
  /** Índice do nível atual na lista de níveis da carreira. */
  level: number
  /** Experiência no nível atual. Usada pelas promoções a partir da Fase 4. */
  xp: number
}

export type Member = {
  id: MemberId
  firstName: string
  gender: Gender
  /** Dia do jogo em que nasceu. Negativo para quem nasceu antes do início da partida. */
  birthDay: number
  /** Dia do jogo em que morreu, ou null enquanto vive. */
  deathDay: number | null
  /** Idade, em anos, em que morre de causas naturais. Sorteada no nascimento. */
  lifespan: number
  /** 0 para o casal fundador, 1 para os filhos, 2 para os netos e assim por diante. */
  generation: number
  parentIds: MemberId[]
  partnerId: MemberId | null
  career: CareerState | null
  /** Dia do jogo em que teve o último filho, para o intervalo mínimo entre filhos. */
  lastChildDay: number | null
  /** Traços de personalidade. Entram na Fase 4. */
  traits: string[]
  /** Semente do avatar procedural. */
  avatarSeed: string
}

export type Clock = {
  /** Dia atual do jogo, contado a partir de 0. */
  day: number
  /** Unidades do relógio já passadas dentro do dia atual, de 0 a TICKS_PER_DAY - 1. */
  tickOfDay: number
  paused: boolean
}

export type GameStats = {
  /** Milissegundos reais simulados, sem contar pausas. Decide conflitos de save entre aparelhos. */
  simulatedMs: number
  totalEarned: number
  totalSpent: number
}

export type GameState = {
  schemaVersion: number
  /** Seed com que a partida começou. Fica só como referência. */
  seed: number
  /** Estado atual do gerador aleatório. */
  rngState: number
  familyName: string
  /** Data do calendário que corresponde ao dia 0, no formato AAAA-MM-DD. */
  startDate: string
  clock: Clock
  /** Instante real (epoch em ms) até onde o estado foi simulado. Base do progresso offline. */
  lastSimulatedAt: number
  money: number
  members: Record<MemberId, Member>
  nextMemberId: number
  stats: GameStats
}

/** Acontecimentos que a engine reporta para a interface mostrar. */
export type GameEvent =
  | { type: 'born'; day: number; memberId: MemberId }
  | { type: 'becameAdult'; day: number; memberId: MemberId }
  | { type: 'firstJob'; day: number; memberId: MemberId; careerId: CareerId }
  | { type: 'retired'; day: number; memberId: MemberId }
  | { type: 'died'; day: number; memberId: MemberId; age: number }
