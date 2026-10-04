'use client'

import { Briefcase, Building2, Heart, School, TreeDeciduous, type LucideIcon } from 'lucide-react'
import { useUiStore, type Tab } from './ui-store'

const TABS: { id: Tab; label: string; icon: LucideIcon; badgeLabel?: string }[] = [
  { id: 'family', label: 'Família', icon: TreeDeciduous },
  { id: 'love', label: 'Amor', icon: Heart, badgeLabel: 'ações disponíveis' },
  { id: 'studies', label: 'Estudos', icon: School },
  { id: 'work', label: 'Trabalho', icon: Briefcase, badgeLabel: 'cursos cabem no dinheiro' },
  { id: 'properties', label: 'Imóveis', icon: Building2 },
]

/**
 * Navegação entre as abas. A aba Amor mostra quantas ações dá para fazer agora,
 * e a aba Trabalho, quantos cursos de promoção cabem no dinheiro.
 */
export function BottomNav({ badges }: { badges: Partial<Record<Tab, number>> }) {
  const tab = useUiStore((store) => store.tab)
  const setTab = useUiStore((store) => store.setTab)

  return (
    <nav className="border-line bg-surface z-20 shrink-0 border-t pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map(({ id, label, icon: Icon, badgeLabel }) => {
          const active = tab === id
          const badge = badges[id] ?? 0
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setTab(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-0.5 pt-2 pb-2.5 text-[12px] font-bold transition ${
                  active ? 'text-leaf-strong' : 'text-ink-soft'
                }`}
              >
                <span
                  className={`relative grid h-8 w-14 place-items-center rounded-full transition ${
                    active ? 'bg-leaf-soft' : ''
                  }`}
                >
                  <Icon size={21} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                  {badge > 0 ? (
                    <span className="tabular bg-rose ring-surface absolute -top-1 right-1.5 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-extrabold text-white ring-2">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  ) : null}
                </span>
                {label}
                {badge > 0 && badgeLabel ? (
                  <span className="sr-only">
                    , {badge} {badgeLabel}
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
