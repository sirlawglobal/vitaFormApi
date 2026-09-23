import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DealersRepository } from './dealers.repository';
import { GooglePlacesService } from './google-places.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache-keys.constants';
import { FALLBACK_DEALERS } from './dealers.fallback';
import { haversineDistanceKm } from '../../common/utils/geo.util';

export interface NearbyDealersResult {
  source: 'google_places' | 'fallback';
  dealers: any[];
}

// Fallback results are cached briefly so that once a real API key is
// configured, clients start seeing real data within a minute instead of
// waiting out the full DEALERS cache TTL.
const FALLBACK_CACHE_TTL_SECONDS = 60;

@Injectable()
export class DealersService {
  private readonly logger = new Logger(DealersService.name);

  constructor(
    private readonly dealersRepository: DealersRepository,
    private readonly googlePlaces: GooglePlacesService,
    private readonly cache: CacheService,
  ) {}

  // Backed by Google Places (real-world data) rather than the admin-curated
  // `dealers` collection, so results don't depend on anyone having manually
  // created dealer records. Falls back to a small static seed list — served
  // from here so every client (web, mobile, …) sees identical fallback
  // behavior instead of each one hardcoding its own copy.
  async getNearbyDealers(lat: number, lng: number, radiusKm: number = 20): Promise<NearbyDealersResult> {
    const cacheKey = CACHE_KEYS.dealers(lat, lng, radiusKm);
    const cached = await this.cache.get<NearbyDealersResult>(cacheKey);
    if (cached) return cached;

    let result: NearbyDealersResult;
    try {
      const places = await this.googlePlaces.searchNearby(lat, lng, radiusKm);
      result = {
        source: 'google_places',
        dealers: places.map((p) => ({
          _id: p.id,
          name: p.name,
          address: p.address,
          contactPhone: p.phone,
          operatingHours: p.operatingHours,
          rating: p.rating,
          location: { type: 'Point', coordinates: [p.lng, p.lat] },
        })),
      };
    } catch (err) {
      this.logger.warn(`Google Places unavailable, serving fallback dealers: ${(err as Error).message}`);
      result = { source: 'fallback', dealers: this.getFallbackDealers(lat, lng, radiusKm) };
    }

    await this.cache.set(cacheKey, result, result.source === 'fallback' ? FALLBACK_CACHE_TTL_SECONDS : CACHE_TTL.DEALERS);
    return result;
  }

  private getFallbackDealers(lat: number, lng: number, radiusKm: number) {
    return FALLBACK_DEALERS.map((d) => ({ ...d, distanceKm: haversineDistanceKm(lat, lng, d.lat, d.lng) }))
      .filter((d) => d.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .map((d) => ({
        _id: d.id,
        name: d.name,
        address: d.address,
        contactPhone: d.phone,
        operatingHours: d.operatingHours,
        location: { type: 'Point', coordinates: [d.lng, d.lat] },
      }));
  }

  async createDealer(data: any) {
    return this.dealersRepository.create({
      name: data.name,
      address: data.address,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      operatingHours: data.operatingHours,
      location: {
        type: 'Point',
        coordinates: [data.lng, data.lat], // Longitude first!
      },
    });
  }

  async updateDealer(id: string, data: any) {
    const payload: any = { ...data };
    if (data.lat !== undefined && data.lng !== undefined) {
      payload.location = {
        type: 'Point',
        coordinates: [data.lng, data.lat],
      };
    }
    
    const updated = await this.dealersRepository.update(id, payload);
    if (!updated) {
      throw new NotFoundException('Dealer not found');
    }
    return updated;
  }

  async getAllDealers() {
    return this.dealersRepository.findAll();
  }
}
