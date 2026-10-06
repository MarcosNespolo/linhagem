import { describe, expect, it } from 'vitest'
import { simulate } from '@/sim/run'

/**
 * Versão de 1 hora da simulação de balanceamento; a de 10 horas roda com
 * `npm run sim`. O jogador automático joga uma hora com a estratégia do plano,
 * e os limites que já valem nesse tempo (números, ritmo, save, relógio e volta
 * ao jogo) e os marcos que cabem numa hora (o 1º imóvel e os 10 imóveis)
 * precisam passar. Crescimento e família pedem mais horas e ficam para a
 * simulação longa.
 */
describe('balanceamento', () => {
  it.each([1, 2])(
    'uma hora de jogo com a seed %i cumpre os limites do plano',
    (seed) => {
      const { results, measures } = simulate({ seed, minutes: 60 })
      expect(results.filter((result) => !result.ok)).toEqual([])
      expect(results.map((result) => result.name)).toEqual([
        'Números',
        '1º imóvel',
        '10 imóveis',
        '1º comercial',
        'Save',
        'Relógio',
        'Volta ao jogo',
      ])
      expect(measures.hourlyIncome).toHaveLength(1)
    },
    120_000,
  )
})
