/**
 * Tipos de imóvel, do mais barato ao mais caro. Cada um libera depois da
 * primeira compra do anterior. Os três primeiros são de moradia: a família
 * pode morar neles, cada um tem lugar para algumas pessoas, o bairro tem
 * `lots` de cada e cada um comprado deixa o próximo do tipo mais caro
 * (`BALANCE.properties.priceGrowth`). Os comerciais têm preço fixo e ficam à
 * venda poucos de cada vez, até `BALANCE.properties.maxForSale`, e um novo
 * aparece a cada `market.everyYears` anos do jogo. Alugado, cada imóvel rende
 * `rentPerMonth` menos a manutenção; vazio, ou com a família morando nele, a
 * família paga as contas (`billsPerMonth`: condomínio e IPTU). Os de moradia
 * rendem perto de 6% do preço por ano, como na vida real; os comerciais bem
 * menos, porque chegam quando a renda já é alta.
 */
export const PROPERTY_TYPES = [
  {
    id: 'kitnet',
    name: 'Kitnet',
    gender: 'm',
    plural: 'Kitnets',
    price: 80_000,
    rentPerMonth: 400,
    billsPerMonth: 200,
    home: { places: 2 },
    market: null,
    lots: 10,
  },
  {
    id: 'apartamento',
    name: 'Apartamento',
    gender: 'm',
    plural: 'Apartamentos',
    price: 400_000,
    rentPerMonth: 1_950,
    billsPerMonth: 450,
    home: { places: 4 },
    market: null,
    lots: 10,
  },
  {
    id: 'casa',
    name: 'Casa',
    gender: 'f',
    plural: 'Casas',
    price: 1_200_000,
    rentPerMonth: 5_800,
    billsPerMonth: 700,
    home: { places: 6 },
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
    billsPerMonth: 900,
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
    billsPerMonth: 3_000,
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
    billsPerMonth: 10_000,
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
    billsPerMonth: 40_000,
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
    billsPerMonth: 150_000,
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
    billsPerMonth: 600_000,
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
  /** Preço do primeiro imóvel do tipo. Nos de moradia, cada um comprado sobe o do próximo. */
  price: number
  /** Aluguel por mês de cada imóvel do tipo, quando a família não mora nele e ele não está vazio. */
  rentPerMonth: number
  /** Contas por mês (condomínio e IPTU), pagas pela família quando ela mora nele ou ele está vazio. */
  billsPerMonth: number
  /** Moradia: lugares para pessoas da família. Null nos comerciais. */
  home: { places: number } | null
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
