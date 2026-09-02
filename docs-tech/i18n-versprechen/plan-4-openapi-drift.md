# Schnitt 4: Der OpenAPI-Drift-Test — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Test, der fehlschlägt, wenn `lib/openapi.ts` und `app/api/**/route.ts` auseinanderlaufen.

**Architecture:** Ein table-driven vitest-Suite nach dem Muster von `__tests__/api-rate-limits.test.ts`: über jede `route.ts` laufen, an den Handler-Exporten zerteilen, **pro Handler** prüfen. Drei Prüfungen mit unterschiedlicher Schärfe — tote `$ref`s und Geister-Operationen stehen auf null und sind sofort scharf; die 30 undokumentierten Handler werden exakt gepinnt.

**Tech Stack:** TypeScript strict, vitest, Node `fs`/`path`

**Spec:** `docs-tech/i18n-versprechen/design.md`, Abschnitt „Der Drift-Test"

## Global Constraints

- Kein `any`. Strict mode ist an.
- **Die ehrliche Einheit ist der Handler, nicht die Datei.** 97 exportierte Handler über 67 Dateien; 67 dokumentierte Operationen über 42 Pfade. Eine Prüfung pro Datei übersieht einen undokumentierten Handler, dessen Datei-Nachbar dokumentiert ist — genau der Fehler, der bei der Rate-Limit-Arbeit zwei ungeschützte Handler verdeckte.
- Der Test importiert `lib/openapi.ts` **nicht** als Modul-Seiteneffekt-frei-Annahme, sondern echt — er ist die erste Testdatei, die das tut.
- Keine der 30 undokumentierten Operationen wird in diesem Schnitt nachdokumentiert. Der Test nagelt die Menge fest.
- Commit-Format: `<type>(<scope>): <beschreibung>`, Scope hier: `api`.
- `main` ist branch-protected. Ein PR. Testlauf ist `npm test` (vitest).

---

### Task 1: Die Messung — Handler und Operationen zählen

**Files:**
- Create: `__tests__/openapi-drift.test.ts`

**Interfaces:**
- Produces:
  - `type Operation = { method: string; path: string }`
  - `findAllHandlers(): Operation[]` — jeder exportierte GET/POST/PATCH/PUT/DELETE unter `app/api`, mit dem aus dem Dateipfad abgeleiteten OpenAPI-Pfad
  - `findDocumentedOperations(): Operation[]` — jede Operation in `openApiSpec.paths`

Der Dateipfad wird zum OpenAPI-Pfad: `app/api/tasks/[id]/route.ts` → `/api/tasks/{id}`. Das ist die einzige Übersetzung, und sie muß stimmen, sonst meldet der Test 97 Geister und 67 Undokumentierte.

- [ ] **Step 1: Failing test schreiben**

```ts
/**
 * OpenAPI-Spec gegen die tatsaechlichen Routen.
 *
 * lib/openapi.ts sind ~3700 handgepflegte Zeilen, die bis zu diesem Test von
 * keiner Testdatei importiert wurden. Waehrend der Haertungsarbeit behauptete
 * die Spec zweimal etwas Falsches: ein 429 auf einer Route ohne Limit, und
 * zwei tote $refs auf eine RateLimited-Komponente, die nie existiert hat.
 * Beides fand kein Test, sondern ein Mensch.
 *
 * Geprueft wird PRO HANDLER, nicht pro Datei: 97 Handler ueber 67 Dateien.
 * Eine Datei-Zaehlung uebersieht einen undokumentierten Handler, dessen
 * Datei-Nachbar dokumentiert ist.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, it, expect } from "vitest";
import { openApiSpec } from "@/lib/openapi";

const METHODS = ["get", "post", "patch", "put", "delete"] as const;
type Method = (typeof METHODS)[number];

type Operation = { method: Method; path: string };

const EXPORT_RE = /export\s+(?:async\s+)?function\s+(GET|POST|PATCH|PUT|DELETE)\b/g;

/** Every `route.ts` under app/api, recursively. */
function findRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...findRouteFiles(full));
    else if (entry === "route.ts") out.push(full);
  }
  return out;
}

/**
 * `app/api/tasks/[id]/route.ts` → `/api/tasks/{id}`
 *
 * Die einzige Uebersetzung in diesem Test. Stimmt sie nicht, meldet er 97
 * Geister und 67 Undokumentierte statt eines echten Befundes — deshalb prueft
 * Task 1 Step 4 sie gegen einen bekannten Pfad, bevor irgendetwas gepinnt wird.
 */
function routeFileToPath(file: string): string {
  const rel = relative(join(process.cwd(), "app"), file);
  const parts = rel.split(sep).slice(0, -1); // "route.ts" ab
  return (
    "/" +
    parts
      .map((p) => (p.startsWith("[") && p.endsWith("]") ? `{${p.slice(1, -1)}}` : p))
      .join("/")
  );
}

function findAllHandlers(): Operation[] {
  const out: Operation[] = [];
  for (const file of findRouteFiles(join(process.cwd(), "app", "api"))) {
    const src = readFileSync(file, "utf8");
    const path = routeFileToPath(file);
    for (const m of src.matchAll(EXPORT_RE)) {
      out.push({ method: m[1].toLowerCase() as Method, path });
    }
  }
  return out;
}

function findDocumentedOperations(): Operation[] {
  const out: Operation[] = [];
  const paths = openApiSpec.paths as Record<string, Record<string, unknown>>;
  for (const [path, ops] of Object.entries(paths)) {
    for (const method of METHODS) {
      if (ops[method]) out.push({ method, path });
    }
  }
  return out;
}

const key = (o: Operation) => `${o.method.toUpperCase()} ${o.path}`;

describe("Messung", () => {
  it("findet 97 Handler", () => {
    expect(findAllHandlers()).toHaveLength(97);
  });

  it("findet 67 dokumentierte Operationen", () => {
    expect(findDocumentedOperations()).toHaveLength(67);
  });
});
```

- [ ] **Step 2: Test laufen lassen**

Run: `npx vitest run __tests__/openapi-drift.test.ts`
Expected: PASS bei beiden. Weichen die Zahlen ab, ist seit dem 2026-09-02 eine Route dazugekommen — dann die Konstanten auf den neuen Wahrwert setzen und im Commit begründen, **nicht** die Zählung anpassen, bis sie passt.

- [ ] **Step 3: Den Pfad-Übersetzer gegen einen bekannten Pfad prüfen**

Ergänzen:

```ts
it("übersetzt Dateipfade korrekt in OpenAPI-Pfade", () => {
  const all = findAllHandlers().map(key);
  // Diese vier existieren und sind dokumentiert — stimmt die Uebersetzung
  // nicht, fehlen sie hier und der ganze Test misst Unsinn.
  expect(all).toContain("GET /api/health");
  expect(all).toContain("GET /api/tasks");
  expect(all).toContain("PATCH /api/tasks/{id}");
  expect(all).toContain("DELETE /api/tasks/{id}");
});
```

Run: `npx vitest run __tests__/openapi-drift.test.ts -t "übersetzt Dateipfade"`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add __tests__/openapi-drift.test.ts
git commit -m "test(api): Handler und dokumentierte Operationen messen"
```

---

### Task 2: Tote `$ref`s — sofort scharf

**Files:**
- Modify: `__tests__/openapi-drift.test.ts`

**Interfaces:**
- Consumes: `openApiSpec` aus Task 1
- Produces: `collectRefs(node: unknown): string[]`

Zwei tote `$ref`s auf eine `RateLimited`-Komponente, die nie existiert hat, standen laut Roadmap jahrelang unbemerkt in der Spec. Heute sind es null — die Prüfung darf deshalb ohne Ausnahmeliste scharf sein.

- [ ] **Step 1: Failing test schreiben**

```ts
/** Sammelt jeden $ref-Wert im Spec-Baum. */
function collectRefs(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const item of node) collectRefs(item, out);
  } else if (node !== null && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k === "$ref" && typeof v === "string") out.push(v);
      else collectRefs(v, out);
    }
  }
  return out;
}

/** Loest "#/components/schemas/Task" gegen den Spec-Baum auf. */
function refResolves(ref: string): boolean {
  if (!ref.startsWith("#/")) return false;
  let node: unknown = openApiSpec;
  for (const segment of ref.slice(2).split("/")) {
    if (node === null || typeof node !== "object") return false;
    node = (node as Record<string, unknown>)[segment];
    if (node === undefined) return false;
  }
  return true;
}

describe("Tote $refs", () => {
  it("jeder $ref löst innerhalb der Spec auf", () => {
    const dead = [...new Set(collectRefs(openApiSpec))].filter((r) => !refResolves(r));
    expect(
      dead,
      `Diese $refs zeigen ins Leere — Swagger-UI rendert an der Stelle nichts:\n${dead.join("\n")}`
    ).toEqual([]);
  });

  it("die Auflösung erkennt einen erfundenen $ref als tot", () => {
    expect(refResolves("#/components/schemas/RateLimited")).toBe(false);
    expect(refResolves("#/components/schemas/GibtEsNicht")).toBe(false);
  });
});
```

Der zweite Fall ist die Gegenprobe: eine Prüfung, die nichts findet, ist von einer Prüfung, die nicht prüft, sonst nicht zu unterscheiden. `RateLimited` ist absichtlich gewählt — das ist der Name, der real tot in der Spec stand.

- [ ] **Step 2: Laufen lassen**

Run: `npx vitest run __tests__/openapi-drift.test.ts -t "Tote"`
Expected: PASS bei beiden. Schlägt der erste fehl, ist ein toter `$ref` da — dann ist das ein echter Befund und gehört behoben, nicht ausgenommen.

- [ ] **Step 3: Commit**

```bash
git add __tests__/openapi-drift.test.ts
git commit -m "test(api): jeder \$ref muss innerhalb der Spec aufloesen"
```

---

### Task 3: Geister-Operationen — sofort scharf

**Files:**
- Modify: `__tests__/openapi-drift.test.ts`

Eine dokumentierte Operation ohne Handler ist schlimmer als eine undokumentierte: sie verspricht einem API-Nutzer einen Endpunkt, der 404 antwortet. Heute null — sofort scharf.

- [ ] **Step 1: Test schreiben**

```ts
describe("Geister-Operationen", () => {
  it("jede dokumentierte Operation hat einen Handler", () => {
    const existing = new Set(findAllHandlers().map(key));
    const ghosts = findDocumentedOperations()
      .map(key)
      .filter((k) => !existing.has(k));
    expect(
      ghosts,
      `Die Spec dokumentiert Endpunkte, die es nicht gibt — ein API-Nutzer bekommt dort 404:\n${ghosts.join("\n")}`
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Laufen lassen**

Run: `npx vitest run __tests__/openapi-drift.test.ts -t "Geister"`
Expected: PASS

Schlägt er fehl, sind es echte Geister. Der Fix ist, die Operation aus der Spec zu entfernen oder den Handler zu bauen — nicht, den Test zu lockern.

- [ ] **Step 3: Commit**

```bash
git add __tests__/openapi-drift.test.ts
git commit -m "test(api): keine dokumentierte Operation ohne Handler"
```

---

### Task 4: Die 30 undokumentierten Operationen pinnen

**Files:**
- Modify: `__tests__/openapi-drift.test.ts`

**Interfaces:**
- Produces: `UNDOCUMENTED` — eine exakte, sortierte Liste von `"METHOD /path"`-Strings

Das Pinnen ist der Zweck des ganzen Schnitts. 30 Operationen heute nachzudokumentieren ist nicht das Ziel; die 31. zu verhindern ist es.

`toEqual` auf eine sortierte Liste, nicht `toBeLessThanOrEqual(30)`: eine Zahl bliebe grün, wenn jemand eine dokumentiert und gleichzeitig eine neue undokumentiert hinzufügt.

- [ ] **Step 1: Die Liste erzeugen**

Einen temporären Test einfügen, der die Liste ausgibt:

```ts
it.skip("LISTE ERZEUGEN", () => {
  const documented = new Set(findDocumentedOperations().map(key));
  const undocumented = findAllHandlers()
    .map(key)
    .filter((k) => !documented.has(k))
    .sort();
  console.log(JSON.stringify(undocumented, null, 2));
  console.log("Anzahl:", undocumented.length);
});
```

Run: `npx vitest run __tests__/openapi-drift.test.ts -t "LISTE ERZEUGEN" --reporter=verbose`

Das `.skip` für den Lauf entfernen, Ausgabe kopieren, Test danach löschen.

- [ ] **Step 2: Die Liste als Konstante eintragen**

```ts
/**
 * Operationen, die es gibt und die die Spec nicht dokumentiert.
 *
 * Stand 2026-09-02: 30 von 97. Diese Liste ist ABSICHTLICH exakt und
 * ABSICHTLICH lang — sie zu leeren ist Arbeit fuer einen eigenen PR, sie
 * einzufrieren ist die Arbeit dieses Tests.
 *
 * Die Liste darf nur SCHRUMPFEN. Schlaegt der Test fehl, weil ein Eintrag
 * fehlt: gut, jemand hat dokumentiert — Eintrag entfernen. Schlaegt er fehl,
 * weil ein Eintrag dazugekommen ist: eine neue Route ist ohne Doku gelandet,
 * und "Full API" im README ist um eine Luecke unwahrer geworden. Dann
 * dokumentieren, nicht eintragen.
 *
 * Laut Roadmap fehlen ganze Bereiche: Webhooks (3), Push-Devices (2),
 * 2FA (5), Passkeys (7).
 */
const UNDOCUMENTED: readonly string[] = [
  // ← Ausgabe aus Step 1, sortiert
].sort();
```

- [ ] **Step 3: Die Prüfung schreiben**

```ts
describe("Undokumentierte Operationen", () => {
  it("genau die gepinnten 30, keine mehr und keine anderen", () => {
    const documented = new Set(findDocumentedOperations().map(key));
    const actual = findAllHandlers()
      .map(key)
      .filter((k) => !documented.has(k))
      .sort();

    const neu = actual.filter((k) => !UNDOCUMENTED.includes(k));
    const dokumentiert = UNDOCUMENTED.filter((k) => !actual.includes(k));

    expect(
      neu,
      `Neue Route ohne OpenAPI-Doku:\n${neu.join("\n")}\n\n` +
        `Dokumentiere sie in lib/openapi.ts. Sie hier einzutragen macht die ` +
        `Luecke groesser — die Liste darf nur schrumpfen.`
    ).toEqual([]);

    expect(
      dokumentiert,
      `Diese Operationen sind jetzt dokumentiert — aus UNDOCUMENTED entfernen:\n${dokumentiert.join("\n")}`
    ).toEqual([]);
  });

  it("die Liste hat 30 Einträge", () => {
    expect(UNDOCUMENTED).toHaveLength(30);
  });
});
```

Zwei getrennte `expect` mit eigenen Botschaften, nicht ein `toEqual` auf die ganze Liste: die Fehlermeldung sagt dann, **welche** Richtung passiert ist, und die beiden Fälle brauchen entgegengesetzte Reaktionen.

- [ ] **Step 4: Laufen lassen**

Run: `npx vitest run __tests__/openapi-drift.test.ts`
Expected: alle grün

- [ ] **Step 5: Die Gegenprobe — den Test rot sehen**

Ein Pin, den nie jemand rot gesehen hat, ist unbewiesen.

```bash
mkdir -p app/api/__drift_probe
cat > app/api/__drift_probe/route.ts <<'ROUTE'
export async function GET() {
  return Response.json({ ok: true });
}
ROUTE
npx vitest run __tests__/openapi-drift.test.ts 2>&1 | grep -A3 "Neue Route ohne"
rm -rf app/api/__drift_probe
```
Expected: der Test meldet `GET /api/__drift_probe` als neue Route ohne Doku. Danach ist das Verzeichnis wieder weg und der Test grün.

Run: `npx vitest run __tests__/openapi-drift.test.ts`
Expected: grün

- [ ] **Step 6: Commit**

```bash
git add __tests__/openapi-drift.test.ts
git commit -m "test(api): die 30 undokumentierten Operationen exakt gepinnt"
```

---

### Task 5: Doku und Abschluß

**Files:**
- Modify: `CHANGELOG.md`, `ROADMAP.md`

- [ ] **Step 1: `CHANGELOG.md`**

```markdown
- **Die OpenAPI-Spec wird jetzt von einem Test bewacht.** `lib/openapi.ts` sind
  ~3700 handgepflegte Zeilen, die keine Testdatei importierte. Drei Prüfungen:
  jeder `$ref` muß innerhalb der Spec auflösen (zwei tote `$ref`s auf eine
  `RateLimited`-Komponente, die nie existierte, standen jahrelang darin), jede
  dokumentierte Operation braucht einen Handler, und die 30 undokumentierten
  Operationen sind exakt gepinnt — die 31. macht den Test rot. Gemessen wird
  pro Handler, nicht pro Datei: 97 Handler über 67 Dateien, 67 dokumentierte
  Operationen über 42 Pfade.
```

- [ ] **Step 2: `ROADMAP.md` berichtigen**

Der Abschnitt „OpenAPI-Spec-Drift, von keinem Test bewacht" enthält zwei falsche Angaben, die beim Schreiben dieser Pläne aufgefallen sind:

1. „Dokumentiert sind 42 von 67 API-Routen" — falsche Einheit. 67 von 97 **Handlern**; die Lücke ist 30.
2. „Der Beweis, dass der Test billig ist: ein ~40-zeiliges Skript … Dieses Skript *ist* der fehlende Test — er muss nur noch in `__tests__/` einziehen." Das Skript existiert nicht in `scripts/`. Es war Wegwerfcode.

Beide korrigieren und den Punkt als erledigt markieren, mit Verweis auf `__tests__/openapi-drift.test.ts`.

- [ ] **Step 3: Volle Suite, Commit und PR**

```bash
npm test && npx tsc --noEmit && npm run lint
git add CHANGELOG.md ROADMAP.md
git commit -m "docs(docs): Drift-Test im CHANGELOG, zwei Roadmap-Angaben berichtigt"
git push -u origin HEAD
gh pr create --title "test(api): OpenAPI-Spec gegen die tatsaechlichen Routen"
```
