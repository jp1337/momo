import { describe, it, expect } from "vitest";
import { groupByPriority } from "@/components/tasks/task-groups";

/**
 * Priorität wird zur Gruppenüberschrift statt zum Abzeichen an jeder
 * Zeile. Eine Überschrift "HOCH · 2" kodiert etwas Wahres über den
 * Inhalt; ein amberfarbenes Abzeichen an jeder Zeile behauptet nur
 * Wichtigkeit.
 */
describe("groupByPriority", () => {
  it("sortiert HIGH vor NORMAL vor SOMEDAY", () => {
    const groups = groupByPriority([
      { priority: "SOMEDAY" as const, id: "c" },
      { priority: "HIGH" as const, id: "a" },
      { priority: "NORMAL" as const, id: "b" },
    ]);
    expect(groups.map((g) => g.key)).toEqual(["HIGH", "NORMAL", "SOMEDAY"]);
  });

  it("lässt leere Gruppen weg — eine Überschrift ohne Zeilen ist Lärm", () => {
    const groups = groupByPriority([{ priority: "NORMAL" as const, id: "b" }]);
    expect(groups.map((g) => g.key)).toEqual(["NORMAL"]);
  });

  it("erhält die Eingabereihenfolge innerhalb einer Gruppe", () => {
    const groups = groupByPriority([
      { priority: "HIGH" as const, id: "a" },
      { priority: "HIGH" as const, id: "b" },
    ]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("gibt für eine leere Liste keine Gruppen zurück", () => {
    expect(groupByPriority([])).toEqual([]);
  });
});
