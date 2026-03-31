/**
 * Custom Service Worker — push notification handlers for Momo.
 *
 * This file is merged into the generated next-pwa service worker via
 * the `customWorkerDir` option in next.config.ts.
 *
 * Handles:
 *  - Incoming push notifications (show system notification)
 *  - Notification click events (focus or open the target URL)
 */

/**
 * Push event handler — displays a system notification from the push payload.
 * Expects the push data to be a JSON object with title, body, icon, badge,
 * tag, and url fields.
 */
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/favicon.ico",
      badge: "/favicon.ico",
      tag: data.tag || "momo-notification",
      data: { url: data.url || "/dashboard" },
    })
  );
});

/**
 * Notification click handler — closes the notification and opens/focuses
 * the relevant URL in the PWA window.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        const url = event.notification.data?.url || "/dashboard";

        // Try to focus an existing window with the target URL
        for (const client of windowClients) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }

        // No matching window found — open a new one
        return clients.openWindow(url);
      })
  );
});
