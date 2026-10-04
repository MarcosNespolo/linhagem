import { describe, expect, it } from 'vitest'
import { formatDate, formatDuration, formatGameSpan, formatMoney, formatRate } from '@/lib/format'

describe('formatMoney', () => {
  it.each([
    [0, '$0'],
    [950.7, '$950'],
    [1_000, '$1,00K'],
    [26_300, '$26,3K'],
    [999_999, '$999K'],
    [1_234_567, '$1,23M'],
    [-1_500, '-$1,50K'],
  ])('%d vira %s', (value, expected) => {
    expect(formatMoney(value)).toBe(expected)
  })
})

describe('formatRate', () => {
  it.each([
    [153, '+$153/s'],
    [3, '+$3/s'],
    [-3.5, '-$3,5/s'],
    [26.25, '+$26,2/s'],
    [12_500, '+$12,5K/s'],
  ])('%d vira %s', (value, expected) => {
    expect(formatRate(value)).toBe(expected)
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
