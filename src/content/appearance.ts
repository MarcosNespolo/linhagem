/**
 * Probabilidades da aparência dos personagens.
 *
 * As listas de pesos seguem a ordem das paletas em src/ui/avatar/palette.ts:
 * cada índice é uma cor. Um teste confere que as duas listas têm o mesmo
 * tamanho.
 */
export const APPEARANCE = {
  /** Tons de pele, do mais claro ao mais escuro. */
  skinTones: 8,

  /**
   * Cores de cabelo: preto, castanho-escuro, castanho, castanho-claro,
   * acobreado, ruivo, loiro, loiro-claro. O peso depende do tom de pele, para
   * que combinações raras na vida real também sejam raras no jogo.
   */
  hairWeights: {
    light: [14, 22, 22, 14, 6, 6, 11, 5],
    medium: [30, 30, 22, 10, 3, 1, 3, 1],
    dark: [58, 32, 10, 0, 0, 0, 0, 0],
  },

  /** Cores de olhos: castanho-escuro, castanho, mel, verde, azul, cinza. */
  eyeWeights: {
    light: [20, 24, 14, 13, 22, 7],
    medium: [40, 30, 14, 8, 6, 2],
    dark: [70, 26, 4, 0, 0, 0],
  },

  /** Textura do cabelo: liso, ondulado, cacheado, crespo. */
  curlWeights: {
    light: [45, 32, 18, 5],
    medium: [30, 35, 25, 10],
    dark: [8, 17, 35, 40],
  },

  /** Chances para quem entra no jogo sem pais na família (fundadores e cônjuges). */
  freckles: 0.12,
  glasses: 0.3,
  beard: 0.45,
  balding: 0.35,

  /** Como os filhos herdam a aparência dos pais. */
  inheritance: {
    /** Chance de o tom de pele sair um passo fora da faixa entre os pais. */
    skinJitter: 0.15,
    /** Chance de a cor do cabelo ou dos olhos não vir de nenhum dos pais. */
    hairMutation: 0.1,
    eyeMutation: 0.08,
    frecklesFromParent: 0.5,
    frecklesNew: 0.05,
    glassesFromParent: 0.45,
    glassesNew: 0.2,
  },
} as const
