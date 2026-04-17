"use client";

/**
 * OutboundWebhooks component.
 *
 * Manages outbound webhook endpoints for automation integrations.
 * Each endpoint subscribes to task lifecycle events and receives a signed
 * HTTP POST with a structured JSON payload.
 *
 * Secrets are write-only: once set, the UI shows a "●●●●●●●●" placeholder.
 * Submitting an empty secret field keeps the existing one unchanged.
 * The "Remove signing" button explicitly sends null to clear the secret.
 *
 * Delivery history is lazy-loaded per endpoint on expand.
 */

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { WEBHOOK_EVENTS, type WebhookEvent } from "@/lib/validators/webhooks";

/** Public shape of a webhook endpoint as returned by the API */
interface WebhookEndpointData {
  id: string;
  name: string;
  url: string;
  hasSecret: boolean;
  events: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Delivery log row as returned by the API */
interface DeliveryData {
  id: string;
  event: string;
  httpStatus: number | null;
  status: string;
  errorMessage: string | null;
  durationMs: number | null;
  deliveredAt: string;
}

interface OutboundWebhooksProps {
  initialEndpoints: WebhookEndpointData[];
}

/** Human-friendly event name labels */
const EVENT_LABELS: Record<WebhookEvent, string> = {
  "task.created": "task.created",
  "task.completed": "task.completed",
  "task.deleted": "task.deleted",
  "task.updated": "task.updated",
};

/**
 * Outbound Webhooks settings section.
 * Allows users to configure automation endpoints that receive HTTP POST events.
 */
export function OutboundWebhooks({ initialEndpoints }: OutboundWebhooksProps) {
  const t = useTranslations("settings");
  const [endpoints, setEndpoints] = useState<WebhookEndpointData[]>(initialEndpoints);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Add form state
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    url: "",
    secret: "",
    events: [] as WebhookEvent[],
    enabled: true,
  });
  const [addSaving, setAddSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    url: "",
    secret: "",
    removeSecret: false,
    events: [] as WebhookEvent[],
    enabled: true,
  });
  const [editSaving, setEditSaving] = useState(false);

  // Delivery history state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  // Testing state
  const [testingId, setTestingId] = useState<string | null>(null);

  function showMessage(text: string, type: "success" | "error") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  }

  // ─── Add ───────────────────────────────────────────────────────────────────

  function startAdding() {
    setAdding(true);
    setEditingId(null);
    setExpandedId(null);
    setAddForm({ name: "", url: "", secret: "", events: [], enabled: true });
  }

  function cancelAdding() {
    setAdding(false);
  }

  async function handleAdd() {
    if (!addForm.name.trim() || !addForm.url.trim()) {
      showMessage(t("webhook_endpoint_err_save"), "error");
      return;
    }
    setAddSaving(true);
    try {
      const res = await fetch("/api/settings/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name.trim(),
          url: addForm.url.trim(),
          secret: addForm.secret.trim() || undefined,
          events: addForm.events,
          enabled: addForm.enabled,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; code?: string };
        if (data.code === "limit_exceeded") {
          showMessage(t("webhook_endpoint_err_limit"), "error");
        } else {
          showMessage(t("webhook_endpoint_err_save"), "error");
        }
        return;
      }
      const data = await res.json() as { endpoint: WebhookEndpointData };
      setEndpoints((prev) => [...prev, data.endpoint]);
      setAdding(false);
      setAddForm({ name: "", url: "", secret: "", events: [], enabled: true });
      showMessage(t("webhook_endpoint_saved"), "success");
    } catch {
      showMessage(t("webhook_endpoint_err_save"), "error");
    } finally {
      setAddSaving(false);
    }
  }

  // ─── Edit ──────────────────────────────────────────────────────────────────

  function startEditing(ep: WebhookEndpointData) {
    setEditingId(ep.id);
    setAdding(false);
    setExpandedId(null);
    setEditForm({
      name: ep.name,
      url: ep.url,
      secret: "",
      removeSecret: false,
      events: ep.events as WebhookEvent[],
      enabled: ep.enabled,
    });
  }

  function cancelEditing() {
    setEditingId(null);
  }

  async function handleEdit(id: string) {
    if (!editForm.name.trim() || !editForm.url.trim()) {
      showMessage(t("webhook_endpoint_err_save"), "error");
      return;
    }
    setEditSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: editForm.name.trim(),
        url: editForm.url.trim(),
        events: editForm.events,
        enabled: editForm.enabled,
      };
      // secret handling: null = remove, non-empty string = replace, omit = keep
      if (editForm.removeSecret) {
        body.secret = null;
      } else if (editForm.secret.trim()) {
        body.secret = editForm.secret.trim();
      }

      const res = await fetch(`/api/settings/webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        showMessage(t("webhook_endpoint_err_save"), "error");
        return;
      }
      const data = await res.json() as { endpoint: WebhookEndpointData };
      setEndpoints((prev) => prev.map((ep) => (ep.id === id ? data.endpoint : ep)));
      setEditingId(null);
      showMessage(t("webhook_endpoint_saved"), "success");
    } catch {
      showMessage(t("webhook_endpoint_err_save"), "error");
    } finally {
      setEditSaving(false);
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm(t("webhook_endpoint_delete_confirm"))) return;
    try {
      const res = await fetch(`/api/settings/webhooks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setEndpoints((prev) => prev.filter((ep) => ep.id !== id));
      if (editingId === id) setEditingId(null);
      if (expandedId === id) setExpandedId(null);
      showMessage(t("webhook_endpoint_deleted"), "success");
    } catch {
      showMessage(t("webhook_endpoint_err_save"), "error");
    }
  }

  // ─── Test ──────────────────────────────────────────────────────────────────

  async function handleTest(id: string) {
    setTestingId(id);
    try {
      const res = await fetch(`/api/settings/webhooks/${id}/test`, { method: "POST" });
      if (!res.ok) throw new Error();
      showMessage(t("webhook_endpoint_test_sent"), "success");
    } catch {
      showMessage(t("webhook_endpoint_test_failed"), "error");
    } finally {
      setTestingId(null);
    }
  }

  // ─── Deliveries ────────────────────────────────────────────────────────────

  const handleToggleDeliveries = useCallback(async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setDeliveries([]);
    setLoadingDeliveries(true);
    try {
      const res = await fetch(`/api/settings/webhooks/${id}`);
      if (res.ok) {
        const data = await res.json() as { deliveries: DeliveryData[] };
        setDeliveries(data.deliveries.reverse());
      }
    } finally {
      setLoadingDeliveries(false);
    }
  }, [expandedId]);

  // ─── Event checkbox toggle ─────────────────────────────────────────────────

  function toggleEvent(
    ev: WebhookEvent,
    current: WebhookEvent[],
    setter: (fn: (prev: typeof current) => typeof current) => void
  ) {
    setter((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "1rem", fontFamily: "var(--font-ui)" }}
    >
      {/* Status message */}
      {message && (
        <div
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "0.375rem",
            fontSize: "0.875rem",
            backgroundColor:
              message.type === "success"
                ? "var(--color-success-bg, #d1fae5)"
                : "var(--color-error-bg, #fee2e2)",
            color:
              message.type === "success"
                ? "var(--color-success, #065f46)"
                : "var(--color-error, #991b1b)",
          }}
        >
          {message.text}
        </div>
      )}

      {/* Endpoint list */}
      {endpoints.length === 0 && !adding && (
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
          {t("webhook_endpoint_empty")}
        </p>
      )}

      {endpoints.map((ep) => (
        <div
          key={ep.id}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            overflow: "hidden",
          }}
        >
          {/* Endpoint row */}
          {editingId !== ep.id ? (
            <div
              style={{
                padding: "0.75rem 1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                flexWrap: "wrap",
                backgroundColor: "var(--bg-surface)",
              }}
            >
              {/* Enabled dot */}
              <span
                style={{
                  width: "0.5rem",
                  height: "0.5rem",
                  borderRadius: "50%",
                  flexShrink: 0,
                  backgroundColor: ep.enabled ? "var(--color-success, #10b981)" : "var(--text-muted)",
                }}
              />

              {/* Name + URL */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ep.name}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ep.url.length > 50 ? ep.url.slice(0, 50) + "…" : ep.url}
                </div>
              </div>

              {/* Event badges */}
              <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                {ep.events.length === 0 ? (
                  <span style={badgeStyle("var(--color-amber, #f59e0b)")}>
                    {t("webhook_events_all")}
                  </span>
                ) : (
                  ep.events.map((ev) => (
                    <span key={ev} style={badgeStyle("var(--color-primary, #6366f1)")}>
                      {ev}
                    </span>
                  ))
                )}
              </div>

              {/* Signing badge */}
              {ep.hasSecret && (
                <span style={badgeStyle("var(--text-muted)")}>
                  {t("webhook_endpoint_has_secret")}
                </span>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                <button
                  onClick={() => handleTest(ep.id)}
                  disabled={testingId === ep.id}
                  style={btnStyle("var(--text-muted)")}
                >
                  {testingId === ep.id ? "…" : t("webhook_endpoint_test_btn")}
                </button>
                <button
                  onClick={() => handleToggleDeliveries(ep.id)}
                  style={btnStyle(expandedId === ep.id ? "var(--color-primary, #6366f1)" : "var(--text-muted)")}
                >
                  {t("webhook_endpoint_deliveries_btn")}
                </button>
                <button
                  onClick={() => startEditing(ep)}
                  style={btnStyle("var(--text-secondary)")}
                >
                  {t("webhook_endpoint_edit_btn")}
                </button>
                <button
                  onClick={() => handleDelete(ep.id)}
                  style={btnStyle("var(--color-error, #ef4444)")}
                >
                  {t("webhook_endpoint_delete_btn")}
                </button>
              </div>
            </div>
          ) : (
            /* Edit form */
            <div style={{ padding: "0.75rem 1rem", backgroundColor: "var(--bg-elevated, var(--bg-surface))" }}>
              <EndpointForm
                form={editForm}
                hasExistingSecret={ep.hasSecret}
                onNameChange={(v) => setEditForm((f) => ({ ...f, name: v }))}
                onUrlChange={(v) => setEditForm((f) => ({ ...f, url: v }))}
                onSecretChange={(v) => setEditForm((f) => ({ ...f, secret: v, removeSecret: false }))}
                onRemoveSecret={() => setEditForm((f) => ({ ...f, secret: "", removeSecret: true }))}
                onEventsChange={(ev) =>
                  toggleEvent(
                    ev,
                    editForm.events,
                    (fn) => setEditForm((f) => ({ ...f, events: fn(f.events) }))
                  )
                }
                onEnabledChange={(v) => setEditForm((f) => ({ ...f, enabled: v }))}
                onSave={() => handleEdit(ep.id)}
                onCancel={cancelEditing}
                saving={editSaving}
                t={t}
              />
            </div>
          )}

          {/* Delivery history panel */}
          {expandedId === ep.id && editingId !== ep.id && (
            <div
              style={{
                borderTop: "1px solid var(--border)",
                padding: "0.75rem 1rem",
                backgroundColor: "var(--bg-base, var(--bg-surface))",
              }}
            >
              <p
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                  color: "var(--text-secondary)",
                }}
              >
                {t("webhook_endpoint_deliveries_title")}
              </p>
              {loadingDeliveries ? (
                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>…</p>
              ) : deliveries.length === 0 ? (
                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                  {t("webhook_endpoint_deliveries_empty")}
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                    <thead>
                      <tr style={{ color: "var(--text-muted)" }}>
                        <th style={thStyle}>{t("webhook_delivery_col_time")}</th>
                        <th style={thStyle}>{t("webhook_delivery_col_event")}</th>
                        <th style={thStyle}>{t("webhook_delivery_col_status")}</th>
                        <th style={thStyle}>{t("webhook_delivery_col_http")}</th>
                        <th style={thStyle}>{t("webhook_delivery_col_duration")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveries.map((d) => (
                        <tr key={d.id}>
                          <td style={tdStyle}>
                            {new Date(d.deliveredAt).toLocaleString()}
                          </td>
                          <td style={tdStyle}>
                            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem" }}>
                              {d.event}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <span
                              style={{
                                ...badgeStyle(
                                  d.status === "success"
                                    ? "var(--color-success, #10b981)"
                                    : "var(--color-error, #ef4444)"
                                ),
                                display: "inline-block",
                              }}
                            >
                              {d.status === "success"
                                ? t("webhook_delivery_status_success")
                                : t("webhook_delivery_status_failure")}
                            </span>
                            {d.errorMessage && (
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: "var(--color-error, #ef4444)",
                                  marginTop: "0.2rem",
                                  maxWidth: "20rem",
                                  wordBreak: "break-all",
                                }}
                              >
                                {d.errorMessage}
                              </div>
                            )}
                          </td>
                          <td style={tdStyle}>{d.httpStatus ?? "—"}</td>
                          <td style={tdStyle}>
                            {d.durationMs != null ? `${d.durationMs} ms` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add form */}
      {adding && (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            padding: "0.75rem 1rem",
            backgroundColor: "var(--bg-surface)",
          }}
        >
          <EndpointForm
            form={addForm}
            hasExistingSecret={false}
            onNameChange={(v) => setAddForm((f) => ({ ...f, name: v }))}
            onUrlChange={(v) => setAddForm((f) => ({ ...f, url: v }))}
            onSecretChange={(v) => setAddForm((f) => ({ ...f, secret: v }))}
            onRemoveSecret={() => {}}
            onEventsChange={(ev) =>
              toggleEvent(
                ev,
                addForm.events,
                (fn) => setAddForm((f) => ({ ...f, events: fn(f.events) }))
              )
            }
            onEnabledChange={(v) => setAddForm((f) => ({ ...f, enabled: v }))}
            onSave={handleAdd}
            onCancel={cancelAdding}
            saving={addSaving}
            t={t}
          />
        </div>
      )}

      {/* Add button */}
      {!adding && (
        <button
          onClick={startAdding}
          style={{
            alignSelf: "flex-start",
            padding: "0.4rem 0.875rem",
            borderRadius: "0.375rem",
            border: "1px solid var(--border)",
            backgroundColor: "transparent",
            color: "var(--text-secondary)",
            fontSize: "0.875rem",
            cursor: "pointer",
            fontFamily: "var(--font-ui)",
          }}
        >
          + {t("webhook_endpoint_add_btn")}
        </button>
      )}

      {/* Payload note */}
      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
        {t("webhook_payload_note")}
      </p>
    </div>
  );
}

// ─── Sub-component: EndpointForm ──────────────────────────────────────────────

interface EndpointFormProps {
  form: {
    name: string;
    url: string;
    secret: string;
    removeSecret?: boolean;
    events: WebhookEvent[];
    enabled: boolean;
  };
  hasExistingSecret: boolean;
  onNameChange: (v: string) => void;
  onUrlChange: (v: string) => void;
  onSecretChange: (v: string) => void;
  onRemoveSecret: () => void;
  onEventsChange: (ev: WebhookEvent) => void;
  onEnabledChange: (v: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  t: ReturnType<typeof useTranslations<"settings">>;
}

function EndpointForm({
  form,
  hasExistingSecret,
  onNameChange,
  onUrlChange,
  onSecretChange,
  onRemoveSecret,
  onEventsChange,
  onEnabledChange,
  onSave,
  onCancel,
  saving,
  t,
}: EndpointFormProps) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.375rem 0.625rem",
    borderRadius: "0.375rem",
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg-input, var(--bg-surface))",
    color: "var(--text-primary)",
    fontSize: "0.875rem",
    fontFamily: "var(--font-body)",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.8125rem",
    fontWeight: 500,
    marginBottom: "0.25rem",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-ui)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Name */}
      <div>
        <label style={labelStyle}>{t("webhook_endpoint_name_label")}</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t("webhook_endpoint_name_placeholder")}
          style={inputStyle}
          maxLength={100}
        />
      </div>

      {/* URL */}
      <div>
        <label style={labelStyle}>{t("webhook_endpoint_url_label")}</label>
        <input
          type="url"
          value={form.url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder={t("webhook_endpoint_url_placeholder")}
          style={inputStyle}
          maxLength={2000}
        />
      </div>

      {/* Secret */}
      <div>
        <label style={labelStyle}>{t("webhook_endpoint_secret_label")}</label>
        {hasExistingSecret && !form.removeSecret ? (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="text"
              value={form.secret}
              onChange={(e) => onSecretChange(e.target.value)}
              placeholder={t("webhook_endpoint_secret_replace_placeholder")}
              style={{ ...inputStyle, flex: 1 }}
              maxLength={200}
            />
            <button
              type="button"
              onClick={onRemoveSecret}
              style={{
                ...btnStyle("var(--color-error, #ef4444)"),
                flexShrink: 0,
              }}
            >
              {t("webhook_endpoint_secret_remove")}
            </button>
          </div>
        ) : (
          <input
            type="text"
            value={form.removeSecret ? "" : form.secret}
            onChange={(e) => onSecretChange(e.target.value)}
            placeholder={t("webhook_endpoint_secret_placeholder")}
            style={inputStyle}
            maxLength={200}
            disabled={!!form.removeSecret}
          />
        )}
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem", fontFamily: "var(--font-ui)" }}>
          {t("webhook_endpoint_secret_hint")}
        </p>
      </div>

      {/* Event subscriptions */}
      <div>
        <label style={labelStyle}>{t("webhook_endpoint_events_label")}</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {WEBHOOK_EVENTS.map((ev) => (
            <label
              key={ev}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                cursor: "pointer",
                fontSize: "0.8125rem",
                fontFamily: "var(--font-body)",
                color: "var(--text-secondary)",
              }}
            >
              <input
                type="checkbox"
                checked={form.events.includes(ev)}
                onChange={() => onEventsChange(ev)}
              />
              {EVENT_LABELS[ev]}
            </label>
          ))}
        </div>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem", fontFamily: "var(--font-ui)" }}>
          {t("webhook_endpoint_events_hint")}
        </p>
      </div>

      {/* Enabled toggle */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          cursor: "pointer",
          fontSize: "0.875rem",
          fontFamily: "var(--font-ui)",
          color: "var(--text-secondary)",
        }}
      >
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        {t("webhook_endpoint_enabled_label")}
      </label>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            padding: "0.4rem 0.875rem",
            borderRadius: "0.375rem",
            border: "none",
            backgroundColor: "var(--color-primary, #6366f1)",
            color: "#fff",
            fontSize: "0.875rem",
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "var(--font-ui)",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "…" : t("webhook_endpoint_save_btn")}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          style={btnStyle("var(--text-muted)")}
        >
          {t("webhook_endpoint_cancel_btn")}
        </button>
      </div>
    </div>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

function badgeStyle(color: string): React.CSSProperties {
  return {
    padding: "0.125rem 0.375rem",
    borderRadius: "0.25rem",
    fontSize: "0.7rem",
    fontFamily: "var(--font-body)",
    backgroundColor: color + "22",
    color: color,
    border: `1px solid ${color}44`,
    whiteSpace: "nowrap",
  };
}

function btnStyle(color: string): React.CSSProperties {
  return {
    padding: "0.3rem 0.625rem",
    borderRadius: "0.375rem",
    border: `1px solid ${color}55`,
    backgroundColor: "transparent",
    color: color,
    fontSize: "0.8125rem",
    cursor: "pointer",
    fontFamily: "var(--font-ui)",
  };
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.25rem 0.5rem",
  fontSize: "0.75rem",
  fontWeight: 500,
  borderBottom: "1px solid var(--border)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "0.3rem 0.5rem",
  fontSize: "0.8125rem",
  color: "var(--text-secondary)",
  borderBottom: "1px solid var(--border)",
  verticalAlign: "top",
};
