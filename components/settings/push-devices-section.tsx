"use client";

/**
 * PushDevicesSection — manage individual web push subscriptions per device.
 *
 * Shows all registered devices with name, enabled toggle, and remove button.
 * Marks the current browser as "Dieses Gerät" by comparing subscription endpoints.
 * Users can rename any device and enable/disable notifications per device.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faBellSlash,
  faTrash,
  faDesktop,
  faMobileScreen,
  faLaptop,
  faTabletScreenButton,
  faPen,
  faCheck,
  faXmark,
  faArrowsRotate,
} from "@fortawesome/free-solid-svg-icons";

interface PushDevice {
  id: string;
  name: string | null;
  enabled: boolean;
  createdAt: string;
  endpoint: string;
}

/** Infer a device icon from its name string. */
function deviceIcon(name: string | null) {
  const n = (name ?? "").toLowerCase();
  if (n.includes("mobile") || n.includes("android") || n.includes("iphone")) return faMobileScreen;
  if (n.includes("tablet") || n.includes("ipad")) return faTabletScreenButton;
  if (n.includes("laptop") || n.includes("macbook")) return faLaptop;
  return faDesktop;
}

/** Format a date as a human-readable relative string. */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface RenameRowProps {
  device: PushDevice;
  onSave: (id: string, name: string) => Promise<void>;
  onCancel: () => void;
}

function RenameRow({ device, onSave, onCancel }: RenameRowProps) {
  const [value, setValue] = useState(device.name ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    await onSave(device.id, value.trim());
    setSaving(false);
  };

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") onCancel();
        }}
        maxLength={80}
        className="flex-1 min-w-0 px-2 py-0.5 rounded text-sm"
        style={{
          fontFamily: "var(--font-ui)",
          backgroundColor: "var(--bg-base)",
          border: "1px solid var(--accent-amber)",
          color: "var(--text-primary)",
          outline: "none",
        }}
      />
      <button
        onClick={handleSave}
        disabled={saving || !value.trim()}
        className="p-1 rounded transition-colors"
        style={{ color: "var(--accent-green)" }}
        title="Speichern"
      >
        <FontAwesomeIcon icon={faCheck} style={{ fontSize: "0.75rem" }} />
      </button>
      <button
        onClick={onCancel}
        className="p-1 rounded transition-colors"
        style={{ color: "var(--text-muted)" }}
        title="Abbrechen"
      >
        <FontAwesomeIcon icon={faXmark} style={{ fontSize: "0.75rem" }} />
      </button>
    </div>
  );
}

export function PushDevicesSection() {
  const [devices, setDevices] = useState<PushDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Detect current device's push subscription endpoint
  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          if (sub) setCurrentEndpoint(sub.endpoint);
        })
        .catch(() => {});
    }
  }, []);

  const fetchDevices = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(false);

    try {
      const res = await fetch("/api/push/devices");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setDevices(data.devices ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleToggle = async (device: PushDevice) => {
    setTogglingId(device.id);
    try {
      const res = await fetch(`/api/push/devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !device.enabled }),
      });
      if (res.ok) {
        setDevices((prev) =>
          prev.map((d) => (d.id === device.id ? { ...d, enabled: !d.enabled } : d))
        );
      }
    } finally {
      setTogglingId(null);
    }
  };

  const handleRename = async (id: string, name: string) => {
    const res = await fetch(`/api/push/devices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
    }
    setRenamingId(null);
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      const res = await fetch(`/api/push/devices/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDevices((prev) => prev.filter((d) => d.id !== id));
      }
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg animate-pulse" style={{ backgroundColor: "var(--bg-hover)" }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
        Geräte konnten nicht geladen werden.
      </p>
    );
  }

  if (devices.length === 0) {
    return (
      <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
        Keine Geräte registriert. Aktiviere Web Push, um dein erstes Gerät hinzuzufügen.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Refresh */}
      <div className="flex justify-end mb-1">
        <button
          onClick={() => fetchDevices(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors"
          style={{ fontFamily: "var(--font-ui)", color: "var(--text-secondary)", backgroundColor: "var(--bg-hover)" }}
        >
          <FontAwesomeIcon icon={faArrowsRotate} className={refreshing ? "animate-spin" : ""} style={{ fontSize: "0.7rem" }} />
          Aktualisieren
        </button>
      </div>

      {/* Device list */}
      <div
        className="rounded-lg overflow-hidden divide-y"
        style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-base)" }}
      >
        {devices.map((device) => {
          const isCurrent = currentEndpoint === device.endpoint;
          const icon = deviceIcon(device.name);
          const isRenaming = renamingId === device.id;
          const isToggling = togglingId === device.id;
          const isRemoving = removingId === device.id;
          const displayName = device.name || "Unbekanntes Gerät";

          return (
            <div
              key={device.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{
                opacity: isRemoving ? 0.4 : 1,
                transition: "opacity 0.2s",
                backgroundColor: !device.enabled ? "color-mix(in srgb, var(--bg-hover) 50%, transparent)" : undefined,
              }}
            >
              {/* Icon */}
              <FontAwesomeIcon
                icon={icon}
                style={{
                  fontSize: "1rem",
                  color: device.enabled ? "var(--accent-amber)" : "var(--text-muted)",
                  flexShrink: 0,
                  width: "1.2rem",
                }}
              />

              {/* Name + meta */}
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                {isRenaming ? (
                  <RenameRow
                    device={device}
                    onSave={handleRename}
                    onCancel={() => setRenamingId(null)}
                  />
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="text-sm font-medium truncate"
                      style={{
                        fontFamily: "var(--font-ui)",
                        color: device.enabled ? "var(--text-primary)" : "var(--text-muted)",
                      }}
                    >
                      {displayName}
                    </span>
                    {isCurrent && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full shrink-0"
                        style={{
                          fontFamily: "var(--font-ui)",
                          backgroundColor: "color-mix(in srgb, var(--accent-amber) 15%, transparent)",
                          color: "var(--accent-amber)",
                          border: "1px solid color-mix(in srgb, var(--accent-amber) 30%, transparent)",
                        }}
                      >
                        Dieses Gerät
                      </span>
                    )}
                    {!device.enabled && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full shrink-0"
                        style={{
                          fontFamily: "var(--font-ui)",
                          backgroundColor: "var(--bg-hover)",
                          color: "var(--text-muted)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        Deaktiviert
                      </span>
                    )}
                    <button
                      onClick={() => setRenamingId(device.id)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-100"
                      style={{ color: "var(--text-muted)" }}
                      title="Umbenennen"
                    >
                      <FontAwesomeIcon icon={faPen} style={{ fontSize: "0.6rem" }} />
                    </button>
                  </div>
                )}
                {!isRenaming && (
                  <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
                    Hinzugefügt am {formatDate(device.createdAt)}
                  </span>
                )}
              </div>

              {/* Actions */}
              {!isRenaming && (
                <div className="flex items-center gap-1 shrink-0">
                  {/* Enable/disable toggle */}
                  <button
                    onClick={() => handleToggle(device)}
                    disabled={isToggling || isRemoving}
                    className="p-2 rounded-lg transition-colors"
                    style={{
                      color: device.enabled ? "var(--accent-amber)" : "var(--text-muted)",
                      backgroundColor: "transparent",
                    }}
                    title={device.enabled ? "Benachrichtigungen deaktivieren" : "Benachrichtigungen aktivieren"}
                  >
                    <FontAwesomeIcon
                      icon={device.enabled ? faBell : faBellSlash}
                      style={{ fontSize: "0.85rem" }}
                    />
                  </button>

                  {/* Remove */}
                  <button
                    onClick={() => handleRemove(device.id)}
                    disabled={isRemoving || isToggling}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: "var(--text-muted)" }}
                    title="Gerät entfernen"
                  >
                    <FontAwesomeIcon
                      icon={faTrash}
                      className={isRemoving ? "animate-pulse" : ""}
                      style={{ fontSize: "0.75rem" }}
                    />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
