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
  /** Idade de aposentadoria. A partir dela, a renda é uma fração do último salário. */
  retirementAge: 65,
  pensionRatio: 0.5,
  /** No serviço público, a aposentadoria paga uma fração maior do último salário. */
  publicPensionRatio: 0.7,
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
    minParentAge: 20,
    maxParentAge: 45,
    /** Custo base de um filho, antes do ajuste pelo tamanho da família. */
    baseCost: 72_000,
    /** Cada filho que o casal já teve multiplica o custo do próximo por este fator. */
    coupleGrowth: 1.3,
    /** Intervalo mínimo entre dois filhos do mesmo membro, em dias do jogo: 2 anos. */
    cooldownDays: 730,
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
    /**
     * Formação de quem é sugerido como par: chance de ter curso técnico e de ter
     * faculdade. O resto tem ensino médio.
     */
    suitorTechnicalChance: 0.2,
    suitorDegreeChance: 0.2,
    /** Chance de quem é sugerido como par ser servidor público. */
    suitorPublicChance: 0.1,
  },

  jobs: {
    /** Quantas vagas aparecem na escolha do primeiro emprego. */
    offersPerChoice: 3,
  },

  careers: {
    /**
     * Anos no nível para subir ao seguinte: do 1º para o 2º, do 2º para o 3º, do
     * 3º para o 4º e do 4º para o 5º.
     */
    yearsToPromote: [3, 5, 8, 12],
    /**
     * Primeiro nível (índice) que pede um curso pago: o 4º. Até o 3º, a pessoa
     * sobe sozinha com o tempo. O serviço público sobe sempre só com o tempo.
     */
    courseLevel: 3,
    /** O curso custa tantos meses do aumento, e se paga no mesmo tempo. */
    courseMonths: 24,
  },

  /**
   * Imóveis rendem aluguel todo mês para a família. Cada imóvel do mesmo tipo
   * custa este fator vezes o anterior, e o aluguel fica igual: o décimo kitnet
   * custa cerca de 3,5 vezes o primeiro e demora 3,5 vezes mais para se pagar.
   */
  properties: { priceGrowth: 1.15 },

  /** Missões do dia: quantas aparecem, todas de tipos diferentes. */
  missions: { perDay: 3 },

  /**
   * Concurso público: quem estuda não trabalha, paga o cursinho e faz uma prova
   * a cada três meses, por até um ano. A nota parte da nota do ENEM e sobe com
   * os meses de estudo.
   */
  concurso: {
    /** Mensalidade do cursinho para concurso. */
    fee: 500,
    /** Dias do calendário (MM-DD) em que sai o resultado de cada prova. */
    examDates: ['03-15', '06-15', '09-15', '12-15'],
    /** Provas por tentativa: com quatro por ano, é um ano de estudo. */
    maxExams: 4,
    /** Pontos que cada mês de estudo soma à nota de partida. */
    pointsPerMonth: 10,
    /** A nota de cada prova varia até tantos pontos para cima ou para baixo. */
    spread: 40,
    /**
     * Nota de corte por nível de entrada no serviço público: técnico, de nível
     * médio, e analista, de nível superior.
     */
    cutoffs: [620, 720],
  },

  /**
   * Aptidão para os estudos. Quem chega à família de fora (fundadores e quem
   * casa) tem mínimo mais dois valores de 0 a `spread`: com 400 e 150, fica
   * entre 400 e 700, mais perto de 550. Os filhos herdam: a média dos pais puxa
   * a aptidão com o peso `heritability`, a partir de 550, e um sorteio próprio
   * soma até `noise` para cima ou para baixo. A nota de quem estuda é a aptidão
   * mais os pontos que as escolas somam.
   */
  aptitude: { min: 400, spread: 150, heritability: 0.7, noise: 60 },

  school: {
    /** Dia do calendário (MM-DD) das matrículas: as escolhas de escola do ano abrem juntas. */
    enrollmentDate: '01-01',
    /** Chance de sair vaga na creche pública. */
    daycareVacancyChance: 0.5,
    /** Nota mínima para passar na prova do instituto federal. */
    federalCutoff: 550,
    /** Quantos cursos técnicos o instituto federal oferece em cada matrícula. */
    federalCourses: 2,
    /** Fração do salário de quem trabalha meio período para cuidar de um filho em casa. */
    halfTimeRatio: 0.5,
    /**
     * Professor particular para quem está na escola ou no ensino médio: a
     * mensalidade e os pontos que soma à nota por ano com ele, contados em
     * proporção ao tempo.
     */
    tutor: { fee: 800, pointsPerYear: 5 },
    /**
     * Etapas, pela idade que a criança faz no ano. A mensalidade é por mês, e os
     * pontos de cada rede se dividem pelos anos da etapa: o colégio particular
     * soma 40 ao longo dos 11 anos da escola.
     */
    stages: {
      creche: {
        firstAge: 1,
        lastAge: 3,
        fees: { particular: 1200 },
        points: { publica: 20, particular: 20 },
      },
      escola: {
        firstAge: 4,
        lastAge: 14,
        fees: { particular: 1500 },
        points: { particular: 40 },
      },
      medio: {
        firstAge: 15,
        lastAge: 17,
        fees: { particular: 2000 },
        points: { particular: 40, federal: 60 },
      },
    },
  },

  /** Depois do ensino médio: ENEM, faculdade, curso técnico e cursinho. */
  college: {
    /** O ENEM é a nota da escola mais um sorteio de até tantos pontos para cima ou para baixo. */
    enemSpread: 50,
    /** Nota mínima no ENEM para o curso técnico do instituto federal. */
    federalTechCutoff: 550,
    /** Curso técnico depois do médio: duração em anos e mensalidade na escola particular. */
    technical: { years: 2, fee: 600 },
    /** Cursinho: um ano, com mensalidade, e pontos que somam na nota do ENEM seguinte. */
    prep: { years: 1, fee: 800, points: 30 },
  },
} as const
