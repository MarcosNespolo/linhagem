/** Marca provisória do jogo: um casal e dois filhos. Mesmo desenho do ícone do app. */
export function FamilyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <rect width="512" height="512" rx="112" fill="#4f46e5" />
      <path
        d="M256 196V272M256 272C256 302 176 292 176 322M256 272C256 302 336 292 336 322"
        fill="none"
        stroke="#c7d2fe"
        strokeWidth="20"
        strokeLinecap="round"
      />
      <circle cx="212" cy="158" r="56" fill="#fbbf24" />
      <circle cx="300" cy="158" r="56" fill="#ffffff" stroke="#4f46e5" strokeWidth="12" />
      <circle cx="176" cy="366" r="44" fill="#ffffff" />
      <circle cx="336" cy="366" r="44" fill="#fbbf24" />
    </svg>
  )
}
