// Register service worker strictly in production builds
if (import.meta.env.PROD && 'serviceWorker' in navigator && window.location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.log('SW registration skipped or failed:', err);
    });
  });
}
