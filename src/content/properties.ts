/** Tipos de imóvel, do mais barato ao mais caro. Cada um libera depois da primeira compra do anterior. */
export const PROPERTY_TYPES = [
  { id: 'kitnet', name: 'Kitnet', gender: 'm', price: 80_000, rentPerMonth: 670 },
  { id: 'apartamento', name: 'Apartamento', gender: 'm', price: 450_000, rentPerMonth: 3_200 },
  { id: 'casa', name: 'Casa', gender: 'f', price: 1_500_000, rentPerMonth: 9_400 },
  { id: 'sala', name: 'Sala comercial', gender: 'f', price: 5_000_000, rentPerMonth: 27_500 },
  { id: 'loja', name: 'Loja', gender: 'f', price: 18_000_000, rentPerMonth: 86_000 },
  { id: 'galpao', name: 'Galpão', gender: 'm', price: 70_000_000, rentPerMonth: 290_000 },
  { id: 'predio', name: 'Prédio', gender: 'm', price: 280_000_000, rentPerMonth: 1_000_000 },
  {
    id: 'fazenda',
    name: 'Fazenda',
    gender: 'f',
    price: 1_200_000_000,
    rentPerMonth: 3_800_000,
  },
  {
    id: 'shopping',
    name: 'Shopping',
    gender: 'm',
    price: 5_000_000_000,
    rentPerMonth: 13_000_000,
  },
] as const satisfies readonly {
  id: string
  name: string
  /** Gênero da palavra, para os artigos: "um kitnet", "a 3ª casa". */
  gender: 'm' | 'f'
  /** Preço do primeiro imóvel do tipo. Cada um a mais custa `BALANCE.properties.priceGrowth` vezes o anterior. */
  price: number
  /** Aluguel por mês de cada imóvel do tipo. */
  rentPerMonth: number
}[]

export type PropertyType = (typeof PROPERTY_TYPES)[number]
export type PropertyId = PropertyType['id']

export const PROPERTY_IDS: readonly PropertyId[] = PROPERTY_TYPES.map((type) => type.id)

export function propertyType(id: PropertyId): PropertyType {
  const type = PROPERTY_TYPES.find((candidate) => candidate.id === id)
  if (!type) throw new Error(`Imóvel desconhecido: ${id}`)
  return type
}
