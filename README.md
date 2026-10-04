# Linhagem

Idle game de família para web e celular. Toda a progressão vem de jogar: sem anúncios, sem
compras, sem moeda premium.

O jogador começa com um casal, tem filhos, vê a família crescer e envelhecer enquanto o tempo
passa, inclusive com o app fechado.

## Stack

- Next.js (App Router) e TypeScript, hospedado na Vercel
- Zustand para o estado no navegador
- Supabase para conta e save na nuvem (a partir da Fase 3)
- Vitest para os testes da engine

A simulação roda inteira no navegador. A nuvem serve de backup e para continuar o jogo em outro
aparelho.

## Rodando localmente

Precisa do Node 22 ou mais novo.

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

## Scripts

| Comando                | O que faz                                                 |
| ---------------------- | --------------------------------------------------------- |
| `npm run dev`          | servidor de desenvolvimento                               |
| `npm run build`        | build de produção                                         |
| `npm test`             | testes da engine e do save                                |
| `npm run check`        | tipos, lint, formatação e testes, como no CI              |
| `npm run sim`          | simula horas de jogo e imprime a evolução da família      |
| `npm run fixture:save` | grava um save de exemplo antes de criar uma migração nova |
| `npm run icons`        | gera os PNGs do app a partir dos SVGs em `public/icons`   |

## Estrutura

```text
app/            rotas do Next.js, manifest da PWA e ícones
src/engine/     simulação pura em TypeScript: estado, relógio, economia, save
src/content/    carreiras, nomes e números de balanceamento
src/game/       store, loop do jogo e save local
src/ui/         componentes da interface
src/lib/        utilitários de formatação
supabase/       configuração local e migrations do banco
scripts/        ferramentas de desenvolvimento
tests/          testes da engine, do save e da formatação
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
