"use client";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

export default function DesignSystemPage() {
  const [checked, setChecked] = useState(false);

  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl space-y-16">
      <section className="space-y-4">
        <h1 className="text-4xl font-bold">Design System</h1>
        <p className="text-[var(--text-muted)] text-lg">
          A showcase of the reusable components and styles used in Momo.
        </p>
      </section>

      {/* Buttons */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b border-[var(--border)] pb-2">Buttons</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button data-testid="btn-primary" variant="primary">jetzt anfangen</Button>
          <Button data-testid="btn-quiet" variant="quiet">aufteilen</Button>
          <Button data-testid="btn-danger" variant="danger">löschen</Button>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b border-[var(--border)] pb-2">Badges</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Badge>Neutral</Badge>
          <Badge variant="amber">Amber</Badge>
          <Badge variant="done">Done</Badge>
          <Badge variant="danger">Danger</Badge>
        </div>
      </section>

      {/* Surfaces — revidiert 2026-08-21: zwei Stufen statt vier. Gewöhnlicher
          Inhalt liegt auf --ground und braucht keine Surface; die Leiter war
          selbst das Problem, das dieser Entwurf abschaffen wollte. */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b border-[var(--border)] pb-2">
          Flächen
        </h2>
        <div className="flex flex-wrap gap-4 items-start">
          <div className="space-y-2 max-w-[16rem]">
            <Surface data-testid="surface-raised" level="raised" className="p-6">
              raised
            </Surface>
            <p className="text-sm text-[var(--text-muted)]">
              Fläche + Haarlinie. Nur für Affordanzen: „hier kannst du tippen
              oder drücken".
            </p>
          </div>
          <div className="space-y-2 max-w-[16rem]">
            <Surface data-testid="surface-overlay" level="overlay" radius="lg" className="p-6">
              overlay
            </Surface>
            <p className="text-sm text-[var(--text-muted)]">
              Fläche + Schatten, keine Haarlinie. Für Dialog und Popover —
              der Scrim grenzt schon ab.
            </p>
          </div>
          <div className="space-y-2 max-w-[16rem]">
            <input
              data-testid="surface-affordance-input"
              placeholder="hier tippen …"
              className="w-full h-12 px-4 rounded-[var(--radius-md)] bg-[var(--raised)] border border-[var(--hairline)] text-[var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--amber)]"
            />
            <p className="text-sm text-[var(--text-muted)]">
              Ein Eingabefeld ist der Grund, warum es --raised überhaupt
              gibt: die Kante sagt „hier kannst du tippen".
            </p>
          </div>
        </div>
      </section>

      {/* Forms */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b border-[var(--border)] pb-2">Forms</h2>
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

      {/* Typography */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b border-[var(--border)] pb-2">Typography</h2>
        <div className="space-y-4">
          <h1 className="text-4xl">Heading 1 (Lora)</h1>
          <h2 className="text-3xl">Heading 2 (Lora)</h2>
          <p className="task-text text-lg">
            Body text in JetBrains Mono. Good for tasks and data.
          </p>
          <p className="text-base">
            UI text in DM Sans. Used for buttons, labels, and general interface.
          </p>
        </div>
      </section>
    </div>
  );
}
