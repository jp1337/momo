import type { Page } from "@playwright/test";

/**
 * Die vier Zähler der Spec (§8), gemessen mit derselben Methode, mit der
 * die Ausgangslage gezählt wurde.
 *
 * Zwei Fallen, an denen eine naive Messung vorbeiläuft:
 *
 * 1. `color(srgb … / α)`. Chromium serialisiert alles, was durch
 *    `color-mix(in srgb, …)` gegangen ist, in dieser Form — nicht als
 *    `rgb()`. Beim Messen für die Spec hat ein Zähler, der nur `rgb()`
 *    kannte, vier Amber-Elemente auf /tasks als null gemeldet. Ein Test,
 *    der die Verstöße nicht sieht, ist schlimmer als keiner.
 *
 * 2. Vererbung. `color` erbt: unter einem amberfarbenen Element meldet
 *    jedes Kind ebenfalls Amber. Deshalb zählt `color` nur an Elementen
 *    mit eigenem Textknoten — das ist die ehrliche Zahl „so viele Stellen
 *    tragen amberfarbenen Text".
 */
export interface Hit {
  tag: string;
  testid: string | null;
  prop: string;
  text: string;
  /** True, wenn der Treffer innerhalb der einen Lichtquelle (.lichtkegel) liegt. */
  inLight: boolean;
}

/** Seiten, die auf das Token-System migriert sind. Jede Phase verlängert die Liste. */
export const MIGRATED_PAGES: string[] = ["/dashboard", "/tasks", "/focus", "/topics", "/progress"];

/**
 * Zählt Amber über das GESAMTE Dokument — Navbar, Sidebar, Dialoge
 * eingeschlossen. Die alte Zählung über `main` war das Schlupfloch, durch
 * das Feder und Münzzähler auf jeder Seite ungezählt Amber trugen.
 *
 * Zwei weitere Grenzen, ausdrücklich benannt statt stillschweigend:
 *
 * - **Bildquellen sind blind.** `getComputedStyle` liefert keine Farbe, die
 *   in einer Bildressource steckt — `<img>` (auch `src="…svg"`),
 *   `background-image: url(...)`, `<use href="…">`. Amber, das in einer
 *   solchen Ressource lebt statt in CSS, ist für diesen Zähler unsichtbar.
 *   Der Navbar-Fix (Task 3) hat genau deshalb `/icon.svg` durch ein
 *   Inline-SVG mit `currentColor` ersetzt — nicht weil der Zähler es
 *   verlangt hätte (er hätte den Verstoß nie gesehen), sondern weil sonst
 *   kein Test der Welt eine Rückkehr zum Bild bemerken würde. Task 3s
 *   `design-rules.spec.ts` führt deshalb eine eigene, zählerunabhängige
 *   Prüfung: kein `<img src="*.svg">` im Dokument, und die Navigation
 *   enthält ein Inline-`<svg>`.
 * - **Der `opacity: 0`-Guard unten kann eine Einstiegsanimation mit einer
 *   echten Abwesenheit verwechseln.** Ein Element, das gerade von
 *   `opacity: 0` nach `1` animiert, IST für einen Nutzer, der die Seite
 *   eine halbe Sekunde länger ansieht, sichtbar — der Zähler sieht es nur
 *   dann, wenn er nach dem Einstieg misst. Diese Funktion wartet nicht
 *   selbst (sie ist ein reiner Snapshot, kein Test), also liegt das beim
 *   Aufrufer: `design-rules.spec.ts` wartet auf `opacity: 1` am
 *   `.lichtkegel`-Element, bevor sie zählt, und verifiziert das Ergebnis
 *   zusätzlich mit einer Positivprobe (der Wash muss gesehen werden) —
 *   eine Deckelungs-Regel allein (`≤ 2`) wird sonst von `0/0` genauso
 *   erfüllt wie von einer korrekten Messung.
 *
 * @param page - Die Playwright-Seite, bereits navigiert (und, falls die
 *   Seite eine Eintrittsanimation hat, bereits eingestanden — siehe oben)
 * @returns Ein Treffer pro Element und Eigenschaft, die Amber trägt
 */
export async function countAmber(page: Page): Promise<Hit[]> {
  return page.evaluate(() => {
    const hex = getComputedStyle(document.documentElement)
      .getPropertyValue("--amber")
      .trim()
      .replace("#", "");
    const target = [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
    const near = (r: number, g: number, b: number) =>
      Math.abs(r - target[0]) <= 4 &&
      Math.abs(g - target[1]) <= 4 &&
      Math.abs(b - target[2]) <= 4;
    const alpha = (raw: string | undefined) => {
      if (raw === undefined) return 1;
      const s = raw.trim();
      return s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s);
    };
    const carries = (value: string | null) => {
      if (!value || value === "none") return false;
      let m: RegExpExecArray | null;
      const rgb =
        /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.%]+))?\s*\)/g;
      while ((m = rgb.exec(value)) !== null) {
        if (alpha(m[4]) > 0.03 && near(+m[1], +m[2], +m[3])) return true;
      }
      const srgb =
        /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.%]+))?\s*\)/g;
      while ((m = srgb.exec(value)) !== null) {
        if (alpha(m[4]) > 0.03 && near(+m[1] * 255, +m[2] * 255, +m[3] * 255))
          return true;
      }
      return false;
    };
    const ownText = (el: Element) =>
      Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "",
      );

    const hits: Hit[] = [];
    const push = (el: Element, prop: string) =>
      hits.push({
        tag: el.tagName.toLowerCase(),
        testid: el.getAttribute("data-testid"),
        prop,
        text: (el.textContent ?? "").trim().slice(0, 40),
        inLight: el.closest(".lichtkegel") !== null,
      });

    // `fill`/`stroke` erben wie `color` — ein Icon ist fast immer
    // `<svg><path fill="currentColor"/></svg>`, und wenn stattdessen die
    // Farbe auf dem `<svg>` selbst sitzt (z. B. `<svg stroke="currentColor">`
    // um Kinder ohne eigenen Wert), berichten Elternteil UND Kind denselben
    // Treffer — ein Icon zählt dann als zwei. Ein Icon ist eine Einheit,
    // also wird pro Eigenschaft nur einmal pro nächstgelegenem `<svg>`
    // gezählt (Elemente ohne `<svg>`-Vorfahren zählen für sich selbst).
    const fillSeen = new Set<Element>();
    const strokeSeen = new Set<Element>();

    for (const el of Array.from(document.querySelectorAll("*"))) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      if (parseFloat(cs.opacity) === 0) continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;

      if (ownText(el) && carries(cs.color)) push(el, "color");
      if (carries(cs.backgroundColor)) push(el, "background");
      if (carries(cs.backgroundImage)) push(el, "background-image");
      if (carries(cs.boxShadow)) push(el, "box-shadow");
      if (carries(cs.fill)) {
        const root = el.closest("svg") ?? el;
        if (!fillSeen.has(root)) {
          fillSeen.add(root);
          push(root, "fill");
        }
      }
      if (carries(cs.stroke)) {
        const root = el.closest("svg") ?? el;
        if (!strokeSeen.has(root)) {
          strokeSeen.add(root);
          push(root, "stroke");
        }
      }

      for (const side of ["top", "right", "bottom", "left"]) {
        const w = parseFloat(cs.getPropertyValue(`border-${side}-width`));
        const style = cs.getPropertyValue(`border-${side}-style`);
        if (w > 0 && style !== "none" && carries(cs.getPropertyValue(`border-${side}-color`))) {
          push(el, `border-${side}`);
          break;
        }
      }

      // Der Lichtkegel selbst liegt in ::before — ohne Pseudoelemente
      // sieht der Zähler die eine erlaubte Lichtquelle gar nicht und die
      // Regel wäre trivial erfüllt.
      for (const pseudo of ["::before", "::after"]) {
        const ps = getComputedStyle(el, pseudo);
        if (ps.content === "none") continue;
        if (carries(ps.backgroundImage) || carries(ps.backgroundColor) || carries(ps.color)) {
          push(el, pseudo);
        }
      }
    }
    return hits;
  });
}

/** Der Wurzelknoten für die Zähler, die sich auf Inhalt beziehen. */
const CONTENT_ROOT = "main";

/**
 * Zählt Fraunces innerhalb von `main`. Die Spec erlaubt genau eins pro
 * Seite; /stats hatte 16.
 *
 * Teilt sich den Opazitäts-/Nullgrößen-Guard mit {@link countAmber} — ein
 * Element, das mitten in einer Eintrittsanimation steckt (`opacity: 0`,
 * oder noch `0×0` vor dem ersten Layout), zählt hier genauso wenig wie
 * dort. Ohne diesen Gleichlauf könnte ein und dasselbe Element für die
 * Amber-Regel unsichtbar sein und für die Fraunces-Regel trotzdem zählen
 * (oder umgekehrt) — zwei Regeln, die denselben Rendering-Zustand
 * unterschiedlich lesen.
 */
export async function countDisplayFont(page: Page): Promise<Hit[]> {
  return page.evaluate((rootSel: string) => {
    const root = document.querySelector(rootSel) ?? document.body;
    const ownText = (el: Element) =>
      Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "",
      );
    const hits: Hit[] = [];
    for (const el of Array.from(root.querySelectorAll("*"))) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      if (parseFloat(cs.opacity) === 0) continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (!ownText(el)) continue;
      if (!/^\s*["']?Fraunces/.test(cs.fontFamily)) continue;
      hits.push({
        tag: el.tagName.toLowerCase(),
        testid: el.getAttribute("data-testid"),
        prop: `font-size:${cs.fontSize}`,
        text: (el.textContent ?? "").trim().slice(0, 40),
        inLight: el.closest(".lichtkegel") !== null,
      });
    }
    return hits;
  }, CONTENT_ROOT);
}

/**
 * Zählt umrahmte ODER gefüllte Inhaltsflächen in `main` — der Name ist
 * bewusst "Kasten", nicht "Rahmen": eine gefüllte Fläche ohne Kante (z. B.
 * ein `Badge` mit `bg-[var(--raised)]` und `border-0`) ist genauso ein
 * Kasten, wie die Task-3-Review am `daily-quest-card.tsx`-Fund gezeigt hat.
 *
 * Ein Kasten ist: eine Kante auf ALLEN VIER Seiten, oder eine Fläche, die
 * sich von `--ground` unterscheidet. Eine einzelne Linie (Trennlinie unter
 * einer Überschrift, Haarlinie zwischen Zeilen) ist kein Kasten — sie
 * trennt, sie umrahmt nicht.
 *
 * Ausnahmen, jede mit eigenem Grund statt einer wachsenden Fluchtliste:
 *
 * - **Echte Affordanzen** (Button, Input, ein Link SELBST, …) — eine Kante
 *   sagt „hier kannst du tippen oder drücken" und ist damit Information.
 *   Das gilt nur für die Affordanz selbst und ihre unmittelbaren Text-/
 *   Icon-Kinder (Label, Icon-Span) — NICHT für jeden Nachfahren über
 *   `closest()`. Ein `<a>`, das eine ganze gefüllte, gerahmte Karte umgibt
 *   (die vom Entwurf abgeschaffte `Card`, wiederauferstanden als
 *   Link-Wrapper), ist genau der Fall, den diese Regel fangen soll — ein
 *   uneingeschränktes `closest(AFFORDANCE)` hätte ihn unsichtbar gemacht.
 * - **Fortschrittsanzeigen** (`progress`, `meter`, `[role="progressbar"]`)
 *   — eine Leiste IST eine Fläche, per Definition; die Regel ist für sie
 *   unerfüllbar und deshalb nicht anwendbar.
 * - **Punkte** (≤ 12px in BEIDEN Dimensionen) — der globale Constraint
 *   erlaubt die frei gewählte Nutzer-Themenfarbe „ausschließlich als
 *   6-px-Punkt"; 12px statt 6px, weil ein Punkt mit Ring/Rand leicht größer
 *   rendert als sein Farbkern. Eine Fläche dieser Größe beantwortet keine
 *   Frage außer „hier ist eine Farbe" — sie umrahmt und füllt nichts, was
 *   als Inhaltsfläche wahrgenommen wird.
 * - **Overlays** (Dialog, Popover, Menü) — die schweben und grenzen sich
 *   per Definition ab.
 *
 * **Opazitäts-Guard** (Task 8 Review, F6): teilt sich mit {@link countAmber}
 * und {@link countDisplayFont} den `opacity: 0`-Filter — ohne ihn zählte
 * eine bei Ruhe unsichtbare, aber im DOM verbleibende Fläche (z. B. eine
 * Wisch-Vorschau, die nur während einer aktiven Geste sichtbar wird) als
 * gefüllte Box. Dieselbe Einschränkung wie dort: ein Element mitten in
 * einer Opazitäts-Einstiegsanimation ist für einen Nutzer sichtbar, aber
 * für diesen Snapshot nicht — der Aufrufer muss ggf. auf das Ende der
 * Animation warten, bevor er zählt.
 */
export async function countBoxes(page: Page): Promise<Hit[]> {
  return page.evaluate((rootSel: string) => {
    const root = document.querySelector(rootSel) ?? document.body;
    const groundRaw = getComputedStyle(document.documentElement)
      .getPropertyValue("--ground")
      .trim();
    const probe = document.createElement("div");
    probe.style.backgroundColor = groundRaw;
    document.body.appendChild(probe);
    const ground = getComputedStyle(probe).backgroundColor;
    probe.remove();

    const AFFORDANCE =
      'button, input, textarea, select, a, label, summary, [role="button"], [role="tab"], [role="switch"], [role="menuitem"], [contenteditable="true"], [data-affordance]';
    const PROGRESS = 'progress, meter, [role="progressbar"]';
    const FLOATING = '[role="dialog"], [role="menu"], [role="tooltip"], [data-radix-popper-content-wrapper]';
    /**
     * Diagramm-Zellen (Task-11-Review I1): `role="gridcell"` markiert die
     * Tage eines `ContributionGrid`-Jahresrasters — momentan der einzige
     * Ort im Code, der diese Rolle vergibt. Wie bei `PROGRESS` ist die
     * Regel für sie unerfüllbar, nicht unwichtig: eine Zelle IST eine
     * gefüllte Fläche, per Definition (ihre Füllung kodiert die
     * Abschlusszahl des Tages), nicht ein Kasten, der eine Handlung
     * behauptet. Vor der Task-11-Korrektur (I1) blieben die Zellen unter
     * dem 12px-Punkt-Schwellenwert und brauchten diese Ausnahme nicht;
     * seit der Kasten-Regel-Breakout (siehe `contribution-grid.tsx`) dürfen
     * sie wachsen, also braucht es jetzt eine eigene, benannte Ausnahme
     * statt eines Zufallstreffers auf die Punkt-Schwelle.
     */
    const CHART = '[role="gridcell"]';
    /** Punkt-Schwelle in px — siehe JSDoc oben. */
    const DOT_MAX_PX = 12;

    const isAffordance = (el: Element) => el.matches(AFFORDANCE);

    const transparent = (c: string) => c === "rgba(0, 0, 0, 0)" || c === "transparent";

    const hits: Hit[] = [];
    for (const el of Array.from(root.querySelectorAll("*"))) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      if (parseFloat(cs.opacity) === 0) continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (box.width <= DOT_MAX_PX && box.height <= DOT_MAX_PX) continue;
      if (el.closest(PROGRESS) !== null) continue;
      if (el.closest(FLOATING) !== null) continue;
      if (el.closest(CHART) !== null) continue;
      // Die Affordanz selbst, oder ihr unmittelbares Text-/Icon-Kind — NICHT
      // jeder Nachfahre. Ein Container-Kind (hat selbst Element-Kinder) zählt
      // weiter mit, sonst würde genau die abgeschaffte Card unsichtbar, wenn
      // sie in einen Link gewrappt wird.
      if (isAffordance(el)) continue;
      const parent = el.parentElement;
      if (parent && isAffordance(parent) && el.children.length === 0) continue;

      const framed = ["top", "right", "bottom", "left"].every((s) => {
        const w = parseFloat(cs.getPropertyValue(`border-${s}-width`));
        return w > 0 && cs.getPropertyValue(`border-${s}-style`) !== "none";
      });
      const filled = !transparent(cs.backgroundColor) && cs.backgroundColor !== ground;

      if (framed || filled) {
        hits.push({
          tag: el.tagName.toLowerCase(),
          testid: el.getAttribute("data-testid"),
          prop: framed ? "border" : `background:${cs.backgroundColor}`,
          text: (el.textContent ?? "").trim().slice(0, 40),
          inLight: el.closest(".lichtkegel") !== null,
        });
      }
    }
    return hits;
  }, CONTENT_ROOT);
}

/** Ein Kind eines `[data-column]`, das dessen Breite überschreitet. */
export interface Breakout {
  tag: string;
  testid: string | null;
  /** Wert von `data-breakout` am überschreitenden Element oder einem Vorfahren, oder null, wenn unbenannt. */
  reason: string | null;
  overflowPx: number;
}

/**
 * Misst jede Inhaltsspalte gegen `--measure` UND stellt fest, ob etwas
 * darin die Spalte überschreitet — vorher unsichtbar für diese Funktion,
 * weil nur `[data-column]`s EIGENE Breite gemessen wurde, nie die ihrer
 * Kinder (Task-11-Review I1: genau deshalb bestand die Heatmap-Spalten-
 * Regel trotz eines 84px-724px-Überlaufs bei 1440px).
 *
 * Ein Überlauf ist kein Fehler an sich — ein Diagramm darf bewusst aus der
 * Lesespalte ausbrechen (`contribution-grid.tsx`s `data-breakout="chart"`).
 * Er muss nur BENANNT sein: jeder Überlauf ohne ein `data-breakout` an sich
 * selbst oder einem Vorfahren ist unbenannt und damit ein Fund, den der
 * Aufrufer rot machen soll — sonst wäre aus der stillen Lücke von vorher
 * bloß eine neue stille Lücke geworden, die diesmal wenigstens ein Attribut
 * kennt.
 *
 * Gemeldet wird nur der EINSTIEGSPUNKT eines Überlaufs (das Element, dessen
 * Elternteil die Spalte noch nicht überschreitet, das Element selbst aber
 * schon) — sonst würde jedes Kind eines überschreitenden Elements erneut
 * denselben Überlauf melden (bei der Heatmap: jede einzelne Tageszelle).
 *
 * @returns Das Maß in px, die Breiten aller `[data-column]` in `main`, und
 *   jeder gefundene Überlauf-Einstiegspunkt mit seiner (ggf. fehlenden)
 *   Begründung
 */
export async function measureColumns(
  page: Page,
): Promise<{ measurePx: number; widths: number[]; breakouts: Breakout[] }> {
  return page.evaluate((rootSel: string) => {
    const probe = document.createElement("div");
    probe.style.width = "var(--measure)";
    document.body.appendChild(probe);
    const measurePx = probe.getBoundingClientRect().width;
    probe.remove();
    const root = document.querySelector(rootSel) ?? document.body;
    const columns = Array.from(root.querySelectorAll("[data-column]"));
    const widths = columns.map((el) => el.getBoundingClientRect().width);

    const overflows = (rect: DOMRect, colRect: DOMRect) =>
      rect.right - colRect.right > 1 || colRect.left - rect.left > 1;

    // Dieselbe Affordanz-Liste wie in `countBoxes` (dort nicht wiederverwendbar
    // — jeder `page.evaluate`-Callback läuft als eigener, serialisierter
    // Funktionskörper im Browser, keine geteilte Modul-Closure). Ein
    // vergrößerter Tipp-/Klickbereich per negativem Margin (z. B. die
    // `-m-2`-Checkbox-Buttons auf `/tasks`, `p-2` Innenabstand kompensiert
    // dieselben 8px wieder nach innen) verschiebt die Layout-Box der
    // Affordanz messbar über die Spalte hinaus, OHNE dass optisch irgendetwas
    // die Spalte verlässt — die erste Messung dieser Regel hat das als 94
    // "Überläufe" auf /tasks gemeldet, die keine sind. Eine Affordanz ist
    // eine Handlung, kein Lesetext; dieselbe Unterscheidung, aus demselben
    // Grund, den `countBoxes` schon trifft.
    const AFFORDANCE =
      'button, input, textarea, select, a, label, summary, [role="button"], [role="tab"], [role="switch"], [role="menuitem"], [contenteditable="true"], [data-affordance]';

    const breakouts: Breakout[] = [];
    for (const col of columns) {
      const colRect = col.getBoundingClientRect();
      for (const el of Array.from(col.querySelectorAll("*"))) {
        if (el.matches(AFFORDANCE)) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (!overflows(rect, colRect)) continue;
        const parent = el.parentElement;
        if (
          parent &&
          !parent.matches(AFFORDANCE) &&
          overflows(parent.getBoundingClientRect(), colRect)
        ) {
          // Nicht der Einstiegspunkt — der Elternteil hat den Überlauf
          // schon gemeldet (oder wird es gleich, als eigenes Element).
          // Gilt NICHT, wenn der Elternteil selbst eine Affordanz ist:
          // die wird nie gemeldet (`el.matches(AFFORDANCE)` oben), ihr
          // eigener Überlauf ist also kein Beleg, dass irgendjemand ihn
          // schon erfasst hat — ein Inhalts-Kind, das WEITER überschreitet
          // als die Affordanz selbst, braucht einen eigenen Eintrag. Ohne
          // diese Ausnahme meldete ein synthetischer Button mit 11px
          // Überlauf und einem `<span>`-Kind mit 33px weiterem Überlauf
          // `breakoutsFound: []` — der Kasten-review-Fund hinter F3.
          continue;
        }
        const named = el.closest("[data-breakout]");
        breakouts.push({
          tag: el.tagName.toLowerCase(),
          testid: el.getAttribute("data-testid"),
          reason: named ? named.getAttribute("data-breakout") : null,
          overflowPx: Math.max(rect.right - colRect.right, colRect.left - rect.left),
        });
      }
    }

    return { measurePx, widths, breakouts };
  }, CONTENT_ROOT);
}
