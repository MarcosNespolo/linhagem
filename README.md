# Linhagem

Idle game de família para web e celular. Toda a progressão vem de jogar: sem anúncios, sem
compras, sem moeda premium.

O jogador começa com um casal, tem filhos, casa os filhos com pessoas de fora da família e vê a
linhagem atravessar gerações enquanto o tempo passa, inclusive um pouco com o jogo fechado.

Jogue em [linhagem.vercel.app](https://linhagem.vercel.app).

## O que já dá para fazer

- Criar uma família a partir de um casal fundador sorteado e dar o sobrenome
- Ter filhos a partir dos 20 anos, com 2 anos entre um e outro; eles herdam o tom de pele, a cor
  do cabelo e dos olhos dos pais
- Matricular os filhos todo janeiro: creche, escola e ensino médio, na rede pública, num colégio
  particular ou no instituto federal, para quem passa na prova
- Fazer o ENEM no fim do médio e escolher o que vem depois: universidade federal (quando a nota
  alcança o corte do curso), faculdade particular, curso técnico, cursinho ou trabalhar
- Ver na aba Estudos quem estuda, onde, a mensalidade e a nota ou o ENEM de cada um, e contratar
  professor particular para quem está na escola ou no médio
- Tocar na foto de quem está numa escolha para ver a nota, de onde ela vem, o ENEM e a formação
- Escolher o primeiro emprego entre três vagas das carreiras que a formação abre, ou estudar para
  concurso público; o tempo para até a escolha
- Acompanhar na aba Trabalho as carreiras, os níveis e as promoções, e pagar os cursos que levam
  ao 4º e ao 5º nível
- Casar quem fez 18 anos, escolhendo entre pessoas sugeridas, cada uma com formação e emprego; o
  cônjuge entra na família e trabalha
- Comprar imóveis, do kitnet ao shopping, que rendem aluguel todo mês na aba Imóveis
- Cumprir as três missões do dia, que valem até a meia-noite, e pegar a recompensa: meses de renda
  ou a renda em dobro por 5 anos do jogo
- Acompanhar o dinheiro em reais, com salários, aluguel e despesas por mês e o 13º salário em
  dezembro
- Ver a família numa árvore com zoom e arrasto, com quem já morreu esmaecido
- Ver o histórico na aba Família: nascimentos, casamentos, estudos, empregos, promoções e mortes
- Voltar ao jogo e ver o resumo do que aconteceu enquanto esteve fora
- Entrar com e-mail, sem senha, para guardar a família na nuvem e continuar em outro aparelho

Filhos e casamentos ficam mais caros conforme a família viva cresce, para que ela se estabilize
num tamanho que a renda sustenta.

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
| `npm test`             | testes da engine, do save, da árvore e dos avatares                |
| `npm run check`        | tipos, lint, formatação e testes, como no CI                       |
| `npm run sim`          | simula horas de jogo casando todo mundo e imprime a evolução       |
| `npm run gallery`      | gera um HTML com avatares em várias idades, para revisar o desenho |
| `npm run fixture:save` | grava um save de exemplo antes de criar uma migração nova          |
| `npm run icons`        | gera os PNGs do app a partir dos SVGs em `public/icons`            |

## Estrutura

```text
app/              rotas do Next.js, manifest da PWA e ícones
src/engine/       simulação pura em TypeScript: estado, relógio, economia, casamento, save
src/content/      carreiras, escolas, nomes, aparência e números de balanceamento
src/game/         store, loop do jogo, save local e sincronização com a nuvem
src/ui/           interface: HUD, abas, painéis e avisos
src/ui/avatar/    avatares procedurais que mudam com a idade
src/ui/tree/      layout e desenho da árvore da família
src/lib/          utilitários de formatação
supabase/         configuração local e migrations do banco
scripts/          ferramentas de desenvolvimento
tests/            testes da engine, do save, da interface e da formatação
```

A regra principal: a engine não conhece React, navegador nem rede. A interface só lê o estado e
despacha ações; a store é o único ponto que chama a engine, grava o save e, mais tarde,
sincroniza com a nuvem.

## Como o tempo funciona

O jogo passa a 1 ano por minuto, ou 1 mês a cada 5 segundos (`BALANCE.secondsPerGameMonth` em
`src/content/balance.ts`): um filho vira adulto em 18 minutos. Salários e despesas são em reais
por mês do jogo e o dinheiro entra aos poucos, a cada instante. Os eventos (aniversários,
maioridade, aposentadoria, morte, promoções, provas de concurso e o 13º salário, em 20 de
dezembro) acontecem na virada de cada dia do jogo.

Quando alguém precisa de uma escolha, como a matrícula ou o primeiro emprego, o relógio para até o
jogador decidir. As escolhas abertas ficam no save (`choices`), e a sugestão de cada uma já vem
marcada no painel.

Como no Brasil, as matrículas são em janeiro. Quem começa a creche (no ano em que faz 1), a escola
(4) ou o ensino médio (15) ganha uma escolha, e todas aparecem juntas numa pausa só. A escola
particular cobra mensalidade e soma pontos na nota, que é a aptidão de cada um mais esses pontos; o
instituto federal é gratuito, pede nota 550 na prova e forma técnico. Quem está na escola ou no
médio pode ter professor particular, por R$ 800 por mês, que soma 5 pontos na nota por ano, em
proporção ao tempo (`src/engine/tutor.ts`). A aptidão é sorteada no nascimento, de 400 a 700, mais
perto de 550. As regras ficam em `src/engine/enrollment.ts` e `src/engine/school.ts`, e os valores
em `BALANCE.school`.

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

A promoção vem com o tempo no nível: 3 anos no 1º, 5 no 2º, 8 no 3º e 12 no 4º. Até o 3º nível, a
pessoa sobe sozinha; para o 4º e o 5º, a família paga um curso que custa 24 meses do aumento, na
aba Trabalho, onde também dá para pagar todos de uma vez, do mais barato ao mais caro. As regras
ficam em `src/engine/promotions.ts`, e os valores em `BALANCE.careers`.

Quem tem ensino médio pode trocar a primeira vaga por estudar para concurso: até um ano sem
salário, com cursinho de R$ 500 por mês e uma prova a cada três meses. A nota parte do ENEM, sobe
10 pontos por mês de estudo e varia até 40 para cima ou para baixo. Com 620, a pessoa passa para
técnico; com faculdade e 720, para analista. Quando sai a aprovação, o jogador escolhe tomar posse,
continuar estudando para o cargo de nível superior ou procurar outro emprego. No serviço público,
a promoção vem só com o tempo, e a aposentadoria paga 70% do último salário, em vez de 50%. As
regras ficam em `src/engine/concurso.ts`, e os valores em `BALANCE.concurso`.

O casal fundador começa no 1º nível de uma carreira de ensino médio. Quem é sugerido como par chega
com formação e emprego sorteados, já com as promoções dos anos de trabalho
(`src/engine/jobs.ts`).

Com o jogo fechado ou a aba escondida, o relógio não anda. Ao voltar, o tempo fora é simulado de
uma vez, com limite de 5 anos do jogo (`BALANCE.offlineCapYears`), e para na primeira escolha que
aparecer. A pausa congela o relógio, inclusive com o jogo fechado.

O relógio conta o tempo em unidades inteiras, então avançar de uma vez ou aos poucos deixa o
calendário exatamente igual.

Todo sorteio usa um gerador com seed guardada no save, então a mesma partida avançada da mesma
forma chega sempre ao mesmo estado. Os testes conferem isso.

## Imóveis

São nove tipos, do kitnet ao shopping (`src/content/properties.ts`), cada um de 3 a 4,5 vezes mais
caro que o anterior. O primeiro de cada tipo se paga em 10 anos do jogo, no kitnet, até 32, no
shopping. Cada imóvel a mais do mesmo tipo custa 15% mais que o anterior, com o mesmo aluguel, e o
tipo seguinte libera com a primeira compra do anterior. A compra é de um em um, sem venda nem
financiamento por enquanto.

O aluguel entra na renda da família todo mês, sem depender de quem está vivo: os imóveis são da
família e ficam quando as pessoas morrem. O resumo da volta ao jogo mostra quanto veio de aluguel.
As regras ficam em `src/engine/properties.ts`, e o crescimento do preço em `BALANCE.properties`.

## Missões e bônus

Todo dia o jogo sorteia três missões de tipos diferentes, entre oito (`src/content/missions.ts`),
que valem até a meia-noite do aparelho. O sorteio usa a seed da família e a data, e não o gerador
do jogo, então o mesmo dia dá as mesmas missões em qualquer aparelho com o mesmo save. A data vem
da store, porque a engine não conhece o relógio do aparelho, e o sorteio acontece depois de
simular o tempo fora, para que o jogo fechado não cumpra missões sozinho.

Cada missão só aparece quando a família consegue cumpri-la, como Formatura, que pede alguém na
faculdade ou no técnico, e conta só o que acontece depois que aparece. A recompensa vale meses da
renda líquida na hora de pegar, ou a renda em dobro por 5 anos do jogo; outro bônus soma 5 anos ao
que falta. O bônus conta o tempo de jogo andando, então para nas pausas e nas escolhas, e o fim
dele é um ponto de corte do relógio, como a virada do dia. Recompensas não pegas somem com as
missões quando o dia vira. As regras ficam em `src/engine/missions.ts` e `src/engine/boost.ts`.

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
