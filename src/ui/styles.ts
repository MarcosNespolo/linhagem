/** Classes de botões e elementos repetidos na interface. */

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-bold transition active:scale-[0.97] disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf'

export const button = {
  primary: `${base} bg-leaf px-5 py-3 text-[15px] text-white disabled:bg-line disabled:text-ink-soft`,
  love: `${base} bg-rose px-5 py-3 text-[15px] text-white disabled:bg-line disabled:text-ink-soft`,
  secondary: `${base} bg-leaf-soft px-4 py-2.5 text-[14px] text-leaf-strong disabled:opacity-50`,
  danger: `${base} bg-expense px-5 py-3 text-[15px] text-white`,
  quiet: `${base} px-3 py-2 text-[14px] text-ink-soft hover:text-ink`,
  small: `${base} bg-leaf px-3.5 py-2 text-[13px] text-white disabled:bg-line disabled:text-ink-soft`,
  smallLove: `${base} bg-rose px-3.5 py-2 text-[13px] text-white disabled:bg-line disabled:text-ink-soft`,
}

export const card = 'rounded-2xl bg-surface ring-1 ring-line'
