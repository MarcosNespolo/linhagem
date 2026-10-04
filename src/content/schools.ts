import type { CareerId } from './careers'

/** Etapas da escola, na ordem em que a criança passa por elas. */
export const SCHOOL_STAGES = ['creche', 'escola', 'medio'] as const

/** Creche (1 a 3 anos), escola com pré-escola e ensino fundamental (4 a 14) e ensino médio (15 a 17). */
export type SchoolStage = (typeof SCHOOL_STAGES)[number]

/** Estudos depois do ensino médio, escolhidos pelo jogador e com duração em anos. */
export const HIGHER_STAGES = ['cursinho', 'tecnico', 'faculdade'] as const

export type HigherStage = (typeof HIGHER_STAGES)[number]

/** Qualquer etapa de estudo, da creche à faculdade. */
export type Stage = SchoolStage | HigherStage

export function isHigherStage(stage: Stage): stage is HigherStage {
  return (HIGHER_STAGES as readonly Stage[]).includes(stage)
}

/**
 * Onde a pessoa estuda ou passa o dia. Na creche: pública, particular, com os
 * avós ou em casa. Na escola: pública (municipal) ou particular. No ensino
 * médio e no curso técnico: pública (estadual), particular ou o instituto
 * federal. Na faculdade: universidade federal ou faculdade particular.
 */
export type Network = 'publica' | 'particular' | 'federal' | 'avos' | 'casa'

export type TechCourseId = 'informatica' | 'enfermagem' | 'edificacoes' | 'agropecuaria'

export type TechCourse = {
  id: TechCourseId
  name: string
  /** Carreira da área, onde a vaga do curso aparece na escolha de emprego. */
  careerId: CareerId
}

/** Cursos técnicos do instituto federal, integrados ao médio ou depois dele. */
export const TECH_COURSES: readonly TechCourse[] = [
  { id: 'informatica', name: 'Informática', careerId: 'tecnologia' },
  { id: 'enfermagem', name: 'Enfermagem', careerId: 'saude' },
  { id: 'edificacoes', name: 'Edificações', careerId: 'construcao' },
  { id: 'agropecuaria', name: 'Agropecuária', careerId: 'agro' },
]

export function techCourse(id: TechCourseId): TechCourse {
  const course = TECH_COURSES.find((candidate) => candidate.id === id)
  if (!course) throw new Error(`Curso técnico desconhecido: ${id}`)
  return course
}

export function techCourseName(id: TechCourseId): string {
  return techCourse(id).name
}

export type DegreeId =
  'medicina' | 'direito' | 'engenharia' | 'computacao' | 'enfermagem' | 'licenciatura'

export type Degree = {
  id: DegreeId
  name: string
  /** Anos de faculdade. */
  years: number
  /** Nota mínima no ENEM para entrar na universidade federal. */
  cutoff: number
  /** Mensalidade na faculdade particular, em reais por mês. */
  fee: number
  /** Carreira da área, onde a vaga do curso aparece na escolha de emprego. */
  careerId: CareerId
}

/** Cursos de faculdade, do mais disputado ao menos disputado. */
export const DEGREES: readonly Degree[] = [
  {
    id: 'medicina',
    name: 'Medicina',
    years: 6,
    cutoff: 780,
    fee: 10_000,
    careerId: 'medicina',
  },
  { id: 'direito', name: 'Direito', years: 5, cutoff: 720, fee: 1_500, careerId: 'direito' },
  {
    id: 'engenharia',
    name: 'Engenharia',
    years: 5,
    cutoff: 700,
    fee: 1_800,
    careerId: 'engenharia',
  },
  {
    id: 'computacao',
    name: 'Computação',
    years: 4,
    cutoff: 690,
    fee: 1_200,
    careerId: 'tecnologia',
  },
  { id: 'enfermagem', name: 'Enfermagem', years: 4, cutoff: 650, fee: 1_300, careerId: 'saude' },
  {
    id: 'licenciatura',
    name: 'Licenciatura',
    years: 4,
    cutoff: 600,
    fee: 700,
    careerId: 'educacao',
  },
]

export function degree(id: DegreeId): Degree {
  const found = DEGREES.find((candidate) => candidate.id === id)
  if (!found) throw new Error(`Curso de faculdade desconhecido: ${id}`)
  return found
}
