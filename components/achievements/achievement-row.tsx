"use client";

/**
 * AchievementRow — eine Errungenschaft als Zeile.
 *
 * Ersetzt `achievement-card.tsx` (17 Ratschen-Verstöße: Kachel mit
 * Seltenheits-Rahmen, farbigem Akzentstreifen, Box-Shadow, umrahmtem
 * Seltenheits-Abzeichen, 🪙-Emoji und einem eigenen Fortschrittsbalken).
 *
 * Die Seltenheit war die eigentliche Regelverletzung: `epic` trug
 * `var(--accent-amber)` — bei 48 Errungenschaften waren das N Amber auf
 * einer Ansicht, wo die Regel eins erlaubt. Sie wandert deshalb aus der
 * Zeile heraus in die `GroupHeading` darüber, genau wie die Priorität auf
 * `/tasks`: eine Gruppierung kodiert etwas Wahres über den Inhalt, ein
 * farbiges Abzeichen an jeder Zeile behauptet nur Wichtigkeit.
 *
 * Die Beschreibung steht als zweite Zeile IM Titel, nicht im `eyebrow`:
 * `Row`s Eyebrow-Slot setzt `uppercase tracking-[0.16em]` und `truncate` —
 * ein ganzer Satz wäre dort abgeschnitten und in Versalien. Der Titel-Slot
 * nimmt beliebige Knoten und bricht mit `wrapTitle` an Silbengrenzen.
 */

import { useLocale, useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";
import { Row } from "@/components/ui/list";
import type { AchievementWithProgress } from "@/lib/statistics";

/**
 * Eine Errungenschaft als `Row`.
 *
 * @param props.achievement - die Errungenschaft samt Fortschritt
 * @returns Eine Zeile ohne Fläche, ohne Rahmen, ohne Abzeichen
 */
export function AchievementRow({
  achievement,
}: {
  achievement: AchievementWithProgress;
}) {
  const t = useTranslations("achievements");
  const locale = useLocale();
  const earned = achievement.earnedAt != null;
  const isSecret = achievement.secret && !earned;

  // Der Eyebrow trägt nur Kurzes: den Fortschrittsbruch (der den
  // Fortschrittsbalken ersetzt — ein Balken zeigt einen Anteil, ein Bruch
  // zeigt beide Zahlen) und die Münzbelohnung ohne Emoji.
  const eyebrowParts: string[] = [];
  if (!earned && !isSecret && achievement.progress) {
    eyebrowParts.push(
      t("progress", {
        current: achievement.progress.current,
        total: achievement.progress.total,
      }),
    );
  }
  if (achievement.coinReward > 0) {
    eyebrowParts.push(t("coin_reward", { coins: achievement.coinReward }));
  }

  return (
    <Row
      testId="achievement-row"
      wrapTitle
      tone={earned ? "primary" : "secondary"}
      lead={
        isSecret ? (
          <FontAwesomeIcon
            icon={faLock}
            aria-hidden="true"
            className="text-[0.875rem] text-[var(--ink-3)]"
          />
        ) : (
          <span aria-hidden="true" className="text-[1.125rem] leading-none">
            {achievement.icon}
          </span>
        )
      }
      title={
        <>
          {isSecret ? t("secret_title") : achievement.title}
          <span className="mt-1 block font-[family-name:var(--font-ui)] text-[0.8125rem] font-normal normal-case tracking-normal text-[var(--ink-2)]">
            {isSecret ? t("secret_description") : achievement.description}
          </span>
        </>
      }
      eyebrow={eyebrowParts.length > 0 ? eyebrowParts.join(" · ") : undefined}
      trailing={
        earned && achievement.earnedAt
          ? new Date(achievement.earnedAt).toLocaleDateString(locale, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : undefined
      }
    />
  );
}
