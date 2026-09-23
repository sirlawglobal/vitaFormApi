import { Injectable, NotFoundException } from '@nestjs/common';
import { Dealer } from './dealers.schema';
import { DealersRepository } from './dealers.repository';
import { FALLBACK_DEALERS } from './dealers.fallback';
import { haversineDistanceKm } from '../../common/utils/geo.util';

export interface DealersResult {
  source: 'database' | 'fallback';
  dealers: any[];
}

function toPublicShape(d: Dealer) {
  return {
    _id: (d as any)._id?.toString?.() ?? (d as any).id,
    name: d.name,
    address: d.address,
    city: d.city,
    state: d.state,
    contactPhone: d.contactPhone,
    contactEmail: d.contactEmail,
    operatingHours: d.operatingHours,
    location: d.location,
  };
}

function fallbackToPublicShape(d: (typeof FALLBACK_DEALERS)[number]) {
  return {
    _id: d.id,
    name: d.name,
    address: d.address,
    city: d.city,
    state: d.state,
    contactPhone: d.phone,
    operatingHours: d.operatingHours,
    location: { type: 'Point', coordinates: [d.lng, d.lat] },
  };
}

@Injectable()
export class DealersService {
  constructor(private readonly dealersRepository: DealersRepository) {}

  // Full public dealer directory — admin-onboarded data, or the static
  // fallback list when nothing has been onboarded yet.
  async getPublicDealers(): Promise<DealersResult> {
    const dealers = await this.dealersRepository.findAllActive();
    if (dealers.length > 0) {
      return { source: 'database', dealers: dealers.map(toPublicShape) };
    }
    return { source: 'fallback', dealers: FALLBACK_DEALERS.map(fallbackToPublicShape) };
  }

  // GPS-based proximity search against admin-onboarded dealers.
  async getNearbyDealers(lat: number, lng: number, radiusKm: number = 20): Promise<DealersResult> {
    const maxDistanceMeters = radiusKm * 1000;
    const dealers = await this.dealersRepository.findNearby(lng, lat, maxDistanceMeters);
    if (dealers.length > 0) {
      return { source: 'database', dealers: dealers.map(toPublicShape) };
    }

    const fallback = FALLBACK_DEALERS.map((d) => ({ ...d, distanceKm: haversineDistanceKm(lat, lng, d.lat, d.lng) }))
      .filter((d) => d.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .map(fallbackToPublicShape);
    return { source: 'fallback', dealers: fallback };
  }

  // Search by an arbitrary place name (city/state), independent of the
  // caller's own location — e.g. searching "Enugu" while based in Lagos.
  async searchDealersByLocation(location: string): Promise<DealersResult> {
    const dealers = await this.dealersRepository.findByLocationText(location);
    if (dealers.length > 0) {
      return { source: 'database', dealers: dealers.map(toPublicShape) };
    }

    const needle = location.trim().toLowerCase();
    const fallback = FALLBACK_DEALERS.filter(
      (d) =>
        d.city.toLowerCase().includes(needle) ||
        d.state.toLowerCase().includes(needle) ||
        d.address.toLowerCase().includes(needle),
    ).map(fallbackToPublicShape);
    return { source: 'fallback', dealers: fallback };
  }

  async createDealer(data: any) {
    return this.dealersRepository.create({
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state,
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
