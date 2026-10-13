/* AreaCare service worker: shows push notifications and opens the right page on tap. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "AreaCare", body: event.data && event.data.text() };
  }
  const title = data.title || "AreaCare";
  const urgent = data.tag === "pickup" || data.confirm;
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: data.confirm && data.pickupId ? `confirm-${data.pickupId}` : data.tag,
      renotify: Boolean(data.tag), // buzz again even if an older alert with this tag is still showing
      requireInteraction: Boolean(urgent),
      vibrate: data.confirm ? [300, 120, 300, 120, 300] : [200, 100, 200],
      actions: data.confirm
        ? [
            { action: "confirm-yes", title: "Yes, it's cleared" },
            { action: "confirm-no", title: "Not cleared" },
          ]
        : [],
      data: { url: data.url || "/", pickupId: data.pickupId },
    }),
  );
});

function openUrl(url) {
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const client of list) {
      if ("focus" in client) {
        client.navigate(url);
        return client.focus();
      }
    }
    return self.clients.openWindow(url);
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || "/";

  if (event.action === "confirm-yes" && data.pickupId) {
    // Confirm straight from the notification; fall back to opening the app if that fails.
    event.waitUntil(
      fetch(`/api/pickups/${data.pickupId}/confirm`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cleared: true }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("confirm failed");
          return self.registration.showNotification("Thanks! Pickup confirmed", {
            body: "We've let the crew know your bin was cleared.",
            icon: "/icon.svg",
            tag: `confirm-${data.pickupId}`,
          });
        })
        .catch(() => openUrl("/dashboard?confirm=1")),
    );
    return;
  }
  if (event.action === "confirm-no") {
    event.waitUntil(openUrl("/dashboard?confirm=no"));
    return;
  }
  event.waitUntil(openUrl(url));
});
