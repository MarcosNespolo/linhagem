/**
 * Números de balanceamento do jogo.
 *
 * A engine lê tudo daqui e os testes derivam as expectativas destas
 * constantes, então ajustar um valor não exige mexer em código. Os valores
 * são provisórios até a Fase 4, quando o script de simulação (npm run sim)
 * entra no ajuste fino.
 */
export const BALANCE = {
  /** Ritmo do jogo: meses do jogo por segundo real. Com 1, um ano passa em 12 s. */
  gameMonthsPerSecond: 1,
  /** Dias por ano do jogo. Não há anos bissextos. */
  daysPerYear: 365,
  /** Tempo de jogo que passa, no máximo, enquanto o jogo está fechado, em anos do jogo. */
  offlineCapYears: 5,

  /** Dinheiro no início da partida. */
  startingMoney: 500,
  /** Faixa de idade do casal fundador, em anos. */
  startingAge: { min: 22, max: 27 },

  /** Idade em que um membro vira adulto e consegue o primeiro emprego. */
  adultAge: 18,
  /** Idade de aposentadoria. A partir dela, a renda é uma fração do salário. */
  retirementAge: 65,
  pensionRatio: 0.5,
  /**
   * Expectativa de vida, sorteada no nascimento: mínimo mais dois sorteios de
   * 0 a `spread`. Com 72 e 12, fica entre 72 e 96 anos, mais perto de 84.
   */
  lifespan: { min: 72, spread: 12 },

  /**
   * Filhos e casamentos ficam mais caros conforme a família viva cresce: cada
   * membro vivo multiplica esses custos por este fator. A renda cresce em linha
   * reta com a família e os custos em curva, então a família se estabiliza num
   * tamanho que a renda sustenta, em vez de crescer sem parar.
   */
  familySizeGrowth: 1.03,

  children: {
    /** Os dois membros do casal precisam estar nesta faixa de idade. */
    minParentAge: 18,
    maxParentAge: 45,
    /** Custo base de um filho, antes do ajuste pelo tamanho da família. */
    baseCost: 400,
    /** Cada filho que o casal já teve multiplica o custo do próximo por este fator. */
    coupleGrowth: 1.3,
    /** Intervalo mínimo entre dois filhos do mesmo membro, em dias do jogo. */
    cooldownDays: 365,
    /** Despesa por segundo de uma criança: base mais um valor por ano de idade. */
    expenseBase: 1,
    expensePerYear: 0.25,
  },

  marriage: {
    /** Custo base de um casamento, antes do ajuste pelo tamanho da família. */
    baseCost: 300,
    /** Diferença máxima de idade, em anos, entre o membro e as pessoas sugeridas como par. */
    maxAgeGapYears: 5,
    /** Quantas pessoas aparecem a cada busca por par. */
    suitorsPerSearch: 3,
  },
} as const
