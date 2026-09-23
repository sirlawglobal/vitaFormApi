import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'vitaForm';

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in .env');
  process.exit(1);
}

const GeoJSONPointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  { _id: false },
);

const DealerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, index: true },
    state: { type: String, required: true, trim: true, index: true },
    location: { type: GeoJSONPointSchema, required: true, index: '2dsphere' },
    contactPhone: { type: String, trim: true },
    contactEmail: { type: String, trim: true },
    operatingHours: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { collection: 'dealers', timestamps: true },
);

const DealerModel = mongoose.model('Dealer', DealerSchema);

// lat/lng are the real coordinates of each city; street address/phone are
// plausible sample data, not verified real Vitafoam branch details — replace
// via the admin dealer form once real onboarding details are available.
const DEALERS_DATA = [
  { name: 'Vitafoam Comfort Center - Ikeja', address: '131 Awolowo Way, Ikeja', city: 'Ikeja', state: 'Lagos', lat: 6.6018, lng: 3.3515, phone: '+234 801 000 0001' },
  { name: 'Vitafoam Abuja Showroom', address: '12 Aminu Kano Crescent, Wuse II', city: 'Abuja', state: 'FCT', lat: 9.0765, lng: 7.3986, phone: '+234 801 000 0002' },
  { name: 'Vitafoam Kano Depot', address: '45 Zoo Road', city: 'Kano', state: 'Kano', lat: 12.0022, lng: 8.5920, phone: '+234 801 000 0003' },
  { name: 'Vitafoam Port Harcourt Store', address: '8 Aba Road', city: 'Port Harcourt', state: 'Rivers', lat: 4.8156, lng: 7.0498, phone: '+234 801 000 0004' },
  { name: 'Vitafoam Ibadan Outlet', address: '22 Ring Road', city: 'Ibadan', state: 'Oyo', lat: 7.3775, lng: 3.9470, phone: '+234 801 000 0005' },
  { name: 'Vitafoam Enugu Showroom', address: '10 Ogui Road', city: 'Enugu', state: 'Enugu', lat: 6.4483, lng: 7.5100, phone: '+234 801 000 0006' },
  { name: 'Vitafoam Kaduna Depot', address: '3 Ahmadu Bello Way', city: 'Kaduna', state: 'Kaduna', lat: 10.5105, lng: 7.4165, phone: '+234 801 000 0007' },
  { name: 'Vitafoam Asaba Store', address: '17 Nnebisi Road', city: 'Asaba', state: 'Delta', lat: 6.2059, lng: 6.7383, phone: '+234 801 000 0008' },
  { name: 'Vitafoam Onitsha Depot', address: '5 New Market Road', city: 'Onitsha', state: 'Anambra', lat: 6.1450, lng: 6.7852, phone: '+234 801 000 0009' },
  { name: 'Vitafoam Benin City Showroom', address: '9 Sapele Road', city: 'Benin City', state: 'Edo', lat: 6.3350, lng: 5.6037, phone: '+234 801 000 0010' },
  { name: 'Vitafoam Abeokuta Store', address: '14 Ibrahim Babangida Boulevard', city: 'Abeokuta', state: 'Ogun', lat: 7.1475, lng: 3.3619, phone: '+234 801 000 0011' },
  { name: 'Vitafoam Ilorin Outlet', address: '6 Ibrahim Taiwo Road', city: 'Ilorin', state: 'Kwara', lat: 8.4966, lng: 4.5426, phone: '+234 801 000 0012' },
  { name: 'Vitafoam Jos Depot', address: '21 Rukuba Road', city: 'Jos', state: 'Plateau', lat: 9.8965, lng: 8.8583, phone: '+234 801 000 0013' },
  { name: 'Vitafoam Calabar Store', address: '11 Marian Road', city: 'Calabar', state: 'Cross River', lat: 4.9517, lng: 8.3220, phone: '+234 801 000 0014' },
  { name: 'Vitafoam Uyo Showroom', address: '4 Ikot Ekpene Road', city: 'Uyo', state: 'Akwa Ibom', lat: 5.0377, lng: 7.9128, phone: '+234 801 000 0015' },
];

async function seedDealers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!, { dbName: MONGODB_DB_NAME });
    console.log(`Connected successfully to database: "${MONGODB_DB_NAME}"`);

    console.log(`\nUpserting ${DEALERS_DATA.length} dealers across ${new Set(DEALERS_DATA.map((d) => d.state)).size} states...`);

    const ops = DEALERS_DATA.map((d) => ({
      updateOne: {
        filter: { name: d.name },
        update: {
          $set: {
            name: d.name,
            address: d.address,
            city: d.city,
            state: d.state,
            contactPhone: d.phone,
            operatingHours: 'Mon - Sat: 9am - 6pm',
            isActive: true,
            location: { type: 'Point' as const, coordinates: [d.lng, d.lat] },
          },
        },
        upsert: true,
      },
    }));

    const result = await DealerModel.bulkWrite(ops);
    console.log(`\n==================================================`);
    console.log(`SUCCESS: Dealer seeding complete!`);
    console.log(`   - New dealers created: ${result.upsertedCount}`);
    console.log(`   - Existing dealers matched (re-run is safe): ${result.matchedCount}`);
    console.log(`==================================================\n`);
  } catch (error) {
    console.error('Error during dealer seeding:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seedDealers();
