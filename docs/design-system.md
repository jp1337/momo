# Momo Design System — Lichtkegel

Hierarchie entsteht aus Beleuchtung, nicht aus Umrandung: eine Lichtquelle
pro Seite, alles andere liegt ruhig auf dem Grund. Das ersetzt das frühere
System aus acht gleich gerahmten, gleich beschatteten Kästen, das einem
Nutzer mit Vermeidungstendenzen signalisierte, alles sei gleich wichtig —
und damit gleich überwältigend.

Vollständige Herleitung, Messwerte und die Revisionsgeschichte:
[`docs/superpowers/specs/2026-08-21-lichtkegel-design.md`](superpowers/specs/2026-08-21-lichtkegel-design.md).
Live-Referenz: Route `/design-system`.

## Flächen — zwei Werte, keine Leiter

Es gibt `--ground` (die Seite, und den Körper von Dialogen) und `--raised`
(ausschließlich echte Affordanzen: Eingabe, Button, Hover). Eine
vierstufige Leiter (`--s1`/`--s2`/`--s3`) gab es im ersten Entwurf — sie
maß gemessen ΔL* ≈ 3 zwischen Nachbarstufen, weit unter der
Wahrnehmungsgrenze, und wurde gestrichen.

| Token | Dark | Light | Rolle |
|---|---|---|---|
| `--ground` | `#0e100f` | `#eceee5` | Seite, Dialog-Körper |
| `--raised` | `#202623` | `#cfd5c5` | nur Affordanzen |
| `--hairline` | `#6a7a6d` | `#6d7860` | die eine Linie, nur wo sie Information ist |

Die Richtung des Schritts unterscheidet sich pro Theme, bewusst: im
Dunkeln ist eine Eingabe heller als der Grund, im Hellen ein Trog, in den
man tippt — also dunkler. Die Invariante ist ein klarer Schritt weg vom
Grund, nicht „immer heller".

### Eine Kante nur, wo sie etwas aussagt

| Kante um … | Aussage | Folge |
|---|---|---|
| eine Inhaltsgruppe | keine — Abstand und Typografie gruppieren schon | keine Kante, keine Fläche |
| ein Eingabefeld, einen Button | „hier kannst du tippen / drücken" | Fläche **und** Haarlinie |
| einen Dialog | leistet Scrim + `--shadow-overlay` | Fläche, keine Haarlinie |

Gewöhnlicher Inhalt braucht damit **keine** Surface. Wer eine Fläche
setzt, muss sagen können, welche Frage sie dem Nutzer beantwortet.

### Wie Flächenabstand gemessen wird

Nicht mit WCAG-Kontrastverhältnis — das ist für Textlesbarkeit gebaut und
komprimiert bei hoher Helligkeit, sodass es im Light Mode Abstände als
katastrophal ausweist, die das Auge klar unterscheidet. Für Flächen gilt
der perzeptuelle Helligkeitsabstand **ΔL\*** (CIE L\*), Ziel **≥ 8**;
gemessen 9.98 (dark) und 9.30 (light). Kontrastverhältnis bleibt die
Metrik für **Text**, bei 4.5:1 (AA, Fließtext/Meta).

## Radius

Vier Werte, sonst nichts. `npm run check:design` verwirft jede
Rundungs-Utility außerhalb dieser Liste in `.tsx`.

| Token | Wert | Einsatz |
|---|---|---|
| `--radius-sm` | 7px | Chip, Badge, Eingabe |
| `--radius-md` | 11px | Fläche, Panel |
| `--radius-lg` | 14px | Dialog, Bühne |
| `--radius-pill` | 999px | Pille, Avatar |

## Schatten

Keiner, außer `--shadow-overlay` für Dialog und Popover — Flächen, die
tatsächlich über scrollendem Inhalt schweben. `--shadow-sm` und
`--shadow-md` sind `0 0 #0000`: ein gültiger, aber maler-loser Schatten.
Absichtlich nicht `none` — `none` ist nur als Alleinwert von `box-shadow`
gültig; als Listenglied (`0 0 16px …, var(--shadow-md)`) macht es die
**gesamte** Deklaration ungültig, und der Browser verwirft sie komplett.
Das war der Bug, der der Daily Quest ihren Amber-Glow genommen hat. Wer
das zu `none` "aufräumt", bringt ihn zurück.

## Die Amber-Regel

**Genau ein Amber-Element pro Seite** — gezählt über `main` plus einen
eventuell offenen Dialog. Amber ist Licht: Textfarbe oder weicher Wash,
nie eine Button-Fläche, nie ein Rahmen. Braucht eine Seite zwei gleich
wichtige Handlungen, trägt keine von beiden Amber.

`--done` bedeutet ausschließlich „erledigt", `--danger` ausschließlich
Zerstörung. Keins der beiden ist ein zweiter Akzent.

## Schrift

| Rolle | Familie | Einsatz |
|---|---|---|
| `--font-display` | Fraunces (variabel: SOFT/WONK/opsz) | **einmal** pro Seite groß — die Quest, die Seitenüberschrift |
| `--font-ui` | Instrument Sans | Handlungen, Labels, Fließtext |
| `--font-mono` | JetBrains Mono | Aufgabentext, Zahlen, Meta |

Lora und DM Sans sind ersetzt. `--font-body` bleibt als Alias auf
`--font-mono` bestehen, für die ~130 noch nicht migrierten Dateien.
Fraunces erscheint **genau einmal pro Seite in großer Größe**;
Abschnittsüberschriften sind Mono-Eyebrows, nicht Fraunces.

## Komponenten

### `Surface`

```ts
<Surface level="raised" | "overlay" radius="md" | "lg">
```

Zwei Stufen, keine für gewöhnlichen Inhalt:

- **`raised`** — Fläche + Haarlinie. Nur für echte Affordanzen.
- **`overlay`** — Fläche + `--shadow-overlay`, keine Haarlinie. Für Dialog
  und Popover; der Scrim grenzt schon ab.

`Card` existiert nicht mehr — sie *war* der Kasten, den dieser Entwurf
abschafft.

### `Button`

```ts
<Button variant="primary" | "quiet" | "danger" size="sm" | "md" | "lg" | "icon">
```

- **`primary`** — Amber als Text, transparenter Grund. Genau eine pro
  Seite.
- **`quiet`** — Standard. Trägt `--raised` + Haarlinie, weil sie selbst
  eine Affordanz ist.
- **`danger`** — wie `primary`, aber `--danger` statt `--amber`.

`secondary`, `ghost`, `outline`, `success` sind gestrichen.

### `Badge`

```ts
<Badge variant="neutral" | "done" | "danger" | "amber">
```

## Aufwandsstufen

Task-Zeilen zeigen den geschätzten Aufwand über die Schriftgröße — drei
Stufen, keine Animation:

| Geschätzte Dauer | Stufe | Größe |
|---|---|---|
| 5 min | small | 0.875rem |
| 15 / 30 min | medium | 1rem |
| 60 min | large | 1.25rem |
| kein Wert | medium | 1rem |

`estimatedMinutes` ist die Enum `5 \| 15 \| 30 \| 60 \| null`. Auf dem
Dashboard sind nur `small` und `medium` erreichbar, weil die Quick-Wins-
Abfrage `estimatedMinutes <= 15` filtert.

## Durchsetzung

`npm run check:design` ist eine Datei-für-Datei-Ratsche über hartkodierte
Farbe, Radius außerhalb der Skala und `style={{}}` in `.tsx`. Aktuell 1947
Verstöße über den Rest der App — die Zahl darf nur fallen, neue Verstöße
lassen CI fehlschlagen. Eine Regel legitim zu erweitern hebt die Baseline
an; der dafür vorgesehene Weg ist, `scripts/design-baseline.json` zu
löschen und neu zu erzeugen — nicht `--update` gegen die alte Baseline,
das eine echte Steigerung als Fehler ablehnt.

Kein Test kann bestätigen, dass ein Design *funktioniert* — nur dass ein
Schatten weg ist. Fünf Festlegungen dieses Systems waren falsch, alle
fünf gingen durch Reviews mit sauberem Ergebnis, und alle fünf fielen
innerhalb von Minuten auf, sobald die Seite im Browser geöffnet wurde.
Jede optische Änderung wird deshalb angesehen, nicht nur getestet.
