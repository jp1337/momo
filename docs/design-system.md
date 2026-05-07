# Momo Design System

Das Momo Design System folgt einer "Cozy Productivity" und "Calm Design" Philosophie. Es wurde entwickelt, um eine ablenkungsfreie, beruhigende Atmosphäre zu schaffen, die besonders Menschen mit ADHS oder Prokrastinationstendenzen unterstützt.

## Design-Prinzipien

1. **Monochromatische Hierarchie:** Anstatt viele verschiedene Farben für die Navigation zu nutzen, verwenden wir Schattierungen einer einzigen Akzentfarbe (Amber), um die Aufmerksamkeit auf das Wichtigste zu lenken.
2. **Beruhigende Farbpalette:** Die "Wald nach dem Regen" Palette nutzt entsättigte, erdige Töne für den Dark Mode und warme Cremetöne für den Light Mode.
3. **Weiche Ästhetik:** Großzügige Radien und subtile Schatten erzeugen eine haptische, freundliche Oberfläche.
4. **Fokus auf das Wesentliche:** Nur ein Element pro Seite (z.B. die Daily Quest) erhält die volle Farbsättigung.

## Typografie

- **Lora (Serif):** Für Überschriften und Markennamen. Vermittelt Ruhe und Hochwertigkeit.
- **DM Sans (Sans-Serif):** Für das User Interface (Buttons, Labels, Menüs).
- **JetBrains Mono (Monospace):** Für Aufgaben-Texte und Daten. Erzeugt das Gefühl einer strukturierten Liste.

## Komponenten

Die Komponenten befinden sich in `components/ui/` und basieren auf Radix UI Primitives und Tailwind CSS v4.

- `Button`: Unterstützt verschiedene Varianten (primary, secondary, ghost, etc.) und Größen.
- `Card`: Der primäre Container für Inhalte, mit optionalen Hover-Effekten.
- `Badge`: Kleine Indikatoren für Status oder Priorität.
- `Input` & `Label`: Standard-Formularelemente im Momo-Stil.
- `Checkbox`: Speziell für die Erledigung von Aufgaben optimiert.

## Verwendung

Alle Komponenten unterstützen das `asChild` Pattern (via Radix Slot), um semantisches HTML zu ermöglichen:

```tsx
import { Card } from "@/components/ui/card";

<Card asChild>
  <article>
    {/* Inhalt */}
  </article>
</Card>
```

## Lokale Vorschau

Das gesamte Design System kann auf der Route `/design-system` visuell geprüft werden.
