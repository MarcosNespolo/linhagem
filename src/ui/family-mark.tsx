/** Marca do jogo: um casal e dois filhos ligados por um galho. Mesmo desenho do ícone do app. */
export function FamilyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <rect width="512" height="512" rx="112" fill="#2f6b4e" />
      <path
        d="M256 214V262C256 300 176 292 176 330M256 262C256 300 336 292 336 330"
        fill="none"
        stroke="#e9dcc4"
        strokeWidth="20"
        strokeLinecap="round"
      />
      <path
        d="M0 0Q26 -22 56 0Q26 22 0 0Z"
        fill="#8db27f"
        transform="translate(268 282) rotate(-32)"
      />
      <circle cx="208" cy="162" r="58" fill="#f2b84b" />
      <circle cx="304" cy="162" r="58" fill="#fff6e6" stroke="#2f6b4e" strokeWidth="12" />
      <circle cx="176" cy="372" r="46" fill="#fff6e6" />
      <circle cx="336" cy="372" r="46" fill="#f2b84b" />
    </svg>
  )
}
