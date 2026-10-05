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

  /** Dinheiro no início da partida: a família começa do zero. */
  startingMoney: 0,
  /**
   * Falência: o saldo pode ficar negativo. O relógio para quando a família
   * entra no vermelho, e ela tem `graceDays` dias do jogo para voltar ao
   * azul; se não voltar, vai à falência e a partida acaba.
   */
  debt: { graceDays: 365 },
  /** Faixa de idade do casal fundador, em anos. */
  startingAge: { min: 24, max: 29 },

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

  children: {
    /** Os dois membros do casal precisam estar nesta faixa de idade. */
    minParentAge: 20,
    maxParentAge: 45,
    /** Parto e enxoval: o custo de ter um filho, sempre o mesmo. */
    birthCost: 15_000,
    /** Intervalo mínimo entre dois filhos do mesmo membro, em dias do jogo: 2 anos. */
    cooldownDays: 730,
    /**
     * Custo de vida de uma criança por mês, sem a escola: alimentação, roupas,
     * saúde e lazer. Uma base mais um valor por ano de idade.
     */
    expenseBase: 400,
    expensePerYear: 30,
  },

  /**
   * Custo de vida de cada adulto por mês, sem a moradia: mercado e contas,
   * plano de saúde (com médico e dentista), que fica mais caro a partir dos 65
   * anos, e transporte, de ônibus para quem ganha pouco e de carro para quem
   * ganha a partir de `carFromSalary`.
   */
  living: {
    adult: 800,
    health: { adult: 300, senior: 900 },
    seniorAge: 65,
    transport: { bus: 200, car: 800, carFromSalary: 6_000 },
  },

  /**
   * Moradia. Cada pessoa da família precisa de um lugar em casa. Quem não cabe
   * nos imóveis de moradia da família mora de aluguel, pago por lugar e sem
   * limite: ninguém sai da família por falta de lugar. Quem mora num imóvel da
   * família paga só as contas dele (condomínio, IPTU e manutenção, em
   * `PROPERTY_TYPES`).
   */
  housing: {
    /** Aluguel por mês de cada um dos primeiros `basePlaces` lugares alugados. */
    rentPerPlace: 600,
    basePlaces: 6,
    /**
     * Daí em diante, cada lugar alugado custa esta parte a mais que o anterior.
     * Com o aluguel sem limite, é o preço que segura o tamanho da família.
     */
    rentGrowth: 0.4,
  },

  /**
   * Imprevistos, com a chance por ano de cada um. Demissão: quem trabalha fora
   * do serviço público fica de `months` meses sem salário e volta no mesmo
   * nível. Cirurgia: conta de hospital, mais provável a partir de
   * `seniorRiskFromAge`. Carro: conserto para quem tem carro.
   */
  mishaps: {
    layoff: { perYear: 0.03, months: { min: 3, max: 9 } },
    surgery: { perYear: 0.01, seniorPerYear: 0.04, cost: { min: 15_000, max: 60_000 } },
    car: { perYear: 0.06, cost: { min: 1_500, max: 8_000 } },
  },

  marriage: {
    /** Festa e cartório: o custo de um casamento, sempre o mesmo. */
    cost: 30_000,
    /** Diferença máxima de idade, em anos, entre o membro e quem ele conhece. */
    maxAgeGapYears: 5,
    /**
     * Formação de quem o membro conhece: chance de ter curso técnico e de ter
     * faculdade. O resto tem ensino médio.
     */
    suitorTechnicalChance: 0.2,
    suitorDegreeChance: 0.2,
    /** Chance de quem o membro conhece ser servidor público. */
    suitorPublicChance: 0.1,
  },

  /**
   * Namoro. Nas datas de `meetDates` (carnaval e dia dos namorados), cada
   * solteiro adulto tem `meetChance` de conhecer alguém, e o jogo para para
   * decidir se namora. Depois de `yearsToPropose` anos de namoro vem o pedido,
   * que também para o jogo: casar, esperar mais um ano ou terminar.
   */
  dating: { meetDates: ['02-15', '06-12'], meetChance: 0.6, yearsToPropose: 1 },

  jobs: {
    /** Quantas vagas aparecem na escolha do primeiro emprego. */
    offersPerChoice: 3,
  },

  careers: {
    /**
     * Fora do serviço público, cada nível pede um curso, feito enquanto a pessoa
     * trabalha: anos de cada curso no ritmo normal, do 1º para o 2º nível, do 2º
     * para o 3º, do 3º para o 4º e do 4º para o 5º. Com dedicação, o curso dura a
     * metade e a mensalidade dobra.
     */
    courseYears: [1, 2, 3, 4],
    /** Mensalidade do curso no ritmo normal: esta parte do aumento que ele traz. */
    courseFeeShare: 0.5,
    /**
     * Serviço público: anos no nível para subir ao seguinte, só com o tempo. Quem
     * chega de fora da família, o casal fundador e quem casa, também tem o nível
     * dos anos que já trabalhou, com estes tempos, até `backgroundMaxLevel`.
     */
    yearsToPromote: [3, 5, 8, 12],
    /** Nível (índice) até onde chega pelo tempo quem vem de fora da família: o 3º. */
    backgroundMaxLevel: 2,
  },

  /**
   * Imóveis, todos com preço fixo. O bairro tem um lote para cada imóvel de
   * moradia (`lots` em `PROPERTY_TYPES`). Os comerciais ficam à venda poucos de
   * cada vez: até `maxForSale` de cada tipo, e um novo aparece de tempos em
   * tempos (`market` em `PROPERTY_TYPES`). Com um ano do jogo por minuto, é o
   * ritmo das vendas que segura o aluguel, em vez de preços que sobem.
   */
  properties: { maxForSale: 2 },

  /**
   * Arquivo da árvore: quando ela passa deste número de pessoas, os ramos
   * antigos que já terminaram saem dela em janeiro, para o save não crescer
   * sem limite (`archiveMembers`).
   */
  archive: { maxMembers: 800 },

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
     * A nota cresce com a idade, em casa ou na escola: toda criança soma
     * `perYear` pontos por ano de vida, até `years` anos.
     */
    growth: { perYear: 2, years: 17 },
    /**
     * Etapas, pela idade que a criança faz no ano. A mensalidade é por mês, e os
     * pontos de cada rede se dividem pelos anos da etapa: o colégio particular
     * soma 40 ao longo dos 11 anos da escola, e a escola pública, 10. Na idade da
     * creche, ficar com os avós ou em casa também soma um pouco.
     */
    stages: {
      creche: {
        firstAge: 1,
        lastAge: 3,
        fees: { particular: 1200 },
        points: { publica: 20, particular: 20, avos: 5, casa: 5 },
      },
      escola: {
        firstAge: 4,
        lastAge: 14,
        fees: { particular: 1500 },
        points: { publica: 10, particular: 40 },
      },
      medio: {
        firstAge: 15,
        lastAge: 17,
        fees: { particular: 2000 },
        points: { publica: 5, particular: 40, federal: 60 },
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
