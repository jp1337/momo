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
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="success">Success</Button>
          <Button variant="danger">Danger</Button>
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
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="amber">Amber</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </section>

      {/* Surfaces */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b border-[var(--border)] pb-2">
          Flächen
        </h2>
        <div className="flex flex-wrap gap-4">
          <Surface data-testid="surface-flat" className="p-6">flat — unbeleuchtet</Surface>
          <Surface data-testid="surface-raised" level="raised" className="p-6">raised</Surface>
          <Surface data-testid="surface-input" level="input" className="p-6">input, hover</Surface>
          <Surface data-testid="surface-overlay" level="overlay" radius="lg" className="p-6">
            overlay — die einzige Stufe mit Schatten
          </Surface>
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
