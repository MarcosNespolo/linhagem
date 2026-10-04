import { create } from 'zustand'
import type { MemberId } from '@/engine'

export type Tab = 'family' | 'love' | 'history' | 'settings'

export type Sheet =
  | { kind: 'member'; memberId: MemberId }
  | { kind: 'partner'; memberId: MemberId }
  | { kind: 'rename' }
  | { kind: 'confirmNewFamily' }

type UiStore = {
  tab: Tab
  sheet: Sheet | null
  /** Mostrar na árvore quem já faleceu e não deixou descendentes vivos. */
  showDeceased: boolean
  setTab: (tab: Tab) => void
  openSheet: (sheet: Sheet) => void
  closeSheet: () => void
  setShowDeceased: (value: boolean) => void
}

const PREFS_KEY = 'linhagem:prefs'

type Prefs = { showDeceased: boolean }

function readPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<Prefs>) : {}
    return { showDeceased: parsed.showDeceased === true }
  } catch {
    return { showDeceased: false }
  }
}

function writePrefs(prefs: Prefs): void {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Preferência de exibição: se não der para guardar, vale só nesta sessão.
  }
}

/** Estado da interface: aba aberta, painel aberto e preferências de exibição. */
export const useUiStore = create<UiStore>()((set) => ({
  tab: 'family',
  sheet: null,
  showDeceased: false,
  setTab: (tab) => set({ tab, sheet: null }),
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  setShowDeceased: (showDeceased) => {
    writePrefs({ showDeceased })
    set({ showDeceased })
  },
}))

/** Lê as preferências guardadas. Chamado uma vez, no navegador. */
export function loadUiPrefs(): void {
  useUiStore.setState(readPrefs())
}
