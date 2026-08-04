import mongoose, { Types } from 'mongoose';
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

// 1. Category Schema Definition
const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    description: { type: String, trim: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    path: { type: String, required: true, default: '/', index: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    imageUrl: { type: String, trim: true },
  },
  { timestamps: true },
);

// 2. Product Schema Definition
const ProductVariantSchema = new mongoose.Schema({
  sku: { type: String, required: true, index: true, trim: true },
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true },
  compareAtPrice: { type: Number },
  firmness: { type: String, enum: ['soft', 'medium', 'firm', 'extra-firm'] },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: { type: String, default: 'cm' },
  },
  weight: {
    value: Number,
    unit: { type: String, default: 'kg' },
  },
  isAvailable: { type: Boolean, default: true },
});

const ProductImageSchema = new mongoose.Schema({
  url: { type: String, required: true, trim: true },
  alt: { type: String, trim: true },
  isPrimary: { type: Boolean, default: false },
});

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    description: { type: String, required: true, trim: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    categorySlug: { type: String, required: true, index: true, trim: true, lowercase: true },
    tags: { type: [String], default: [], index: true },
    images: { type: [ProductImageSchema], default: [] },
    variants: { type: [ProductVariantSchema], default: [] },
    specifications: { type: Map, of: String, default: {} },
    warrantyTerms: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    reviewCount: { type: Number, default: 12, min: 0 },
  },
  { timestamps: true },
);

// 3. Inventory Schema Definition
const InventorySchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true, index: true, trim: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    reserved: { type: Number, required: true, default: 0, min: 0 },
    reorderPoint: { type: Number, required: true, default: 10, min: 0 },
    reorderQuantity: { type: Number, required: true, default: 50, min: 1 },
    warehouse: { type: String, required: true, default: 'Main Warehouse — Ikeja', trim: true },
    version: { type: Number, required: true, default: 1, min: 1 },
  },
  { timestamps: true },
);

const CategoryModel = mongoose.model('Category', CategorySchema);
const ProductModel = mongoose.model('Product', ProductSchema);
const InventoryModel = mongoose.model('Inventory', InventorySchema);

// Defined Categories to ensure exist in DB
const CATEGORIES_DATA = [
  {
    name: 'Mattresses',
    slug: 'mattresses',
    description: 'Premium Orthopaedic, Memory Foam, Spring, and High-Density Vitafoam Mattresses.',
    path: '/mattresses',
    order: 1,
    imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Pillows & Cushions',
    slug: 'pillows-cushions',
    description: 'Ergonomic Memory Foam, Microfiber, Orthopaedic Neck, and Lumbar Support Pillows.',
    path: '/pillows-cushions',
    order: 2,
    imageUrl: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Furniture & Bed Frames',
    slug: 'furniture',
    description: 'Upholstered Bed Frames, Convertible Sofa Beds, Recliners, and Nightstands.',
    path: '/furniture',
    order: 3,
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Beddings & Linens',
    slug: 'beddings-linens',
    description: 'Egyptian Cotton Duvets, Waterproof Mattress Protectors, and Quilted Comforters.',
    path: '/beddings-linens',
    order: 4,
    imageUrl: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Nursery & Kids',
    slug: 'nursery-kids',
    description: 'Safe, Anti-Bacterial Baby Cot Mattresses and Playmat Cushions for Toddlers.',
    path: '/nursery-kids',
    order: 5,
    imageUrl: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=800&q=80',
  },
];

// 20 Products Data
const PRODUCTS_DATA = [
  // 1. Mattresses
  {
    name: 'Vita Spring Flex Orthopaedic Mattress',
    slug: 'vita-spring-flex-orthopaedic-mattress',
    categorySlug: 'mattresses',
    description:
      'Engineered specifically for superior back care, the Vita Spring Flex Orthopaedic Mattress incorporates heavy-duty Bonnell springs surrounded by ultra-high-density foam layers. It aligns your spine naturally during sleep and mitigates posture stress.',
    tags: ['orthopaedic', 'spring', 'back-care', 'firm', 'bestseller'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Spring Flex Orthopaedic Mattress Angle View',
        isPrimary: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1582582621959-48d27397dc69?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Spring Flex Layer Construction Detail',
        isPrimary: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Spring Flex Side Stitching Detail',
        isPrimary: false,
      },
    ],
    variants: [
      {
        sku: 'VITA-SPRX-6X4.5-10',
        name: 'Double (6ft x 4.5ft x 10 in)',
        price: 145000,
        compareAtPrice: 165000,
        firmness: 'firm',
        dimensions: { length: 190, width: 137, height: 25, unit: 'cm' },
        weight: { value: 32, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 75,
      },
      {
        sku: 'VITA-SPRX-6X6-10',
        name: 'King (6ft x 6ft x 10 in)',
        price: 195000,
        compareAtPrice: 220000,
        firmness: 'extra-firm',
        dimensions: { length: 190, width: 183, height: 25, unit: 'cm' },
        weight: { value: 42, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 100,
      },
    ],
    specifications: {
      'Core Material': 'Pocket Spring & High-Density Polyurethane',
      Fabric: 'Quilted Hypoallergenic Jacquard',
      Warranty: '10 Years Manufacturer Warranty',
      'Target Support': 'Lumbosacral & Spinal Support',
    },
    warrantyTerms: '10 Years warranty covering internal structural sagging over 1.5 inches.',
    isFeatured: true,
    rating: 4.8,
    reviewCount: 46,
  },
  {
    name: 'Vita Grand Memory Foam Mattress',
    slug: 'vita-grand-memory-foam-mattress',
    categorySlug: 'mattresses',
    description:
      'Experience weightless sleep with the Vita Grand Memory Foam Mattress. Designed with open-cell visco-elastic memory foam, it contours precisely to your unique pressure points while virtually eliminating motion transfer for uninterrupted sleep.',
    tags: ['memory-foam', 'luxury', 'zero-motion', 'medium-soft'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Grand Memory Foam Mattress Bedroom Setting',
        isPrimary: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Grand Top Quilted Surface',
        isPrimary: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1578898835028-26d11f568cae?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Grand Foam Core Layer View',
        isPrimary: false,
      },
    ],
    variants: [
      {
        sku: 'VITA-GRND-6X5-12',
        name: 'Queen (6ft x 5ft x 12 in)',
        price: 225000,
        compareAtPrice: 250000,
        firmness: 'medium',
        dimensions: { length: 190, width: 152, height: 30, unit: 'cm' },
        weight: { value: 38, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 60,
      },
      {
        sku: 'VITA-GRND-6X6-12',
        name: 'King (6ft x 6ft x 12 in)',
        price: 275000,
        compareAtPrice: 310000,
        firmness: 'medium',
        dimensions: { length: 190, width: 183, height: 30, unit: 'cm' },
        weight: { value: 45, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 80,
      },
    ],
    specifications: {
      'Core Material': 'Visco-Elastic Memory Foam & Support Base',
      Fabric: 'Bamboo Breathable Soft Knit Cover',
      Warranty: '12 Years Manufacturer Warranty',
      'Motion Transfer': 'Zero Motion Transfer',
    },
    warrantyTerms: '12 Years full coverage against shape deformation and foam sagging.',
    isFeatured: true,
    rating: 4.9,
    reviewCount: 82,
  },
  {
    name: 'Vita Galaxy High-Density Foam Mattress',
    slug: 'vita-galaxy-high-density-foam-mattress',
    categorySlug: 'mattresses',
    description:
      'The Vita Galaxy is the iconic, reliable high-density foam mattress trusted by millions of homes. Crafted for durability and consistent resilience, it delivers firm whole-body support night after night.',
    tags: ['high-density', 'classic', 'durable', 'firm', 'bestseller'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1582582621959-48d27397dc69?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Galaxy Mattress Front View',
        isPrimary: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1544457070-4cd773b4d71e?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Galaxy Bedroom Display',
        isPrimary: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Galaxy Fabric Texture',
        isPrimary: false,
      },
    ],
    variants: [
      {
        sku: 'VITA-GLX-6X4.5-8',
        name: 'Double (6ft x 4.5ft x 8 in)',
        price: 110000,
        compareAtPrice: 125000,
        firmness: 'firm',
        dimensions: { length: 190, width: 137, height: 20, unit: 'cm' },
        weight: { value: 26, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 120,
      },
      {
        sku: 'VITA-GLX-6X6-8',
        name: 'King (6ft x 6ft x 8 in)',
        price: 155000,
        compareAtPrice: 175000,
        firmness: 'firm',
        dimensions: { length: 190, width: 183, height: 20, unit: 'cm' },
        weight: { value: 34, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 150,
      },
    ],
    specifications: {
      'Core Material': 'High-Density Polyurethane Foam Grade A',
      Fabric: 'Damask Woven Jacquard',
      Warranty: '5 Years Warranty',
    },
    warrantyTerms: '5 Years coverage against body impression indentations.',
    isFeatured: false,
    rating: 4.7,
    reviewCount: 39,
  },
  {
    name: 'Vita Cool Gel Hybrid Mattress',
    slug: 'vita-cool-gel-hybrid-mattress',
    categorySlug: 'mattresses',
    description:
      'Combine the cool touch of gel memory foam with the targeted bounce of pocket springs. The Vita Cool Gel Hybrid regulates sleeping temperature and adapts instantly to shifting sleep positions.',
    tags: ['hybrid', 'cooling', 'gel-memory-foam', 'pocket-spring'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Cool Gel Hybrid Primary View',
        isPrimary: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Cool Gel Side Profile',
        isPrimary: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Cool Gel Mattress Surface Texture',
        isPrimary: false,
      },
    ],
    variants: [
      {
        sku: 'VITA-COOL-6X5-14',
        name: 'Queen (6ft x 5ft x 14 in)',
        price: 310000,
        compareAtPrice: 350000,
        firmness: 'medium',
        dimensions: { length: 190, width: 152, height: 35, unit: 'cm' },
        weight: { value: 48, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 50,
      },
      {
        sku: 'VITA-COOL-6.5X6-14',
        name: 'Super King (6.5ft x 6ft x 14 in)',
        price: 380000,
        compareAtPrice: 420000,
        firmness: 'medium',
        dimensions: { length: 200, width: 183, height: 35, unit: 'cm' },
        weight: { value: 56, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 40,
      },
    ],
    specifications: {
      'Core Material': 'Cooling Gel-Infused Foam & Individually Wrapped Pocket Springs',
      Fabric: 'Tencel Airflow Mesh Fabric',
      Warranty: '15 Years Warranty',
      Cooling: 'Active Gel Heat Dissipation',
    },
    warrantyTerms: '15 Years comprehensive structural warranty.',
    isFeatured: true,
    rating: 4.95,
    reviewCount: 64,
  },
  {
    name: 'Vita Supreme Semi-Orthopaedic Mattress',
    slug: 'vita-supreme-semi-orthopaedic-mattress',
    categorySlug: 'mattresses',
    description:
      'The perfect balance between plush cushioning and spinal firmness. Designed with dual-density foam core to reduce lower back stiffness while offering a soft top cushioning feel.',
    tags: ['semi-orthopaedic', 'balanced-firmness', 'everyday-comfort'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1544457070-4cd773b4d71e?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Supreme Semi-Orthopaedic Mattress Main View',
        isPrimary: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Supreme Bedroom View',
        isPrimary: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Supreme Corner Construction',
        isPrimary: false,
      },
    ],
    variants: [
      {
        sku: 'VITA-SUPR-6X4.5-10',
        name: 'Double (6ft x 4.5ft x 10 in)',
        price: 130000,
        compareAtPrice: 145000,
        firmness: 'medium',
        dimensions: { length: 190, width: 137, height: 25, unit: 'cm' },
        weight: { value: 30, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 90,
      },
      {
        sku: 'VITA-SUPR-6X6-10',
        name: 'King (6ft x 6ft x 10 in)',
        price: 175000,
        compareAtPrice: 195000,
        firmness: 'firm',
        dimensions: { length: 190, width: 183, height: 25, unit: 'cm' },
        weight: { value: 39, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 110,
      },
    ],
    specifications: {
      'Core Material': 'Dual-Layer High-Resilience Foam',
      Fabric: 'Quilted Polyester Cotton Blend',
      Warranty: '7 Years Warranty',
    },
    warrantyTerms: '7 Years limited warranty against foam breakdown.',
    isFeatured: false,
    rating: 4.6,
    reviewCount: 31,
  },
  {
    name: 'Vita Eco-Luxe Natural Latex Mattress',
    slug: 'vita-eco-luxe-natural-latex-mattress',
    categorySlug: 'mattresses',
    description:
      'Harvested from 100% natural organic rubber trees, the Vita Eco-Luxe Natural Latex mattress provides hypoallergenic protection, natural pinhole breathability, and resilient buoyant body support.',
    tags: ['organic', 'latex', 'eco-friendly', 'hypoallergenic'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Eco-Luxe Natural Latex Mattress Angle View',
        isPrimary: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Eco-Luxe Latex Core Texture',
        isPrimary: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Eco-Luxe Bedroom Setting',
        isPrimary: false,
      },
    ],
    variants: [
      {
        sku: 'VITA-LATX-6X6-10',
        name: 'King (6ft x 6ft x 10 in)',
        price: 420000,
        compareAtPrice: 480000,
        firmness: 'medium',
        dimensions: { length: 190, width: 183, height: 25, unit: 'cm' },
        weight: { value: 50, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 35,
      },
    ],
    specifications: {
      'Core Material': '100% Natural Dunlop Latex',
      Fabric: 'Organic Unbleached Cotton Cover',
      Warranty: '20 Years Warranty',
      Certification: 'OEKO-TEX Standard 100 Certified',
    },
    warrantyTerms: '20 Years natural latex integrity warranty.',
    isFeatured: true,
    rating: 4.9,
    reviewCount: 28,
  },

  // 2. Pillows & Cushions
  {
    name: 'Vita Ergo Contour Memory Pillow',
    slug: 'vita-ergo-contour-memory-pillow',
    categorySlug: 'pillows-cushions',
    description:
      'Scientifically contoured to align the cervical vertebrae and eliminate neck stiffness. Made with high-density visco-elastic memory foam and covered in a removable machine-washable bamboo cover.',
    tags: ['contour-pillow', 'neck-support', 'memory-foam', 'ergonomic'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Ergo Contour Pillow Angle View',
        isPrimary: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Ergo Contour Side Elevation',
        isPrimary: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1579656381226-5fc0f0100c3b?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Ergo Contour Pillow Cover Close Up',
        isPrimary: false,
      },
    ],
    variants: [
      {
        sku: 'VITA-PIL-ERGO-STD',
        name: 'Standard Ergo Contour',
        price: 18500,
        compareAtPrice: 22000,
        firmness: 'medium',
        dimensions: { length: 60, width: 40, height: 12, unit: 'cm' },
        weight: { value: 1.2, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 200,
      },
    ],
    specifications: {
      'Core Material': '100% Moulded Visco-Elastic Memory Foam',
      'Cover Material': '60% Bamboo Fiber, 40% Polyester Washable Zip Cover',
      Dimensions: '60 cm x 40 cm x 12 cm',
    },
    warrantyTerms: '2 Years shape retention warranty.',
    isFeatured: true,
    rating: 4.85,
    reviewCount: 114,
  },
  {
    name: 'Vita Luxury Microfiber Hotel Pillow',
    slug: 'vita-luxury-microfiber-hotel-pillow',
    categorySlug: 'pillows-cushions',
    description:
      'Bring 5-star hotel luxury straight to your master bedroom. Stuffed with ultra-fine down-alternative microfibers that maintain loft and fluffiness after every wash.',
    tags: ['hotel-pillow', 'microfiber', 'plush', 'soft', 'pack-of-2'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Luxury Microfiber Pillow Set',
        isPrimary: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1629949009765-40fc74c954c4?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Microfiber Plush Corner Detail',
        isPrimary: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Microfiber Pillow Stack',
        isPrimary: false,
      },
    ],
    variants: [
      {
        sku: 'VITA-PIL-HTL-2PK',
        name: 'Queen Pack of 2',
        price: 24000,
        compareAtPrice: 28000,
        firmness: 'soft',
        dimensions: { length: 70, width: 50, height: 18, unit: 'cm' },
        weight: { value: 2.2, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 250,
      },
    ],
    specifications: {
      Filling: '100% Virgin Down-Alternative Microfiber',
      Shell: '300 Thread Count Percale Cotton Shell',
      Packaging: 'Pack of 2 Pillows',
    },
    warrantyTerms: '1 Year loft bounce-back warranty.',
    isFeatured: false,
    rating: 4.75,
    reviewCount: 95,
  },
  {
    name: 'Vita CoolGel Therapy Neck Pillow',
    slug: 'vita-coolgel-therapy-neck-pillow',
    categorySlug: 'pillows-cushions',
    description:
      'Features an active cooling gel layer fused directly on top of supportive memory foam to keep your neck cool and relieve heat tension on warm tropical nights.',
    tags: ['coolgel', 'neck-pain-relief', 'cooling', 'therapy'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1579656381226-5fc0f0100c3b?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita CoolGel Therapy Pillow Surface',
        isPrimary: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita CoolGel Pillow Side View',
        isPrimary: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1629949009765-40fc74c954c4?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita CoolGel Gel Mesh Layer',
        isPrimary: false,
      },
    ],
    variants: [
      {
        sku: 'VITA-PIL-COOLGEL',
        name: 'Standard Gel Therapy',
        price: 26500,
        compareAtPrice: 32000,
        firmness: 'medium',
        dimensions: { length: 65, width: 42, height: 13, unit: 'cm' },
        weight: { value: 1.5, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 140,
      },
    ],
    specifications: {
      'Core Material': 'Memory Foam with Integrated Hydro-Gel Pad',
      'Cover Material': 'Ice-Silk Touch Cooling Fabric',
    },
    warrantyTerms: '3 Years gel adhesion and shape warranty.',
    isFeatured: true,
    rating: 4.9,
    reviewCount: 57,
  },
  {
    name: 'Vita Ortho Lumbar Back Support Cushion',
    slug: 'vita-ortho-lumbar-back-support-cushion',
    categorySlug: 'pillows-cushions',
    description:
      'Engineered for long sitting hours at the desk or during highway driving. Straps securely onto any chair to correct slouching, stabilize your lower back, and prevent lumbar fatigue.',
    tags: ['lumbar-support', 'office-chair', 'car-cushion', 'back-pain'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Ortho Lumbar Cushion Front View',
        isPrimary: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1629949009765-40fc74c954c4?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Ortho Lumbar Elastic Strap Detail',
        isPrimary: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1579656381226-5fc0f0100c3b?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Ortho Lumbar Back Cushion Angle View',
        isPrimary: false,
      },
    ],
    variants: [
      {
        sku: 'VITA-CSH-LMBR-UNV',
        name: 'Universal Lumbar Support',
        price: 15000,
        compareAtPrice: 18000,
        firmness: 'firm',
        dimensions: { length: 42, width: 38, height: 12, unit: 'cm' },
        weight: { value: 0.8, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 180,
      },
    ],
    specifications: {
      'Core Material': 'High-Density Molded Memory Foam',
      Straps: 'Dual Adjustable Elastic Straps with Quick-Release Buckle',
      Cover: '3D Breathable Mesh Cover',
    },
    warrantyTerms: '2 Years foam integrity warranty.',
    isFeatured: false,
    rating: 4.8,
    reviewCount: 73,
  },
  {
    name: 'Vita Nest Maternity Full Body Pillow',
    slug: 'vita-nest-maternity-full-body-pillow',
    categorySlug: 'pillows-cushions',
    description:
      'Total body support contoured for pregnant mothers. The ergonomic U-shape cradles back, belly, hips, and knees simultaneously to relieve joint pressure points and facilitate side sleeping.',
    tags: ['maternity-pillow', 'pregnancy', 'u-shape', 'full-body'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1629949009765-40fc74c954c4?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Nest Maternity Pillow Overview',
        isPrimary: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Nest Maternity Fabric Close Up',
        isPrimary: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Nest Maternity Full View on Bed',
        isPrimary: false,
      },
    ],
    variants: [
      {
        sku: 'VITA-PIL-MAT-USHAPE',
        name: 'Full Body U-Shape',
        price: 35000,
        compareAtPrice: 42000,
        firmness: 'soft',
        dimensions: { length: 140, width: 80, height: 20, unit: 'cm' },
        weight: { value: 3.5, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 90,
      },
    ],
    specifications: {
      Filling: '7D Premium Spiral Micro-Fiber',
      Cover: '100% Organic Jersey Cotton Zippered Cover',
    },
    warrantyTerms: '1 Year stitching and elasticity warranty.',
    isFeatured: true,
    rating: 4.95,
    reviewCount: 41,
  },

  // 3. Furniture & Bed Frames
  {
    name: 'Vita Modern Upholstered Bed Frame',
    slug: 'vita-modern-upholstered-bed-frame',
    categorySlug: 'furniture',
    description:
      'Handcrafted solid hardwood frame upholstered in premium stain-resistant velvet fabric with a tall padded button-tufted headboard and heavy-duty steel slat foundation.',
    tags: ['bed-frame', 'headboard', 'upholstered', 'furniture'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Modern Upholstered Bed Frame Front',
        isPrimary: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Modern Bed Frame Headboard Tufting',
        isPrimary: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Modern Bed Frame Bedroom View',
        isPrimary: false,
      },
    ],
    variants: [
      {
        sku: 'VITA-FRM-QN-GRY',
        name: 'Queen (Velvet Gray)',
        price: 290000,
        compareAtPrice: 330000,
        dimensions: { length: 215, width: 165, height: 125, unit: 'cm' },
        weight: { value: 65, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 30,
      },
      {
        sku: 'VITA-FRM-KG-NVY',
        name: 'King (Velvet Navy)',
        price: 340000,
        compareAtPrice: 390000,
        dimensions: { length: 215, width: 195, height: 125, unit: 'cm' },
        weight: { value: 78, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 25,
      },
    ],
    specifications: {
      'Frame Material': 'Kiln-Dried Hardwood & Reinforced Steel',
      Upholstery: 'Stain-Resistant Performance Velvet',
      'Weight Capacity': '500 kg',
    },
    warrantyTerms: '5 Years structural wood frame warranty.',
    isFeatured: true,
    rating: 4.8,
    reviewCount: 22,
  },
  {
    name: 'Vita Relaxer Convertible Sofa Bed',
    slug: 'vita-relaxer-convertible-sofa-bed',
    categorySlug: 'furniture',
    description:
      'Seamlessly switch from a stylish living room sofa to a comfortable guest sleeper mattress in seconds. Padded with high-density Vitafoam cushioning and framed with solid steel folding legs.',
    tags: ['sofa-bed', 'convertible', 'living-room', 'guest-bed'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Relaxer Convertible Sofa Bed Upright',
        isPrimary: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Relaxer Sofa Bed Unfolded Position',
        isPrimary: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Relaxer Fabric Texture',
        isPrimary: false,
      },
    ],
    variants: [
      {
        sku: 'VITA-SFB-2SEAT-CH',
        name: '2-Seater (Charcoal Gray)',
        price: 240000,
        compareAtPrice: 275000,
        dimensions: { length: 150, width: 90, height: 85, unit: 'cm' },
        weight: { value: 45, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 40,
      },
      {
        sku: 'VITA-SFB-3SEAT-CH',
        name: '3-Seater (Charcoal Gray)',
        price: 310000,
        compareAtPrice: 350000,
        dimensions: { length: 190, width: 90, height: 85, unit: 'cm' },
        weight: { value: 58, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 35,
      },
    ],
    specifications: {
      Mechanism: 'Click-Clack Heavy Duty Steel Hinge',
      Foam: 'High-Resilience Vitafoam Dual-Layer',
      Upholstery: 'Heavy Weave Linen Blend',
    },
    warrantyTerms: '3 Years frame and hinge mechanism warranty.',
    isFeatured: true,
    rating: 4.7,
    reviewCount: 35,
  },
  {
    name: 'Vita Comfort Ergonomic Recliner Armchair',
    slug: 'vita-comfort-ergonomic-recliner-armchair',
    categorySlug: 'furniture',
    description:
      'Unwind in supreme relaxation. The Vita Comfort Recliner features plush molded memory foam backrests, thick lumbar support pads, and a smooth manual push-back reclining mechanism.',
    tags: ['recliner', 'armchair', 'living-room', 'lounge-chair'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1506898667547-42e2b3a4fe21?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Comfort Recliner Armchair Front View',
        isPrimary: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Comfort Recliner Fully Reclined View',
        isPrimary: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Comfort Recliner Leatherette Detail',
        isPrimary: false,
      },
    ],
    variants: [
      {
        sku: 'VITA-RCL-LTHR-BRN',
        name: 'Premium Leatherette (Espresso Brown)',
        price: 210000,
        compareAtPrice: 245000,
        dimensions: { length: 95, width: 85, height: 102, unit: 'cm' },
        weight: { value: 38, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 45,
      },
    ],
    specifications: {
      Material: 'Breathable Bonded Leatherette',
      Recline: '150-Degree Push-Back Recline with Footrest',
    },
    warrantyTerms: '3 Years reclining mechanical warranty.',
    isFeatured: false,
    rating: 4.85,
    reviewCount: 19,
  },
  {
    name: 'Vita Artisan Hardwood Nightstand Side Table',
    slug: 'vita-artisan-hardwood-nightstand-side-table',
    categorySlug: 'furniture',
    description:
      'Complement your bedroom layout with the Vita Artisan solid hardwood bedside table. Crafted with smooth soft-close double drawers and brushed brass handles.',
    tags: ['nightstand', 'bedside-table', 'hardwood', 'bedroom-furniture'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Artisan Hardwood Nightstand Front',
        isPrimary: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Artisan Nightstand Open Drawers View',
        isPrimary: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Artisan Wood Grain Texture',
        isPrimary: false,
      },
    ],
    variants: [
      {
        sku: 'VITA-NSTND-WLNT',
        name: 'Walnut Solid Wood',
        price: 65000,
        compareAtPrice: 75000,
        dimensions: { length: 50, width: 40, height: 55, unit: 'cm' },
        weight: { value: 14, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 60,
      },
    ],
    specifications: {
      Wood: 'Solid Walnut Wood & Natural Oil Finish',
      Drawers: '2 Soft-Close Metal Runner Drawers',
    },
    warrantyTerms: '3 Years wood warranty.',
    isFeatured: false,
    rating: 4.65,
    reviewCount: 15,
  },

  // 4. Beddings & Linens
  {
    name: 'Vita Royal Egyptian Cotton Duvet Set',
    slug: 'vita-royal-egyptian-cotton-duvet-set',
    categorySlug: 'beddings-linens',
    description:
      'Woven from 100% authentic long-staple Egyptian cotton at an 800 thread count, offering silky smooth softness, cool breathability, and long-lasting durability.',
    tags: ['duvet-set', 'egyptian-cotton', 'bedsheets', '800-thread-count'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Royal Egyptian Cotton Duvet Set Bed Layout',
        isPrimary: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Royal Duvet Cover Texture Detail',
        isPrimary: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Royal Pillowcase Detail',
        isPrimary: false,
      },
    ],
    variants: [
      {
        sku: 'VITA-DVT-EGY-QN-WHT',
        name: 'Queen Set (Pure White)',
        price: 68000,
        compareAtPrice: 80000,
        isAvailable: true,
        stockQuantity: 110,
      },
      {
        sku: 'VITA-DVT-EGY-KG-WHT',
        name: 'King Set (Pure White)',
        price: 78000,
        compareAtPrice: 92000,
        isAvailable: true,
        stockQuantity: 130,
      },
    ],
    specifications: {
      Material: '100% Long-Staple Egyptian Cotton',
      'Thread Count': '800 TC Satin Weave',
      Includes: '1 Duvet Cover, 1 Fitted Sheet, 4 Pillowcases',
    },
    warrantyTerms: '1 Year fabric pilling warranty.',
    isFeatured: true,
    rating: 4.9,
    reviewCount: 58,
  },
  {
    name: 'Vita Shield Waterproof Mattress Protector',
    slug: 'vita-shield-waterproof-mattress-protector',
    categorySlug: 'beddings-linens',
    description:
      'Guard your investment against liquid spills, perspiration, allergens, and dust mites. The Vita Shield uses a noiseless, 100% waterproof TPU membrane topped with ultra-soft bamboo jersey.',
    tags: ['mattress-protector', 'waterproof', 'bamboo', 'hypoallergenic'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Shield Waterproof Mattress Protector Applied on Mattress',
        isPrimary: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Shield Elastic Corner Skirt Detail',
        isPrimary: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Shield Water Resistance Demonstration',
        isPrimary: false,
      },
    ],
    variants: [
      {
        sku: 'VITA-PROT-QN-BMB',
        name: 'Queen Fitted (6ft x 5ft)',
        price: 22000,
        compareAtPrice: 26000,
        isAvailable: true,
        stockQuantity: 160,
      },
      {
        sku: 'VITA-PROT-KG-BMB',
        name: 'King Fitted (6ft x 6ft)',
        price: 26000,
        compareAtPrice: 30000,
        isAvailable: true,
        stockQuantity: 180,
      },
    ],
    specifications: {
      Top: '100% Organic Bamboo Viscose Jersey',
      Backing: 'Breathable Waterproof Polyurethane Membrane',
      Skirt: '18-inch Deep Pocket Stretch Fitted Skirt',
    },
    warrantyTerms: '2 Years waterproof backing guarantee.',
    isFeatured: false,
    rating: 4.8,
    reviewCount: 92,
  },
  {
    name: 'Vita All-Season Quilted Comforter',
    slug: 'vita-all-season-quilted-comforter',
    categorySlug: 'beddings-linens',
    description:
      'Designed with box-stitch baffle quilting to prevent filling shifts, offering cloud-like loft and balanced thermal regulation for both air-conditioned summer rooms and cooler nights.',
    tags: ['comforter', 'quilted', 'all-season', 'bedding'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita All-Season Quilted Comforter Overview',
        isPrimary: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Comforter Box-Stitch Detail',
        isPrimary: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Comforter Draped on Bed',
        isPrimary: false,
      },
    ],
    variants: [
      {
        sku: 'VITA-CMF-QN-SLV',
        name: 'Queen (Silver Gray)',
        price: 45000,
        compareAtPrice: 52000,
        isAvailable: true,
        stockQuantity: 95,
      },
    ],
    specifications: {
      Filling: '300 GSM Siliconized Microfiber',
      Shell: 'Peach-Fuzz Brushed Microfiber Shell',
    },
    warrantyTerms: '1 Year fill distribution warranty.',
    isFeatured: false,
    rating: 4.7,
    reviewCount: 33,
  },

  // 5. Nursery & Kids
  {
    name: 'Vita Baby Care Cot Mattress',
    slug: 'vita-baby-care-cot-mattress',
    categorySlug: 'nursery-kids',
    description:
      'Specially designed for developing infant spines. Constructed with firm anti-bacterial foam and wrapped in a non-toxic, fluid-resistant, wipe-clean cover for hygienic baby nurseries.',
    tags: ['baby-mattress', 'cot-mattress', 'infant', 'nursery', 'anti-bacterial'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Baby Care Cot Mattress in Wooden Cot',
        isPrimary: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Baby Care Mattress Surface Texture',
        isPrimary: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Baby Care Cot Mattress Side Profile',
        isPrimary: false,
      },
    ],
    variants: [
      {
        sku: 'VITA-BABY-COT-STD',
        name: 'Standard Baby Cot (120 x 60 x 10 cm)',
        price: 42000,
        compareAtPrice: 48000,
        firmness: 'firm',
        dimensions: { length: 120, width: 60, height: 10, unit: 'cm' },
        weight: { value: 6, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 85,
      },
    ],
    specifications: {
      Foam: 'Medical-Grade Firm Anti-Bacterial Polyurethane',
      Cover: 'Non-Toxic Phthalate-Free Waterproof Cover',
      Safety: 'Pediatrician Recommended Firmness Standard',
    },
    warrantyTerms: '3 Years core warranty.',
    isFeatured: true,
    rating: 4.9,
    reviewCount: 49,
  },
  {
    name: 'Vita Kids Play & Fold Cushion Mat',
    slug: 'vita-kids-play-and-fold-cushion-mat',
    categorySlug: 'nursery-kids',
    description:
      'A versatile multi-layer folding foam mat for toddler playtime, tumbling, and nap time. High-density cushioning absorbs impact during active play, while the removable canvas cover is machine washable.',
    tags: ['kids-mat', 'playmat', 'foldable', 'toddler-cushion'],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Kids Play & Fold Mat Folded View',
        isPrimary: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Kids Play Mat Unfolded Position',
        isPrimary: false,
      },
      {
        url: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=1000&q=80',
        alt: 'Vita Kids Play Mat Soft Surface Detail',
        isPrimary: false,
      },
    ],
    variants: [
      {
        sku: 'VITA-KIDS-MAT-BLU',
        name: 'Standard Tri-Fold (Pastel Blue)',
        price: 38000,
        compareAtPrice: 45000,
        dimensions: { length: 180, width: 90, height: 5, unit: 'cm' },
        weight: { value: 4.5, unit: 'kg' },
        isAvailable: true,
        stockQuantity: 105,
      },
    ],
    specifications: {
      Foam: 'High-Density Impact Absorbing Foam',
      Cover: 'Removable Heavy Duty Washable Cotton Canvas',
    },
    warrantyTerms: '2 Years foam shape warranty.',
    isFeatured: false,
    rating: 4.8,
    reviewCount: 29,
  },
];

async function seedDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!, { dbName: MONGODB_DB_NAME });
    console.log(`✅ Connected successfully to database: "${MONGODB_DB_NAME}"`);

    // 1. Inspect existing categories in database
    const existingCategories = await CategoryModel.find({}).exec();
    console.log(`\n📦 Existing Categories in DB (${existingCategories.length}):`);
    existingCategories.forEach((c) => {
      console.log(`   - ID: ${c._id} | Name: "${c.name}" | Slug: "${c.slug}"`);
    });

    const categoryMap = new Map<string, mongoose.Types.ObjectId>();

    // 2. Ensure Categories Exist in DB
    console.log('\n🏷️  Seeding / Updating Categories...');
    for (const catData of CATEGORIES_DATA) {
      let cat = await CategoryModel.findOne({ slug: catData.slug }).exec();

      if (!cat) {
        cat = await CategoryModel.findOne({
          name: new RegExp(`^${catData.name}$`, 'i'),
        }).exec();
      }

      if (cat) {
        console.log(`   ➔ Found existing category: "${cat.name}" (ID: ${cat._id})`);
        categoryMap.set(catData.slug, cat._id as Types.ObjectId);
      } else {
        const newCat = await CategoryModel.create({
          name: catData.name,
          slug: catData.slug,
          description: catData.description,
          path: catData.path,
          order: catData.order,
          imageUrl: catData.imageUrl,
          isActive: true,
        });
        console.log(`   ✨ Created new category: "${newCat.name}" (ID: ${newCat._id})`);
        categoryMap.set(catData.slug, newCat._id as Types.ObjectId);
      }
    }

    for (const existing of existingCategories) {
      if (!categoryMap.has(existing.slug)) {
        categoryMap.set(existing.slug, existing._id as Types.ObjectId);
      }
    }

    // 3. Clear old test products and inventory documents
    console.log('\n🧹 Clearing old products and inventory records...');
    const deleteProductsResult = await ProductModel.deleteMany({});
    const deleteInventoryResult = await InventoryModel.deleteMany({});
    console.log(
      `   Deleted ${deleteProductsResult.deletedCount} product(s) and ${deleteInventoryResult.deletedCount} inventory record(s).`,
    );

    // 4. Insert 20 Products and their corresponding Inventory stock documents
    console.log('\n🚀 Inserting 20 Vitafoam Products & Inventory Stock...');
    let insertedCount = 0;
    let inventoryCount = 0;

    for (const p of PRODUCTS_DATA) {
      let categoryId = categoryMap.get(p.categorySlug);

      if (!categoryId) {
        const fallbackCat = Array.from(categoryMap.values())[0];
        categoryId = fallbackCat;
      }

      // Strip temporary `stockQuantity` from variants before inserting product
      const cleanVariants = p.variants.map(({ stockQuantity, ...v }) => v);

      const productToInsert = {
        name: p.name,
        slug: p.slug,
        description: p.description,
        categoryId: categoryId,
        categorySlug: p.categorySlug,
        tags: p.tags,
        images: p.images,
        variants: cleanVariants,
        specifications: p.specifications,
        warrantyTerms: p.warrantyTerms,
        isActive: true,
        isFeatured: p.isFeatured,
        rating: p.rating,
        reviewCount: p.reviewCount,
      };

      const createdProduct = await ProductModel.create(productToInsert);
      insertedCount++;

      // Create Inventory record for EACH variant SKU of this product
      for (const variant of p.variants) {
        const stockQty = variant.stockQuantity || 100;
        await InventoryModel.create({
          sku: variant.sku.trim(),
          productId: createdProduct._id,
          quantity: stockQty,
          reserved: 0,
          reorderPoint: 10,
          reorderQuantity: 50,
          warehouse: 'Main Warehouse — Ikeja',
          version: 1,
        });
        inventoryCount++;
      }

      console.log(
        `   [${insertedCount}/20] Created Product: "${createdProduct.name}" (${p.variants.length} variant SKUs seeded in Inventory)`,
      );
    }

    console.log('\n==================================================');
    console.log(`🎉 SUCCESS: Database & Inventory seeding complete!`);
    console.log(`   - Total Categories Available: ${categoryMap.size}`);
    console.log(`   - Total Products Seeded: ${insertedCount}`);
    console.log(`   - Total Inventory Stock Records Created: ${inventoryCount}`);
    console.log('==================================================\n');
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

seedDatabase();
