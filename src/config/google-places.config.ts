import { registerAs } from '@nestjs/config';

export default registerAs('googlePlaces', () => ({
  apiKey: process.env.GOOGLE_PLACES_API_KEY ?? '',
  // The brand/name we search for on Google Places near the user's location.
  searchQuery: process.env.GOOGLE_PLACES_QUERY ?? 'Vitafoam',
}));
