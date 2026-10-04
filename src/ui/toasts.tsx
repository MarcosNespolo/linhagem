'use client'

import { useEffect } from 'react'
import type { GameState } from '@/engine'
import { useGameStore, type Toast } from '@/game/store'
import { describeEvent } from './labels'

const TOAST_MS = 4_000

/** Avisos curtos sobre o que acaba de acontecer na família. */
export function Toasts({ game }: { game: GameState }) {
  const toasts = useGameStore((store) => store.toasts)
  if (toasts.length === 0) return null
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-30 flex flex-col items-center gap-2 px-4"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} text={describeEvent(game, toast.event)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, text }: { toast: Toast; text: string }) {
  const dismiss = useGameStore((store) => store.dismissToast)
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [dismiss, toast.id])
  return (
    <p className="animate-toast-in bg-ink pointer-events-auto max-w-sm rounded-2xl px-4 py-2.5 text-center text-[14px] font-semibold text-white shadow-lg">
      {text}
    </p>
  )
}
