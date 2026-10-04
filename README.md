# Linhagem

Idle game de família para web e celular. Toda a progressão vem de jogar: sem anúncios, sem
compras, sem moeda premium.

O jogador começa com um casal, tem filhos, casa os filhos com pessoas de fora da família e vê a
linhagem atravessar gerações enquanto o tempo passa, inclusive um pouco com o jogo fechado.

Jogue em [linhagem.vercel.app](https://linhagem.vercel.app).

## O que já dá para fazer

- Criar uma família a partir de um casal fundador sorteado e dar o sobrenome
- Ter filhos, que herdam o tom de pele, a cor do cabelo e dos olhos dos pais
- Casar quem fez 18 anos, escolhendo entre pessoas sugeridas; o cônjuge entra na família e
  trabalha
- Ver a família numa árvore com zoom e arrasto, com quem já morreu esmaecido
- Acompanhar o histórico de nascimentos, casamentos, aposentadorias e mortes
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
| `npm run sim`          | simula minutos de jogo casando todo mundo e imprime a evolução     |
| `npm run gallery`      | gera um HTML com avatares em várias idades, para revisar o desenho |
| `npm run fixture:save` | grava um save de exemplo antes de criar uma migração nova          |
| `npm run icons`        | gera os PNGs do app a partir dos SVGs em `public/icons`            |

## Estrutura

```text
app/              rotas do Next.js, manifest da PWA e ícones
src/engine/       simulação pura em TypeScript: estado, relógio, economia, casamento, save
src/content/      carreiras, nomes, aparência e números de balanceamento
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

O jogo passa a 1 mês por segundo real (`BALANCE.gameMonthsPerSecond` em
`src/content/balance.ts`): um ano leva 12 segundos e um filho vira adulto em pouco mais de 3
minutos. O dinheiro acumula por segundo real e os eventos (aniversários, maioridade,
aposentadoria, morte) acontecem na virada de cada dia do jogo.

Com o jogo fechado ou a aba escondida, o relógio não anda. Ao voltar, o tempo fora é simulado de
uma vez, com limite de 5 anos do jogo (`BALANCE.offlineCapYears`). A pausa congela o relógio,
inclusive com o jogo fechado.

O relógio conta o tempo em unidades inteiras, então avançar de uma vez ou aos poucos deixa o
calendário exatamente igual.

Todo sorteio usa um gerador com seed guardada no save, então a mesma partida avançada da mesma
forma chega sempre ao mesmo estado. Os testes conferem isso.

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
