import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { WarrantyRepository } from './warranty.repository'; // trigger TS server update
import { ClaimStatus, WarrantyStatus } from './warranty.schema';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { DOMAIN_EVENTS } from '../../common/constants/event-names.constants';
import { ProductsService } from '../products/products.service';

@Injectable()
export class WarrantyService {
  private readonly logger = new Logger(WarrantyService.name);

  constructor(
    private readonly warrantyRepository: WarrantyRepository,
    private readonly productsService: ProductsService,
    private readonly outboxService: OutboxService,
  ) { }

  async registerWarranty(userId: string, data: { serialNumber: string; productId: string; purchaseDate: Date }) {
    // 1. Verify product exists
    const product = await this.productsService.getById(data.productId);

    // Check if serial number already registered
    const existing = await this.warrantyRepository.findBySerialNumber(data.serialNumber);
    if (existing) {
      throw new BadRequestException('Serial number is already registered.');
    }

    // Default to 5 years if not specified on product metadata
    const warrantyPeriodYears = product.tags?.includes('premium') ? 10 : 5;

    const expiresAt = new Date(data.purchaseDate);
    expiresAt.setFullYear(expiresAt.getFullYear() + warrantyPeriodYears);

    const warranty = await this.warrantyRepository.create({
      userId,
      productId: data.productId,
      serialNumber: data.serialNumber,
      purchaseDate: data.purchaseDate,
      warrantyPeriodYears,
      expiresAt,
      status: expiresAt > new Date() ? WarrantyStatus.ACTIVE : WarrantyStatus.EXPIRED,
    });

    await this.outboxService.saveEvent({
      aggregateType: 'Warranty',
      aggregateId: warranty._id.toString(),
      eventType: DOMAIN_EVENTS.WARRANTY_REGISTERED,
      payload: { warrantyId: warranty._id.toString(), userId },
    });

    return warranty;
  }

  async getMyWarranties(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.warrantyRepository.findByUser(userId, skip, limit);
    return { data, total };
  }

  async getWarrantyDetails(id: string, userId: string) {
    const warranty = await this.warrantyRepository.findById(id);
    if (!warranty || warranty.userId.toString() !== userId) {
      throw new NotFoundException('Warranty not found');
    }
    return warranty;
  }

  async fileClaim(userId: string, warrantyId: string, description: string, images: string[]) {
    const warranty = await this.warrantyRepository.findById(warrantyId);
    if (!warranty || warranty.userId.toString() !== userId) {
      throw new NotFoundException('Warranty not found');
    }

    if (warranty.status === WarrantyStatus.EXPIRED || warranty.status === WarrantyStatus.VOIDED) {
      throw new BadRequestException(`Cannot file claim on ${warranty.status.toLowerCase()} warranty`);
    }

    const updated = await this.warrantyRepository.addClaim(warrantyId, {
      description,
      images,
      status: ClaimStatus.PENDING,
    });

    await this.outboxService.saveEvent({
      aggregateType: 'Warranty',
      aggregateId: warrantyId,
      eventType: DOMAIN_EVENTS.WARRANTY_CLAIM_SUBMITTED,
      payload: { warrantyId, userId },
    });

    return updated;
  }

  // --- Admin Methods ---

  async moderateClaim(warrantyId: string, claimId: string, status: ClaimStatus, resolution?: string) {
    const updated = await this.warrantyRepository.updateClaimStatus(warrantyId, claimId, status, resolution);
    if (!updated) {
      throw new NotFoundException('Warranty or Claim not found');
    }

    await this.outboxService.saveEvent({
      aggregateType: 'Warranty',
      aggregateId: warrantyId,
      eventType: DOMAIN_EVENTS.WARRANTY_CLAIM_RESOLVED,
      payload: { warrantyId, claimId, status, userId: updated.userId.toString() },
    });

    return updated;
  }
}
