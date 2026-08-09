import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'vitaForm';

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in .env');
  process.exit(1);
}

const ProductSchema = new mongoose.Schema({
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
}, { strict: false });

const ReviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  status: { type: String, default: 'pending' },
  rating: { type: Number, required: true },
}, { strict: false });

async function syncRatings() {
  try {
    await mongoose.connect(MONGODB_URI!, { dbName: MONGODB_DB_NAME });
    console.log(`Connected to database: ${MONGODB_DB_NAME}`);

    const Product = mongoose.model('Product', ProductSchema);
    const Review = mongoose.model('Review', ReviewSchema);

    const products = await Product.find({});
    console.log(`Found ${products.length} products. Recalculating ratings...`);

    let updatedCount = 0;

    for (const product of products) {
      const result = await Review.aggregate([
        { $match: { productId: product._id, status: 'approved' } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalCount: { $sum: 1 },
          },
        },
      ]);

      const averageRating = result.length > 0 ? Math.round(result[0].averageRating * 10) / 10 : 0;
      const totalCount = result.length > 0 ? result[0].totalCount : 0;

      await Product.updateOne(
        { _id: product._id },
        { $set: { rating: averageRating, reviewCount: totalCount } }
      );
      updatedCount++;
    }

    console.log(`Successfully synced ratings for ${updatedCount} products.`);

    // Flush Redis cache for products
    const REDIS_HOST = process.env.REDIS_HOST;
    const REDIS_PORT = process.env.REDIS_PORT;
    const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
    const REDIS_TLS = process.env.REDIS_TLS === 'true';
    
    if (REDIS_HOST) {
      console.log('Connecting to Redis to clear cache...');
      const Redis = require('ioredis');
      const redis = new Redis({
        host: REDIS_HOST,
        port: Number(REDIS_PORT) || 6379,
        password: REDIS_PASSWORD,
        tls: REDIS_TLS ? {} : undefined,
      });
      
      const keys = await redis.keys('vitaform:product:*');
      if (keys.length > 0) {
        // ioredis keys return full keys including prefix, but we might just run flushall or delete these specific keys
        await redis.del(...keys);
        console.log(`Cleared ${keys.length} product cache keys from Redis.`);
      } else {
         // Also check without prefix just in case
         const rawKeys = await redis.keys('*product:*');
         if (rawKeys.length > 0) {
           await redis.del(...rawKeys);
           console.log(`Cleared ${rawKeys.length} product cache keys from Redis.`);
         } else {
           console.log('No product cache keys found to clear.');
         }
      }
      redis.disconnect();
    }
    
  } catch (error) {
    console.error('Error syncing ratings:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

syncRatings();
