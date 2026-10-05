/**
 * Tipos de imóvel, do mais barato ao mais caro, todos com preço fixo. Cada um
 * libera depois da primeira compra do anterior. Os três primeiros são de
 * moradia: a família pode morar neles, e cada um tem lugar para algumas pessoas
 * e contas por mês (condomínio, IPTU e manutenção) enquanto alguém mora lá; o
 * bairro tem `lots` de cada. Os comerciais ficam à venda poucos de cada vez,
 * até `BALANCE.properties.maxForSale`, e um novo aparece a cada
 * `market.everyYears` anos do jogo.
 */
export const PROPERTY_TYPES = [
  {
    id: 'kitnet',
    name: 'Kitnet',
    gender: 'm',
    plural: 'Kitnets',
    price: 80_000,
    rentPerMonth: 670,
    home: { places: 2, billsPerMonth: 200 },
    market: null,
    lots: 10,
  },
  {
    id: 'apartamento',
    name: 'Apartamento',
    gender: 'm',
    plural: 'Apartamentos',
    price: 450_000,
    rentPerMonth: 3_200,
    home: { places: 4, billsPerMonth: 450 },
    market: null,
    lots: 10,
  },
  {
    id: 'casa',
    name: 'Casa',
    gender: 'f',
    plural: 'Casas',
    price: 1_500_000,
    rentPerMonth: 9_400,
    home: { places: 6, billsPerMonth: 700 },
    market: null,
    lots: 10,
  },
  {
    id: 'sala',
    name: 'Sala comercial',
    gender: 'f',
    plural: 'Salas comerciais',
    price: 5_000_000,
    rentPerMonth: 9_300,
    home: null,
    market: { everyYears: 2 },
    lots: 5,
  },
  {
    id: 'loja',
    name: 'Loja',
    gender: 'f',
    plural: 'Lojas',
    price: 18_000_000,
    rentPerMonth: 30_000,
    home: null,
    market: { everyYears: 3 },
    lots: 5,
  },
  {
    id: 'galpao',
    name: 'Galpão',
    gender: 'm',
    plural: 'Galpões',
    price: 70_000_000,
    rentPerMonth: 106_000,
    home: null,
    market: { everyYears: 4 },
    lots: 3,
  },
  {
    id: 'predio',
    name: 'Prédio',
    gender: 'm',
    plural: 'Prédios',
    price: 280_000_000,
    rentPerMonth: 390_000,
    home: null,
    market: { everyYears: 5 },
    lots: 4,
  },
  {
    id: 'fazenda',
    name: 'Fazenda',
    gender: 'f',
    plural: 'Fazendas',
    price: 1_200_000_000,
    rentPerMonth: 1_540_000,
    home: null,
    market: { everyYears: 7 },
    lots: 2,
  },
  {
    id: 'shopping',
    name: 'Shopping',
    gender: 'm',
    plural: 'Shoppings',
    price: 5_000_000_000,
    rentPerMonth: 5_950_000,
    home: null,
    market: { everyYears: 9 },
    lots: 2,
  },
] as const satisfies readonly {
  id: string
  name: string
  /** Gênero da palavra, para os artigos: "um kitnet", "a 3ª casa". */
  gender: 'm' | 'f'
  /** Nome no plural: "3 salas comerciais". */
  plural: string
  /** Preço de cada imóvel do tipo, sempre o mesmo. */
  price: number
  /** Aluguel por mês de cada imóvel do tipo, quando a família não mora nele. */
  rentPerMonth: number
  /** Moradia: lugares para pessoas da família e contas por mês de quando alguém mora lá. */
  home: { places: number; billsPerMonth: number } | null
  /** Comercial: de quantos em quantos anos do jogo um novo fica à venda. */
  market: { everyYears: number } | null
  /**
   * Lotes do tipo no bairro, cada um com seu número na rua. Os de moradia são
   * todos os que existem; dos comerciais, os que aparecem na rua, e a família
   * pode ter outros fora dela.
   */
  lots: number
}[]

export type PropertyType = (typeof PROPERTY_TYPES)[number]
export type PropertyId = PropertyType['id']

export const PROPERTY_IDS: readonly PropertyId[] = PROPERTY_TYPES.map((type) => type.id)

export function propertyType(id: PropertyId): PropertyType {
  const type = PROPERTY_TYPES.find((candidate) => candidate.id === id)
  if (!type) throw new Error(`Imóvel desconhecido: ${id}`)
  return type
}
