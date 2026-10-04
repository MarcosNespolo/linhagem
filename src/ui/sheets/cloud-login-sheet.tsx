'use client'

import { useEffect, useState } from 'react'
import type { CloudProblem } from '@/game/cloud'
import { useGameStore } from '@/game/store'
import { button } from '../styles'
import { useUiStore } from '../ui-store'
import { Sheet } from './sheet'

/** Espera para pedir outro código. O Supabase recusa pedidos seguidos antes disso. */
const RESEND_SECONDS = 60
/** O Supabase manda códigos de 6 dígitos, ou mais se o projeto for configurado assim. */
const CODE_MIN_LENGTH = 6
const CODE_MAX_LENGTH = 10

const PROBLEMS: Record<CloudProblem, string> = {
  offline: 'Sem conexão com a internet. Tente de novo quando ela voltar.',
  rateLimited: 'Muitos pedidos seguidos. Espere um pouco e tente de novo.',
  invalidEmail: 'Esse e-mail não parece certo. Confira e tente de novo.',
  notAuthorized: 'Por enquanto, só alguns e-mails podem receber o código.',
  wrongCode: 'Código errado ou vencido. Confira o último e-mail ou peça outro.',
  unavailable: 'O login por e-mail está desligado agora.',
  unknown: 'Algo deu errado. Tente de novo em instantes.',
}

/**
 * Entrar com e-mail, sem senha: o jogador recebe um código e digita aqui, ou abre o link do
 * e-mail neste aparelho.
 */
export function CloudLoginSheet() {
  const closeSheet = useUiStore((store) => store.closeSheet)
  const sendLoginCode = useGameStore((store) => store.sendLoginCode)
  const verifyLoginCode = useGameStore((store) => store.verifyLoginCode)
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<CloudProblem | null>(null)
  const [wait, setWait] = useState(0)

  useEffect(() => {
    if (wait <= 0) return
    const timer = window.setTimeout(() => setWait(wait - 1), 1_000)
    return () => window.clearTimeout(timer)
  }, [wait])

  const send = async (to: string) => {
    setBusy(true)
    setProblem(null)
    const result = await sendLoginCode(to)
    setBusy(false)
    if (!result.ok) {
      setProblem(result.problem)
      return
    }
    setSentTo(to)
    setCode('')
    setWait(RESEND_SECONDS)
  }

  const verify = async (to: string) => {
    setBusy(true)
    setProblem(null)
    const result = await verifyLoginCode(to, code)
    setBusy(false)
    if (result.ok) closeSheet()
    else setProblem(result.problem)
  }

  const trimmed = email.trim()
  const alert = problem ? (
    <p role="alert" className="text-expense mt-2 text-[14px] font-semibold">
      {PROBLEMS[problem]}
    </p>
  ) : null

  return (
    <Sheet title="Entrar com e-mail" onClose={closeSheet}>
      {sentTo === null ? (
        <form
          className="mt-2"
          onSubmit={(event) => {
            event.preventDefault()
            void send(trimmed)
          }}
        >
          <p className="text-ink-soft text-[15px]">
            Guarde a família na nuvem e continue em outro aparelho. Não precisa de senha: mandamos
            um código para o seu e-mail.
          </p>
          <label htmlFor="cloud-email" className="mt-4 block text-[15px] font-bold">
            E-mail
          </label>
          <input
            id="cloud-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="bg-canvas ring-line focus:ring-leaf mt-2 w-full rounded-2xl px-4 py-3 text-lg font-bold ring-1 outline-none focus:ring-2"
          />
          {alert}
          <button
            type="submit"
            className={`${button.primary} mt-4 w-full`}
            disabled={busy || !trimmed.includes('@')}
          >
            {busy ? 'Enviando…' : 'Enviar código'}
          </button>
        </form>
      ) : (
        <form
          className="mt-2"
          onSubmit={(event) => {
            event.preventDefault()
            void verify(sentTo)
          }}
        >
          <p className="text-ink-soft text-[15px]">
            Mandamos um código para <strong className="text-ink break-all">{sentTo}</strong>. Digite
            o código aqui ou abra o link do e-mail neste aparelho.
          </p>
          <label htmlFor="cloud-code" className="mt-4 block text-[15px] font-bold">
            Código
          </label>
          <input
            id="cloud-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CODE_MAX_LENGTH}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            className="bg-canvas ring-line focus:ring-leaf tabular mt-2 w-full rounded-2xl px-4 py-3 text-center text-2xl font-black tracking-[0.3em] ring-1 outline-none focus:ring-2"
          />
          {alert}
          <button
            type="submit"
            className={`${button.primary} mt-4 w-full`}
            disabled={busy || code.length < CODE_MIN_LENGTH}
          >
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              className={`${button.quiet} -ml-3`}
              onClick={() => {
                setSentTo(null)
                setProblem(null)
              }}
            >
              Trocar o e-mail
            </button>
            <button
              type="button"
              className={`${button.quiet} tabular -mr-3`}
              disabled={busy || wait > 0}
              onClick={() => void send(sentTo)}
            >
              {wait > 0 ? `Pedir outro em ${wait} s` : 'Pedir outro código'}
            </button>
          </div>
        </form>
      )}
    </Sheet>
  )
}
