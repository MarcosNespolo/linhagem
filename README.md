# Linhagem

Idle game de família para web e celular. Toda a progressão vem de jogar: sem anúncios, sem
compras, sem moeda premium.

O jogador começa com um casal, tem filhos, vê os filhos namorarem e casarem com quem aparece e vê
a linhagem atravessar gerações enquanto o tempo passa, inclusive um pouco com o jogo fechado.

Jogue em [linhagem.vercel.app](https://linhagem.vercel.app).

## O que já dá para fazer

- Criar uma família a partir de um casal fundador sorteado e dar o sobrenome
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
  concurso público; o tempo para até a escolha
- Subir na carreira com cursos: cada nível pede um curso, pago por mês enquanto a pessoa
  trabalha, no ritmo normal ou com dedicação, que termina na metade do tempo, custa o dobro por mês
  e deixa a pessoa sem namoro nem filho até terminar; no serviço público, a promoção vem com o
  tempo
- Namorar quem aparece: no carnaval e no dia dos namorados, cada filho solteiro com 18 anos ou
  mais pode conhecer alguém, com formação e emprego, e o tempo para até decidir se namora. Um ano
  depois vem o pedido: casar, esperar mais um ano ou terminar. O cônjuge entra na família e
  trabalha; sem lugar em casa, o casal paga aluguel
- Comprar imóveis na aba Imóveis, que mostra o bairro desenhado: kitnets, apartamentos e casas
  dão lugar para a família morar, e os que ela não usa, como os comerciais, rendem aluguel todo
  mês
- Cumprir as três missões do dia, que valem até a meia-noite, e pegar a recompensa: meses de renda
  ou a renda em dobro por 5 anos do jogo
- Acompanhar o dinheiro em reais, a partir do zero, com salários, aluguel, custo de vida (mercado,
  plano de saúde, transporte e moradia) e o 13º salário em dezembro, e passar por imprevistos:
  demissão, cirurgia e conserto do carro
- Perder o jogo: um ano no vermelho leva a família à falência
- Ver a família numa árvore com zoom e arrasto, com quem já morreu esmaecido
- Ver o histórico na aba Família: nascimentos, namoros, casamentos, estudos, empregos, promoções,
  imprevistos e mortes
- Voltar ao jogo e ver o resumo do que aconteceu enquanto esteve fora
- Entrar com e-mail, sem senha, para guardar a família na nuvem e continuar em outro aparelho

A família começa com R$ 0. Os preços são fixos: um filho custa R$ 15 mil, um casamento, R$ 30 mil,
e cada imóvel, sempre o mesmo. O que limita a família é o dinheiro: quem não cabe nos imóveis
dela paga aluguel, e para ter mais filhos é preciso ganhar mais. Se o saldo fica negativo, o jogo
para e avisa, e a família tem um ano do jogo para voltar ao azul antes da falência. O que limita o
aluguel que ela recebe é haver poucos imóveis comerciais à venda de cada vez.

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

## Como o tempo funciona

O jogo passa a 1 ano por minuto, ou 1 mês a cada 5 segundos (`BALANCE.secondsPerGameMonth` em
`src/content/balance.ts`): um filho vira adulto em 18 minutos. Salários e despesas são em reais
por mês do jogo e o dinheiro entra aos poucos, a cada instante. Os eventos (aniversários,
maioridade, aposentadoria, morte, promoções, imprevistos, provas de concurso e o 13º salário, em
20 de dezembro) acontecem na virada de cada dia do jogo.

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

## Carreiras e concurso

São 12 carreiras, com 5 níveis cada (`src/content/careers.ts`). Cada uma pede uma formação, e as
que pedem mais pagam mais: cinco pedem só o ensino médio, Saúde e Tecnologia pedem o curso técnico
da área, Educação, Engenharia, Direito e Medicina pedem a faculdade, e o serviço público pede
aprovação em concurso. Na escolha de emprego aparecem três vagas: a da área da formação, sempre,
e carreiras de ensino médio. Quem tem formação acima da que a carreira pede, na mesma área, entra
um nível acima, como quem se formou em Enfermagem, que começa como enfermeiro.

Fora do serviço público, ninguém sobe só com o tempo: cada nível pede um curso, feito enquanto a
pessoa trabalha (`src/engine/promotions.ts`, com os valores em `BALANCE.careers`). No ritmo normal,
o curso para o 2º nível leva 1 ano, o do 3º, 2, o do 4º, 3, e o do 5º, 4, e a mensalidade é metade
do aumento que ele traz. Com dedicação, o curso dura a metade e a mensalidade dobra, e até terminar
a pessoa não conhece ninguém nem tem filho. Ao terminar, ela sobe de nível. O jogador começa o curso
pela aba Trabalho ou pela ficha da pessoa e pode parar quando quiser, sem receber de volta o que
pagou. Quem é demitido no meio continua pagando e sobe no fim; quem se aposenta perde o curso.

Quem tem ensino médio pode trocar a primeira vaga por estudar para concurso: até um ano sem
salário, com cursinho de R$ 500 por mês e uma prova a cada três meses. A nota parte do ENEM, sobe
10 pontos por mês de estudo e varia até 40 para cima ou para baixo. Com 620, a pessoa passa para
técnico; com faculdade e 720, para analista. Quando sai a aprovação, o jogador escolhe tomar posse,
continuar estudando para o cargo de nível superior ou procurar outro emprego. No serviço público,
a promoção vem só com o tempo, e a aposentadoria paga 70% do último salário, em vez de 50%. As
regras ficam em `src/engine/concurso.ts`, e os valores em `BALANCE.concurso`.

O casal fundador, de 24 a 29 anos, começa numa carreira de ensino médio, já com os níveis dos anos
que trabalhou desde os 18, contados com os tempos do serviço público (3 anos no 1º nível e 5 no 2º),
até o 3º nível. Quem aparece para namorar chega com formação e emprego sorteados, também com os
níveis dos anos de trabalho (`src/engine/jobs.ts`).

## Namoro e casamento

Ninguém escolhe o par numa lista: a pessoa aparece ao acaso (`src/engine/dating.ts`, com os valores
em `BALANCE.dating` e `BALANCE.marriage`). No carnaval (15 de fevereiro) e no dia dos namorados (12
de junho), cada solteiro vivo com 18 anos ou mais e sem outra escolha aberta tem 60% de chance de
conhecer alguém: uma pessoa de outro gênero, com até 5 anos de diferença, formação, emprego e
aptidão. O relógio para, e o jogador decide se namora; quem diz agora não pode conhecer outra pessoa
na próxima data. Um ano depois, na mesma data do calendário, vem o pedido de casamento, que também
para o relógio: casar (R$ 30 mil), esperar mais um ano ou terminar. Casar só dá com o dinheiro do
casamento; com vários pedidos no mesmo painel, os casamentos marcados saem do dinheiro um depois do
outro, e marcar casar num deles passa os outros para esperar quando não cabe tudo. Quem casa traz o
par para a família (`src/engine/marriage.ts`), que trabalha no emprego que tinha, ganha pelo menos
dois anos de vida pela frente e mora com a família ou de aluguel. O namoro acaba se o membro morrer.
Quem entrou na família casando, ou ficou viúvo, não casa de novo.

## Custo de vida e imprevistos

Cada pessoa tem um custo de vida por mês (`livingCost` em `src/engine/economy.ts`, com os valores
em `BALANCE.living` e `BALANCE.children`). Uma criança custa R$ 400 mais R$ 30 por ano de idade,
sem a escola. Um adulto paga R$ 800 de mercado e contas, R$ 300 de plano de saúde, com médico e
dentista (R$ 900 a partir dos 65), e o transporte: R$ 200 de ônibus, ou R$ 800 de carro para quem
ganha a partir de R$ 6 mil. A moradia é da família inteira (veja Moradia e imóveis).

Imprevistos acontecem com uma chance pequena por ano (`src/engine/mishaps.ts`, com os valores em
`BALANCE.mishaps`). Quem trabalha fora do serviço público pode ser demitido (3% ao ano) e fica de 3
a 9 meses sem salário, voltando no mesmo nível. Adultos podem precisar de cirurgia (1% ao ano, 4% a
partir dos 65), de R$ 15 mil a R$ 60 mil, e quem tem carro pode precisar de conserto (6% ao ano),
de R$ 1.500 a R$ 8 mil. A família paga o que tiver no caixa. Cada sorteio depende só da seed, do dia
e da pessoa, sem gastar o gerador do jogo, então o resultado é o mesmo avançando de uma vez ou aos
poucos. Demissões e cirurgias aparecem como aviso; o resto fica no histórico.

Com o jogo fechado ou a aba escondida, o relógio não anda. Ao voltar, o tempo fora é simulado de
uma vez, com limite de 5 anos do jogo (`BALANCE.offlineCapYears`), e para na primeira escolha que
aparecer. A pausa congela o relógio, inclusive com o jogo fechado.

O relógio conta o tempo em unidades inteiras, então avançar de uma vez ou aos poucos deixa o
calendário exatamente igual.

Todo sorteio usa um gerador com seed guardada no save, então a mesma partida avançada da mesma
forma chega sempre ao mesmo estado. Os testes conferem isso.

## Dinheiro e falência

A família começa com R$ 0, e o saldo pode ficar negativo (`src/engine/debt.ts`, com o prazo em
`BALANCE.debt`). Na virada do dia em que o saldo fica negativo, o relógio para e um aviso mostra o
saldo, a renda e as despesas; o topo passa a mostrar quanto falta para a falência. Se a família
voltar ao azul, o prazo some. Se ficar um ano do jogo no vermelho, ela vai à falência: a partida
acaba, o relógio não anda mais e o jogo oferece começar outra família. Com o jogo fechado, o
relógio também para ao entrar no vermelho, mas o prazo já iniciado continua correndo. Imprevistos
continuam cobrando só o que cabe no caixa, para a falência vir das escolhas, e não do azar.

## Moradia e imóveis

Cada pessoa da família precisa de um lugar em casa. Kitnet tem 2 lugares, apartamento 4 e casa 6,
e o bairro tem 10 de cada, com preço fixo: R$ 80 mil, R$ 450 mil e R$ 1,5 milhão. Quem não cabe nos
imóveis da família mora de aluguel, a R$ 600 por pessoa por mês, sem limite: ninguém sai da
família por falta de lugar. A família mora primeiro nos imóveis que rendem menos aluguel por
lugar (kitnets, depois apartamentos e casas) e paga as contas deles, de condomínio, IPTU e
manutenção; os outros ficam alugados. Em saves antigos, quem tinha saído de casa por falta de
lugar volta para a família.

Os comerciais, da sala comercial ao shopping, também têm preço fixo, mas ficam à venda poucos de
cada vez: até 2 de cada tipo, e um novo aparece num calendário fixo, a cada 2 anos do jogo na sala
comercial e a cada 9 no shopping. Com os 2 à venda, o novo não aparece. A aba Imóveis mostra
quantos há à venda e quando aparece o próximo, e o número na aba diz quantos tipos à venda cabem no
dinheiro. Alugados, os de moradia se pagam em 10 a 13 anos do jogo, e os comerciais em 45 a 70: com
um ano por minuto, aluguéis que se pagassem em 15 a 30 anos, como na vida real, fariam a renda
saltar 24 vezes na segunda hora de jogo. Cada tipo libera com a primeira compra do anterior, e a
compra é de um em um, sem venda nem financiamento por enquanto.

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

Todo dia o jogo sorteia três missões de tipos diferentes, entre oito (`src/content/missions.ts`),
que valem até a meia-noite do aparelho. O sorteio usa a seed da família e a data, e não o gerador
do jogo, então o mesmo dia dá as mesmas missões em qualquer aparelho com o mesmo save. A data vem
da store, porque a engine não conhece o relógio do aparelho, e o sorteio acontece depois de
simular o tempo fora, para que o jogo fechado não cumpra missões sozinho.

Cada missão só aparece quando a família consegue cumpri-la, como Formatura, que pede alguém na
faculdade ou no técnico, ou Chá de bebê, que pede lugar livre em casa, e conta só o que acontece
depois que aparece. A recompensa vale meses da
renda líquida na hora de pegar, ou a renda em dobro por 5 anos do jogo; outro bônus soma 5 anos ao
que falta. O bônus conta o tempo de jogo andando, então para nas pausas e nas escolhas, e o fim
dele é um ponto de corte do relógio, como a virada do dia. Recompensas não pegas somem com as
missões quando o dia vira. As regras ficam em `src/engine/missions.ts` e `src/engine/boost.ts`.

## Balanceamento

Os números ficam em `src/content/balance.ts` e foram ajustados com uma simulação de 10 horas de
jogo (`npm run sim`). Um jogador automático (`src/sim/autoplay.ts`) namora quem aparece, casa no
pedido quando o casamento cabe no dinheiro e tem até 4 filhos por casal; põe os filhos no colégio
particular quando sobra renda depois de guardar um quarto dela, tenta a federal e paga a faculdade
particular quando não passa; escolhe a vaga de maior salário, começa os cursos no ritmo normal
quando a mensalidade deixa folga de R$ 2 mil na renda e pega as recompensas das missões. Filhos e casamentos vêm primeiro, mas a
estratégia guarda 3 meses de despesa e só tem mais um filho com folga de R$ 2 mil na renda, para
não ir à falência. O resto vai para o imóvel que se paga mais rápido; os de moradia contam o
aluguel que a família deixa de pagar morando neles. O dia das missões vira a cada hora, como quem
joga uma hora por dia.

A simulação confere sete limites (`src/sim/limits.ts`) e sai com erro se algum falhar:

| Limite        | Valor                                                                         |
| ------------- | ----------------------------------------------------------------------------- |
| Números       | dinheiro e renda finitos e abaixo de 10^15                                    |
| Ritmo         | depois dos 5 primeiros minutos, nunca mais de 2 minutos sem nada para comprar |
| Crescimento   | a renda por mês no fim de cada hora sobe, no máximo 10 vezes, sem o bônus     |
| Família       | entre 60 e 150 pessoas vivas depois das 3 primeiras horas                     |
| Save          | abaixo de 1 MB, o limite de cada save na nuvem                                |
| Relógio       | cada segundo de jogo custa menos de 2 ms com a família do fim                 |
| Volta ao jogo | 5 anos de progresso offline em menos de 200 ms                                |

Os resultados abaixo são de antes do aluguel sem limite (etapa 4.9), do namoro (4.10) e dos cursos
de promoção (4.11). O aluguel e o namoro deixam a família crescer sem teto: com a seed 1, ela passa
de 1.900 pessoas vivas no ano 110 do jogo, e a simulação longa fica lenta. O balanceamento das
regras novas (etapa 4.14) refaz os números.

Com as seeds de 1 a 4, a família chega a 124 pessoas, o máximo que as casas do bairro e o aluguel
comportam, em cerca de 1 hora e meia, e fica entre 118 e 124 dali em diante. A renda vai de cerca
de R$ 750 mil por mês na primeira hora a R$ 400 milhões na décima, crescendo até 6 vezes na segunda
hora e 1,2 vez na última. O save fica perto de 560 KB, cada segundo de jogo custa cerca de 1 ms, e 5
anos de progresso offline, menos de 80 ms. O CI roda uma versão de 1 hora com duas seeds
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
