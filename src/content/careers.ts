export type CareerLevel = {
  /** Título do cargo para homens (m) e mulheres (f). */
  title: { m: string; f: string }
  /** Salário por mês do jogo, em reais. */
  salaryPerMonth: number
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
      { title: title('Atendente'), salaryPerMonth: 1800 },
      { title: title('Vendedor', 'Vendedora'), salaryPerMonth: 2880 },
      { title: title('Gerente de loja'), salaryPerMonth: 4680 },
      { title: title('Gerente regional'), salaryPerMonth: 7560 },
      { title: title('Diretor comercial', 'Diretora comercial'), salaryPerMonth: 12_240 },
    ],
  },
  {
    id: 'tecnologia',
    name: 'Tecnologia',
    levels: [
      { title: title('Estagiário de TI', 'Estagiária de TI'), salaryPerMonth: 2160 },
      { title: title('Desenvolvedor', 'Desenvolvedora'), salaryPerMonth: 3600 },
      { title: title('Desenvolvedor sênior', 'Desenvolvedora sênior'), salaryPerMonth: 5760 },
      { title: title('Tech lead'), salaryPerMonth: 9360 },
      { title: title('CTO'), salaryPerMonth: 15_120 },
    ],
  },
  {
    id: 'saude',
    name: 'Saúde',
    levels: [
      { title: title('Técnico de enfermagem', 'Técnica de enfermagem'), salaryPerMonth: 1980 },
      { title: title('Enfermeiro', 'Enfermeira'), salaryPerMonth: 3240 },
      { title: title('Enfermeiro-chefe', 'Enfermeira-chefe'), salaryPerMonth: 5220 },
      { title: title('Coordenador de saúde', 'Coordenadora de saúde'), salaryPerMonth: 8280 },
      { title: title('Diretor hospitalar', 'Diretora hospitalar'), salaryPerMonth: 13_500 },
    ],
  },
  {
    id: 'educacao',
    name: 'Educação',
    levels: [
      { title: title('Monitor', 'Monitora'), salaryPerMonth: 1620 },
      { title: title('Professor', 'Professora'), salaryPerMonth: 2700 },
      { title: title('Coordenador pedagógico', 'Coordenadora pedagógica'), salaryPerMonth: 4320 },
      { title: title('Diretor de escola', 'Diretora de escola'), salaryPerMonth: 6840 },
      { title: title('Secretário de educação', 'Secretária de educação'), salaryPerMonth: 10_800 },
    ],
  },
  {
    id: 'construcao',
    name: 'Construção',
    levels: [
      { title: title('Ajudante de obra'), salaryPerMonth: 1800 },
      { title: title('Eletricista'), salaryPerMonth: 2880 },
      { title: title('Mestre de obras', 'Mestra de obras'), salaryPerMonth: 4860 },
      { title: title('Engenheiro civil', 'Engenheira civil'), salaryPerMonth: 7920 },
      { title: title('Dono de construtora', 'Dona de construtora'), salaryPerMonth: 12_960 },
    ],
  },
  {
    id: 'gastronomia',
    name: 'Gastronomia',
    levels: [
      { title: title('Auxiliar de cozinha'), salaryPerMonth: 1620 },
      { title: title('Cozinheiro', 'Cozinheira'), salaryPerMonth: 2700 },
      { title: title('Sous-chef'), salaryPerMonth: 4500 },
      { title: title('Chef'), salaryPerMonth: 7200 },
      { title: title('Dono de restaurante', 'Dona de restaurante'), salaryPerMonth: 11_880 },
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
