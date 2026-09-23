import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PlaceDealer {
  id: string;
  name: string;
  address: string;
  phone?: string;
  operatingHours?: string;
  rating?: number;
  lat: number;
  lng: number;
}

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

// Google's locationBias circle caps at 50km regardless of what the caller asks for.
const MAX_BIAS_RADIUS_METERS = 50_000;

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.internationalPhoneNumber',
  'places.regularOpeningHours',
  'places.rating',
  'places.businessStatus',
].join(',');

@Injectable()
export class GooglePlacesService {
  private readonly logger = new Logger(GooglePlacesService.name);

  constructor(private readonly config: ConfigService) {}

  async searchNearby(lat: number, lng: number, radiusKm: number): Promise<PlaceDealer[]> {
    const apiKey = this.config.get<string>('googlePlaces.apiKey');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Dealer locator is not configured. Set GOOGLE_PLACES_API_KEY to enable it.',
      );
    }

    const query = this.config.get<string>('googlePlaces.searchQuery', 'Vitafoam');
    const radiusMeters = Math.min(radiusKm * 1000, MAX_BIAS_RADIUS_METERS);

    let response: Response;
    try {
      response = await fetch(PLACES_SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery: query,
          locationBias: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: radiusMeters,
            },
          },
        }),
      });
    } catch (err) {
      this.logger.error('Google Places request failed to send', err as Error);
      throw new ServiceUnavailableException('Unable to reach the dealer locator service right now.');
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(`Google Places search failed: ${response.status} ${body}`);
      throw new ServiceUnavailableException('Unable to reach the dealer locator service right now.');
    }

    const data = (await response.json()) as { places?: any[] };
    const places = Array.isArray(data.places) ? data.places : [];

    return places
      .filter((p) => p.businessStatus !== 'CLOSED_PERMANENTLY')
      .map((p): PlaceDealer => ({
        id: p.id,
        name: p.displayName?.text ?? query,
        address: p.formattedAddress ?? '',
        phone: p.internationalPhoneNumber,
        operatingHours: p.regularOpeningHours?.weekdayDescriptions?.join(' | '),
        rating: p.rating,
        lat: p.location?.latitude,
        lng: p.location?.longitude,
      }))
      .filter((d) => typeof d.lat === 'number' && typeof d.lng === 'number');
  }
}
