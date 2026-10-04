'use client'

import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

type Props = {
  /** Título do painel, também usado por leitores de tela. */
  title: string
  /** Esconde o título visível quando o conteúdo já tem um cabeçalho próprio. */
  hideTitle?: boolean
  onClose: () => void
  children: ReactNode
}

/** Painel que sobe da parte de baixo da tela. Fecha com Esc, com o X ou tocando fora. */
export function Sheet({ title, hideTitle = false, onClose, children }: Props) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    panel.current?.focus()
  }, [])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div
        className="animate-fade-in bg-ink/40 absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-sheet-in bg-surface relative max-h-[88dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[28px] px-5 pt-2.5 pb-[max(env(safe-area-inset-bottom),1.25rem)] outline-none"
      >
        <div className="bg-line mx-auto mb-2 h-1.5 w-10 rounded-full" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3">
          {hideTitle ? <span /> : <h2 className="pt-1 text-xl font-extrabold">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-ink-soft hover:bg-canvas -mr-2 grid size-10 shrink-0 place-items-center rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
