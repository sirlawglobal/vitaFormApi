import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { SessionService } from '../auth/session.service';
import { DOMAIN_EVENTS } from '../../common/constants/event-names.constants';
import { User } from './users.schema';
import {
  UpdateProfileDto,
  CreateAddressDto,
  UpdateAddressDto,
  UpdatePreferencesDto,
  RegisterDeviceDto,
} from './dto';
import { Address, Device, UserPreferences } from './interfaces/user.interface';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly outboxService: OutboxService,
    @Inject(forwardRef(() => SessionService))
    private readonly sessionService: SessionService,
  ) {}

  /**
   * Retrieves user profile by ID, checking that the user exists and is active.
   */
  async getProfile(userId: string): Promise<User> {
    const user = await this.usersRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundException('User profile not found or deactivated');
    }
    return user;
  }

  /**
   * Updates basic profile information (firstName, lastName, avatarUrl)
   * and emits a USER_PROFILE_UPDATED outbox event.
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.getProfile(userId);

    const updateData: Record<string, any> = {};
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;

    if (Object.keys(updateData).length === 0) {
      return user;
    }

    const session = await this.usersRepository.startSession();
    session.startTransaction();

    try {
      const updatedUser = await this.usersRepository.updateById(
        userId,
        { $set: updateData },
        session,
      );

      if (!updatedUser) {
        throw new NotFoundException('User profile not found during update');
      }

      await this.outboxService.saveEvent(
        {
          aggregateType: 'User',
          aggregateId: userId,
          eventType: DOMAIN_EVENTS.USER_PROFILE_UPDATED,
          payload: {
            userId,
            ...updateData,
            updatedAt: new Date().toISOString(),
          },
        },
        session,
      );

      await session.commitTransaction();
      this.logger.log(`Updated profile for user ${userId}`);
      return updatedUser;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Deactivates the user account, revokes all active device session hashes in Redis,
   * and dispatches USER_DEACTIVATED domain event.
   */
  async deleteAccount(userId: string): Promise<{ success: boolean; message: string }> {
    const session = await this.usersRepository.startSession();
    session.startTransaction();

    try {
      const updatedUser = await this.usersRepository.updateById(
        userId,
        {
          $set: {
            isActive: false,
            email: `deleted_${userId}@vitafoam.invalid`,
            phone: `deleted_${userId.slice(-6)}`,
          },
        },
        session,
      );

      if (!updatedUser) {
        throw new NotFoundException('User profile not found for deletion');
      }

      await this.outboxService.saveEvent(
        {
          aggregateType: 'User',
          aggregateId: userId,
          eventType: DOMAIN_EVENTS.USER_DEACTIVATED,
          payload: {
            userId,
            deactivatedAt: new Date().toISOString(),
          },
        },
        session,
      );

      await session.commitTransaction();

      // Immediately wipe all Redis session hashes
      await this.sessionService.revokeAllUserSessions(userId);

      this.logger.log(`Deactivated account and wiped sessions for user ${userId}`);
      return { success: true, message: 'Account successfully deactivated and logged out' };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ── Address Book Methods ──────────────────────────────────────────────────

  /**
   * Returns all delivery addresses belonging to the user.
   */
  async getAddresses(userId: string): Promise<Address[]> {
    const user = await this.getProfile(userId);
    return user.addresses || [];
  }

  /**
   * Adds a new delivery address to the user's profile book.
   * If marked as default or if it is the first address, all other defaults are unset atomically.
   */
  async addAddress(userId: string, dto: CreateAddressDto): Promise<Address[]> {
    const user = await this.getProfile(userId);
    const isFirstAddress = (user.addresses?.length || 0) === 0;
    const isDefault = dto.isDefault || isFirstAddress;

    const session = await this.usersRepository.startSession();
    session.startTransaction();

    try {
      if (isDefault) {
        await this.usersRepository.unsetAllAddressesDefault(userId, session);
      }

      const newAddress: Address = {
        label: dto.label,
        street: dto.street,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country || 'Nigeria',
        isDefault,
        coordinates: dto.coordinates,
      };

      const updatedUser = await this.usersRepository.addAddress(userId, newAddress, session);
      if (!updatedUser) {
        throw new NotFoundException('User not found while adding address');
      }

      await session.commitTransaction();
      this.logger.log(`Added delivery address '${dto.label}' for user ${userId}`);
      return updatedUser.addresses;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Updates an existing delivery address or sets it as the new default.
   */
  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto): Promise<Address[]> {
    const user = await this.getProfile(userId);
    const targetAddress = user.addresses?.find((a) => (a._id ? a._id.toString() === addressId : false));

    if (!targetAddress) {
      throw new NotFoundException(`Address with ID ${addressId} not found`);
    }

    const session = await this.usersRepository.startSession();
    session.startTransaction();

    try {
      if (dto.isDefault === true) {
        await this.usersRepository.unsetAllAddressesDefault(userId, session);
      }

      const updateFields: Record<string, any> = {};
      if (dto.label !== undefined) updateFields.label = dto.label;
      if (dto.street !== undefined) updateFields.street = dto.street;
      if (dto.city !== undefined) updateFields.city = dto.city;
      if (dto.state !== undefined) updateFields.state = dto.state;
      if (dto.postalCode !== undefined) updateFields.postalCode = dto.postalCode;
      if (dto.country !== undefined) updateFields.country = dto.country;
      if (dto.isDefault !== undefined) updateFields.isDefault = dto.isDefault;
      if (dto.coordinates !== undefined) updateFields.coordinates = dto.coordinates;

      const updatedUser = await this.usersRepository.updateAddress(userId, addressId, updateFields, session);
      if (!updatedUser) {
        throw new NotFoundException('Failed to update address');
      }

      await session.commitTransaction();
      this.logger.log(`Updated address ${addressId} for user ${userId}`);
      return updatedUser.addresses;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Removes a saved delivery address from the user profile.
   * If the removed address was the default address and other addresses remain, promotes the first remaining address.
   */
  async removeAddress(userId: string, addressId: string): Promise<Address[]> {
    const user = await this.getProfile(userId);
    const targetAddress = user.addresses?.find((a) => (a._id ? a._id.toString() === addressId : false));

    if (!targetAddress) {
      throw new NotFoundException(`Address with ID ${addressId} not found`);
    }

    const updatedUser = await this.usersRepository.removeAddress(userId, addressId);
    if (!updatedUser) {
      throw new NotFoundException('Failed to remove address');
    }

    // Auto-promote first remaining address if the deleted address was marked default
    if (targetAddress.isDefault && updatedUser.addresses && updatedUser.addresses.length > 0) {
      const firstRemaining = updatedUser.addresses[0];
      if (firstRemaining._id) {
        const rePromotedUser = await this.usersRepository.updateAddress(
          userId,
          firstRemaining._id.toString(),
          { isDefault: true },
        );
        if (rePromotedUser) {
          this.logger.log(`Auto-promoted address ${firstRemaining._id} as new default for user ${userId}`);
          return rePromotedUser.addresses;
        }
      }
    }

    this.logger.log(`Removed address ${addressId} for user ${userId}`);
    return updatedUser.addresses;
  }

  // ── Preferences Methods ───────────────────────────────────────────────────

  /**
   * Updates sleep profile answers and notification toggles.
   */
  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<UserPreferences> {
    const user = await this.getProfile(userId);

    const updateQuery: Record<string, any> = {};
    if (dto.sleepPosition !== undefined) updateQuery['preferences.sleepPosition'] = dto.sleepPosition;
    if (dto.bodyWeightKg !== undefined) updateQuery['preferences.bodyWeightKg'] = dto.bodyWeightKg;
    if (dto.mattressPreference !== undefined) updateQuery['preferences.mattressPreference'] = dto.mattressPreference;
    if (dto.newsletter !== undefined) updateQuery['preferences.newsletter'] = dto.newsletter;
    if (dto.smsAlerts !== undefined) updateQuery['preferences.smsAlerts'] = dto.smsAlerts;
    if (dto.pushNotifications !== undefined) updateQuery['preferences.pushNotifications'] = dto.pushNotifications;

    if (Object.keys(updateQuery).length === 0) {
      return user.preferences;
    }

    const updatedUser = await this.usersRepository.updateById(userId, { $set: updateQuery });
    if (!updatedUser) {
      throw new NotFoundException('User profile not found while updating preferences');
    }

    this.logger.log(`Updated sleep & notification preferences for user ${userId}`);
    return updatedUser.preferences;
  }

  // ── Device & FCM Push Token Methods ───────────────────────────────────────

  /**
   * Retrieves all active registered client devices for the user.
   */
  async getDevices(userId: string): Promise<Device[]> {
    const user = await this.getProfile(userId);
    return user.devices || [];
  }

  /**
   * Registers a client device or updates existing fcmToken / lastSeenAt.
   * Enforces maximum of 10 registered devices via FIFO pruning.
   */
  async registerDevice(userId: string, dto: RegisterDeviceDto): Promise<Device[]> {
    const session = await this.usersRepository.startSession();
    session.startTransaction();

    try {
      // Pull existing instance of this deviceId if present
      await this.usersRepository.removeDevice(userId, dto.deviceId, session);

      const newDevice: Device = {
        deviceId: dto.deviceId,
        platform: dto.platform,
        fcmToken: dto.fcmToken,
        lastSeenAt: new Date(),
      };

      const updatedUser = await this.usersRepository.updateById(
        userId,
        {
          $push: {
            devices: {
              $each: [newDevice],
              $slice: -10, // Retain only the 10 most recent devices
            },
          },
        },
        session,
      );

      if (!updatedUser) {
        throw new NotFoundException('User profile not found while registering device');
      }

      await session.commitTransaction();
      this.logger.log(`Registered device '${dto.deviceId}' (${dto.platform}) for user ${userId}`);
      return updatedUser.devices;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Removes a physical device and its FCM push token.
   */
  async removeDevice(userId: string, deviceId: string): Promise<Device[]> {
    const updatedUser = await this.usersRepository.removeDevice(userId, deviceId);
    if (!updatedUser) {
      throw new NotFoundException('User profile not found while removing device');
    }
    this.logger.log(`Removed device ${deviceId} for user ${userId}`);
    return updatedUser.devices;
  }
}
