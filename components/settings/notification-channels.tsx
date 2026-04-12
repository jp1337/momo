"use client";

/**
 * NotificationChannels component.
 *
 * Manages additional notification channels (ntfy.sh, Pushover, Telegram, Email).
 * Each channel type has its own configuration form. Channels are stored in the
 * notification_channels DB table via the /api/settings/notification-channels endpoints.
 *
 * The Email channel requires SMTP to be configured on the server instance —
 * `emailAvailable` is read on the server and threaded through as a prop so
 * the "+ Email" button is hidden on instances without SMTP credentials.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";

/** Channel data as returned from the API / passed as props */
interface ChannelData {
  type: string;
  config: Record<string, unknown>;
  enabled: boolean;
}

interface NotificationChannelsProps {
  /** Initially configured channels from the DB */
  initialChannels: ChannelData[];
  /** Whether the email channel is available (instance has SMTP configured) */
  emailAvailable?: boolean;
  /** Default address to prefill in the email channel form (usually the user's account email) */
  defaultEmailAddress?: string;
}

/** Supported channel types with their i18n label keys */
const AVAILABLE_CHANNEL_TYPES = [
  { type: "ntfy", labelKey: "channel_ntfy_label" as const },
  { type: "pushover", labelKey: "channel_pushover_label" as const },
  { type: "telegram", labelKey: "channel_telegram_label" as const },
  { type: "email", labelKey: "channel_email_label" as const },
  { type: "webhook", labelKey: "channel_webhook_label" as const },
] as const;

/**
 * Notification channels settings section.
 * Shows configured channels with edit/test/remove actions and an "add channel" flow.
 */
export function NotificationChannels({
  initialChannels,
  emailAvailable = false,
  defaultEmailAddress = "",
}: NotificationChannelsProps) {
  const t = useTranslations("settings");
  const [channels, setChannels] = useState<ChannelData[]>(initialChannels);
  const [addingType, setAddingType] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Determine which types are not yet configured
  const configuredTypes = new Set(channels.map((c) => c.type));
  const availableToAdd = AVAILABLE_CHANNEL_TYPES.filter((ct) => {
    if (configuredTypes.has(ct.type)) return false;
    // Hide email when the instance has no SMTP configured
    if (ct.type === "email" && !emailAvailable) return false;
    return true;
  });

  function showMessage(text: string, type: "success" | "error") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleRemove(channelType: string) {
    if (!confirm(t("channel_remove_confirm"))) return;
    try {
      const res = await fetch(`/api/settings/notification-channels/${channelType}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setChannels((prev) => prev.filter((c) => c.type !== channelType));
      showMessage(t("channel_removed"), "success");
    } catch {
      showMessage(t("channel_err_save"), "error");
    }
  }

  async function handleTest(channelType: string) {
    try {
      const res = await fetch(`/api/settings/notification-channels/${channelType}/test`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      showMessage(t("channel_test_sent"), "success");
    } catch {
      showMessage(t("channel_test_failed"), "error");
    }
  }

  async function handleToggle(channelType: string, enabled: boolean) {
    const channel = channels.find((c) => c.type === channelType);
    if (!channel) return;
    try {
      const res = await fetch("/api/settings/notification-channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: channelType, config: channel.config, enabled }),
      });
      if (!res.ok) throw new Error();
      setChannels((prev) =>
        prev.map((c) => (c.type === channelType ? { ...c, enabled } : c))
      );
    } catch {
      showMessage(t("channel_err_save"), "error");
    }
  }

  function handleSaved(channelType: string, config: Record<string, unknown>) {
    setChannels((prev) => {
      const existing = prev.find((c) => c.type === channelType);
      if (existing) {
        return prev.map((c) =>
          c.type === channelType ? { ...c, config } : c
        );
      }
      return [...prev, { type: channelType, config, enabled: true }];
    });
    setAddingType(null);
    showMessage(t("channel_saved"), "success");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status message */}
      {message && (
        <p
          className="text-sm px-3 py-2 rounded-lg"
          style={{
            fontFamily: "var(--font-ui)",
            backgroundColor:
              message.type === "success"
                ? "var(--color-success-bg, rgba(34, 197, 94, 0.1))"
                : "var(--color-error-bg, rgba(239, 68, 68, 0.1))",
            color:
              message.type === "success"
                ? "var(--color-success, #22c55e)"
                : "var(--color-error, #ef4444)",
          }}
        >
          {message.text}
        </p>
      )}

      {/* Configured channels */}
      {channels.map((channel) => (
        <div
          key={channel.type}
          className="rounded-lg p-4 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Status dot */}
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{
                  backgroundColor: channel.enabled
                    ? "var(--color-success, #22c55e)"
                    : "var(--text-muted)",
                }}
              />
              <span
                className="text-sm font-medium"
                style={{
                  fontFamily: "var(--font-ui)",
                  color: "var(--text-primary)",
                }}
              >
                {t(`channel_${channel.type}_label` as Parameters<typeof t>[0])}
              </span>
              <span
                className="text-xs"
                style={{
                  fontFamily: "var(--font-ui)",
                  color: "var(--text-muted)",
                }}
              >
                {channel.enabled ? t("channel_active") : t("channel_not_configured")}
              </span>
            </div>

            {/* Toggle */}
            <button
              onClick={() => handleToggle(channel.type, !channel.enabled)}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
              style={{
                backgroundColor: channel.enabled
                  ? "var(--color-accent, #f0a500)"
                  : "var(--bg-surface)",
                border: "1px solid var(--border)",
              }}
              aria-label={channel.enabled ? t("channel_disable") : t("channel_enable")}
            >
              <span
                className="inline-block h-3.5 w-3.5 rounded-full transition-transform"
                style={{
                  backgroundColor: channel.enabled
                    ? "var(--bg-primary)"
                    : "var(--text-muted)",
                  transform: channel.enabled ? "translateX(16px)" : "translateX(2px)",
                }}
              />
            </button>
          </div>

          {/* Channel-specific config summary */}
          {channel.type === "ntfy" && (
            <NtfyConfigSummary config={channel.config} />
          )}
          {channel.type === "pushover" && (
            <PushoverConfigSummary config={channel.config} />
          )}
          {channel.type === "telegram" && (
            <TelegramConfigSummary config={channel.config} />
          )}
          {channel.type === "email" && (
            <EmailConfigSummary config={channel.config} />
          )}
          {channel.type === "webhook" && (
            <WebhookConfigSummary config={channel.config} />
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => handleTest(channel.type)}
              className="text-xs px-3 py-1.5 rounded-md transition-colors"
              style={{
                fontFamily: "var(--font-ui)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            >
              {t("channel_test")}
            </button>
            <button
              onClick={() => handleRemove(channel.type)}
              className="text-xs px-3 py-1.5 rounded-md transition-colors"
              style={{
                fontFamily: "var(--font-ui)",
                backgroundColor: "transparent",
                color: "var(--color-error, #ef4444)",
                border: "1px solid var(--color-error, #ef4444)",
              }}
            >
              {t("channel_remove")}
            </button>
          </div>
        </div>
      ))}

      {/* Add channel form (inline, shown when addingType is set) */}
      {addingType === "ntfy" && (
        <NtfyForm
          onSave={(config) => handleSaved("ntfy", config)}
          onCancel={() => setAddingType(null)}
        />
      )}
      {addingType === "pushover" && (
        <PushoverForm
          onSave={(config) => handleSaved("pushover", config)}
          onCancel={() => setAddingType(null)}
        />
      )}
      {addingType === "telegram" && (
        <TelegramForm
          onSave={(config) => handleSaved("telegram", config)}
          onCancel={() => setAddingType(null)}
        />
      )}
      {addingType === "email" && (
        <EmailForm
          defaultAddress={defaultEmailAddress}
          onSave={(config) => handleSaved("email", config)}
          onCancel={() => setAddingType(null)}
        />
      )}
      {addingType === "webhook" && (
        <WebhookForm
          onSave={(config) => handleSaved("webhook", config)}
          onCancel={() => setAddingType(null)}
        />
      )}

      {/* Add channel button */}
      {availableToAdd.length > 0 && !addingType && (
        <div className="flex gap-2 flex-wrap">
          {availableToAdd.map((ct) => (
            <button
              key={ct.type}
              onClick={() => setAddingType(ct.type)}
              className="text-sm px-4 py-2 rounded-lg transition-colors"
              style={{
                fontFamily: "var(--font-ui)",
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text-primary)",
                border: "1px dashed var(--border)",
              }}
            >
              + {t(ct.labelKey)}
            </button>
          ))}
        </div>
      )}

      {/* Empty state — all channels configured */}
      {channels.length === 0 && !addingType && availableToAdd.length > 0 && (
        <p
          className="text-sm"
          style={{ fontFamily: "var(--font-ui)", color: "var(--text-muted)" }}
        >
          {t("channels_hint")}
        </p>
      )}
    </div>
  );
}

// ─── Pushover Config Summary ────────────────────────────────────────────────

function PushoverConfigSummary({ config }: { config: Record<string, unknown> }) {
  const userKey = (config.userKey as string) || "—";
  const masked = userKey.length > 6
    ? `${userKey.slice(0, 3)}${"•".repeat(userKey.length - 6)}${userKey.slice(-3)}`
    : "•••";
  return (
    <p
      className="text-xs"
      style={{
        fontFamily: "var(--font-body)",
        color: "var(--text-muted)",
      }}
    >
      User Key: {masked}
    </p>
  );
}

// ─── Pushover Configuration Form ────────────────────────────────────────────

function PushoverForm({
  onSave,
  onCancel,
}: {
  onSave: (config: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [userKey, setUserKey] = useState("");
  const [appToken, setAppToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!userKey.trim() || !appToken.trim()) return;
    if (!/^[a-zA-Z0-9]+$/.test(userKey.trim())) {
      setError("User key may only contain letters and numbers.");
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(appToken.trim())) {
      setError("App token may only contain letters and numbers.");
      return;
    }

    setSaving(true);
    try {
      const config: Record<string, unknown> = {
        userKey: userKey.trim(),
        appToken: appToken.trim(),
      };

      const res = await fetch("/api/settings/notification-channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "pushover", config, enabled: true }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }

      onSave(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("channel_err_save"));
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    fontFamily: "var(--font-body)",
    backgroundColor: "var(--bg-primary)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg p-4 flex flex-col gap-3"
      style={{
        backgroundColor: "var(--bg-elevated)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-sm font-medium"
          style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
        >
          {t("channel_pushover_label")}
        </span>
      </div>
      <p
        className="text-xs -mt-2"
        style={{ fontFamily: "var(--font-ui)", color: "var(--text-muted)" }}
      >
        {t("channel_pushover_hint")}
      </p>

      {/* User Key input */}
      <div className="flex flex-col gap-1">
        <label
          className="text-xs font-medium"
          style={{ fontFamily: "var(--font-ui)", color: "var(--text-secondary)" }}
        >
          {t("pushover_userkey_label")}
        </label>
        <input
          type="text"
          value={userKey}
          onChange={(e) => setUserKey(e.target.value)}
          placeholder={t("pushover_userkey_placeholder")}
          className="w-full px-3 py-2 rounded-md text-sm"
          style={inputStyle}
          maxLength={50}
          required
        />
      </div>

      {/* App Token input */}
      <div className="flex flex-col gap-1">
        <label
          className="text-xs font-medium"
          style={{ fontFamily: "var(--font-ui)", color: "var(--text-secondary)" }}
        >
          {t("pushover_apptoken_label")}
        </label>
        <input
          type="text"
          value={appToken}
          onChange={(e) => setAppToken(e.target.value)}
          placeholder={t("pushover_apptoken_placeholder")}
          className="w-full px-3 py-2 rounded-md text-sm"
          style={inputStyle}
          maxLength={50}
          required
        />
        <p
          className="text-xs"
          style={{ fontFamily: "var(--font-ui)", color: "var(--text-muted)" }}
        >
          {t("pushover_apptoken_hint")}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <p
          className="text-xs"
          style={{ fontFamily: "var(--font-ui)", color: "var(--color-error, #ef4444)" }}
        >
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !userKey.trim() || !appToken.trim()}
          className="text-sm px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          style={{
            fontFamily: "var(--font-ui)",
            backgroundColor: "var(--color-accent, #f0a500)",
            color: "var(--bg-primary)",
          }}
        >
          {saving ? "..." : tCommon("save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm px-4 py-2 rounded-lg transition-colors"
          style={{
            fontFamily: "var(--font-ui)",
            backgroundColor: "var(--bg-surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
        >
          {tCommon("cancel")}
        </button>
      </div>
    </form>
  );
}

// ─── ntfy.sh Config Summary ─────────────────────────────────────────────────

function NtfyConfigSummary({ config }: { config: Record<string, unknown> }) {
  const topic = (config.topic as string) || "—";
  const server = (config.server as string) || "ntfy.sh";
  return (
    <p
      className="text-xs"
      style={{
        fontFamily: "var(--font-body)",
        color: "var(--text-muted)",
      }}
    >
      {server.replace(/^https?:\/\//, "")}/{topic}
    </p>
  );
}

// ─── ntfy.sh Configuration Form ─────────────────────────────────────────────

function NtfyForm({
  onSave,
  onCancel,
}: {
  onSave: (config: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [topic, setTopic] = useState("");
  const [server, setServer] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!topic.trim()) return;
    if (!/^[a-zA-Z0-9_\-]+$/.test(topic.trim())) {
      setError("Topic may only contain letters, numbers, hyphens, and underscores.");
      return;
    }

    setSaving(true);
    try {
      const config: Record<string, unknown> = { topic: topic.trim() };
      if (server.trim()) config.server = server.trim();

      const res = await fetch("/api/settings/notification-channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ntfy", config, enabled: true }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }

      onSave(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("channel_err_save"));
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    fontFamily: "var(--font-body)",
    backgroundColor: "var(--bg-primary)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg p-4 flex flex-col gap-3"
      style={{
        backgroundColor: "var(--bg-elevated)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-sm font-medium"
          style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
        >
          {t("channel_ntfy_label")}
        </span>
      </div>
      <p
        className="text-xs -mt-2"
        style={{ fontFamily: "var(--font-ui)", color: "var(--text-muted)" }}
      >
        {t("channel_ntfy_hint")}
      </p>

      {/* Topic input */}
      <div className="flex flex-col gap-1">
        <label
          className="text-xs font-medium"
          style={{ fontFamily: "var(--font-ui)", color: "var(--text-secondary)" }}
        >
          {t("ntfy_topic_label")}
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={t("ntfy_topic_placeholder")}
          className="w-full px-3 py-2 rounded-md text-sm"
          style={inputStyle}
          maxLength={200}
          required
        />
      </div>

      {/* Advanced toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-xs self-start"
        style={{
          fontFamily: "var(--font-ui)",
          color: "var(--text-muted)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          textDecoration: "underline",
        }}
      >
        {t("ntfy_advanced")} {showAdvanced ? "▴" : "▾"}
      </button>

      {/* Server URL (advanced) */}
      {showAdvanced && (
        <div className="flex flex-col gap-1">
          <label
            className="text-xs font-medium"
            style={{ fontFamily: "var(--font-ui)", color: "var(--text-secondary)" }}
          >
            {t("ntfy_server_label")}
          </label>
          <input
            type="url"
            value={server}
            onChange={(e) => setServer(e.target.value)}
            placeholder={t("ntfy_server_placeholder")}
            className="w-full px-3 py-2 rounded-md text-sm"
            style={inputStyle}
            maxLength={500}
          />
          <p
            className="text-xs"
            style={{ fontFamily: "var(--font-ui)", color: "var(--text-muted)" }}
          >
            {t("ntfy_server_hint")}
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p
          className="text-xs"
          style={{ fontFamily: "var(--font-ui)", color: "var(--color-error, #ef4444)" }}
        >
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !topic.trim()}
          className="text-sm px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          style={{
            fontFamily: "var(--font-ui)",
            backgroundColor: "var(--color-accent, #f0a500)",
            color: "var(--bg-primary)",
          }}
        >
          {saving ? "..." : tCommon("save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm px-4 py-2 rounded-lg transition-colors"
          style={{
            fontFamily: "var(--font-ui)",
            backgroundColor: "var(--bg-surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
        >
          {tCommon("cancel")}
        </button>
      </div>
    </form>
  );
}

// ─── Telegram Config Summary ────────────────────────────────────────────────

function TelegramConfigSummary({ config }: { config: Record<string, unknown> }) {
  const chatId = (config.chatId as string) || "—";
  const masked =
    chatId.length > 6
      ? `${chatId.slice(0, 3)}${"•".repeat(chatId.length - 6)}${chatId.slice(-3)}`
      : "•••";
  return (
    <p
      className="text-xs"
      style={{
        fontFamily: "var(--font-body)",
        color: "var(--text-muted)",
      }}
    >
      Chat ID: {masked}
    </p>
  );
}

// ─── Telegram Configuration Form ────────────────────────────────────────────

function TelegramForm({
  onSave,
  onCancel,
}: {
  onSave: (config: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!botToken.trim() || !chatId.trim()) return;
    if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(botToken.trim())) {
      setError("Bot token must be in the format <bot_id>:<secret>.");
      return;
    }
    if (!/^-?\d+$/.test(chatId.trim())) {
      setError("Chat ID must be a numeric ID (optionally negative).");
      return;
    }

    setSaving(true);
    try {
      const config: Record<string, unknown> = {
        botToken: botToken.trim(),
        chatId: chatId.trim(),
      };

      const res = await fetch("/api/settings/notification-channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "telegram", config, enabled: true }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }

      onSave(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("channel_err_save"));
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    fontFamily: "var(--font-body)",
    backgroundColor: "var(--bg-primary)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg p-4 flex flex-col gap-3"
      style={{
        backgroundColor: "var(--bg-elevated)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-sm font-medium"
          style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
        >
          {t("channel_telegram_label")}
        </span>
      </div>
      <p
        className="text-xs -mt-2"
        style={{ fontFamily: "var(--font-ui)", color: "var(--text-muted)" }}
      >
        {t("channel_telegram_hint")}
      </p>

      {/* Bot Token input */}
      <div className="flex flex-col gap-1">
        <label
          className="text-xs font-medium"
          style={{ fontFamily: "var(--font-ui)", color: "var(--text-secondary)" }}
        >
          {t("telegram_bottoken_label")}
        </label>
        <input
          type="text"
          value={botToken}
          onChange={(e) => setBotToken(e.target.value)}
          placeholder={t("telegram_bottoken_placeholder")}
          className="w-full px-3 py-2 rounded-md text-sm"
          style={inputStyle}
          maxLength={100}
          required
        />
        <p
          className="text-xs"
          style={{ fontFamily: "var(--font-ui)", color: "var(--text-muted)" }}
        >
          {t("telegram_bottoken_hint")}
        </p>
      </div>

      {/* Chat ID input */}
      <div className="flex flex-col gap-1">
        <label
          className="text-xs font-medium"
          style={{ fontFamily: "var(--font-ui)", color: "var(--text-secondary)" }}
        >
          {t("telegram_chatid_label")}
        </label>
        <input
          type="text"
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          placeholder={t("telegram_chatid_placeholder")}
          className="w-full px-3 py-2 rounded-md text-sm"
          style={inputStyle}
          maxLength={32}
          required
        />
        <p
          className="text-xs"
          style={{ fontFamily: "var(--font-ui)", color: "var(--text-muted)" }}
        >
          {t("telegram_chatid_hint")}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <p
          className="text-xs"
          style={{ fontFamily: "var(--font-ui)", color: "var(--color-error, #ef4444)" }}
        >
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !botToken.trim() || !chatId.trim()}
          className="text-sm px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          style={{
            fontFamily: "var(--font-ui)",
            backgroundColor: "var(--color-accent, #f0a500)",
            color: "var(--bg-primary)",
          }}
        >
          {saving ? "..." : tCommon("save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm px-4 py-2 rounded-lg transition-colors"
          style={{
            fontFamily: "var(--font-ui)",
            backgroundColor: "var(--bg-surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
        >
          {tCommon("cancel")}
        </button>
      </div>
    </form>
  );
}

// ─── Email Config Summary ───────────────────────────────────────────────────

function EmailConfigSummary({ config }: { config: Record<string, unknown> }) {
  const address = (config.address as string) || "—";
  return (
    <p
      className="text-xs"
      style={{
        fontFamily: "var(--font-body)",
        color: "var(--text-muted)",
      }}
    >
      {address}
    </p>
  );
}

// ─── Email Configuration Form ───────────────────────────────────────────────

function EmailForm({
  defaultAddress,
  onSave,
  onCancel,
}: {
  defaultAddress: string;
  onSave: (config: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [address, setAddress] = useState(defaultAddress);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = address.trim();
    if (!trimmed) return;
    // Basic email shape check — server-side Zod is the source of truth
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSaving(true);
    try {
      const config: Record<string, unknown> = { address: trimmed };

      const res = await fetch("/api/settings/notification-channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "email", config, enabled: true }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }

      onSave(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("channel_err_save"));
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    fontFamily: "var(--font-body)",
    backgroundColor: "var(--bg-primary)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg p-4 flex flex-col gap-3"
      style={{
        backgroundColor: "var(--bg-elevated)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-sm font-medium"
          style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
        >
          {t("channel_email_label")}
        </span>
      </div>
      <p
        className="text-xs -mt-2"
        style={{ fontFamily: "var(--font-ui)", color: "var(--text-muted)" }}
      >
        {t("channel_email_hint")}
      </p>

      {/* Address input */}
      <div className="flex flex-col gap-1">
        <label
          className="text-xs font-medium"
          style={{ fontFamily: "var(--font-ui)", color: "var(--text-secondary)" }}
        >
          {t("email_address_label")}
        </label>
        <input
          type="email"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t("email_address_placeholder")}
          className="w-full px-3 py-2 rounded-md text-sm"
          style={inputStyle}
          maxLength={254}
          required
        />
        <p
          className="text-xs"
          style={{ fontFamily: "var(--font-ui)", color: "var(--text-muted)" }}
        >
          {t("email_address_hint")}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <p
          className="text-xs"
          style={{ fontFamily: "var(--font-ui)", color: "var(--color-error, #ef4444)" }}
        >
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !address.trim()}
          className="text-sm px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          style={{
            fontFamily: "var(--font-ui)",
            backgroundColor: "var(--color-accent, #f0a500)",
            color: "var(--bg-primary)",
          }}
        >
          {saving ? "..." : tCommon("save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm px-4 py-2 rounded-lg transition-colors"
          style={{
            fontFamily: "var(--font-ui)",
            backgroundColor: "var(--bg-surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
        >
          {tCommon("cancel")}
        </button>
      </div>
    </form>
  );
}

// ─── Webhook Config Summary ─────────────────────────────────────────────────

function WebhookConfigSummary({ config }: { config: Record<string, unknown> }) {
  const url = String(config.url ?? "");
  const display = url.length > 60 ? `${url.slice(0, 57)}…` : url;
  return (
    <p
      className="text-xs break-all"
      style={{
        fontFamily: "var(--font-body)",
        color: "var(--text-muted)",
      }}
    >
      {display || "—"}
    </p>
  );
}

// ─── Webhook Configuration Form ─────────────────────────────────────────────

function WebhookForm({
  onSave,
  onCancel,
}: {
  onSave: (config: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [url, setUrl] = useState("");
  const [signRequests, setSignRequests] = useState(false);
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    // Client-side URL shape check — server Zod is the source of truth
    try {
      new URL(trimmedUrl);
    } catch {
      setError("Please enter a valid URL (https://…).");
      return;
    }

    setSaving(true);
    try {
      const config: Record<string, unknown> = { url: trimmedUrl };
      if (signRequests && secret.trim()) {
        config.secret = secret.trim();
      }

      const res = await fetch("/api/settings/notification-channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "webhook", config, enabled: true }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }

      onSave(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("channel_err_save"));
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    fontFamily: "var(--font-body)",
    backgroundColor: "var(--bg-primary)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg p-4 flex flex-col gap-3"
      style={{
        backgroundColor: "var(--bg-elevated)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-sm font-medium"
          style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
        >
          {t("channel_webhook_label")}
        </span>
      </div>
      <p
        className="text-xs -mt-2"
        style={{ fontFamily: "var(--font-ui)", color: "var(--text-muted)" }}
      >
        {t("channel_webhook_hint")}
      </p>

      {/* URL input */}
      <div className="flex flex-col gap-1">
        <label
          className="text-xs font-medium"
          style={{ fontFamily: "var(--font-ui)", color: "var(--text-secondary)" }}
        >
          {t("webhook_url_label")}
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t("webhook_url_placeholder")}
          className="w-full px-3 py-2 rounded-md text-sm"
          style={inputStyle}
          maxLength={2000}
          required
        />
        <p
          className="text-xs"
          style={{ fontFamily: "var(--font-ui)", color: "var(--text-muted)" }}
        >
          {t("webhook_payload_note")}
        </p>
      </div>

      {/* HMAC signing toggle */}
      <label
        className="flex items-center gap-2 cursor-pointer select-none"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        <input
          type="checkbox"
          checked={signRequests}
          onChange={(e) => setSignRequests(e.target.checked)}
          className="rounded"
          style={{ accentColor: "var(--color-accent, #f0a500)" }}
        />
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {t("webhook_sign_label")}
        </span>
      </label>

      {/* Secret input (shown only when signing is enabled) */}
      {signRequests && (
        <div className="flex flex-col gap-1">
          <label
            className="text-xs font-medium"
            style={{ fontFamily: "var(--font-ui)", color: "var(--text-secondary)" }}
          >
            {t("webhook_secret_label")}
          </label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={t("webhook_secret_placeholder")}
            className="w-full px-3 py-2 rounded-md text-sm"
            style={inputStyle}
            maxLength={200}
            autoComplete="new-password"
          />
          <p
            className="text-xs"
            style={{ fontFamily: "var(--font-ui)", color: "var(--text-muted)" }}
          >
            {t("webhook_secret_hint")}
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p
          className="text-xs"
          style={{ fontFamily: "var(--font-ui)", color: "var(--color-error, #ef4444)" }}
        >
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !url.trim()}
          className="text-sm px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          style={{
            fontFamily: "var(--font-ui)",
            backgroundColor: "var(--color-accent, #f0a500)",
            color: "var(--bg-primary)",
          }}
        >
          {saving ? "..." : tCommon("save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm px-4 py-2 rounded-lg transition-colors"
          style={{
            fontFamily: "var(--font-ui)",
            backgroundColor: "var(--bg-surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
        >
          {tCommon("cancel")}
        </button>
      </div>
    </form>
  );
}
