import type { Business, DayHours } from './types';

const weekday: DayHours = { open: '09:30', close: '18:00' };

export const business: Business = {
  name: 'Jazz Audio',
  longName: 'Jazz Audio Sound and Security',
  tagline: 'Sound, Security, Video',
  bio: 'Car sound and security in Selden, NY',
  street: '1198 Middle Country Rd',
  cityLine: 'Selden, NY 11784',
  phoneDisplay: '(631) 696-0303',
  phoneHref: 'tel:+16316960303',
  timeZone: 'America/New_York',
  // TODO: confirm with owner
  hours: [null, weekday, weekday, weekday, weekday, weekday, weekday],
  directionsUrl:
    'https://www.google.com/maps/place/Jazz+Audio/@40.862195,-73.0547942,93m/data=!3m1!1e3!4m15!1m8!3m7!1s0x89e8470f107fcc1d:0x36dcbdb5ba87c9cb!2s1198+Middle+Country+Rd,+Selden,+NY+11784!3b1!8m2!3d40.8624396!4d-73.0544553!16s%2Fg%2F11mrl3skqv!3m5!1s0x89e8470f1d9052e3:0x8e78cf8ea87066c3!8m2!3d40.8624272!4d-73.0547551!16s%2Fg%2F1tdv_xxg?hl=en-GB',
  instagram: 'https://www.instagram.com/jazzaudioselden/',
  facebook: 'https://www.facebook.com/jazz-audio-sound-and-security', // TODO: confirm with owner
  lat: 40.8624272,
  lng: -73.0547551,
};
