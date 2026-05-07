"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
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

      {/* Cards */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b border-[var(--border)] pb-2">Cards</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Standard Card</CardTitle>
              <CardDescription>A simple card for grouping content.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>This is the main content area of the card.</p>
            </CardContent>
            <CardFooter>
              <Badge variant="danger" className="gap-1">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                1 Issue
              </Badge>
            </CardFooter>
          </Card>

          <Card hover>
            <CardHeader>
              <CardTitle>Hoverable Card</CardTitle>
              <CardDescription>This card lifts slightly on hover.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Try hovering over me to see the effect!</p>
            </CardContent>
          </Card>
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
