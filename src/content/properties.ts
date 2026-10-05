/**
 * Tipos de imóvel, do mais barato ao mais caro. Cada um libera depois da
 * primeira compra do anterior. Os três primeiros são de moradia: a família pode
 * morar neles, e cada um tem lugar para algumas pessoas e contas por mês
 * (condomínio, IPTU e manutenção) enquanto alguém mora lá. Alugados, se pagam
 * em 10 a 13 anos. Os comerciais se pagam em 45 a 70 anos: com um ano do jogo
 * por minuto, um aluguel que se paga em poucos anos faria a renda disparar.
 */
export const PROPERTY_TYPES = [
  {
    id: 'kitnet',
    name: 'Kitnet',
    gender: 'm',
    price: 80_000,
    rentPerMonth: 670,
    home: { places: 2, billsPerMonth: 200 },
  },
  {
    id: 'apartamento',
    name: 'Apartamento',
    gender: 'm',
    price: 450_000,
    rentPerMonth: 3_200,
    home: { places: 4, billsPerMonth: 450 },
  },
  {
    id: 'casa',
    name: 'Casa',
    gender: 'f',
    price: 1_500_000,
    rentPerMonth: 9_400,
    home: { places: 6, billsPerMonth: 700 },
  },
  {
    id: 'sala',
    name: 'Sala comercial',
    gender: 'f',
    price: 5_000_000,
    rentPerMonth: 9_300,
    home: null,
  },
  { id: 'loja', name: 'Loja', gender: 'f', price: 18_000_000, rentPerMonth: 30_000, home: null },
  {
    id: 'galpao',
    name: 'Galpão',
    gender: 'm',
    price: 70_000_000,
    rentPerMonth: 106_000,
    home: null,
  },
  {
    id: 'predio',
    name: 'Prédio',
    gender: 'm',
    price: 280_000_000,
    rentPerMonth: 390_000,
    home: null,
  },
  {
    id: 'fazenda',
    name: 'Fazenda',
    gender: 'f',
    price: 1_200_000_000,
    rentPerMonth: 1_540_000,
    home: null,
  },
  {
    id: 'shopping',
    name: 'Shopping',
    gender: 'm',
    price: 5_000_000_000,
    rentPerMonth: 5_950_000,
    home: null,
  },
] as const satisfies readonly {
  id: string
  name: string
  /** Gênero da palavra, para os artigos: "um kitnet", "a 3ª casa". */
  gender: 'm' | 'f'
  /**
   * Preço do imóvel. Nos de moradia é sempre o mesmo; nos comerciais, é o do
   * primeiro, e cada um a mais custa `BALANCE.properties.priceGrowth` vezes o anterior.
   */
  price: number
  /** Aluguel por mês de cada imóvel do tipo, quando a família não mora nele. */
  rentPerMonth: number
  /** Moradia: lugares para pessoas da família e contas por mês de quando alguém mora lá. */
  home: { places: number; billsPerMonth: number } | null
}[]

export type PropertyType = (typeof PROPERTY_TYPES)[number]
export type PropertyId = PropertyType['id']

export const PROPERTY_IDS: readonly PropertyId[] = PROPERTY_TYPES.map((type) => type.id)

export function propertyType(id: PropertyId): PropertyType {
  const type = PROPERTY_TYPES.find((candidate) => candidate.id === id)
  if (!type) throw new Error(`Imóvel desconhecido: ${id}`)
  return type
}
