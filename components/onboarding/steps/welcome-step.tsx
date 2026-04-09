"use client";

/**
 * WelcomeStep — first step of the onboarding wizard.
 * Shows 4 concept cards explaining Daily Quest, Energy, Coins, and Streaks.
 */

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faScroll,
  faBolt,
  faCoins,
  faFire,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

interface ConceptCard {
  icon: IconDefinition;
  color: string;
  titleKey: string;
  descKey: string;
}

const CONCEPTS: ConceptCard[] = [
  {
    icon: faScroll,
    color: "var(--accent-amber)",
    titleKey: "concept_quest_title",
    descKey: "concept_quest_desc",
  },
  {
    icon: faBolt,
    color: "var(--accent-green)",
    titleKey: "concept_energy_title",
    descKey: "concept_energy_desc",
  },
  {
    icon: faCoins,
    color: "var(--coin-gold)",
    titleKey: "concept_coins_title",
    descKey: "concept_coins_desc",
  },
  {
    icon: faFire,
    color: "var(--accent-red)",
    titleKey: "concept_streaks_title",
    descKey: "concept_streaks_desc",
  },
];

interface WelcomeStepProps {
  userName: string | null;
}

/**
 * Welcome step — introduces Momo's core concepts.
 *
 * @param userName - The user's display name (null if unknown)
 */
export function WelcomeStep({ userName }: WelcomeStepProps) {
  const t = useTranslations("onboarding");

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center flex flex-col gap-2">
        <h1
          className="text-3xl font-semibold"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--text-primary)",
          }}
        >
          {userName
            ? t("welcome_title", { name: userName })
            : t("welcome_title_anonymous")}
        </h1>
        <p
          className="text-sm"
          style={{
            fontFamily: "var(--font-ui)",
            color: "var(--text-muted)",
          }}
        >
          {t("welcome_subtitle")}
        </p>
      </div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } },
        }}
      >
        {CONCEPTS.map((concept) => (
          <motion.div
            key={concept.titleKey}
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="rounded-xl p-5 flex flex-col gap-3"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: `color-mix(in srgb, ${concept.color} 18%, transparent)`,
              }}
            >
              <FontAwesomeIcon
                icon={concept.icon}
                style={{ color: concept.color, fontSize: 18 }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span
                className="text-sm font-medium"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--text-primary)",
                }}
              >
                {t(concept.titleKey)}
              </span>
              <span
                className="text-xs leading-relaxed"
                style={{
                  fontFamily: "var(--font-ui)",
                  color: "var(--text-muted)",
                }}
              >
                {t(concept.descKey)}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
