/**
 * Static seed data used only when the admin hasn't onboarded any dealers
 * yet (the `dealers` collection is empty). Keeps the dealer-locator pages
 * from showing a completely blank state before real data exists.
 */
export interface FallbackDealer {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone?: string;
  operatingHours?: string;
  lat: number;
  lng: number;
}

export const FALLBACK_DEALERS: FallbackDealer[] = [
  {
    id: 'fallback-ikeja',
    name: 'Vitafoam Comfort Center - Ikeja',
    address: '131 Awolowo Way, Ikeja, Lagos',
    city: 'Ikeja',
    state: 'Lagos',
    phone: '+234 800 000 0001',
    operatingHours: 'Mon - Sat: 9am - 6pm',
    lat: 6.6018,
    lng: 3.3515,
  },
  {
    id: 'fallback-victoria-island',
    name: 'Sleep Gallery VI',
    address: 'Plot 4, Adetokunbo Ademola Street, Victoria Island, Lagos',
    city: 'Victoria Island',
    state: 'Lagos',
    phone: '+234 800 000 0002',
    operatingHours: 'Mon - Sat: 9am - 6pm',
    lat: 6.4281,
    lng: 3.4239,
  },
  {
    id: 'fallback-surulere',
    name: 'Vitafoam Depot Surulere',
    address: '84 Adeniran Ogunsanya St, Surulere, Lagos',
    city: 'Surulere',
    state: 'Lagos',
    phone: '+234 800 000 0003',
    operatingHours: 'Mon - Sat: 9am - 6pm',
    lat: 6.4926,
    lng: 3.3542,
  },
];
