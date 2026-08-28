"use client";

/**
 * Die Handlungen einer Wunschlisten-Zeile — kaufen, verwerfen, bearbeiten,
 * löschen; für gekaufte/verworfene Einträge das jeweilige Zurück.
 *
 * Getrennt von der Zeile aus demselben Grund wie `task-row-actions.tsx`:
 * die Zeile ist Darstellung, die Handlungen sind Zustand (Bestätigen,
 * Laden). Alle Icon-Knöpfe teilen sich `ACTION_BTN` — den einen Stil für
 * jede Zeilenaktion, der in `components/ui/list.tsx` lebt.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faPen, faXmark, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { ACTION_BTN } from "@/components/ui/list";
import { ConfirmButton } from "@/components/ui/confirm-button";

export interface WishlistRowActionsProps {
  id: string;
  status: "OPEN" | "BOUGHT" | "DISCARDED";
  /** true, wenn ein Münz-Schwellwert gesetzt und noch nicht erreicht ist. */
  locked: boolean;
  /** Der Schwellwert, für die Beschriftung "Für N Münzen kaufen". */
  coinUnlockThreshold: number | null;
  coinsNeeded: number;
  onBuy: (id: string) => void;
  onUnbuy: (id: string) => void;
  onDiscard: (id: string) => void;
  onUndiscard: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Der Aktionscluster einer Wunschlisten-Zeile.
 *
 * @param props - siehe WishlistRowActionsProps
 * @returns Die Aktionen, für `Row`s `actions`-Slot
 */
export function WishlistRowActions({
  id, status, locked, coinUnlockThreshold, coinsNeeded,
  onBuy, onUnbuy, onDiscard, onUndiscard, onEdit, onDelete,
}: WishlistRowActionsProps) {
  const t = useTranslations("wishlist");
  const [isLoading, setIsLoading] = useState(false);

  const run = (action: () => void) => {
    setIsLoading(true);
    try {
      action();
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  return (
    <span className="flex items-center gap-1">
      {status === "OPEN" && (
        <>
          <button
            type="button"
            onClick={() => run(() => onBuy(id))}
            disabled={isLoading || locked}
            className={ACTION_BTN}
            aria-label={
              locked
                ? t("card_locked", { coins: coinsNeeded })
                : coinUnlockThreshold !== null
                  ? t("buy_with_coins", { coins: coinUnlockThreshold })
                  : t("card_btn_bought")
            }
            title={
              locked
                ? t("card_locked", { coins: coinsNeeded })
                : t("card_btn_bought")
            }
          >
            <FontAwesomeIcon icon={faCheck} className="text-[0.75rem]" />
          </button>
          <button
            type="button"
            onClick={() => run(() => onDiscard(id))}
            disabled={isLoading}
            className={ACTION_BTN}
            aria-label={t("card_btn_discard")}
            title={t("card_btn_discard")}
          >
            <FontAwesomeIcon icon={faXmark} className="text-[0.75rem]" />
          </button>
        </>
      )}
      {status === "BOUGHT" && (
        <button
          type="button"
          onClick={() => run(() => onUnbuy(id))}
          disabled={isLoading}
          className={ACTION_BTN}
          aria-label={t("card_btn_undo")}
          title={t("card_btn_undo")}
        >
          <FontAwesomeIcon icon={faRotateLeft} className="text-[0.75rem]" />
        </button>
      )}
      {status === "DISCARDED" && (
        <button
          type="button"
          onClick={() => run(() => onUndiscard(id))}
          disabled={isLoading}
          className={ACTION_BTN}
          aria-label={t("card_btn_restore")}
          title={t("card_btn_restore")}
        >
          <FontAwesomeIcon icon={faRotateLeft} className="text-[0.75rem]" />
        </button>
      )}
      <button
        type="button"
        onClick={() => onEdit(id)}
        className={ACTION_BTN}
        aria-label={t("card_btn_edit")}
        title={t("card_btn_edit")}
      >
        <FontAwesomeIcon icon={faPen} className="text-[0.6875rem]" />
      </button>
      {/* Das zweistufige Löschen der Karte (`confirmingDelete`-State plus
          zwei umrahmte Mini-Buttons) war eine Handkopie dessen, was
          `ConfirmButton` seit Phase 1 kann — inklusive Fokusführung. */}
      <ConfirmButton
        onConfirm={() => onDelete(id)}
        confirmPrompt={t("view_confirm_delete")}
        yesLabel={t("card_btn_delete_confirm")}
        noLabel={t("card_btn_delete_cancel")}
        className={ACTION_BTN}
        disabled={isLoading}
        aria-label={t("card_btn_delete")}
        title={t("card_btn_delete")}
      >
        <FontAwesomeIcon icon={faXmark} className="text-[0.75rem]" />
      </ConfirmButton>
    </span>
  );
}
