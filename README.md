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

Filhos e casamentos ficam mais caros conforme a família viva cresce, para que ela se estabilize
num tamanho que a renda sustenta.

## Stack

- Next.js (App Router) e TypeScript, hospedado na Vercel
- Zustand para o estado no navegador
- react-zoom-pan-pinch para a árvore, Lucide para os ícones, Nunito como fonte
- Supabase para conta e save na nuvem (a partir da Fase 3)
- Vitest para os testes

A simulação roda inteira no navegador. A nuvem serve de backup e para continuar o jogo em outro
aparelho.

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
src/game/         store, loop do jogo e save local
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

## Supabase

As migrations ficam em `supabase/migrations`. Para aplicar num projeto na nuvem:

```bash
npx supabase link --project-ref <ref-do-projeto>
npx supabase db push
```

As variáveis de ambiente estão em `.env.example` e só são necessárias a partir da Fase 3.
