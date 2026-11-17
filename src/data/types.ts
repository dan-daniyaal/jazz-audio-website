export type DayHours = { open: string; close: string } | null; // "09:30", 24 h; null = closed
export type WeekHours = [DayHours, DayHours, DayHours, DayHours, DayHours, DayHours, DayHours]; // index 0 = Sunday

export interface Business {
  name: string;
  longName: string;
  tagline: string;
  bio: string;
  street: string;
  cityLine: string;
  phoneDisplay: string;
  phoneHref: string;
  timeZone: string;
  hours: WeekHours;
  directionsUrl: string;
  instagram: string;
  facebook: string;
  lat: number;
  lng: number;
}

export interface Service {
  id: string;
  title: string;
  body: string;
}

export interface Look {
  id: 'blue' | 'green' | 'white';
  name: string;
  hex: string;
  ink: string;
  line: string;
}

export interface WorkItem {
  id: string;
  title: string;
  line: string;
  post: string;
  img: string;
}

export interface OpenStatus {
  isOpen: boolean;
  label: string;
  todayIndex: number;
}
