"use client";

/**
 * /design-system — the live reference for Momo's token system ("Lichtkegel").
 *
 * This page is not a museum of every primitive that exists in the codebase;
 * it shows exactly what the spec
 * (docs/superpowers/specs/2026-08-21-lichtkegel-design.md) and
 * docs/design-system.md describe, in the same order: the two surface
 * values, the four radii, the three Button variants, the Badge variants,
 * the three font roles (with Fraunces' variable axes visibly live, not
 * just named), the amber rule stated in words, and the three effort steps
 * used by the dashboard's Quick Wins list.
 *
 * Every `data-testid` here is testing surface, not decoration —
 * `e2e/design-tokens.spec.ts` reads computed styles off these exact nodes
 * (surface-raised, surface-overlay, btn-primary, btn-quiet, btn-danger) and
 * asserts btn-success / btn-outline do NOT exist. Do not rename or remove
 * them without updating that spec.
 */

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PageFrame } from "@/components/ui/page-frame";
import { List, Row, GroupHeading, effortStep } from "@/components/ui/list";
import { EmptyState } from "@/components/ui/empty-state";
import { useState } from "react";

const RADII = [
  { token: "--radius-sm", cls: "rounded-[var(--radius-sm)]", px: "7px", use: "Chip, Badge, Eingabe" },
  { token: "--radius-md", cls: "rounded-[var(--radius-md)]", px: "11px", use: "Fläche, Panel" },
  { token: "--radius-lg", cls: "rounded-[var(--radius-lg)]", px: "14px", use: "Dialog, Bühne" },
  { token: "--radius-pill", cls: "rounded-[var(--radius-pill)]", px: "999px", use: "Pille, Avatar" },
] as const;

const EFFORT_EXAMPLES = [
  { title: "Reply to that one email", minutes: 5 },
  { title: "Draft the quarterly budget review", minutes: 30 },
  { title: "Repaint the garden fence", minutes: 60 },
] as const;

export default function DesignSystemPage() {
  const [checked, setChecked] = useState(false);

  return (
    <div className="container mx-auto max-w-4xl space-y-12 px-4 py-12">
      <section className="space-y-4">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-[var(--ink)]">
          Design System
        </h1>
        <p className="max-w-[60ch] text-lg text-[var(--ink-2)]">
          Hierarchy comes from light, not from borders. One light source per
          page; everything else sits quietly on the ground. This page is the
          living reference for that system — see{" "}
          <code className="font-[family-name:var(--font-mono)] text-sm">
            docs/design-system.md
          </code>{" "}
          for the full write-up.
        </p>
      </section>

      {/* Surfaces — two values, not four. Ordinary content sits directly on
          --ground and needs no Surface at all; --raised exists only for
          genuine affordances, which is why a real <input> is shown here
          alongside it, not just a styled <div>. */}
      <section className="space-y-6">
        <h2 className="border-b border-[var(--hairline)] pb-2 text-2xl font-semibold text-[var(--ink)]">
          Flächen
        </h2>
        <p className="max-w-[60ch] text-sm text-[var(--ink-2)]">
          Eine Kante nur, wo sie etwas aussagt. Um eine Inhaltsgruppe gehört
          keine — Abstand und Typografie gruppieren schon. Um ein
          Eingabefeld oder einen Button gehört eine: sie sagt „hier kannst
          du tippen oder drücken“.
        </p>
        <div className="flex flex-wrap items-start gap-4">
          <div className="max-w-[16rem] space-y-2">
            <Surface data-testid="surface-raised" level="raised" className="p-6">
              raised
            </Surface>
            <p className="text-sm text-[var(--ink-2)]">
              Fläche + Haarlinie. Nur für Affordanzen: „hier kannst du tippen
              oder drücken“.
            </p>
          </div>
          <div className="max-w-[16rem] space-y-2">
            <Surface data-testid="surface-overlay" level="overlay" radius="lg" className="p-6">
              overlay
            </Surface>
            <p className="text-sm text-[var(--ink-2)]">
              Fläche + Schatten, keine Haarlinie. Für Dialog und Popover —
              der Scrim grenzt schon ab.
            </p>
          </div>
          <div className="max-w-[16rem] space-y-2">
            <input
              data-testid="surface-affordance-input"
              placeholder="hier tippen …"
              className="h-12 w-full rounded-[var(--radius-md)] border border-[var(--hairline)] bg-[var(--raised)] px-4 text-[var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--amber)]"
            />
            <p className="text-sm text-[var(--ink-2)]">
              Ein Eingabefeld ist der Grund, warum es --raised überhaupt
              gibt: die Kante sagt „hier kannst du tippen“.
            </p>
          </div>
        </div>
      </section>

      {/* Radius — four tokens, nothing off-scale. Any off-scale rounding
          utility is banned by npm run check:design; only these four var()
          references are legal. */}
      <section className="space-y-6">
        <h2 className="border-b border-[var(--hairline)] pb-2 text-2xl font-semibold text-[var(--ink)]">
          Radius
        </h2>
        <div className="flex flex-wrap gap-6">
          {RADII.map((r) => (
            <div key={r.token} className="flex w-28 flex-col items-center gap-2 text-center">
              <div className={`h-20 w-20 border border-[var(--hairline)] bg-[var(--raised)] ${r.cls}`} />
              <code className="font-[family-name:var(--font-mono)] text-xs text-[var(--ink)]">
                {r.token}
              </code>
              <span className="text-xs text-[var(--ink-3)]">
                {r.px} · {r.use}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Buttons — exactly three variants. primary carries amber as TEXT,
          never as a fill; quiet is the only variant that gets --raised
          plus a hairline, because it IS an affordance; danger mirrors
          primary's transparency so it never competes with primary for
          "the one loud thing" on a page. Labels are real production copy
          (German UI strings), not placeholder English, so this page shows
          what actually ships. */}
      <section className="space-y-6">
        <h2 className="border-b border-[var(--hairline)] pb-2 text-2xl font-semibold text-[var(--ink)]">
          Buttons
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button data-testid="btn-primary" variant="primary">jetzt anfangen</Button>
          <Button data-testid="btn-quiet" variant="quiet">aufteilen</Button>
          <Button data-testid="btn-danger" variant="danger">löschen</Button>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-6">
        <h2 className="border-b border-[var(--hairline)] pb-2 text-2xl font-semibold text-[var(--ink)]">
          Badges
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <Badge>Neutral</Badge>
          <Badge variant="amber">Amber</Badge>
          <Badge variant="done">Done</Badge>
          <Badge variant="danger">Danger</Badge>
        </div>
      </section>

      {/* Typography — three roles, not two fonts replaced 1:1. Fraunces is
          variable; SOFT and WONK are what give it character, so the second
          sample below sets them explicitly to make the axes visible rather
          than just naming them in a caption. */}
      <section className="space-y-6">
        <h2 className="border-b border-[var(--hairline)] pb-2 text-2xl font-semibold text-[var(--ink)]">
          Schrift
        </h2>
        <div className="space-y-6">
          <div className="space-y-1">
            <p className="font-display-axis-rest m-0 font-[family-name:var(--font-display)] text-4xl font-normal text-[var(--ink)]">
              Fraunces at rest
            </p>
            <p className="font-display-axis-soft m-0 font-[family-name:var(--font-display)] text-4xl font-normal text-[var(--ink)]">
              Fraunces, SOFT 100 · WONK 1
            </p>
            <p className="text-sm text-[var(--ink-2)]">
              <code className="font-[family-name:var(--font-mono)]">--font-display</code> —
              Fraunces, variable (axes SOFT/WONK/opsz). Used exactly{" "}
              <strong>once per page</strong>, large: the Daily Quest headline,
              or the page title elsewhere. Never for section headings.
            </p>
          </div>
          <div className="space-y-1">
            <p className="m-0 font-[family-name:var(--font-ui)] text-2xl text-[var(--ink)]">
              Instrument Sans — Aa Bb Cc 0123
            </p>
            <p className="text-sm text-[var(--ink-2)]">
              <code className="font-[family-name:var(--font-mono)]">--font-ui</code> — actions,
              labels, running text. Everything that is not a task title or a
              one-per-page headline.
            </p>
          </div>
          <div className="space-y-1">
            <p className="m-0 font-[family-name:var(--font-mono)] text-2xl text-[var(--ink)]">
              JetBrains Mono — Aa Bb Cc 0123
            </p>
            <p className="text-sm text-[var(--ink-2)]">
              <code className="font-[family-name:var(--font-mono)]">--font-mono</code> — task
              text and figures.{" "}
              <code className="font-[family-name:var(--font-mono)]">--font-body</code> is an
              alias onto this token, kept for the files not yet migrated off
              the old name.
            </p>
          </div>
        </div>
      </section>

      {/* Amber rule — stated in words, not just enforced by convention.
          There is deliberately no visual "forbidden" example here (an
          amber-filled button) — building one would itself be a rule
          violation on the very page documenting the rule. */}
      <section className="space-y-3">
        <h2 className="border-b border-[var(--hairline)] pb-2 text-2xl font-semibold text-[var(--ink)]">
          Die Amber-Regel
        </h2>
        <p className="max-w-[60ch] text-sm text-[var(--ink-2)]">
          <strong className="text-[var(--ink)]">Genau ein Amber-Element pro Seite</strong> —
          gezählt über <code className="font-[family-name:var(--font-mono)]">main</code> plus
          einen eventuell offenen Dialog. Amber ist Licht: eine Textfarbe
          oder ein weicher Wash, nie eine Button-Fläche, nie ein Rahmen.
          Braucht eine Seite zwei gleich wichtige Handlungen, trägt keine
          von beiden Amber. <code className="font-[family-name:var(--font-mono)]">--done</code>{" "}
          bedeutet ausschließlich „erledigt“, <code className="font-[family-name:var(--font-mono)]">--danger</code>{" "}
          ausschließlich Zerstörung — keins der beiden ist ein zweiter Akzent.
        </p>
      </section>

      {/* ── Maß und Rand ──────────────────────────────────────────────────
          Die Handles frame-with-rail / frame-no-rail liest
          e2e/design-tokens.spec.ts; nicht umbenennen. */}
      <section className="space-y-6">
        <h2 className="border-b border-[var(--hairline)] pb-2 text-2xl font-semibold text-[var(--ink)]">
          Maß und Rand
        </h2>
        <p className="max-w-[60ch] text-[var(--ink-2)]">
          640 px Lesespalte, 48 px Rinne, 208 px Randnotiz — als Block
          zentriert, nicht links geklebt. Unter 1100 px fällt der Rand unter
          den Inhalt.
        </p>
        {/* -mx-4 gibt der Seitenpolsterung des äußeren Containers (px-4)
            genau die 32px zurück, die 640 + 48 + 208 = 896px sonst fehlen —
            eine Eigenheit dieser Demo-Seite (max-w-4xl + px-4), keine
            Eigenschaft von PageFrame selbst: eine echte Seite (Task 9)
            übergibt PageFrame die volle Breite, ohne einen solchen
            Container davor. */}
        <div data-testid="frame-with-rail" className="-mx-4">
          <PageFrame
            rail={
              <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] text-[var(--ink-3)]">
                Serie · 4 Tage
              </p>
            }
          >
            <p className="m-0 text-[var(--ink-2)]">
              Die Lesespalte. Hier steht, was der Nutzer tut.
            </p>
          </PageFrame>
        </div>
        <div data-testid="frame-no-rail">
          <PageFrame>
            <p className="m-0 text-[var(--ink-2)]">
              Ohne Rand: eine Bühne, eine Sache.
            </p>
          </PageFrame>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="border-b border-[var(--hairline)] pb-2 text-2xl font-semibold text-[var(--ink)]">
          Liste und Zeile
        </h2>
        <p className="max-w-[60ch] text-[var(--ink-2)]">
          Haarlinie trennt, kein Kasten umrahmt. Die Dauer steckt in der
          Schriftgröße des Titels; die Minutenzahl steht rechts, damit die
          Größe nicht die einzige Kodierung ist.
        </p>
        <GroupHeading>Hoch · 3</GroupHeading>
        <List>
          {EFFORT_EXAMPLES.map((ex, i) => (
            <Row
              key={ex.title}
              testId="demo-row"
              effort={effortStep(ex.minutes)}
              title={ex.title}
              eyebrow={i === 0 ? "Steuer" : undefined}
              dotColor={i === 0 ? "var(--done)" : null}
              trailing={`${ex.minutes} min`}
            />
          ))}
        </List>
        <EmptyState
          testId="demo-empty"
          line="Noch keine Aufgabe. Eine reicht."
          action={
            <Button variant="quiet" size="md">
              Aufgabe anlegen
            </Button>
          }
        />
      </section>

      {/* Forms — real Momo primitives (Input, Label, Checkbox), not part of
          the Lichtkegel spec's own scope but kept as a reference for the
          form controls that already exist in components/ui/. */}
      <section className="space-y-6">
        <h2 className="border-b border-[var(--hairline)] pb-2 text-2xl font-semibold text-[var(--ink)]">
          Forms
        </h2>
        <div className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="example">Example Label</Label>
            <Input id="example" placeholder="Type something..." />
          </div>
          <div className="flex items-center gap-3">
            <Checkbox checked={checked} onCheckedChange={setChecked} />
            <Label className="mb-0 cursor-pointer" onClick={() => setChecked(!checked)}>
              Accept Terms
            </Label>
          </div>
        </div>
      </section>
    </div>
  );
}
