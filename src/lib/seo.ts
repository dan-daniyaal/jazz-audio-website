import { business } from '../data/business';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function injectJsonLd(): void {
  if (typeof document === 'undefined') return;
  if (document.head.querySelector('script[data-jsonld="business"]')) return;

  const openingHoursSpecification = business.hours.flatMap((h, i) =>
    h ? [{ '@type': 'OpeningHoursSpecification', dayOfWeek: DAY_NAMES[i], opens: h.open, closes: h.close }] : [],
  );

  const data = {
    '@context': 'https://schema.org',
    '@type': 'AutoPartsStore',
    name: business.longName,
    telephone: business.phoneDisplay,
    url: location.origin,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.street,
      addressLocality: 'Selden',
      addressRegion: 'NY',
      postalCode: '11784',
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: business.lat,
      longitude: business.lng,
    },
    openingHoursSpecification,
    sameAs: [business.instagram],
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-jsonld', 'business');
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}
