const base = { fill: 'none', stroke: '#ABA29A', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const Lamp = () => (
  <g>
    <path d="M58 56 L104 56 L94 22 L68 22 Z" fill="#3D3631" />
    <path d="M58 58 L18 236 L146 236 L104 58 Z" fill="#C9B5FF" fillOpacity=".08" stroke="none" />
    <path d="M81 58 C 80 120, 83 180, 81 262" />
    <path d="M62 264 C 72 260, 92 260, 100 264" />
  </g>
)

const Couch = () => (
  <g>
    <path d="M118 166 C 116 128, 132 118, 160 119 C 220 116, 280 117, 330 119 C 356 120, 366 132, 364 166" />
    <path d="M108 170 C 104 158, 128 154, 132 168 L 132 212 L 350 212 L 350 168 C 352 154, 376 156, 374 170 C 376 196, 374 216, 370 230 L 112 230 C 108 214, 106 192, 108 170 Z" fill="#2A2522" />
    <path d="M132 196 C 190 192, 290 192, 350 196" />
    <path d="M126 230 L 122 252" />
    <path d="M356 230 L 360 252" />
    <circle cx="204" cy="140" r="17" fill="#3D3631" />
    <path d="M178 196 C 178 172, 188 162, 204 162 C 222 162, 232 174, 232 196" />
    <circle cx="270" cy="136" r="16" fill="#3D3631" />
    <path d="M244 196 C 244 170, 254 158, 270 158 C 288 158, 298 172, 298 196" />
  </g>
)

const Glass = () => (
  <g>
    <path d="M384 196 L 412 196" />
    <path d="M398 196 L 398 252" />
    <path d="M388 252 L 408 252" />
    <path d="M390 172 L 404 172 L 400 194 L 394 194 Z" fill="#FF2E88" fillOpacity=".55" />
  </g>
)

const Smoke = () => (
  <path d="M410 192 C 404 180, 418 174, 410 162 C 402 150, 416 144, 410 132" stroke="#B6FF3B" strokeOpacity=".7" strokeWidth={2} />
)

/** Friends on a couch with lamp, glass and smoke curl. Decorative unless `title` is given. */
export function CouchArt({ title }: { title?: string }) {
  return (
    <svg
      viewBox="0 0 420 300"
      width={440}
      height={300}
      style={{ maxWidth: '100%', height: 'auto' }}
      {...base}
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}
    >
      <Lamp />
      <Couch />
      <Glass />
      <Smoke />
    </svg>
  )
}
