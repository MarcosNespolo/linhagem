/**
 * Recompensa de uma missão: meses da renda líquida, ou o bônus na renda por
 * um tempo (`BALANCE.missions.boost`).
 */
export type MissionReward = { kind: 'income'; months: number } | { kind: 'boost' }

/**
 * Missões que o jogo sorteia todo dia. A meta conta o que acontece depois que
 * a missão aparece. No Pé-de-meia, a meta é em meses de renda e vira dinheiro
 * no sorteio. As recompensas são pequenas de propósito: ajudam, mas não
 * substituem a renda.
 */
export const MISSIONS = [
  {
    id: 'chaDeBebe',
    name: 'Chá de bebê',
    goal: 2,
    text: 'Ter 2 filhos',
    reward: { kind: 'income', months: 1 },
  },
  {
    id: 'casorio',
    name: 'Casório',
    goal: 2,
    text: 'Casar 2 pessoas',
    reward: { kind: 'income', months: 1 },
  },
  {
    id: 'carteira',
    name: 'Carteira assinada',
    goal: 2,
    text: 'Empregar 2 pessoas',
    reward: { kind: 'income', months: 1 },
  },
  {
    id: 'formatura',
    name: 'Formatura',
    goal: 1,
    text: 'Formar 1 pessoa na faculdade ou no curso técnico',
    reward: { kind: 'income', months: 2 },
  },
  {
    id: 'aprovado',
    name: 'Aprovado',
    goal: 1,
    text: 'Passar 1 pessoa na federal, no instituto federal ou em concurso',
    reward: { kind: 'boost' },
  },
  {
    id: 'investidor',
    name: 'Investidor',
    goal: 3,
    text: 'Comprar 3 imóveis',
    reward: { kind: 'boost' },
  },
  {
    id: 'casaCheia',
    name: 'Casa cheia',
    goal: 3,
    text: 'Ter 3 pessoas vivas a mais que no começo do dia',
    reward: { kind: 'income', months: 2 },
  },
  {
    id: 'peDeMeia',
    name: 'Pé-de-meia',
    goal: 12,
    text: 'Juntar o equivalente a 1 ano de renda',
    reward: { kind: 'income', months: 3 },
  },
] as const satisfies readonly {
  id: string
  name: string
  goal: number
  text: string
  reward: MissionReward
}[]

export type MissionId = (typeof MISSIONS)[number]['id']

export const MISSION_IDS: readonly MissionId[] = MISSIONS.map((mission) => mission.id)

export function missionInfo(id: MissionId): (typeof MISSIONS)[number] {
  const mission = MISSIONS.find((candidate) => candidate.id === id)
  if (!mission) throw new Error(`Missão desconhecida: ${id}`)
  return mission
}
