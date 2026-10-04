-- Perfis e saves do Linhagem.
-- O projeto do Supabase é compartilhado com outros projetos pessoais, então tudo do jogo leva o
-- prefixo linhagem_ e nada aqui mexe no que já existe no banco.
-- Cada jogador, inclusive o anônimo, lê e escreve só as próprias linhas. Login anônimo do Supabase
-- usa o papel authenticated, então as políticas abaixo cobrem os dois casos.

create table public.linhagem_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 40),
  created_at timestamptz not null default now()
);

comment on table public.linhagem_profiles is 'Linhagem: dados mínimos do jogador.';

create table public.linhagem_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  schema_version integer not null check (schema_version > 0),
  game_time_seconds double precision not null default 0 check (game_time_seconds >= 0),
  saved_at timestamptz not null default now(),
  device_id text check (char_length(device_id) <= 64),
  previous_state jsonb,
  constraint linhagem_saves_state_is_object check (jsonb_typeof(state) = 'object'),
  constraint linhagem_saves_state_size check (pg_column_size(state) <= 1048576)
);

comment on table public.linhagem_saves is
  'Linhagem: um save por jogador. Em conflito entre aparelhos, vence o maior game_time_seconds.';
comment on column public.linhagem_saves.previous_state is
  'Save anterior, guardado a cada atualização para restaurar em caso de perda.';

-- Usa o relógio do servidor, que é mais confiável que o do aparelho, e guarda o save anterior a
-- cada atualização. O aparelho não escolhe saved_at nem previous_state.
create function public.linhagem_saves_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.saved_at := now();
  if tg_op = 'UPDATE' then
    new.previous_state := old.state;
  else
    new.previous_state := null;
  end if;
  return new;
end;
$$;

create trigger linhagem_saves_before_write
before insert or update on public.linhagem_saves
for each row execute function public.linhagem_saves_before_write();

alter table public.linhagem_profiles enable row level security;
alter table public.linhagem_saves enable row level security;

-- Só o necessário: sem acesso para anon, e o jogador lê, cria e atualiza as próprias linhas.
revoke all on public.linhagem_profiles, public.linhagem_saves from anon, authenticated;
grant select, insert, update on public.linhagem_profiles, public.linhagem_saves to authenticated;

create policy "Jogador lê o próprio perfil"
  on public.linhagem_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Jogador cria o próprio perfil"
  on public.linhagem_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Jogador atualiza o próprio perfil"
  on public.linhagem_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Jogador lê o próprio save"
  on public.linhagem_saves for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Jogador cria o próprio save"
  on public.linhagem_saves for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Jogador atualiza o próprio save"
  on public.linhagem_saves for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
