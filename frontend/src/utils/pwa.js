// PWA registration utility
export function register() {
  if ('serviceWorker' in navigator && window.workbox !== undefined) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .catch((err) => console.error('Service worker registration failed:', err));
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => registration.unregister())
      .catch((err) => console.error('Service worker unregistration failed:', err));
  }
}

// Sync offline measurements when connection is restored
export function setupOnlineSync(syncFn) {
  window.addEventListener('online', () => {
    if (syncFn) syncFn();
  });
}
