/** Etapas da escola, na ordem em que a criança passa por elas. */
export const SCHOOL_STAGES = ['creche', 'escola', 'medio'] as const

/** Creche (1 a 3 anos), escola com pré-escola e ensino fundamental (4 a 14) e ensino médio (15 a 17). */
export type SchoolStage = (typeof SCHOOL_STAGES)[number]

/**
 * Onde a criança estuda ou passa o dia. Na creche: pública, particular, com os
 * avós ou em casa. Na escola: pública (municipal) ou particular. No ensino
 * médio: pública (estadual), particular ou o instituto federal.
 */
export type Network = 'publica' | 'particular' | 'federal' | 'avos' | 'casa'

/** Cursos técnicos integrados ao ensino médio do instituto federal. */
export const TECH_COURSES = [
  { id: 'informatica', name: 'Informática' },
  { id: 'enfermagem', name: 'Enfermagem' },
  { id: 'edificacoes', name: 'Edificações' },
  { id: 'agropecuaria', name: 'Agropecuária' },
] as const

export type TechCourseId = (typeof TECH_COURSES)[number]['id']

export function techCourseName(id: TechCourseId): string {
  return TECH_COURSES.find((course) => course.id === id)?.name ?? id
}
