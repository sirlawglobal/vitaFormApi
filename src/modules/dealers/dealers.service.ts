import { Injectable, NotFoundException } from '@nestjs/common';
import { DealersRepository } from './dealers.repository';

@Injectable()
export class DealersService {
  constructor(private readonly dealersRepository: DealersRepository) {}

  async getNearbyDealers(lat: number, lng: number, radiusKm: number = 20) {
    const maxDistanceMeters = radiusKm * 1000;
    return this.dealersRepository.findNearby(lng, lat, maxDistanceMeters);
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
