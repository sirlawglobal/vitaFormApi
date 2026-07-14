import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';
import { Types } from 'mongoose';

/**
 * Validates and transforms a route parameter to ensure it is
 * a valid MongoDB ObjectId before it reaches the controller.
 */
@Injectable()
export class ParseMongoIdPipe implements PipeTransform<string> {
  transform(value: string, _metadata: ArgumentMetadata): string {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`'${value}' is not a valid ObjectId`);
    }
    return value;
  }
}
