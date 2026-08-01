import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'vitaForm';

async function cleanup() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri as string, { dbName });
  const db = mongoose.connection.db;
  
  if (!db) {
    throw new Error('Database connection failed');
  }

  const inventories = db.collection('inventories');
  const products = db.collection('products');
  
  const allInventory = await inventories.find().toArray();
  let deletedCount = 0;
  
  for (const inv of allInventory) {
    if (inv.productId) {
      const product = await products.findOne({ _id: inv.productId });
      if (!product) {
         await inventories.deleteOne({ _id: inv._id });
         deletedCount++;
         console.log(`Deleted orphaned inventory record for productId: ${inv.productId}`);
      }
    }
  }
  console.log(`\n✅ Cleanup complete! Deleted ${deletedCount} orphaned inventory records.`);
  await mongoose.disconnect();
}

cleanup().catch(console.error);
