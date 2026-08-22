import * as React from "react";

/**
 * EmptyState — eine leere Sammlung.
 *
 * Die Spec trennt zwei Fälle scharf (§6):
 *
 * - **Fehlende Kennzahl** (Serie 0, Budget nicht gesetzt): NICHTS anzeigen.
 *   Leerraum ist kein Defekt, der gefüllt werden muss. Dafür gibt es
 *   bewusst keine Komponente — der Aufrufer rendert `null`.
 * - **Leere Sammlung** (keine Aufgaben, keine Themen): genau das hier —
 *   eine Mono-Zeile plus eine stille Handlung.
 *
 * Kein Kasten, kein gestrichelter Rahmen, kein Emoji, keine Illustration.
 * Der Text sagt, was zu tun ist, in der Stimme der Oberfläche — nicht was
 * schiefging und nicht, wie schade es ist.
 *
 * @param props.line - Eine Zeile. Was zu tun ist, nicht was fehlt.
 * @param props.action - Eine stille Handlung — Button variant="quiet" oder ein Link.
 * @param props.testId - Standard `"empty-state"`.
 * @returns Ein `<div>` ohne Fläche und ohne Rahmen
 */
export function EmptyState({
  line,
  action,
  testId = "empty-state",
}: {
  line: string;
  action?: React.ReactNode;
  testId?: string;
}) {
  return (
    <div data-testid={testId} className="flex flex-col gap-4 py-8">
      <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] text-[var(--ink-2)]">
        {line}
      </p>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
