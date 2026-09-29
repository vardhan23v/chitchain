type EventName =
  | 'circle_created'
  | 'circle_joined'
  | 'bid_placed'
  | 'wallet_connected'
  | 'theme_toggled';

export function trackEvent(name: EventName, properties?: Record<string, any>) {
  if (typeof window === 'undefined') return;

  if (process.env.NODE_ENV === 'development') {
    console.debug(`[Analytics Event] ${name}`, properties);
  }

  const win = window as any;
  if (win.dataLayer) {
    win.dataLayer.push({ event: name, ...properties });
  }
}
