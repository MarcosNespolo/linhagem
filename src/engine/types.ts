import type { CareerId } from '../content/careers'
import type { MissionId } from '../content/missions'
import type { PropertyId } from '../content/properties'
import type { DegreeId, Network, SchoolStage, Stage, TechCourseId } from '../content/schools'

export type MemberId = string
export type Gender = 'f' | 'm'

/** Como o membro entrou na família. */
export type Origin = 'founder' | 'born' | 'married'

export type CareerState = {
  id: CareerId
  /** Índice do nível atual na lista de níveis da carreira. */
  level: number
  /** Dia do jogo em que a pessoa chegou ao nível atual. Conta o tempo até a promoção. */
  levelSince: number
}

/**
 * Curso de promoção em andamento: ao terminar, a pessoa sobe um nível. Com
 * dedicação, dura a metade e a mensalidade dobra, e a pessoa não conhece
 * ninguém nem tem filho até terminar.
 */
export type CareerCourse = {
  /** Dia do jogo em que começou. */
  since: number
  /** Dia do jogo em que termina e a pessoa sobe de nível. */
  until: number
  dedicated: boolean
  /** Mensalidade, em reais por mês, fixada no começo. */
  fee: number
}

/** Quem estuda para concurso: não trabalha, paga o cursinho e faz uma prova a cada três meses. */
export type ConcursoStudy = {
  /** Dia do jogo em que começou a estudar. A nota sobe com os meses desde então. */
  since: number
  /** Provas já feitas nesta tentativa. */
  exams: number
  /** Nota da última prova, ou null antes da primeira. */
  lastScore: number | null
}

/** Matrícula de quem está na creche, na escola, no cursinho, no técnico ou na faculdade. */
export type Enrollment = {
  stage: Stage
  network: Network
  /** Curso técnico: integrado ao médio no instituto federal, ou o técnico depois do médio. */
  course?: TechCourseId
  /** Curso da faculdade. */
  degree?: DegreeId
  /** Anos que faltam, contando o atual, no cursinho, no técnico e na faculdade. */
  yearsLeft?: number
  /** Quem trabalha meio período para cuidar da criança em casa. */
  caregiverId?: MemberId
  /** Troca de rede pedida para a próxima matrícula, dentro da mesma etapa. */
  next?: Network
}

/** Maior formação concluída: ensino médio, técnico ou faculdade. */
export type Formation =
  | { level: 'medio' }
  | { level: 'tecnico'; course: TechCourseId }
  | { level: 'superior'; degree: DegreeId }

export type Education = {
  /** Matrícula atual, ou null fora dos estudos. */
  school: Enrollment | null
  /** Pontos que as escolas e o cursinho somaram à nota. */
  points: number
  /** Rede de cada etapa já concluída, para sugerir a mesma aos irmãos mais novos. */
  past: Partial<Record<Stage, Network>>
  formation: Formation | null
  /** Nota do último ENEM, ou null para quem não fez. */
  enem: number | null
  /**
   * Dia do jogo desde quando os pontos do professor particular estão contando,
   * ou null sem professor. Os pontos entram em janeiro e quando ele é dispensado.
   */
  tutorSince: number | null
}

/**
 * Vaga oferecida na escolha do primeiro emprego. Quem tem formação acima da que
 * a carreira pede, na mesma área, entra um nível acima.
 */
export type JobOffer = { careerId: CareerId; level: number }

/** Opção quando sai o resultado do concurso. */
export type ConcursoOption =
  /** Tomar posse no serviço público, no nível do cargo: técnico (0) ou analista (1). */
  | { kind: 'posse'; level: number }
  /** Continuar estudando para o cargo de nível superior. */
  | { kind: 'estudar' }
  /** Desistir do cargo e escolher uma vaga fora do serviço público. */
  | { kind: 'privada' }

/** Opção na matrícula de uma etapa nova. */
export type SchoolOption = {
  network: Network
  /** Curso técnico, nas opções do instituto federal. */
  course?: TechCourseId
  /** Saiu vaga, passou na prova: dá para escolher. */
  available: boolean
}

/** Caminho depois do ensino médio, na escolha de janeiro. */
export type PathOption =
  | { path: 'faculdade'; network: 'federal' | 'particular'; degree: DegreeId; available: boolean }
  | { path: 'tecnico'; network: 'federal' | 'particular'; course: TechCourseId; available: boolean }
  | { path: 'cursinho'; available: boolean }
  | { path: 'trabalho'; available: boolean }

/**
 * Escolha que espera o jogador. Enquanto houver alguma aberta, o relógio não
 * anda, nem com o jogo fechado.
 */
export type Choice =
  | {
      /** Primeiro emprego, ao sair dos estudos. */
      type: 'firstJob'
      memberId: MemberId
      /** Dia do jogo em que a escolha abriu. */
      day: number
      offers: JobOffer[]
      /**
       * Se dá para estudar para concurso em vez de trabalhar. A opção vem depois
       * das vagas, com o índice `offers.length`.
       */
      concurso: boolean
      /** Índice da vaga sugerida: a de maior salário. */
      suggested: number
    }
  | {
      /** Resultado do concurso de quem passou: tomar posse, continuar estudando ou desistir. */
      type: 'concurso'
      memberId: MemberId
      day: number
      /** Nota da prova. */
      score: number
      options: ConcursoOption[]
      suggested: number
    }
  | {
      /** Alguém que o membro solteiro conheceu: namorar (0) ou agora não (1). */
      type: 'meet'
      memberId: MemberId
      day: number
      person: Suitor
      suggested: number
    }
  | {
      /** Pedido de casamento depois do namoro: casar (0), esperar mais um ano (1) ou terminar (2). */
      type: 'propose'
      memberId: MemberId
      day: number
      suggested: number
    }
  | {
      /** Matrícula numa etapa nova da escola, em janeiro. */
      type: 'school'
      memberId: MemberId
      day: number
      stage: SchoolStage
      options: SchoolOption[]
      /** Índice da opção sugerida: a do instituto federal, a dos irmãos ou a mais barata. */
      suggested: number
    }
  | {
      /** O que fazer depois do ensino médio, em janeiro, com a nota do ENEM. */
      type: 'afterSchool'
      memberId: MemberId
      day: number
      enem: number
      options: PathOption[]
      /** Índice do caminho sugerido: a federal que a nota alcança, o técnico federal ou trabalhar. */
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
  /** Namoro em andamento, de quem é solteiro, ou null. */
  dating: Dating | null
  career: CareerState | null
  /** Curso de promoção em andamento, ou null. */
  course: CareerCourse | null
  /** Desempregado depois de uma demissão: sem salário até este dia do jogo, ou null. */
  unemployedUntil: number | null
  /** Estudo para concurso, ou null para quem não está estudando. */
  concurso: ConcursoStudy | null
  /** Dia do jogo em que teve o último filho, para o intervalo mínimo entre filhos. */
  lastChildDay: number | null
  /** Traços de personalidade. Ficam para depois do v1. */
  traits: string[]
  education: Education
  /** Aptidão para os estudos, de 400 a 700: de nascença para quem vem de fora, herdada para os filhos. */
  aptitude: number
  appearance: Appearance
  /** Semente para detalhes do avatar que não são herdados, como a cor da roupa. */
  avatarSeed: string
}

/** Pessoa de fora da família que um membro conheceu. Vira membro ao casar. */
export type Suitor = {
  firstName: string
  gender: Gender
  birthDay: number
  lifespan: number
  formation: Formation
  career: CareerState
  /** Aptidão para os estudos, que os filhos do casal vão herdar em parte. */
  aptitude: number
  appearance: Appearance
  avatarSeed: string
}

/** Namoro de um membro solteiro com alguém de fora da família. */
export type Dating = {
  partner: Suitor
  /** Dia do jogo em que começou. */
  since: number
  /** Dia do pedido de casamento: a mesma data, um ano depois do começo, e mais um ano a cada espera. */
  askDay: number
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
  /** A parte do que entrou que veio do aluguel dos imóveis. */
  rentEarned: number
  /** Pessoas de ramos antigos que já terminaram e saíram da árvore guardada (`archiveMembers`). */
  archived: number
}

/** Missão do dia, com o progresso desde que apareceu. */
export type MissionState = {
  id: MissionId
  /** Meta: quantos acontecimentos ou, no Pé-de-meia, quanto dinheiro juntar. */
  goal: number
  /** Quanto já foi feito desde o sorteio, até a meta. */
  progress: number
  /** Ponto de partida das missões que comparam com o sorteio: pessoas vivas ou dinheiro. */
  base: number
  /** A recompensa já foi pega. */
  claimed: boolean
}

/** Missões sorteadas para um dia do aparelho. Somem quando o dia vira. */
export type Missions = {
  /** Data do aparelho (AAAA-MM-DD) do sorteio. */
  date: string
  list: MissionState[]
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
  /** Dinheiro da família. Pode ficar negativo: é a dívida. */
  money: number
  /** Dia em que o saldo ficou negativo, ou null no azul. Daí conta o prazo para a falência. */
  debtSince: number | null
  /** Dia da falência, ou null. Com ela, a partida acabou e o relógio não anda mais. */
  bankruptDay: number | null
  members: Record<MemberId, Member>
  nextMemberId: number
  /** Escolhas abertas, na ordem em que abriram. Com alguma aberta, o relógio para. */
  choices: Choice[]
  /** Quantos imóveis de cada tipo a família tem. São da família e ficam quando as pessoas morrem. */
  properties: Partial<Record<PropertyId, number>>
  /** Quantos imóveis comerciais de cada tipo estão à venda no bairro. */
  market: Partial<Record<PropertyId, number>>
  /**
   * Lotes do bairro que são da família, por tipo, em ordem: o número de cada
   * lote, de 0 a `lots - 1`. Nos de moradia, um por imóvel; nos comerciais, a
   * família pode ter mais imóveis do que lotes, e os outros ficam fora da rua.
   */
  lots: Partial<Record<PropertyId, number[]>>
  /** Missões do dia, ou null antes do primeiro sorteio. */
  missions: Missions | null
  boosts: {
    /** Posição do relógio, em unidades desde o dia 0, até a qual a renda fica em dobro. */
    incomeUntil: number
  }
  /** Últimos acontecimentos da família, do mais antigo para o mais novo. */
  log: LogEvent[]
  stats: GameStats
}

/** Acontecimentos de uma pessoa da família, que ficam no histórico. */
export type MemberEvent =
  | { type: 'born'; day: number; memberId: MemberId }
  | { type: 'becameAdult'; day: number; memberId: MemberId }
  | {
      type: 'firstJob'
      day: number
      memberId: MemberId
      careerId: CareerId
      /** Nível de entrada. Sem valor, o primeiro, como nos saves antigos. */
      level?: number
    }
  | { type: 'promoted'; day: number; memberId: MemberId; careerId: CareerId; level: number }
  | { type: 'concursoStarted'; day: number; memberId: MemberId }
  | {
      /** Resultado final de uma tentativa: aprovado num nível, ou reprovado depois da última prova. */
      type: 'concurso'
      day: number
      memberId: MemberId
      score: number
      /** Nível do cargo em que passou, ou null para quem não passou. */
      level: number | null
    }
  | { type: 'datingStarted'; day: number; memberId: MemberId; partnerName: string }
  | { type: 'breakup'; day: number; memberId: MemberId; partnerName: string }
  | { type: 'married'; day: number; memberId: MemberId; partnerId: MemberId }
  /**
   * Casou sem lugar em casa e foi formar a própria família, com o par. Só nos
   * históricos de saves antigos: desde a versão 14, ninguém sai de casa.
   */
  | { type: 'leftHome'; day: number; memberId: MemberId; partnerId: MemberId }
  /** Demissão: fica sem salário até o dia `until`. */
  | { type: 'laidOff'; day: number; memberId: MemberId; until: number }
  | { type: 'rehired'; day: number; memberId: MemberId }
  /** Imprevisto pago pela família. */
  | { type: 'mishap'; day: number; memberId: MemberId; kind: MishapKind; cost: number }
  | { type: 'retired'; day: number; memberId: MemberId }
  | { type: 'died'; day: number; memberId: MemberId; age: number }
  | {
      type: 'schoolStarted'
      day: number
      memberId: MemberId
      stage: Stage
      network: Network
      course?: TechCourseId
      degree?: DegreeId
    }
  | { type: 'enem'; day: number; memberId: MemberId; score: number }
  | { type: 'schoolChanged'; day: number; memberId: MemberId; network: Network }
  | { type: 'schoolFinished'; day: number; memberId: MemberId; formation: Formation }

/** Imprevistos que custam dinheiro: cirurgia e conserto do carro. */
export type MishapKind = 'surgery' | 'car'

/** Compra de um imóvel pela família. `count` é quantos do tipo ela tem depois da compra. */
export type PropertyEvent = {
  type: 'propertyBought'
  day: number
  propertyId: PropertyId
  count: number
}

/** O dinheiro da família: entrar e sair do vermelho, e a falência, que acaba a partida. */
export type MoneyEvent =
  | { type: 'inDebt'; day: number }
  | { type: 'outOfDebt'; day: number }
  | { type: 'bankrupt'; day: number }

/** Acontecimentos que ficam no histórico: os das pessoas, as compras e o dinheiro da família. */
export type LogEvent = MemberEvent | PropertyEvent | MoneyEvent

/**
 * Acontecimentos que a engine reporta para a interface mostrar. O 13º salário
 * vira aviso, mas não entra no histórico, para não repetir uma linha por ano.
 */
export type GameEvent = LogEvent | { type: 'thirteenth'; day: number; amount: number }
