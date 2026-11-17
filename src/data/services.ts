import type { Service } from './types';

export const services: Service[] = [
  {
    id: 'sound',
    title: 'Sound',
    body: 'Head units, amps, subs and speakers. Custom sub boxes and kick panels built for your car.',
  },
  {
    id: 'security',
    title: 'Security and remote start',
    body: 'Car alarms and remote starters.',
  },
  {
    id: 'lighting',
    title: 'Lighting',
    body: 'LED, underglow and rock lights. We only do the best lighting installs on your trucks.',
  },
  {
    id: 'video',
    title: 'Mobile video',
    body: 'Screens and video for your car.', // TODO: confirm with owner
  },
  {
    id: 'custom',
    title: 'Custom work',
    body: 'Custom bumpers, light bars and one-off builds.', // TODO: confirm with owner
  },
  {
    id: 'interior',
    title: 'Interior',
    body: 'Katzkin leather seats. Window tint removal.', // TODO: confirm with owner
  },
];
