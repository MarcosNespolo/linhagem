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
