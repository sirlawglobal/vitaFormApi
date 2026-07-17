import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, FilterQuery, UpdateQuery, Types } from 'mongoose';
import { User } from './users.schema';

/**
 * Users Repository.
 * Enforces clean architecture isolation between services and Mongoose models.
 */
@Injectable()
export class UsersRepository {
  private readonly logger = new Logger(UsersRepository.name);

  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  async findById(id: string, session?: ClientSession): Promise<User | null> {
    return this.userModel.findById(id).session(session || null).exec();
  }

  async findByEmail(email: string, session?: ClientSession): Promise<User | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .session(session || null)
      .exec();
  }

  async findByPhone(phone: string, session?: ClientSession): Promise<User | null> {
    return this.userModel
      .findOne({ phone: phone.trim() })
      .session(session || null)
      .exec();
  }

  async findOne(filter: FilterQuery<User>, session?: ClientSession): Promise<User | null> {
    return this.userModel.findOne(filter).session(session || null).exec();
  }

  async create(userData: Partial<User>, session?: ClientSession): Promise<User> {
    const [user] = await this.userModel.create([userData], { session });
    return user;
  }

  async updateById(
    id: string,
    updateData: UpdateQuery<User>,
    session?: ClientSession,
  ): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .session(session || null)
      .exec();
  }

  async findOneAndUpdate(
    filter: FilterQuery<User>,
    updateData: UpdateQuery<User>,
    session?: ClientSession,
  ): Promise<User | null> {
    return this.userModel
      .findOneAndUpdate(filter, updateData, { new: true })
      .session(session || null)
      .exec();
  }

  async exists(filter: FilterQuery<User>): Promise<boolean> {
    const count = await this.userModel.countDocuments(filter).limit(1).exec();
    return count > 0;
  }

  async startSession(): Promise<ClientSession> {
    return this.userModel.db.startSession();
  }

  /**
   * Atomically unsets isDefault on all addresses belonging to the user.
   */
  async unsetAllAddressesDefault(id: string, session?: ClientSession): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(
        id,
        { $set: { 'addresses.$[].isDefault': false } },
        { session: session || null },
      )
      .exec();
  }

  /**
   * Atomically pushes a new address document into the user's addresses array.
   */
  async addAddress(
    id: string,
    address: any,
    session?: ClientSession,
  ): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(
        id,
        { $push: { addresses: address } },
        { new: true, session: session || null },
      )
      .exec();
  }

  /**
   * Atomically updates a specific embedded address by its _id using arrayFilters.
   */
  async updateAddress(
    id: string,
    addressId: string,
    updateFields: Record<string, any>,
    session?: ClientSession,
  ): Promise<User | null> {
    const setQuery: Record<string, any> = {};
    for (const [key, value] of Object.entries(updateFields)) {
      if (value !== undefined) {
        setQuery[`addresses.$[elem].${key}`] = value;
      }
    }

    const targetId = Types.ObjectId.isValid(addressId)
      ? new Types.ObjectId(addressId)
      : addressId;

    return this.userModel
      .findByIdAndUpdate(
        id,
        { $set: setQuery },
        {
          new: true,
          arrayFilters: [{ 'elem._id': targetId }],
          session: session || null,
        },
      )
      .exec();
  }

  /**
   * Atomically removes an address from the addresses array by _id.
   */
  async removeAddress(
    id: string,
    addressId: string,
    session?: ClientSession,
  ): Promise<User | null> {
    const targetId = Types.ObjectId.isValid(addressId)
      ? new Types.ObjectId(addressId)
      : addressId;

    return this.userModel
      .findByIdAndUpdate(
        id,
        { $pull: { addresses: { _id: targetId } } },
        { new: true, session: session || null },
      )
      .exec();
  }

  /**
   * Atomically removes a registered device by deviceId.
   */
  async removeDevice(
    id: string,
    deviceId: string,
    session?: ClientSession,
  ): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(
        id,
        { $pull: { devices: { deviceId } } },
        { new: true, session: session || null },
      )
      .exec();
  }
}
