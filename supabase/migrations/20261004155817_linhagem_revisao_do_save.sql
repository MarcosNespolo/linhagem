-- Revisão do save na nuvem. Cada gravação sobe a revisão, e o aparelho só atualiza o save se ela
-- ainda for a que ele conhece. Assim um aparelho não apaga sem saber o que outro gravou depois.

alter table public.linhagem_saves
  add column revision bigint not null default 1 check (revision > 0);

comment on column public.linhagem_saves.revision is
  'Sobe a cada gravação. O aparelho só atualiza o save se a revisão ainda for a que ele conhece.';

comment on table public.linhagem_saves is
  'Linhagem: um save por jogador. Quando dois aparelhos divergem, o jogo pergunta qual versão manter.';

create or replace function public.linhagem_saves_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.saved_at := now();
  if tg_op = 'UPDATE' then
    new.previous_state := old.state;
    new.revision := old.revision + 1;
  else
    new.previous_state := null;
    new.revision := 1;
  end if;
  return new;
end;
$$;
