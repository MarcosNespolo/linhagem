export type CareerLevel = {
  /** Título do cargo para homens (m) e mulheres (f). */
  title: { m: string; f: string }
  /** Salário por mês do jogo, em reais. */
  salaryPerMonth: number
}

/**
 * O que a carreira pede para entrar: ensino médio, curso técnico da área,
 * faculdade da área ou aprovação em concurso.
 */
export type CareerRequirement = 'medio' | 'tecnico' | 'superior' | 'concurso'

/** Formação que um cargo público pede: ensino médio ou faculdade. */
export type ConcursoFormation = 'medio' | 'superior'

export type Career = {
  id: string
  name: string
  requires: CareerRequirement
  /** Cinco níveis, do primeiro emprego ao topo da carreira. */
  levels: readonly CareerLevel[]
  /**
   * Só no serviço público: a nota de corte do concurso e a formação que o
   * cargo pede. Quem passa entra no primeiro nível e sobe com o tempo.
   */
  concurso?: { cutoff: number; formation: ConcursoFormation }
}

const title = (m: string, f: string = m) => ({ m, f })

/**
 * As 16 carreiras: 11 privadas, em que cada nível pede um curso pago, e 5 do
 * serviço público, uma por faixa de concurso, da prefeitura à auditoria fiscal,
 * em que a promoção vem com o tempo. As que pedem mais formação, ou nota mais
 * alta, pagam mais.
 */
export const CAREERS = [
  {
    id: 'comercio',
    name: 'Comércio',
    requires: 'medio',
    levels: [
      { title: title('Atendente'), salaryPerMonth: 1800 },
      { title: title('Vendedor', 'Vendedora'), salaryPerMonth: 3000 },
      { title: title('Gerente de loja'), salaryPerMonth: 5000 },
      { title: title('Gerente regional'), salaryPerMonth: 8400 },
      { title: title('Dono de rede de lojas', 'Dona de rede de lojas'), salaryPerMonth: 14_000 },
    ],
  },
  {
    id: 'gastronomia',
    name: 'Gastronomia',
    requires: 'medio',
    levels: [
      { title: title('Auxiliar de cozinha'), salaryPerMonth: 1700 },
      { title: title('Cozinheiro', 'Cozinheira'), salaryPerMonth: 2800 },
      { title: title('Sous-chef'), salaryPerMonth: 4700 },
      { title: title('Chef'), salaryPerMonth: 7800 },
      { title: title('Dono de restaurante', 'Dona de restaurante'), salaryPerMonth: 13_000 },
    ],
  },
  {
    id: 'construcao',
    name: 'Construção',
    requires: 'medio',
    levels: [
      { title: title('Ajudante de obra'), salaryPerMonth: 1900 },
      { title: title('Técnico de obras', 'Técnica de obras'), salaryPerMonth: 3200 },
      { title: title('Mestre de obras', 'Mestra de obras'), salaryPerMonth: 5300 },
      { title: title('Encarregado geral', 'Encarregada geral'), salaryPerMonth: 8900 },
      { title: title('Dono de construtora', 'Dona de construtora'), salaryPerMonth: 15_000 },
    ],
  },
  {
    id: 'transporte',
    name: 'Transporte',
    requires: 'medio',
    levels: [
      { title: title('Motorista'), salaryPerMonth: 2400 },
      { title: title('Motorista de carreta'), salaryPerMonth: 3900 },
      { title: title('Supervisor de frota', 'Supervisora de frota'), salaryPerMonth: 6200 },
      { title: title('Gerente de logística'), salaryPerMonth: 10_000 },
      { title: title('Dono de transportadora', 'Dona de transportadora'), salaryPerMonth: 16_000 },
    ],
  },
  {
    id: 'agro',
    name: 'Agro',
    requires: 'medio',
    levels: [
      { title: title('Trabalhador rural', 'Trabalhadora rural'), salaryPerMonth: 1800 },
      { title: title('Técnico agrícola', 'Técnica agrícola'), salaryPerMonth: 3000 },
      { title: title('Capataz'), salaryPerMonth: 5100 },
      {
        title: title('Administrador de fazenda', 'Administradora de fazenda'),
        salaryPerMonth: 8600,
      },
      { title: title('Produtor rural', 'Produtora rural'), salaryPerMonth: 14_500 },
    ],
  },
  {
    id: 'saude',
    name: 'Saúde',
    requires: 'tecnico',
    levels: [
      { title: title('Técnico de enfermagem', 'Técnica de enfermagem'), salaryPerMonth: 3000 },
      { title: title('Enfermeiro', 'Enfermeira'), salaryPerMonth: 5100 },
      { title: title('Enfermeiro-chefe', 'Enfermeira-chefe'), salaryPerMonth: 8800 },
      { title: title('Coordenador de saúde', 'Coordenadora de saúde'), salaryPerMonth: 15_200 },
      { title: title('Diretor hospitalar', 'Diretora hospitalar'), salaryPerMonth: 26_000 },
    ],
  },
  {
    id: 'tecnologia',
    name: 'Tecnologia',
    requires: 'tecnico',
    levels: [
      { title: title('Técnico de informática', 'Técnica de informática'), salaryPerMonth: 3000 },
      { title: title('Desenvolvedor', 'Desenvolvedora'), salaryPerMonth: 5300 },
      { title: title('Desenvolvedor sênior', 'Desenvolvedora sênior'), salaryPerMonth: 9500 },
      { title: title('Tech lead'), salaryPerMonth: 16_900 },
      { title: title('CTO'), salaryPerMonth: 30_000 },
    ],
  },
  {
    id: 'educacao',
    name: 'Educação',
    requires: 'superior',
    levels: [
      { title: title('Professor', 'Professora'), salaryPerMonth: 4500 },
      { title: title('Coordenador pedagógico', 'Coordenadora pedagógica'), salaryPerMonth: 6500 },
      { title: title('Diretor de escola', 'Diretora de escola'), salaryPerMonth: 9500 },
      { title: title('Supervisor de ensino', 'Supervisora de ensino'), salaryPerMonth: 13_800 },
      { title: title('Secretário de educação', 'Secretária de educação'), salaryPerMonth: 20_000 },
    ],
  },
  {
    id: 'engenharia',
    name: 'Engenharia',
    requires: 'superior',
    levels: [
      { title: title('Engenheiro júnior', 'Engenheira júnior'), salaryPerMonth: 6500 },
      { title: title('Engenheiro', 'Engenheira'), salaryPerMonth: 9500 },
      { title: title('Engenheiro sênior', 'Engenheira sênior'), salaryPerMonth: 14_000 },
      { title: title('Gerente de projetos'), salaryPerMonth: 20_500 },
      { title: title('Diretor de engenharia', 'Diretora de engenharia'), salaryPerMonth: 30_000 },
    ],
  },
  {
    id: 'direito',
    name: 'Direito',
    requires: 'superior',
    levels: [
      { title: title('Advogado júnior', 'Advogada júnior'), salaryPerMonth: 5500 },
      { title: title('Advogado', 'Advogada'), salaryPerMonth: 8700 },
      { title: title('Advogado sênior', 'Advogada sênior'), salaryPerMonth: 13_900 },
      { title: title('Sócio de escritório', 'Sócia de escritório'), salaryPerMonth: 22_000 },
      { title: title('Sócio-diretor', 'Sócia-diretora'), salaryPerMonth: 35_000 },
    ],
  },
  {
    id: 'medicina',
    name: 'Medicina',
    requires: 'superior',
    levels: [
      { title: title('Médico residente', 'Médica residente'), salaryPerMonth: 7000 },
      { title: title('Médico', 'Médica'), salaryPerMonth: 11_400 },
      { title: title('Médico especialista', 'Médica especialista'), salaryPerMonth: 18_700 },
      { title: title('Chefe de clínica'), salaryPerMonth: 30_500 },
      { title: title('Diretor clínico', 'Diretora clínica'), salaryPerMonth: 50_000 },
    ],
  },
  {
    id: 'prefeitura',
    name: 'Prefeitura',
    requires: 'concurso',
    concurso: { cutoff: 540, formation: 'medio' },
    levels: [
      { title: title('Auxiliar administrativo', 'Auxiliar administrativa'), salaryPerMonth: 2400 },
      { title: title('Agente administrativo', 'Agente administrativa'), salaryPerMonth: 3000 },
      { title: title('Fiscal municipal'), salaryPerMonth: 3600 },
      { title: title('Chefe de setor'), salaryPerMonth: 4400 },
      { title: title('Diretor de departamento', 'Diretora de departamento'), salaryPerMonth: 5500 },
    ],
  },
  {
    id: 'estado',
    name: 'Estado',
    requires: 'concurso',
    concurso: { cutoff: 620, formation: 'medio' },
    levels: [
      { title: title('Agente do estado'), salaryPerMonth: 4200 },
      { title: title('Técnico do estado', 'Técnica do estado'), salaryPerMonth: 5200 },
      { title: title('Supervisor', 'Supervisora'), salaryPerMonth: 6400 },
      { title: title('Chefe de seção'), salaryPerMonth: 7600 },
      { title: title('Diretor estadual', 'Diretora estadual'), salaryPerMonth: 9000 },
    ],
  },
  {
    id: 'tecnicoFederal',
    name: 'Técnico federal',
    requires: 'concurso',
    concurso: { cutoff: 700, formation: 'medio' },
    levels: [
      { title: title('Técnico do INSS', 'Técnica do INSS'), salaryPerMonth: 6400 },
      { title: title('Técnico judiciário', 'Técnica judiciária'), salaryPerMonth: 7800 },
      { title: title('Técnico sênior', 'Técnica sênior'), salaryPerMonth: 9400 },
      { title: title('Supervisor federal', 'Supervisora federal'), salaryPerMonth: 10_800 },
      { title: title('Chefe de agência'), salaryPerMonth: 12_000 },
    ],
  },
  {
    id: 'analistaFederal',
    name: 'Analista federal',
    requires: 'concurso',
    concurso: { cutoff: 760, formation: 'superior' },
    levels: [
      { title: title('Analista'), salaryPerMonth: 12_000 },
      { title: title('Analista sênior'), salaryPerMonth: 14_500 },
      { title: title('Coordenador', 'Coordenadora'), salaryPerMonth: 17_000 },
      { title: title('Gerente'), salaryPerMonth: 19_500 },
      { title: title('Diretor', 'Diretora'), salaryPerMonth: 22_000 },
    ],
  },
  {
    id: 'auditoria',
    name: 'Auditoria fiscal',
    requires: 'concurso',
    concurso: { cutoff: 850, formation: 'superior' },
    levels: [
      { title: title('Auditor fiscal', 'Auditora fiscal'), salaryPerMonth: 23_000 },
      { title: title('Auditor sênior', 'Auditora sênior'), salaryPerMonth: 27_000 },
      { title: title('Auditor-chefe', 'Auditora-chefe'), salaryPerMonth: 31_000 },
      { title: title('Superintendente'), salaryPerMonth: 35_000 },
      { title: title('Secretário da Receita', 'Secretária da Receita'), salaryPerMonth: 40_000 },
    ],
  },
] as const satisfies readonly Career[]

export type CareerId = (typeof CAREERS)[number]['id']

export const CAREER_IDS: readonly CareerId[] = CAREERS.map((career) => career.id)

/** Carreiras do serviço público, da nota de corte mais baixa à mais alta. */
export const PUBLIC_CAREERS: readonly CareerId[] = (CAREERS as readonly Career[])
  .filter((career) => career.concurso)
  .sort((a, b) => (a.concurso?.cutoff ?? 0) - (b.concurso?.cutoff ?? 0))
  .map((career) => career.id as CareerId)

/** Cargos públicos de nível médio: os que quem o membro conhece pode ter. */
export const PUBLIC_MEDIO_CAREERS: readonly CareerId[] = (CAREERS as readonly Career[])
  .filter((career) => career.concurso?.formation === 'medio')
  .map((career) => career.id as CareerId)

/** Carreiras que pedem só o ensino médio. */
export const MEDIO_CAREERS: readonly CareerId[] = CAREERS.filter(
  (career) => career.requires === 'medio',
).map((career) => career.id)

const BY_ID = new Map<CareerId, Career>(CAREERS.map((career) => [career.id, career]))

export function getCareer(id: CareerId): Career {
  const career = BY_ID.get(id)
  if (!career) throw new Error(`Carreira desconhecida: ${id}`)
  return career
}

/** Carreira do serviço público: quem entra passou em concurso e sobe com o tempo. */
export function isPublicCareer(id: CareerId): boolean {
  return getCareer(id).requires === 'concurso'
}

/** A nota de corte e a formação do cargo público. */
export function concursoOf(id: CareerId): { cutoff: number; formation: ConcursoFormation } {
  const { concurso } = getCareer(id)
  if (!concurso) throw new Error(`${id} não é uma carreira de concurso`)
  return concurso
}

/** Índice do último nível, o topo da carreira. */
export function topLevel(id: CareerId): number {
  return getCareer(id).levels.length - 1
}

/** Nível da carreira, limitado aos níveis que existem. */
export function careerLevel(id: CareerId, level: number): CareerLevel {
  const { levels } = getCareer(id)
  return levels[Math.min(Math.max(level, 0), levels.length - 1)]
}
