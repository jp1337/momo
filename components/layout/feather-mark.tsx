/**
 * FeatherMark — die Feder in der Navigation.
 *
 * Chrome ist ausschließlich Ink (Spec §5): die Feder bleibt eine Feder,
 * aber ohne Amber. Vorher lag sie als `/icon.svg` mit hartkodiertem
 * Amber-Hex (f0a500) im Bild — ein `<img>` kann keine Textfarbe erben,
 * deshalb ist sie hier inline und zeichnet mit `currentColor`.
 *
 * Kosten, offen benannt: die Navigation verliert ihre einzige dauerhafte
 * Farbfreude. Der Gegenwert ist eine Amber-Regel, die gilt statt auf dem
 * Papier zu stehen.
 *
 * Das installierte App-Icon (app/icon.svg, apple-icon.svg,
 * public/icon-192.png, icon-512.png, manifest.json) bleibt amberfarben —
 * es erscheint im Betriebssystem und im Browser-Tab, nie neben
 * Seiteninhalt, und fällt damit nicht unter die Regel.
 */
export function FeatherMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={28}
      height={28}
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6 44 C6 38 9 28 15 20 C21 12 30 7 38 6 C43 5 45 8 44 13 C42 22 34 32 24 38 C16 42 10 43 6 44 Z"
        fill="currentColor"
      />
      <path
        d="M6 44 Q24 26 42 8"
        stroke="var(--ground)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M11 38 L6 32" stroke="var(--ground)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
