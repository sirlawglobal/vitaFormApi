/**
 * Static seed data used only when Google Places is unavailable (no API key
 * configured yet, or the request to Google fails). Keeps the API contract
 * identical for every client so nobody has to hardcode their own fallback.
 */
export interface FallbackDealer {
  id: string;
  name: string;
  address: string;
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
    phone: '+234 800 000 0001',
    operatingHours: 'Mon - Sat: 9am - 6pm',
    lat: 6.6018,
    lng: 3.3515,
  },
  {
    id: 'fallback-victoria-island',
    name: 'Sleep Gallery VI',
    address: 'Plot 4, Adetokunbo Ademola Street, Victoria Island, Lagos',
    phone: '+234 800 000 0002',
    operatingHours: 'Mon - Sat: 9am - 6pm',
    lat: 6.4281,
    lng: 3.4239,
  },
  {
    id: 'fallback-surulere',
    name: 'Vitafoam Depot Surulere',
    address: '84 Adeniran Ogunsanya St, Surulere, Lagos',
    phone: '+234 800 000 0003',
    operatingHours: 'Mon - Sat: 9am - 6pm',
    lat: 6.4926,
    lng: 3.3542,
  },
];
