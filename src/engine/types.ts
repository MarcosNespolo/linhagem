import type { CareerId } from '../content/careers'

export type MemberId = string
export type Gender = 'f' | 'm'

/** Como o membro entrou na família. */
export type Origin = 'founder' | 'born' | 'married'

export type CareerState = {
  id: CareerId
  /** Índice do nível atual na lista de níveis da carreira. */
  level: number
  /** Experiência no nível atual. Ainda não usada; as promoções entram na etapa 4.4. */
  xp: number
}

/** Vaga oferecida na escolha do primeiro emprego: o primeiro nível de uma carreira. */
export type JobOffer = { careerId: CareerId }

/**
 * Escolha que espera o jogador. Enquanto houver alguma aberta, o relógio não
 * anda, nem com o jogo fechado.
 */
export type Choice = {
  /** Primeiro emprego, aos 18 anos. */
  type: 'firstJob'
  memberId: MemberId
  /** Dia do jogo em que a escolha abriu. */
  day: number
  offers: JobOffer[]
  /** Índice da vaga sugerida: a de maior salário. */
  suggested: number
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
  /** Traços de personalidade. Ficam para depois do v1. */
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
  /** Escolhas abertas, na ordem em que abriram. Com alguma aberta, o relógio para. */
  choices: Choice[]
  /** Últimos acontecimentos da família, do mais antigo para o mais novo. */
  log: MemberEvent[]
  stats: GameStats
}

/** Acontecimentos de uma pessoa da família, que ficam no histórico. */
export type MemberEvent =
  | { type: 'born'; day: number; memberId: MemberId }
  | { type: 'becameAdult'; day: number; memberId: MemberId }
  | { type: 'firstJob'; day: number; memberId: MemberId; careerId: CareerId }
  | { type: 'married'; day: number; memberId: MemberId; partnerId: MemberId }
  | { type: 'retired'; day: number; memberId: MemberId }
  | { type: 'died'; day: number; memberId: MemberId; age: number }

/**
 * Acontecimentos que a engine reporta para a interface mostrar. O 13º salário
 * vira aviso, mas não entra no histórico, para não repetir uma linha por ano.
 */
export type GameEvent = MemberEvent | { type: 'thirteenth'; day: number; amount: number }
