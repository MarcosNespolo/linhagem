# Linhagem

Idle game de família para web e celular. Toda a progressão vem de jogar: sem anúncios, sem
compras, sem moeda premium.

O jogador começa com uma pessoa de 18 anos, na casa dos pais e sem dinheiro, que faz cursos, pode
voltar a estudar à noite, mudar de carreira ou largar o emprego para estudar para concurso, namora,
casa e tem filhos, escolhe onde a família mora, vê os filhos namorarem e casarem com quem aparece e
vê a linhagem atravessar gerações enquanto o tempo passa, inclusive um pouco com o jogo fechado.

Jogue em [linhagem.vercel.app](https://linhagem.vercel.app).

## O que já dá para fazer

- Começar uma família com uma pessoa sorteada, de 18 anos, com ensino médio, trabalhando desde os
  16 e com R$ 0, morando com os pais até casar, e dar o sobrenome
- Ter filhos a partir dos 20 anos, com 2 anos entre um e outro; eles herdam o tom de pele, a cor
  do cabelo e dos olhos dos pais
- Matricular os filhos todo janeiro: creche, escola e ensino médio, na rede pública, num colégio
  particular ou no instituto federal, para quem passa na prova; a nota cresce desde o nascimento,
  um pouco em casa e na rede pública, mais no colégio particular e no instituto federal
- Fazer o ENEM no fim do médio e escolher o que vem depois: universidade federal (quando a nota
  alcança o corte do curso), faculdade particular, curso técnico, cursinho ou trabalhar
- Ver na aba Estudos quem estuda, onde, a mensalidade e a nota ou o ENEM de cada um, e contratar
  professor particular para quem está na escola ou no médio
- Tocar na foto de quem está numa escolha para ver a nota, de onde ela vem, o ENEM e a formação
- Escolher o primeiro emprego entre três vagas das carreiras que a formação abre, ou estudar para
  concurso público, em cinco faixas de nota, da prefeitura à auditoria fiscal; o tempo para até a
  escolha. Quem já trabalha pode largar o emprego para estudar, pela ficha da pessoa
- Receber propostas de emprego enquanto a família é pequena: outra carreira de ensino médio, no
  mesmo nível, pagando mais, para aceitar pela aba Trabalho ou deixar passar
- Voltar a estudar à noite, sem largar o emprego, pela ficha da pessoa: faculdade ou técnico numa
  particular, um ano mais longos que de dia, com as aulas começando em janeiro; formado, escolher
  entre continuar no emprego e começar na carreira da área
- Mudar de carreira pela ficha: recomeçar do nível de entrada numa carreira que a formação permite,
  pelo teto mais alto; quem é servidor deixa o serviço público
- Subir na carreira com cursos: cada nível pede um curso, depois de 2 anos no nível, pago por mês
  enquanto a pessoa trabalha, no ritmo normal ou com dedicação, que termina na metade do tempo,
  custa o dobro por mês e deixa a pessoa sem namoro nem filho até terminar; no serviço público, a
  promoção vem com o tempo
- Namorar quem aparece: no carnaval e no dia dos namorados, cada filho solteiro com 18 anos ou
  mais pode conhecer alguém, com formação e emprego, e o tempo para até decidir se namora. Um ano
  depois vem o pedido: casar, esperar mais um ano ou terminar. O cônjuge entra na família e
  trabalha; sem lugar em casa, o casal paga aluguel
- Comprar imóveis na aba Imóveis, que mostra o bairro desenhado, à vista ou financiados: kitnets,
  apartamentos e casas dão lugar para a família morar, e os que ela não usa, como os comerciais,
  rendem aluguel todo mês, menos a manutenção e os meses em que ficam vazios
- Escolher onde a família mora: cada moradia dela fica para morar, no automático ou para alugar,
  com o quanto o saldo do mês muda em cada opção
- Cumprir as três missões do dia, que valem até a meia-noite, e pegar a recompensa: alguns meses
  de renda ou a renda com 50% a mais por 1 ano do jogo
- Acompanhar o dinheiro em reais, a partir do zero, que fecha no dia 1º de cada mês: salários,
  aluguel, imposto de renda, custo de vida (padrão de vida, plano de saúde ou SUS, transporte e
  moradia), parcelas dos financiamentos e o 13º salário em dezembro; e passar por imprevistos:
  demissão, com seguro-desemprego, cirurgia e conserto do carro
- Perder o jogo: um ano no vermelho leva a família à falência
- Ver a família numa árvore com zoom e arrasto, com quem já morreu esmaecido
- Ver o histórico na aba Família: nascimentos, namoros, casamentos, estudos, empregos, promoções,
  imprevistos e mortes
- Voltar ao jogo e ver o resumo do que aconteceu enquanto esteve fora; fora do jogo, o tempo passa
  mais devagar, 1 mês por minuto, até 1 ano
- Ler as regras na página Como jogar, em Ajustes; as telas do jogo mostram só números e rótulos
  curtos
- Entrar com e-mail, sem senha, para guardar a família na nuvem e continuar em outro aparelho

A família começa com uma pessoa e R$ 0. Um filho custa R$ 15 mil e um casamento, R$ 10 mil. O que
limita a família é o dinheiro: quem ganha mais gasta mais (o padrão de vida e o imposto crescem
com a renda), quem não cabe nos imóveis dela paga aluguel, que fica mais caro a cada lugar, e para
ter mais filhos é preciso ganhar mais. Se o saldo fica negativo, o jogo para e avisa, e a família
tem um ano do jogo para voltar ao azul antes da falência. O que limita o aluguel que ela recebe é
cada moradia comprada deixar a próxima mais cara, e haver poucos imóveis comerciais à venda de
cada vez.

## Stack

- Next.js (App Router) e TypeScript, hospedado na Vercel
- Zustand para o estado no navegador
- react-zoom-pan-pinch para a árvore, Lucide para os ícones, Nunito como fonte
- Supabase para o login por e-mail e o save na nuvem
- Vitest para os testes

A simulação roda inteira no navegador. A nuvem serve de backup e para continuar o jogo em outro
aparelho. Sem conta, o jogo funciona igual, salvo só no aparelho.

## Rodando localmente

Precisa do Node 22.

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

## Scripts

| Comando                | O que faz                                                          |
| ---------------------- | ------------------------------------------------------------------ |
| `npm run dev`          | servidor de desenvolvimento                                        |
| `npm run build`        | build de produção                                                  |
| `npm test`             | testes da engine, do save, da interface e a simulação de 1 hora    |
| `npm run check`        | tipos, lint, formatação e testes, como no CI                       |
| `npm run sim`          | joga 10 horas com o jogador automático e confere os limites        |
| `npm run gallery`      | gera um HTML com avatares em várias idades, para revisar o desenho |
| `npm run fixture:save` | grava um save de exemplo antes de criar uma migração nova          |
| `npm run icons`        | gera os PNGs do app a partir dos SVGs em `public/icons`            |

## Estrutura

```text
app/                  rotas do Next.js, manifest da PWA e ícones
src/engine/           simulação pura em TypeScript: estado, relógio, economia, casamento, save
src/content/          carreiras, escolas, nomes, aparência e números de balanceamento
src/sim/              jogador automático e limites da simulação de balanceamento
src/game/             store, loop do jogo, save local e sincronização com a nuvem
src/ui/               interface: HUD, abas, painéis e avisos
src/ui/avatar/        avatares procedurais que mudam com a idade
src/ui/tree/          layout e desenho da árvore da família
src/ui/neighborhood/  layout e desenho do bairro da aba Imóveis
src/lib/              utilitários de formatação
supabase/             configuração local e migrations do banco
scripts/              ferramentas de desenvolvimento
tests/                testes da engine, do save, da interface e da formatação
```

A regra principal: a engine não conhece React, navegador nem rede. A interface só lê o estado e
despacha ações; a store é o único ponto que chama a engine, grava o save e, mais tarde,
sincroniza com a nuvem.

As telas do jogo mostram números e rótulos curtos, sem frases que expliquem as regras. As regras
ficam na página Como jogar, em Ajustes (`src/ui/sheets/how-to-play-sheet.tsx`), que monta cada
linha com os números de `BALANCE`; quando um número muda, a página muda junto.

## Como o tempo funciona

O jogo passa a 1 ano por minuto, ou 1 mês a cada 5 segundos (`BALANCE.secondsPerGameMonth` em
`src/content/balance.ts`): um filho vira adulto em 18 minutos. Salários e despesas são em reais
por mês do jogo, e o dinheiro fecha por mês: na virada para o dia 1º, a família recebe a renda e
paga as despesas do mês que passou, pelas taxas daquele dia (`settleMonth`). Entre um dia 1º e
outro, o dinheiro só muda com as compras, os imprevistos, o 13º e as recompensas. Os eventos
(aniversários, maioridade, aposentadoria, morte, promoções, imprevistos, provas de concurso e o 13º
salário, em 20 de dezembro) acontecem na virada de cada dia do jogo.

Quando alguém precisa de uma escolha, como a matrícula ou o primeiro emprego, o relógio para até o
jogador decidir. As escolhas abertas ficam no save (`choices`), e a sugestão de cada uma já vem
marcada no painel.

Como no Brasil, as matrículas são em janeiro. Quem começa a creche (no ano em que faz 1), a escola
(4) ou o ensino médio (15) ganha uma escolha, e todas aparecem juntas numa pausa só. A nota da
escola é a aptidão de cada um, de nascença, mais o que a idade e os estudos somam. A idade soma 2
pontos por ano de vida, do nascimento aos 17, em casa ou na escola (`agePoints`). Os estudos somam
por rede, ao longo de cada etapa: na creche, 20 na pública ou na particular e 5 com os avós ou em
casa; na escola, 10 na pública e 40 no colégio particular, que cobra mensalidade; no médio, 5 no
público, 40 no particular e 60 no instituto federal, que é gratuito, pede nota 550 na prova e forma
técnico. Quem está na escola ou no médio pode ter professor particular, por R$ 800 por mês, que soma
5 pontos na nota por ano, em proporção ao tempo (`src/engine/tutor.ts`). Quem funda a família ou
entra nela casando tem aptidão de 400 a 700, mais perto de 550, e a de quem aparece para namorar já
vem com a pessoa. Os filhos herdam: a aptidão fica perto da média dos pais, puxada um pouco para
550, com até 60 pontos para mais ou para menos (`inheritAptitude`, com os valores em
`BALANCE.aptitude`). As regras ficam em `src/engine/enrollment.ts` e `src/engine/school.ts`, e os
valores em `BALANCE.school`.

No janeiro em que termina o médio, a pessoa faz o ENEM (a nota da escola, para mais ou para menos
até 50 pontos) e o jogador escolhe o caminho. A universidade federal é gratuita e cada curso tem
nota de corte, de 600 em Licenciatura a 780 em Medicina; a faculdade particular aceita qualquer
nota e cobra mensalidade; o curso técnico dura 2 anos, no instituto federal para quem tirou 550 ou
mais; o cursinho dura 1 ano e soma 30 pontos à nota do ENEM anterior; e trabalhar abre na hora a
escolha do primeiro emprego. Quem estuda não tem salário. Na formatura, também em janeiro, a
formação fica registrada e abre a escolha do emprego. Os cursos ficam em `src/content/schools.ts`,
as regras em `src/engine/college.ts` e os valores em `BALANCE.college`. Quem chega aos 18 sem
estudar nem trabalhar, como quem veio de um save antigo, escolhe o emprego no aniversário.

Quem já trabalha pode voltar a estudar, pela ficha da pessoa (`checkReturnToSchool` e
`openReturnToSchool`): abre a mesma escolha de quem termina o médio, com o ENEM que a pessoa tem
(quem nunca fez, como quem funda a família, faz na hora), mas à noite e sem largar o emprego. A
federal e o instituto federal são em tempo integral e aparecem fechados; ficam a faculdade e o
técnico particulares, que duram um ano a mais à noite (`BALANCE.college.night`), e o cursinho. Quem
se matricula no meio do ano começa as aulas no janeiro seguinte (`Enrollment.startsOn`): até lá
não paga a mensalidade, e os anos do curso contam a partir dali. O salário continua, mas o curso de
promoção espera a formatura. Dá para parar quando quiser, sem a formação. Formado, a pessoa escolhe
entre continuar no emprego e começar do zero na carreira da área do curso (`openGraduationChoice`),
na vaga de entrada que a formação dá; na mesma carreira, um nível acima, é uma promoção.

## Carreiras e concurso

São 16 carreiras, com 5 níveis cada (`src/content/careers.ts`): 11 privadas e 5 do serviço
público. Cada uma pede uma formação, e as que pedem mais pagam mais: cinco pedem só o ensino
médio, Saúde e Tecnologia pedem o curso técnico da área, Educação, Engenharia, Direito e Medicina
pedem a faculdade, e as públicas pedem aprovação em concurso. Os salários seguem o Brasil de 2026:
o médico residente começa em R$ 7 mil (a bolsa de R$ 4,1 mil mais plantões), o técnico do INSS em
R$ 6,4 mil, o analista federal em R$ 12 mil e o auditor fiscal em R$ 23 mil. Na escolha de emprego
aparecem três vagas: a da área da formação, sempre, e carreiras de ensino médio. Quem tem formação
acima da que a carreira pede, na mesma área, entra um nível acima, como quem se formou em
Enfermagem, que começa como enfermeiro.

Fora do serviço público, ninguém sobe só com o tempo: cada nível pede um curso, feito enquanto a
pessoa trabalha, depois de 2 anos no nível atual (`src/engine/promotions.ts`, com os valores em
`BALANCE.careers`). No ritmo normal, o curso para o 2º nível leva 1 ano, o do 3º, 2, o do 4º, 3, e
o do 5º, 4, e a mensalidade é igual ao aumento que ele traz: o curso se paga só depois de pronto,
em tantos anos quanto durou. Com dedicação, o curso dura a metade e a mensalidade dobra, e até
terminar a pessoa não conhece ninguém nem tem filho. Ao terminar, ela sobe de nível. O jogador
começa o curso pela aba Trabalho ou pela ficha da pessoa e pode parar quando quiser, sem receber
de volta o que pagou. Quem é demitido no meio continua pagando e sobe no fim; quem se aposenta
perde o curso.

Quem tem ensino médio pode trocar a primeira vaga por estudar para concurso: sem salário, com
cursinho de R$ 500 por mês e uma prova a cada três meses. A nota parte do ENEM, sobe 10 pontos por
mês de estudo e varia até 40 para cima ou para baixo. São cinco cargos, por nota de corte: 540
para a prefeitura (R$ 2,4 mil), 620 para o estado (R$ 4,2 mil), 700 para técnico federal (R$ 6,4
mil) e, só com faculdade, 760 para analista federal (R$ 12 mil) e 850 para a auditoria fiscal (R$
23 mil). Em cada prova, a pessoa passa para o cargo mais alto que a nota e a formação alcançam, e
o jogador escolhe tomar posse, continuar estudando para um cargo maior ou procurar outro emprego.
A cada quatro provas sem passar, abre a escolha de emprego, em que dá para continuar estudando com
a nota que já juntou: um cargo alto pode levar dois ou três anos sem salário. No serviço público,
a promoção vem só com o tempo, ninguém é demitido, e a aposentadoria paga 70% do último salário,
em vez de 50%. As regras ficam em `src/engine/concurso.ts`, e os valores em `BALANCE.concurso` e
em cada carreira.

Quem funda a família, com 18 anos, começa no primeiro nível de uma carreira de ensino médio, em que
trabalha desde os 16 como jovem aprendiz (`BALANCE.founder`): já tem os 2 anos no nível, e o
primeiro curso está liberado no primeiro minuto. Quem aparece para namorar chega com formação e
emprego sorteados, com os níveis dos anos de trabalho, contados com os tempos do serviço público (3
anos no 1º nível), mas só até o 2º nível, e quem é servidor tem um cargo de nível médio: ninguém
chega de fora ganhando muito mais que a família (`src/engine/jobs.ts`).

Enquanto a família tem até 6 pessoas vivas, quem trabalha numa carreira de ensino médio, sem curso
em andamento, tem 20% de chance por ano de receber uma proposta de outra empresa
(`processJobOffers`, com os valores em `BALANCE.jobs.offers`): outra carreira de ensino médio, no
mesmo nível, pagando pelo menos 10% a mais. A proposta vale por 6 meses do jogo e não para o
relógio: aparece como aviso, na aba Trabalho e na ficha da pessoa, com os botões de aceitar e
recusar. Aceitar troca a carreira e zera o tempo no nível, então adia o próximo curso. O sorteio
depende só da seed, do dia e da pessoa, como os imprevistos.

Quem trabalha e tem pelo menos o ensino médio pode largar o emprego para estudar para concurso,
pela ficha da pessoa (`checkStudyForConcurso`): fica sem salário, com o cursinho, e parte da nota
de hoje; se desistir, procura outro emprego do zero. Com a nota alta, é a aposta mais forte do
começo: na casa dos pais, sem aluguel, dá para passar para o Estado ou para técnico federal em
meses. Quem estuda à noite termina o curso antes.

Também pela ficha, dá para mudar de carreira (`careerOptions` e `checkChangeCareer`): as de ensino
médio e a da área da formação, da que paga mais no topo à que paga menos, cada uma com a vaga de
entrada. A pessoa recomeça ali, com o tempo no nível contando de novo; o curso em andamento para,
quem estava desempregado volta a trabalhar e quem é servidor deixa o serviço público, com a
estabilidade e a aposentadoria maior. As carreiras públicas continuam pedindo concurso.

## Namoro e casamento

Ninguém escolhe o par numa lista: a pessoa aparece ao acaso (`src/engine/dating.ts`, com os valores
em `BALANCE.dating` e `BALANCE.marriage`). No carnaval (15 de fevereiro) e no dia dos namorados (12
de junho), cada solteiro vivo com 18 anos ou mais e sem outra escolha aberta tem 60% de chance de
conhecer alguém: uma pessoa de outro gênero, com até 5 anos de diferença, formação, emprego e
aptidão. O relógio para, e o jogador decide se namora; quem diz agora não pode conhecer outra pessoa
na próxima data. Um ano depois, na mesma data do calendário, vem o pedido de casamento, que também
para o relógio: casar (R$ 10 mil, cartório e uma festa simples), esperar mais um ano ou terminar.
Casar só dá com o dinheiro do casamento; com vários pedidos no mesmo painel, os casamentos marcados
saem do dinheiro um depois do outro, e marcar casar num deles passa os outros para esperar quando
não cabe tudo. Quem casa traz o par para a família (`src/engine/marriage.ts`), que trabalha no
emprego que tinha, ganha pelo menos dois anos de vida pela frente e mora com a família ou de
aluguel. O namoro acaba se o membro morrer. Quem entrou na família casando, ou ficou viúvo, não
casa de novo.

## Custo de vida, imposto e imprevistos

Cada pessoa tem um custo de vida por mês (`livingCost` em `src/engine/economy.ts`, com os valores
em `BALANCE.living` e `BALANCE.children`). Uma criança custa R$ 400 mais R$ 30 por ano de idade,
sem a escola. Um adulto paga o padrão de vida, que é R$ 700 de mercado e contas ou 35% da renda, o
que for maior (quem ganha mais gasta mais), o plano de saúde, com médico e dentista, de R$ 300 (R$
900 a partir dos 65) para quem ganha a partir de R$ 3 mil, e o transporte: R$ 200 de ônibus, ou R$
800 de carro para quem ganha a partir de R$ 6 mil. Quem ganha menos de R$ 3 mil usa o SUS e não
paga plano. Cada renda paga imposto de renda e INSS por faixas (`incomeTax`, com as faixas em
`BALANCE.tax`): isento até R$ 2.500, 10% até R$ 5 mil, 20% até R$ 10 mil, 27,5% até R$ 20 mil e 35%
acima, cada alíquota só sobre a parte da renda que cai na faixa. Assim, de um salário de R$ 1.900
sobra metade; de um de R$ 12 mil, 40%; de um de R$ 35 mil, 35%. Sozinha, na casa dos pais, a pessoa
que começa a família ganha de R$ 1.700 a R$ 2.400 e gasta R$ 900, então sobram de R$ 800 a R$ 1.500
por mês, e o primeiro curso custa mais do que sobra: a primeira decisão é começar já, ficando uns
meses no vermelho, ou juntar antes. A moradia é da família inteira (veja Moradia e imóveis).

Imprevistos acontecem com uma chance pequena por ano (`src/engine/mishaps.ts`, com os valores em
`BALANCE.mishaps`). Quem trabalha fora do serviço público pode ser demitido (3% ao ano) e fica de 3
a 9 meses procurando emprego, com o seguro-desemprego de 80% do salário, até R$ 2.400 por mês, e
volta no mesmo nível. O curso que a pessoa estiver fazendo fica trancado nesse tempo: não paga a
mensalidade e termina mais tarde. Adultos podem precisar de cirurgia (1% ao ano, 4% a
partir dos 65), de R$ 15 mil a R$ 60 mil, e quem tem carro pode precisar de conserto (6% ao ano),
de R$ 1.500 a R$ 8 mil. A família paga o que tiver no caixa. Cada sorteio depende só da seed, do dia
e da pessoa, sem gastar o gerador do jogo, então o resultado é o mesmo avançando de uma vez ou aos
poucos. Demissões e cirurgias aparecem como aviso; o resto fica no histórico.

Com o jogo fechado ou a aba escondida, o relógio não anda. Ao voltar, o tempo fora é simulado de
uma vez e mais devagar que o jogo: cada minuto fora vale 1 mês do jogo, até 1 ano
(`BALANCE.away`, em `elapsedToGameMs`), e a simulação para na primeira escolha que aparecer.
Assim, 5 minutos fora são 5 meses do jogo, e não 5 anos. Até 2 segundos sem o relógio andar ainda
contam no ritmo normal, porque o relógio da página anda a cada segundo e pode atrasar. A pausa
congela o relógio, inclusive com o jogo fechado.

O relógio conta o tempo em unidades inteiras, então avançar de uma vez ou aos poucos deixa o
calendário exatamente igual.

Todo sorteio usa um gerador com seed guardada no save, então a mesma partida avançada da mesma
forma chega sempre ao mesmo estado. Os testes conferem isso.

## Dinheiro e falência

A família começa com R$ 0, e o saldo pode ficar negativo (`src/engine/debt.ts`, com o prazo em
`BALANCE.debt`). Na virada do dia em que o saldo fica negativo, quase sempre um dia 1º, o relógio
para e um aviso mostra o
saldo, a renda e as despesas; o topo passa a mostrar quanto falta para a falência. Se a família
voltar ao azul, o prazo some. Se ficar um ano do jogo no vermelho, ela vai à falência: a partida
acaba, o relógio não anda mais e o jogo oferece começar outra família. Com o jogo fechado, o
relógio também para ao entrar no vermelho, mas o prazo já iniciado continua correndo. Imprevistos
continuam cobrando só o que cabe no caixa, para a falência vir das escolhas, e não do azar.

## Moradia e imóveis

Cada pessoa da família precisa de um lugar em casa. Kitnet tem 2 lugares, apartamento 4 e casa 6,
e o bairro tem 10 de cada, a partir de R$ 160 mil, R$ 400 mil e R$ 1,2 milhão: cada um que a família
compra deixa o próximo do tipo 10% mais caro (`propertyPrice`), e toda compra paga 3% de ITBI. Quem
não cabe nos imóveis da família mora de aluguel, sem limite de lugares: ninguém sai da família por
falta de lugar. Os 6 primeiros lugares alugados custam R$ 1.000 por mês cada (um casal paga R$ 2
mil, como num apartamento pequeno de verdade), e cada lugar a mais custa 40% a mais que o anterior
(`placeRent`): o 10º sai por cerca de R$ 3.800, e o 20º, por cerca de R$ 111 mil. Com 120 lugares
nas casas do bairro, é esse preço que segura o tamanho da família. Quem funda a família mora com os
pais, sem aluguel, enquanto está sozinho e solteiro (`livesWithParents`); os imóveis que comprar
nesse tempo ficam alugados. Casar é sair de casa: o aluguel de dois lugares, que empurra o casal
para financiar o primeiro kitnet. A aba Imóveis
mostra quanto custa o lugar de mais uma pessoa, e ter um filho e o pedido de casamento mostram a
moradia a mais (`extraHousingCost`). No automático, a família mora primeiro nos imóveis que rendem
menos aluguel por lugar (kitnets, depois apartamentos e casas) e paga as contas deles, de
condomínio, IPTU e manutenção; os outros ficam alugados. Em saves antigos, quem tinha saído de casa
por falta de lugar volta para a família.

O jogador escolhe onde a família mora (`homes` no save, com as regras em `homesInUse`): cada
moradia dela fica para morar, no automático ou para alugar, pelo painel do lote no bairro ou pelo
cartão Moradia, que abre a lista de todas. Para morar, a família mora nela sempre, mesmo sobrando
lugar; o automático completa o que falta, a começar pelos tipos que rendem menos por lugar; para
alugar, ela fica alugada mesmo com gente pagando aluguel. Cada opção mostra quanto o saldo do mês
muda com ela (`homeUseEffect`), e a escolha é uma conta de verdade: um casal sozinho numa casa de 6
lugares deixa de receber R$ 5.220 de aluguel e paga R$ 700 de contas, e sai mais barato alugar a
casa e pagar o aluguel de dois lugares. Enquanto quem funda a família mora com os pais, a escolha
espera.

Os comerciais, da sala comercial ao shopping, têm preço fixo, mas ficam à venda poucos de cada
vez: até 2 de cada tipo, e um novo aparece num calendário fixo, a cada 2 anos do jogo na sala
comercial e a cada 9 no shopping. Com os 2 à venda, o novo não aparece. A aba Imóveis mostra
quantos há à venda e quando aparece o próximo, e o número na aba diz quantos tipos à venda cabem no
dinheiro à vista. Alugados, os de moradia rendem 6% do preço por ano, como na vida real, e se pagam
em cerca de 19 anos do jogo; os comerciais, em 50 a 78. Cada tipo libera com a primeira compra do
anterior, e a compra é de um em um, sem venda.

Do aluguel de cada imóvel, 10% vai para a manutenção. De vez em quando o inquilino sai (25% ao ano
por imóvel): o imóvel fica vazio de 2 a 6 meses, sem aluguel e com a família pagando as contas dele,
e depois um inquilino novo chega (`processVacancies`, com o sorteio dependendo só da seed, do dia e
do imóvel, como os imprevistos). A aba Imóveis mostra quantos estão vazios.

Qualquer imóvel pode ser financiado (`src/engine/financing.ts`, com os valores em
`BALANCE.properties.financing`): a família paga 20% de entrada mais o ITBI e deve o resto ao
banco, em parcelas fixas pela tabela Price, com juros de 1% ao mês sobre o saldo, por 20 anos. O
banco só financia enquanto as parcelas de todos os financiamentos cabem em 30% da renda da
família. As parcelas saem todo mês com as despesas, e a família pode quitar o saldo quando quiser.
Financiar a casa própria sai mais barato que o aluguel de uma família grande, mas um imóvel
alugado rende menos que os juros, e uma demissão ou um inquilino que sai com a parcela em aberto
leva ao vermelho: é a escolha entre crescer alavancado e guardar reserva.

A aba Imóveis abre no bairro desenhado, no traço dos avatares: uma rua para cada tipo, com os 10
kitnets, apartamentos e casas do bairro e alguns lotes de cada comercial. Cada imóvel é um lote com
endereço, e a engine guarda quais lotes são da família (`lots` no save). Um coração marca onde a
família mora, uma moeda os imóveis que rendem aluguel, e cada um à venda tem a placa de "vende".
Só aparecem as ruas dos tipos liberados e a do próximo, com os terrenos em obras, então o bairro
cresce com a família. Tocar num prédio abre aquele imóvel: onde a família mora, quanto um alugado
rende, de quem é, ou o preço e o botão que compra exatamente aquele lote. Os comerciais à venda
ficam nos primeiros lotes livres da rua; quando a família tem mais do que os lotes, o primeiro
mostra o total, e a compra de outro fica fora da rua. A lista continua ao lado, e comprar por ela
leva o primeiro lote à venda. O desenho só é refeito quando o bairro muda, não a cada segundo do
jogo. O layout fica em `src/ui/neighborhood/layout.ts` e os desenhos em
`src/ui/neighborhood/buildings.tsx`.

O aluguel entra na renda da família todo mês, sem depender de quem está vivo: os imóveis são da
família e ficam quando as pessoas morrem. O resumo da volta ao jogo mostra quanto veio de aluguel.
As regras ficam em `src/engine/properties.ts`, o catálogo em `src/content/properties.ts`, e os
valores em `BALANCE.housing` e `BALANCE.properties`.

## Missões e bônus

Todo dia o jogo sorteia três missões de tipos diferentes, entre onze (`src/content/missions.ts`),
que valem até a meia-noite do aparelho. O sorteio usa a seed da família e a data, e não o gerador
do jogo, então o mesmo dia dá as mesmas missões em qualquer aparelho com o mesmo save. A data vem
da store, porque a engine não conhece o relógio do aparelho, e o sorteio acontece depois de
simular o tempo fora, para que o jogo fechado não cumpra missões sozinho.

Cada missão só aparece quando a família consegue cumpri-la, como Formatura, que pede alguém na
faculdade ou no técnico, Chá de bebê, que pede um casal na idade de ter filhos, ou Casório, que pede
dois solteiros, e conta só o que acontece depois que aparece. Promoção (alguém subir de nível),
Namoro (começar a namorar) e Reserva (guardar três meses de despesa) cabem numa família de uma
pessoa só, para o começo ter o que cumprir. A recompensa vale de 1 a 3 meses da renda líquida na
hora de pegar, ou a renda com 50% a mais por 1 ano do jogo; outro bônus soma 1 ano ao que falta. As
recompensas são pequenas
de propósito: ajudam, mas não substituem a renda. O bônus conta o tempo de jogo andando, então para
nas pausas e nas escolhas, e o fim dele é um ponto de corte do relógio, como a virada do dia.
Recompensas não pegas somem com as missões quando o dia vira. As regras ficam em
`src/engine/missions.ts` e `src/engine/boost.ts`.

## Balanceamento

Os números ficam em `src/content/balance.ts` e foram ajustados com uma simulação de 10 horas de
jogo (`npm run sim`). Um jogador automático (`src/sim/autoplay.ts`) namora quem aparece, casa no
pedido quando o casamento cabe no dinheiro e tem até 4 filhos por casal; põe os filhos no colégio
particular quando sobra renda depois de guardar um quarto dela, tenta a federal e paga a faculdade
particular quando não passa; escolhe a vaga de maior salário, ou estuda para o concurso quando a
nota esperada passa o corte do cargo mais alto que a formação permite, aceita toda proposta de
emprego, e a pessoa sozinha na casa dos pais larga o emprego pelo concurso com a mesma nota;
começa os cursos no ritmo normal quando a mensalidade cabe em 80% do salário da pessoa e deixa
folga de R$ 500 na renda ou, com a renda curta, quando o dinheiro guardado paga a diferença até o
fim do curso, e pega as recompensas das missões. Quem tem só o médio e menos de 30 anos volta a
estudar à noite quando a mensalidade da faculdade particular mais barata cabe no que sobra da renda
depois de guardar um quarto dela, contando as de quem só começa as aulas em janeiro, e faz a de
carreira mais bem paga que o orçamento cobre; formado, fica com a sugestão. No vermelho, para a
mensalidade mais cara, do curso de promoção ou da faculdade à noite. Filhos e casamentos vêm
primeiro, mas a estratégia guarda 3 meses de despesa e só tem mais um filho com folga de R$ 1 mil
na renda, para não ir à falência; um casal sem filhos a 8 anos da idade limite não espera a folga,
mas também não tem o filho quando os dois lugares que ele vai ocupar passam do saldo inteiro. Para
casar, ter filhos e estudar, a estratégia não conta com o bônus das missões, que acaba.
Enquanto mora de aluguel, financia uma moradia quando a parcela cabe no aluguel que deixa de
pagar, e quita o financiamento antes de investir, porque os juros passam do que qualquer aluguel
rende. O resto vai para o imóvel que se paga mais rápido, à vista; os de moradia contam o aluguel
que a família deixa de pagar morando neles. O dia das missões vira a cada hora, como quem joga uma
hora por dia.

Como o aluguel sobe a cada lugar, a estratégia também olha a moradia a mais. Ela casa quando o
lugar de quem chega custa até um quarto da renda, ou o salário dessa pessoa, e nunca com o saldo do
mês no vermelho; sair da casa dos pais vale sempre, porque é o começo da família. Mais um filho só
vem quando o lugar dele e o de quem um dia vai casar com ele custam até 1% da renda, a metade disso
a cada filho que o casal já tem, e esses lugares contam depois dos de quem ainda vai casar na
família. Os casais com menos filhos vêm primeiro, e entre eles os mais velhos. Sem isso, uma
geração que nasce toda de uma vez ocupa os lugares, os filhos dela passam da idade de ter filhos
esperando lugar para casar, e a família acaba em poucas horas.

A simulação confere nove limites (`src/sim/limits.ts`) e sai com erro se algum falhar:

| Limite        | Valor                                                                        |
| ------------- | ---------------------------------------------------------------------------- |
| Números       | dinheiro e renda finitos e abaixo de 10^15                                   |
| 1º imóvel     | a família compra o primeiro imóvel entre 3 e 20 minutos de jogo              |
| 10 imóveis    | chega a 10 imóveis entre 40 minutos e 2 horas                                |
| 1º comercial  | compra o primeiro comercial depois de 1 hora e 10 minutos                    |
| Crescimento   | a renda por mês no fim de cada hora fica entre 0,75 e 30 vezes a da anterior |
| Família       | entre 60 e 150 pessoas vivas depois das 3 primeiras horas                    |
| Save          | abaixo de 1 MB, o limite de cada save na nuvem                               |
| Relógio       | cada segundo de jogo custa menos de 2 ms com a família do fim                |
| Volta ao jogo | 1 ano fora do jogo, o máximo, em menos de 200 ms                             |

Os marcos substituem o antigo limite de ritmo (nunca mais de 2 minutos sem nada para comprar),
que puxava o jogo para o fácil. O começo tem decisões desde o primeiro minuto: uma pessoa só, na
casa dos pais, com o primeiro curso liberado, que custa mais do que sobra, e a aposta de largar o
emprego para o concurso quando a nota é alta. Ela casa entre 2 e 4 minutos de jogo, sai da casa
dos pais e financia o primeiro kitnet logo depois, entre 4 e 12 minutos, quando o aluguel de duas
pessoas passa da parcela. O primeiro filho vem entre 14 e 20 minutos, muitas vezes com o saldo do
mês no vermelho por um tempo. Com as seeds de 1 a 8, a família tem de 8 a 33 pessoas vivas e de
R$ 86 mil a R$ 253 mil de renda por mês no fim da primeira hora, chega a 10 imóveis entre 46 e 57
minutos e ao primeiro comercial entre 1 h 16 e 1 h 33, passa de 100 pessoas e de R$ 1,3 milhão
por mês na segunda hora, e fica entre 96 e 121 depois das 3 horas, subindo e descendo à medida que
as gerações nascem e morrem. O salto da renda entre a primeira e a segunda hora fica entre 13 e 24
vezes, porque a família sai de uma dezena para uma centena de pessoas; daí em diante a renda
oscila. Estudar à noite deixa a renda da primeira hora, em média, cerca de 20% maior que sem ele:
é a recompensa de quem planeja. O save fica perto de 190 KB, cada segundo de jogo custa menos de 1
ms, e o máximo de 1 ano fora do jogo, cerca de 10 ms. O CI roda uma versão de 1 hora com duas seeds
(`tests/sim/balance.test.ts`), com os limites que já valem nesse tempo.

## Avatares

Os rostos são desenhados em SVG a partir de traços guardados no save (`Appearance` em
`src/engine/types.ts`): tom de pele, cor e textura do cabelo, cor dos olhos, sardas, óculos,
barba e calvície. O desenho muda com a idade: bebê, criança, adolescente, adulto e idoso, com o
cabelo ficando grisalho. Filhos herdam os traços dos pais (`src/engine/appearance.ts`). As
cores ficam em `src/ui/avatar/palette.ts`.

## Save e migrações

O save é um JSON versionado (`schemaVersion`). Ao mudar o formato:

1. Rode `npm run fixture:save` para guardar um save de exemplo da versão atual.
2. Suba `CURRENT_SCHEMA_VERSION` e escreva a migração em `src/engine/migrations.ts`.
3. Os testes abrem todos os saves de exemplo e conferem que continuam funcionando.

Migrações são sempre aditivas: criam campos com valores padrão e nunca apagam dados do jogador.

O que sai do save é regra do jogo, não da migração. Para o save não crescer sem limite, todo
janeiro, quando a árvore passa de 800 pessoas, os ramos antigos que já terminaram saem dela
(`src/engine/archive.ts`, com o limite em `BALANCE.archive`). Sai quem morreu, ou saiu de casa e já
passou da expectativa de vida, sem filhos na árvore, sem acontecimento no histórico e com o par na
mesma situação, de quem se foi há mais tempo para quem se foi há menos. Os ancestrais de quem está
na árvore ficam sempre. Os Ajustes mostram quantas pessoas já saíram.

## Nuvem

Quem entra com e-mail recebe um código de 6 dígitos (ou um link) e não precisa de senha. Com a
conta conectada, o jogo sincroniza ao abrir, a cada 30 segundos, ao esconder a aba e ao voltar para
ela. As regras ficam em `src/game/sync.ts`:

- Cada gravação na nuvem sobe a revisão do save. O aparelho só grava se a revisão ainda for a que
  ele conhece, então nunca apaga sem saber o que outro aparelho gravou depois.
- Só as ações do jogador contam como mudança. Tempo passando não conta: a simulação é
  determinística, então qualquer aparelho que avance o mesmo save chega ao mesmo lugar.
- Se outro aparelho gravou e aqui nada mudou, este aparelho continua de lá. Se os dois mudaram, ou
  se as famílias são diferentes, o jogador escolhe qual continuar.
- A versão que não for escolhida fica guardada: a do aparelho em `linhagem:save-substituido`, no
  navegador, e a da nuvem na coluna `previous_state`.
- Começar outra família com a conta conectada substitui a família da nuvem, como o aviso diz.

## Supabase

O save na nuvem usa o projeto `projects` (ref `ungafoolmedlexptatbd`) da organização Side
Projects, que é compartilhado com outros projetos pessoais. Por isso tudo do jogo no banco leva o
prefixo `linhagem_` (`linhagem_profiles` e `linhagem_saves`), e nenhuma migration do jogo mexe no
que é de outro projeto. As contas criadas pelo jogo levam `app: linhagem` nos metadados.

As migrations ficam em `supabase/migrations`. O `supabase db push` não serve aqui: o histórico de
migrations da nuvem também tem as dos outros projetos, que não existem neste repositório. Aplique
cada migration nova pelo conector do Supabase, que registra a migration no histórico do banco, e use
no nome do arquivo a mesma versão que ficou registrada lá.

Os usuários do Supabase Auth também são compartilhados entre os projetos. Um gatilho em
`auth.users` que exija e-mail, por exemplo, impediria um login anônimo do jogo.

Configuração fora do repositório:

| Onde                                                 | O quê                                                                                               |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Vercel, variáveis de ambiente (Production e Preview) | `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, como em `.env.example`         |
| Supabase, Authentication, Emails                     | `{{ .Token }}` nos modelos "Confirm sign up" e "Magic link", para o e-mail trazer o código          |
| Supabase, Authentication, URL Configuration          | `https://linhagem.vercel.app/**` nas URLs de redirecionamento, para o link do e-mail voltar ao jogo |

Sem as variáveis de ambiente, a nuvem fica desligada e o jogo funciona só no aparelho, como nos
testes e no desenvolvimento local.

O envio de e-mail padrão do Supabase só entrega para membros da organização e tem limite baixo
por hora. Para abrir o jogo a outras pessoas, configure um SMTP próprio no Supabase.

No plano gratuito, o Supabase pausa o projeto depois de uma semana com pouco uso do banco. Com o
projeto pausado, o jogo continua no aparelho e a seção Nuvem, em Ajustes, avisa que não conseguiu
sincronizar.
