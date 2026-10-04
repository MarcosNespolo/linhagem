import { describe, expect, it } from 'vitest'
import {
  formatAmount,
  formatDate,
  formatDuration,
  formatGameSpan,
  formatMoney,
  formatRate,
  formatSignedMoney,
} from '@/lib/format'

/** Os valores usam espaço que não quebra a linha; nos exemplos, um espaço comum. */
const plain = (text: string) => text.replace(/\u00a0/g, ' ')

describe('formatMoney', () => {
  it.each([
    [0, 'R$ 0'],
    [950.7, 'R$ 950'],
    [1_800, 'R$ 1.800'],
    [9_999.9, 'R$ 9.999'],
    [10_000, 'R$ 10 mil'],
    [26_300, 'R$ 26,3 mil'],
    [135_000, 'R$ 135 mil'],
    [999_999, 'R$ 999 mil'],
    [1_234_567, 'R$ 1,23 mi'],
    [2_500_000_000, 'R$ 2,5 bi'],
    [-1_500, '-R$ 1.500'],
  ])('%d vira %s', (value, expected) => {
    expect(plain(formatMoney(value))).toBe(expected)
  })
})

describe('formatRate', () => {
  it.each([
    [1_800, '+R$ 1.800/mês'],
    [180, '+R$ 180/mês'],
    [-45.5, '-R$ 45/mês'],
    [12_240, '+R$ 12,2 mil/mês'],
    [135_000, '+R$ 135 mil/mês'],
  ])('%d vira %s', (value, expected) => {
    expect(plain(formatRate(value))).toBe(expected)
  })
})

describe('formatSignedMoney', () => {
  it.each([
    [1_800, '+R$ 1.800'],
    [-225, '-R$ 225'],
    [12_240, '+R$ 12,2 mil'],
  ])('%d vira %s', (value, expected) => {
    expect(plain(formatSignedMoney(value))).toBe(expected)
  })
})

describe('formatAmount', () => {
  it('mostra o valor sem o símbolo da moeda', () => {
    expect(plain(formatAmount(18_400_000))).toBe('18,4 mi')
    expect(plain(formatAmount(1_800))).toBe('1.800')
  })

  it('não deixa o valor quebrar a linha', () => {
    expect(formatMoney(561_000)).toBe('R$\u00a0561\u00a0mil')
  })
})

describe('datas e durações', () => {
  it('formata a data no padrão brasileiro', () => {
    expect(formatDate('2026-10-03')).toBe('03/10/2026')
  })

  it('formata durações curtas, arredondando para cima', () => {
    expect(formatDuration(0.3)).toBe('1 s')
    expect(formatDuration(45)).toBe('45 s')
    expect(formatDuration(720)).toBe('12 min')
    expect(formatDuration(3 * 3600 + 300)).toBe('3 h 5 min')
    expect(formatDuration(7200)).toBe('2 h')
  })

  it('formata períodos em tempo do jogo', () => {
    expect(formatGameSpan(1, 365)).toBe('1 dia')
    expect(formatGameSpan(12, 365)).toBe('12 dias')
    expect(formatGameSpan(31, 365)).toBe('1 mês')
    expect(formatGameSpan(305, 365)).toBe('10 meses')
    expect(formatGameSpan(365, 365)).toBe('1 ano')
    expect(formatGameSpan(836, 365)).toBe('2 anos e 3 meses')
    expect(formatGameSpan(5 * 365, 365)).toBe('5 anos')
  })
})
