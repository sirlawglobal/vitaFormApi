import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  UpdateProfileDto,
  CreateAddressDto,
  UpdateAddressDto,
  UpdatePreferencesDto,
  RegisterDeviceDto,
} from './dto';

@ApiTags('Users & Profile')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Profile Endpoints ─────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Retrieve current authenticated customer profile' })
  @ApiResponse({ status: 200, description: 'Customer profile details' })
  @Get('me')
  async getProfile(@CurrentUser('userId') userId: string) {
    const user = await this.usersService.getProfile(userId);
    const userObject = user.toObject();
    delete userObject.passwordHash;
    return userObject;
  }

  @ApiOperation({ summary: 'Update customer profile details (first name, last name, avatar)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @Patch('me')
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateProfile(userId, dto);
    const userObject = user.toObject();
    delete userObject.passwordHash;
    return userObject;
  }

  @ApiOperation({ summary: 'Deactivate customer account and terminate all active sessions' })
  @ApiResponse({ status: 200, description: 'Account deactivated' })
  @Delete('me')
  async deleteAccount(@CurrentUser('userId') userId: string) {
    return this.usersService.deleteAccount(userId);
  }

  // ── Address Book Endpoints ────────────────────────────────────────────────

  @ApiOperation({ summary: 'List all saved delivery addresses for the customer' })
  @ApiResponse({ status: 200, description: 'List of saved delivery addresses' })
  @Get('me/addresses')
  async getAddresses(@CurrentUser('userId') userId: string) {
    return this.usersService.getAddresses(userId);
  }

  @ApiOperation({ summary: 'Add a new delivery address to the customer profile' })
  @ApiResponse({ status: 201, description: 'Address added to profile' })
  @Post('me/addresses')
  async addAddress(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.usersService.addAddress(userId, dto);
  }

  @ApiOperation({ summary: 'Update an existing delivery address or set as new default' })
  @ApiResponse({ status: 200, description: 'Address updated' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  @Patch('me/addresses/:id')
  async updateAddress(
    @CurrentUser('userId') userId: string,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(userId, addressId, dto);
  }

  @ApiOperation({ summary: 'Delete a saved delivery address by ID' })
  @ApiResponse({ status: 200, description: 'Address removed' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  @Delete('me/addresses/:id')
  async removeAddress(
    @CurrentUser('userId') userId: string,
    @Param('id') addressId: string,
  ) {
    return this.usersService.removeAddress(userId, addressId);
  }

  // ── Preferences Endpoints ─────────────────────────────────────────────────

  @ApiOperation({ summary: 'Update sleep profile answers and notification settings' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  @Patch('me/preferences')
  async updatePreferences(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.usersService.updatePreferences(userId, dto);
  }

  // ── Device & FCM Push Token Endpoints ─────────────────────────────────────

  @ApiOperation({ summary: 'List all active registered client devices' })
  @ApiResponse({ status: 200, description: 'Registered devices list' })
  @Get('me/devices')
  async getDevices(@CurrentUser('userId') userId: string) {
    return this.usersService.getDevices(userId);
  }

  @ApiOperation({ summary: 'Register a client device and attach FCM push notification token' })
  @ApiResponse({ status: 200, description: 'Device registered successfully' })
  @Post('me/devices')
  @HttpCode(HttpStatus.OK)
  async registerDevice(
    @CurrentUser('userId') userId: string,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.usersService.registerDevice(userId, dto);
  }

  @ApiOperation({ summary: 'Remove a client device and revoke its push token' })
  @ApiResponse({ status: 200, description: 'Device unregistered' })
  @Delete('me/devices/:deviceId')
  async removeDevice(
    @CurrentUser('userId') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.usersService.removeDevice(userId, deviceId);
  }
}
