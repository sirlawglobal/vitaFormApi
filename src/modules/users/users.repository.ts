import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, FilterQuery, UpdateQuery } from 'mongoose';
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
}
