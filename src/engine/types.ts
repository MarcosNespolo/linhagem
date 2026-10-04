import type { CareerId } from '../content/careers'

export type MemberId = string
export type Gender = 'f' | 'm'

/** Como o membro entrou na família. */
export type Origin = 'founder' | 'born' | 'married'

export type CareerState = {
  id: CareerId
  /** Índice do nível atual na lista de níveis da carreira. */
  level: number
  /** Experiência no nível atual. Usada pelas promoções a partir da Fase 4. */
  xp: number
}

/**
 * Traços visuais. Cores e textura passam de pais para filhos; o corte de
 * cabelo é escolhido pelo desenho a partir de `style`, conforme idade e gênero.
 */
export type Appearance = {
  /** Índice do tom de pele, do mais claro ao mais escuro. */
  skin: number
  /** Índice da cor do cabelo. Fica grisalho com a idade. */
  hair: number
  /** Índice da cor dos olhos. */
  eyes: number
  /** Textura do cabelo: 0 liso, 1 ondulado, 2 cacheado, 3 crespo. */
  curl: number
  /** Número livre que o desenho usa para escolher o corte de cabelo. */
  style: number
  freckles: boolean
  /** Idade a partir da qual usa óculos, ou null se não usa. */
  glassesFrom: number | null
  /** Barba na vida adulta (só homens). */
  beard: boolean
  /** Calvície a partir da meia-idade (só homens). */
  balding: boolean
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
  origin: Origin
  parentIds: MemberId[]
  partnerId: MemberId | null
  /** Dia do jogo em que casou, ou null. */
  marriedDay: number | null
  career: CareerState | null
  /** Dia do jogo em que teve o último filho, para o intervalo mínimo entre filhos. */
  lastChildDay: number | null
  /** Traços de personalidade. Entram na Fase 4. */
  traits: string[]
  appearance: Appearance
  /** Semente para detalhes do avatar que não são herdados, como a cor da roupa. */
  avatarSeed: string
}

/** Pessoa de fora da família sugerida como par. Vira membro ao casar. */
export type Suitor = {
  firstName: string
  gender: Gender
  birthDay: number
  lifespan: number
  career: CareerState
  appearance: Appearance
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
  /** Pessoas sugeridas como par, por membro solteiro que procurou. */
  suitors: Record<MemberId, Suitor[]>
  /** Últimos acontecimentos da família, do mais antigo para o mais novo. */
  log: GameEvent[]
  stats: GameStats
}

/** Acontecimentos que a engine reporta para a interface mostrar. */
export type GameEvent =
  | { type: 'born'; day: number; memberId: MemberId }
  | { type: 'becameAdult'; day: number; memberId: MemberId }
  | { type: 'firstJob'; day: number; memberId: MemberId; careerId: CareerId }
  | { type: 'married'; day: number; memberId: MemberId; partnerId: MemberId }
  | { type: 'retired'; day: number; memberId: MemberId }
  | { type: 'died'; day: number; memberId: MemberId; age: number }
