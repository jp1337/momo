"use client";

/**
 * QuickAddModal — global keyboard-triggered task creation.
 *
 * Opens with N or / when no text input is focused.
 * Shows a minimal title field; "More options" expands topic + priority + energy.
 * Designed for ADHD users: capture a thought before it vanishes.
 *
 * Built on Radix UI Dialog primitive — focus trap, scroll lock, Esc, ARIA come
 * from the library. The visible top-aligned position (instead of centered) is
 * preserved through inline styles on Dialog.Content.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faChevronDown, faChevronUp, faXmark } from "@fortawesome/free-solid-svg-icons";
import * as RadixDialog from "@radix-ui/react-dialog";

interface Topic {
  id: string;
  title: string;
}

export function QuickAddModal() {
  const t = useTranslations("quick_add");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [topicId, setTopicId] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [energyLevel, setEnergyLevel] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch topics lazily when modal opens
  useEffect(() => {
    if (!open) return;
    fetch("/api/topics")
      .then((r) => r.json())
      .then((data) => setTopics(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [open]);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setTitle("");
      setExpanded(false);
      setTopicId("");
      setPriority("NORMAL");
      setEnergyLevel("");
      setError("");
    }
  }, [open]);

  // Global keyboard shortcut: N or / when not focused on an input.
  // Esc handling is delegated to Radix Dialog itself.
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isEditable =
        tag === "input" || tag === "textarea" || tag === "select" ||
        (e.target as HTMLElement)?.isContentEditable;
      if (isEditable) return;
      if (e.key === "n" || e.key === "N" || e.key === "/") {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open]);

  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = { title: trimmed, priority };
      if (topicId) body.topicId = topicId;
      if (energyLevel) body.energyLevel = energyLevel;
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      setOpen(false);
      router.refresh();
    } catch {
      setError(t("error"));
    } finally {
      setSaving(false);
    }
  }, [title, priority, topicId, energyLevel, t, router]);

  return (
    <RadixDialog.Root open={open} onOpenChange={setOpen}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.5)" }}
        />
        <RadixDialog.Content
          aria-label={t("title")}
          onOpenAutoFocus={(e) => {
            // Prefer focusing the title input rather than the close button
            e.preventDefault();
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="fixed z-50 left-1/2 top-24"
          style={{
            transform: "translateX(-50%)",
            width: "min(560px, calc(100vw - 32px))",
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
            padding: "20px",
          }}
        >
          {/* Visually-hidden title for accessible name */}
          <RadixDialog.Title className="sr-only">{t("title")}</RadixDialog.Title>

          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {t("title")}
              <kbd
                style={{
                  marginLeft: "8px",
                  padding: "1px 5px",
                  fontSize: "0.65rem",
                  borderRadius: "4px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-elevated)",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
                }}
              >
                N
              </kbd>
            </span>
            <RadixDialog.Close
              aria-label={t("close")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                padding: "4px",
                borderRadius: "4px",
                lineHeight: 1,
              }}
            >
              <FontAwesomeIcon icon={faXmark} />
            </RadixDialog.Close>
          </div>

          {/* Title input */}
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={t("placeholder")}
            style={{
              width: "100%",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "1rem",
              fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
              color: "var(--text-primary)",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-amber)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />

          {/* More options toggle */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{
              marginTop: "10px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "0.75rem",
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: 0,
            }}
          >
            <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} style={{ fontSize: "0.65rem" }} />
            {t("more_options")}
          </button>

          {/* Expanded options */}
          {expanded && (
            <div
              style={{
                marginTop: "12px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "10px",
              }}
            >
              {/* Topic */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    marginBottom: "4px",
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {t("topic")}
                </label>
                <select
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    padding: "6px 8px",
                    fontSize: "0.8rem",
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                  }}
                >
                  <option value="">{t("no_topic")}</option>
                  {topics.map((tp) => (
                    <option key={tp.id} value={tp.id}>
                      {tp.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    marginBottom: "4px",
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {t("priority")}
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    padding: "6px 8px",
                    fontSize: "0.8rem",
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                  }}
                >
                  <option value="HIGH">{t("priority_high")}</option>
                  <option value="NORMAL">{t("priority_normal")}</option>
                  <option value="SOMEDAY">{t("priority_someday")}</option>
                </select>
              </div>

              {/* Energy */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    marginBottom: "4px",
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {t("energy")}
                </label>
                <select
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    padding: "6px 8px",
                    fontSize: "0.8rem",
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                  }}
                >
                  <option value="">{t("energy_any")}</option>
                  <option value="HIGH">{t("energy_high")}</option>
                  <option value="MEDIUM">{t("energy_medium")}</option>
                  <option value="LOW">{t("energy_low")}</option>
                </select>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p
              style={{
                marginTop: "8px",
                fontSize: "0.8rem",
                color: "var(--accent-red, #e53e3e)",
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              }}
            >
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-4">
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              }}
            >
              <kbd
                style={{
                  padding: "1px 5px",
                  fontSize: "0.65rem",
                  borderRadius: "4px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-elevated)",
                  fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
                }}
              >
                Enter
              </kbd>{" "}
              {t("hint_save")} ·{" "}
              <kbd
                style={{
                  padding: "1px 5px",
                  fontSize: "0.65rem",
                  borderRadius: "4px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-elevated)",
                  fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
                }}
              >
                Esc
              </kbd>{" "}
              {t("hint_close")}
            </span>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !title.trim()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                background: title.trim() ? "var(--accent-amber)" : "var(--bg-elevated)",
                color: title.trim() ? "#1a1a0a" : "var(--text-muted)",
                border: "none",
                borderRadius: "8px",
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: title.trim() ? "pointer" : "default",
                transition: "all 0.15s",
              }}
            >
              <FontAwesomeIcon icon={faPlus} />
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
