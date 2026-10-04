export type CareerLevel = {
  /** Título do cargo para homens (m) e mulheres (f). */
  title: { m: string; f: string }
  salaryPerSecond: number
}

export type Career = {
  id: string
  name: string
  levels: readonly CareerLevel[]
}

const title = (m: string, f: string = m) => ({ m, f })

/**
 * Carreiras disponíveis. Na Fase 1 todo mundo começa no primeiro nível; as
 * promoções entram na Fase 4.
 */
export const CAREERS = [
  {
    id: 'comercio',
    name: 'Comércio',
    levels: [
      { title: title('Atendente'), salaryPerSecond: 10 },
      { title: title('Vendedor', 'Vendedora'), salaryPerSecond: 16 },
      { title: title('Gerente de loja'), salaryPerSecond: 26 },
      { title: title('Gerente regional'), salaryPerSecond: 42 },
      { title: title('Diretor comercial', 'Diretora comercial'), salaryPerSecond: 68 },
    ],
  },
  {
    id: 'tecnologia',
    name: 'Tecnologia',
    levels: [
      { title: title('Estagiário de TI', 'Estagiária de TI'), salaryPerSecond: 12 },
      { title: title('Desenvolvedor', 'Desenvolvedora'), salaryPerSecond: 20 },
      { title: title('Desenvolvedor sênior', 'Desenvolvedora sênior'), salaryPerSecond: 32 },
      { title: title('Tech lead'), salaryPerSecond: 52 },
      { title: title('CTO'), salaryPerSecond: 84 },
    ],
  },
  {
    id: 'saude',
    name: 'Saúde',
    levels: [
      { title: title('Técnico de enfermagem', 'Técnica de enfermagem'), salaryPerSecond: 11 },
      { title: title('Enfermeiro', 'Enfermeira'), salaryPerSecond: 18 },
      { title: title('Enfermeiro-chefe', 'Enfermeira-chefe'), salaryPerSecond: 29 },
      { title: title('Coordenador de saúde', 'Coordenadora de saúde'), salaryPerSecond: 46 },
      { title: title('Diretor hospitalar', 'Diretora hospitalar'), salaryPerSecond: 75 },
    ],
  },
  {
    id: 'educacao',
    name: 'Educação',
    levels: [
      { title: title('Monitor', 'Monitora'), salaryPerSecond: 9 },
      { title: title('Professor', 'Professora'), salaryPerSecond: 15 },
      { title: title('Coordenador pedagógico', 'Coordenadora pedagógica'), salaryPerSecond: 24 },
      { title: title('Diretor de escola', 'Diretora de escola'), salaryPerSecond: 38 },
      { title: title('Secretário de educação', 'Secretária de educação'), salaryPerSecond: 60 },
    ],
  },
  {
    id: 'construcao',
    name: 'Construção',
    levels: [
      { title: title('Ajudante de obra'), salaryPerSecond: 10 },
      { title: title('Eletricista'), salaryPerSecond: 16 },
      { title: title('Mestre de obras', 'Mestra de obras'), salaryPerSecond: 27 },
      { title: title('Engenheiro civil', 'Engenheira civil'), salaryPerSecond: 44 },
      { title: title('Dono de construtora', 'Dona de construtora'), salaryPerSecond: 72 },
    ],
  },
  {
    id: 'gastronomia',
    name: 'Gastronomia',
    levels: [
      { title: title('Auxiliar de cozinha'), salaryPerSecond: 9 },
      { title: title('Cozinheiro', 'Cozinheira'), salaryPerSecond: 15 },
      { title: title('Sous-chef'), salaryPerSecond: 25 },
      { title: title('Chef'), salaryPerSecond: 40 },
      { title: title('Dono de restaurante', 'Dona de restaurante'), salaryPerSecond: 66 },
    ],
  },
] as const satisfies readonly Career[]

export type CareerId = (typeof CAREERS)[number]['id']

export const CAREER_IDS: readonly CareerId[] = CAREERS.map((career) => career.id)

const BY_ID = new Map<CareerId, Career>(CAREERS.map((career) => [career.id, career]))

export function getCareer(id: CareerId): Career {
  const career = BY_ID.get(id)
  if (!career) throw new Error(`Carreira desconhecida: ${id}`)
  return career
}

/** Nível da carreira, limitado aos níveis que existem. */
export function careerLevel(id: CareerId, level: number): CareerLevel {
  const { levels } = getCareer(id)
  return levels[Math.min(Math.max(level, 0), levels.length - 1)]
}
