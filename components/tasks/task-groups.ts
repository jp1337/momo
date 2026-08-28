/**
 * Gruppierung nach Priorität — rein, ohne JSX, damit sie in Vitest
 * (Node-Umgebung) prüfbar ist.
 */
export type PriorityKey = "HIGH" | "NORMAL" | "SOMEDAY";

export interface PriorityGroup<T> {
  key: PriorityKey;
  items: T[];
}

/** Feste Reihenfolge — das Wichtigste zuerst, ohne Farbe. */
const ORDER: readonly PriorityKey[] = ["HIGH", "NORMAL", "SOMEDAY"];

/**
 * Teilt Aufgaben in Prioritätsgruppen, in fester Reihenfolge, ohne leere
 * Gruppen, unter Erhalt der Eingabereihenfolge innerhalb einer Gruppe.
 *
 * @param items - Aufgaben mit einem Prioritätsfeld
 * @returns Gruppen in der Reihenfolge HIGH, NORMAL, SOMEDAY
 */
export function groupByPriority<T extends { priority: PriorityKey }>(
  items: T[],
): PriorityGroup<T>[] {
  return ORDER.map((key) => ({ key, items: items.filter((i) => i.priority === key) })).filter(
    (g) => g.items.length > 0,
  );
}
