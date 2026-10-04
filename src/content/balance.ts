/**
 * Números de balanceamento do jogo.
 *
 * A engine lê tudo daqui e os testes derivam as expectativas destas
 * constantes, então ajustar um valor não exige mexer em código. Dinheiro é em
 * reais, e renda e despesa são por mês do jogo. Os valores são provisórios até
 * o fim da Fase 4, quando o script de simulação (npm run sim) entra no ajuste
 * fino.
 */
export const BALANCE = {
  /** Ritmo do jogo: segundos reais por mês do jogo. Com 5, um ano passa em 1 minuto. */
  secondsPerGameMonth: 5,
  /** Dias por ano do jogo. Não há anos bissextos. */
  daysPerYear: 365,
  /** Tempo de jogo que passa, no máximo, enquanto o jogo está fechado, em anos do jogo. */
  offlineCapYears: 5,

  /** Dinheiro no início da partida. */
  startingMoney: 90_000,
  /** Faixa de idade do casal fundador, em anos. */
  startingAge: { min: 22, max: 27 },

  /** Idade em que um membro vira adulto e consegue o primeiro emprego. */
  adultAge: 18,
  /** Idade de aposentadoria. A partir dela, a renda é uma fração do salário. */
  retirementAge: 65,
  pensionRatio: 0.5,
  /**
   * Dia do calendário (MM-DD) em que cai o 13º salário: quem trabalha recebe
   * um salário a mais, e quem é aposentado, uma pensão a mais.
   */
  thirteenthSalaryDate: '12-20',
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
    baseCost: 72_000,
    /** Cada filho que o casal já teve multiplica o custo do próximo por este fator. */
    coupleGrowth: 1.3,
    /** Intervalo mínimo entre dois filhos do mesmo membro, em dias do jogo. */
    cooldownDays: 365,
    /** Despesa por mês de uma criança: base mais um valor por ano de idade. */
    expenseBase: 180,
    expensePerYear: 45,
  },

  marriage: {
    /** Custo base de um casamento, antes do ajuste pelo tamanho da família. */
    baseCost: 54_000,
    /** Diferença máxima de idade, em anos, entre o membro e as pessoas sugeridas como par. */
    maxAgeGapYears: 5,
    /** Quantas pessoas aparecem a cada busca por par. */
    suitorsPerSearch: 3,
  },

  jobs: {
    /** Quantas vagas aparecem na escolha do primeiro emprego. */
    offersPerChoice: 3,
  },
} as const
