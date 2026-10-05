/**
 * Gerador pseudoaleatório determinístico (mulberry32).
 *
 * O estado é um inteiro de 32 bits guardado no save, então a sequência
 * continua igual depois de salvar e carregar. Só usa operações inteiras, que
 * dão o mesmo resultado em qualquer navegador.
 */
export type Rng = {
  /** Número em [0, 1). */
  next(): number
  /** Inteiro entre min e max, inclusive. */
  int(min: number, max: number): number
  /** Verdadeiro com probabilidade p. */
  chance(p: number): boolean
  /** Um item da lista, que não pode estar vazia. */
  pick<T>(items: readonly T[]): T
  /** Estado atual, para gravar de volta no GameState. */
  readonly state: number
}

export function createRng(initialState: number): Rng {
  let state = initialState >>> 0

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (items) => {
      if (items.length === 0) throw new RangeError('Não dá para sortear de uma lista vazia')
      return items[Math.floor(next() * items.length)]
    },
    get state() {
      return state
    },
  }
}

/** Hash FNV-1a de 32 bits de um texto. Serve para tirar uma seed de um identificador. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * Embaralha os bits de um inteiro de 32 bits (finalizador do lowbias32). Serve
 * para sorteios que dependem só de números, como seed, dia e pessoa, sem
 * gastar o gerador do jogo.
 */
export function mix32(value: number): number {
  let x = value >>> 0
  x ^= x >>> 16
  x = Math.imul(x, 0x7feb352d)
  x ^= x >>> 15
  x = Math.imul(x, 0x846ca68b)
  x ^= x >>> 16
  return x >>> 0
}

/**
 * Número em [0, 1) que depende só das quatro entradas: o mesmo sorteio em
 * qualquer aparelho, sem gastar o gerador do jogo.
 */
export function hashUnit(a: number, b: number, c: number, d: number): number {
  let hash = mix32(0x9e3779b9 ^ mix32(a))
  hash = mix32(hash ^ mix32(b))
  hash = mix32(hash ^ mix32(c))
  hash = mix32(hash ^ mix32(d))
  return hash / 4294967296
}

/** Sorteia um índice com probabilidade proporcional ao peso. Os pesos não podem ser todos zero. */
export function pickWeighted(rng: Rng, weights: readonly number[]): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  if (total <= 0) throw new RangeError('Pesos precisam somar mais que zero')
  let roll = rng.next() * total
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i]
    if (roll < 0) return i
  }
  return weights.length - 1
}
