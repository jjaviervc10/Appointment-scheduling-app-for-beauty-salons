function upsertLink(rel: string, href: string) {
  const existing = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  const link = existing ?? document.createElement('link');

  link.rel = rel;
  link.href = href;

  if (!existing) {
    document.head.appendChild(link);
  }
}

function upsertMeta(name: string, content: string) {
  const existing = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  const meta = existing ?? document.createElement('meta');

  meta.name = name;
  meta.content = content;

  if (!existing) {
    document.head.appendChild(meta);
  }
}

export function ensurePwaHeadLinks() {
  if (typeof document === 'undefined') return;

  upsertLink('manifest', '/manifest.json');
  upsertLink('apple-touch-icon', '/assets/icons/icon-192.png');
  upsertMeta('theme-color', '#D4AF37');
  upsertMeta('mobile-web-app-capable', 'yes');
  upsertMeta('apple-mobile-web-app-capable', 'yes');
  upsertMeta('apple-mobile-web-app-title', 'Barber Studio');
  upsertMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
}

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (window.location.protocol !== 'https:') return;
  if (process.env.NODE_ENV !== 'production') return;

  const register = () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch((error) => {
        console.warn('[PWA] Service worker registration failed', error);
      });
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }
}
