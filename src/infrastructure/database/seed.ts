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

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, default: 'Vitafoam' },
    lastName: { type: String, default: 'Editorial Team' },
    email: { type: String, unique: true, index: true },
    role: { type: String, default: 'admin' },
  },
  { timestamps: true }
);

const ArticleSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    title: { type: String, required: true, trim: true },
    excerpt: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    tags: { type: [String], default: [], index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coverImage: { type: String, trim: true },
    isPublished: { type: Boolean, default: true, index: true },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const CategoryModel = mongoose.model('Category', CategorySchema);
const ProductModel = mongoose.model('Product', ProductSchema);
const InventoryModel = mongoose.model('Inventory', InventorySchema);
const UserModel = mongoose.model('User', UserSchema);
const ArticleModel = mongoose.model('Article', ArticleSchema);

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

// 1000 Products Generator for Scalability Testing
function generate1000Products() {
  const products: any[] = [];
  let idCounter = 1;

  const categoriesConfig = [
    {
      slug: 'mattresses',
      count: 300,
      prefix: 'VITA-MAT',
      types: [
        'Orthopaedic Mattress',
        'Memory Foam Mattress',
        'Pocket Spring Mattress',
        'Hybrid Mattress',
        'High-Density Foam Mattress',
        'Cooling Gel Mattress',
        'Natural Latex Mattress',
        'Pillowtop Luxury Mattress',
        'Semi-Orthopaedic Mattress',
        'Dual-Comfort Reversible Mattress',
      ],
      qualifiers: [
        'Spring Flex', 'Grand', 'Galaxy', 'Cool Gel', 'Supreme', 'Eco-Luxe', 'Sleep Haven',
        'Ortho Guard', 'Dreamline', 'Spine Align', 'Air Flow', 'Vitality', 'Serenity',
        'Tranquility', 'Horizon', 'Zenith', 'Prestige', 'Monarch', 'Comfort Plus', 'Titan',
        'Quantum', 'Apex', 'Harmony', 'Oasis', 'CloudNine', 'PosturePerfect', 'RestAssured',
        'Sovereign', 'Royal', 'Celestial', 'Imperial', 'UltraFirm', 'PureRest', 'TheraFlex',
        'BioComfort', 'Optima', 'Vanguard', 'Elegance', 'Nirvana', 'Starlight', 'Solace',
        'Regal', 'Peak', 'Legacy', 'Magnum', 'InfiniSleep', 'DualCore', 'ActiveRest',
        'ProBack', 'ChiroSupport', 'SilverTouch', 'VelvetRest', 'ZenithFlex', 'Lumina',
        'VividRest', 'TitaniumCore', 'AeroBreathe', 'EcoFoam', 'ZeroG', 'UltraSleep'
      ],
      tagsList: ['orthopaedic', 'memory-foam', 'spring', 'back-care', 'cooling', 'firm', 'bestseller', 'luxury'],
      basePrice: 95000,
      priceStep: 5000,
      images: [
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
        'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80',
        'https://images.unsplash.com/photo-1582582621959-48d27397dc69?w=800&q=80',
        'https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=800&q=80',
        'https://images.unsplash.com/photo-1544457070-4cd773b4d71e?w=800&q=80',
        'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=800&q=80',
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80'
      ]
    },
    {
      slug: 'pillows-cushions',
      count: 225,
      prefix: 'VITA-PIL',
      types: [
        'Ergo Contour Memory Pillow',
        'Luxury Microfiber Hotel Pillow',
        'CoolGel Therapy Neck Pillow',
        'Ortho Lumbar Back Support Cushion',
        'Nest Maternity Body Pillow',
        'Cervical Spine Support Pillow',
        'Shredded Memory Foam Pillow',
        'Natural Latex Pillow',
        'Wedge Acid Reflux Cushion',
        'Travel U-Shape Neck Pillow'
      ],
      qualifiers: [
        'AirBreathe', 'RestEasy', 'TheraNeck', 'CloudSoft', 'SpineCare', 'CoolTouch',
        'SatinSoft', 'VelvetTouch', 'PureRelax', 'OrthoRest', 'BioGel', 'ComfortPlus',
        'PlushLoft', 'SereneRest', 'ZenSupport', 'FlexiLoft', 'AeroGel', 'ErgoPro',
        'DeepRest', 'SleepShield', 'HydroCool', 'SilkySoft', 'ContourMax', 'DualZone',
        'TitanRest', 'RegalLoft', 'OptimaCare', 'NirvanaRest', 'VanguardPilot', 'LuminaRest',
        'StarlightPillow', 'OasisCushion', 'HarmonyLoft', 'ApexSupport', 'QuantumLoft',
        'MonarchPillow', 'LegacyLoft', 'MagnumSupport', 'InfiniRest', 'ProNeck',
        'ChiroLoft', 'SilverLoft', 'VelvetSupport', 'ZenithPillow', 'VividLoft'
      ],
      tagsList: ['pillow', 'neck-support', 'memory-foam', 'cooling', 'ergonomic', 'lumbar'],
      basePrice: 12000,
      priceStep: 1500,
      images: [
        'https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=800&q=80',
        'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&q=80',
        'https://images.unsplash.com/photo-1579656381226-5fc0f0100c3b?w=800&q=80',
        'https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=800&q=80',
        'https://images.unsplash.com/photo-1629949009765-40fc74c954c4?w=800&q=80'
      ]
    },
    {
      slug: 'furniture',
      count: 175,
      prefix: 'VITA-FRN',
      types: [
        'Modern Upholstered Bed Frame',
        'Relaxer Convertible Sofa Bed',
        'Comfort Ergonomic Recliner',
        'Artisan Hardwood Nightstand',
        'Storage Ottoman Bench',
        'Platform Wooden Bed Frame',
        'Velvet Tufted Headboard',
        'Folding Rollaway Guest Bed',
        'Bedroom Accent Lounge Chair',
        'Minimalist Double Wardrobe'
      ],
      qualifiers: [
        'Heritage', 'Royal', 'Imperial', 'Nordic', 'Artisan', 'Urban', 'VelvetRest',
        'Hardwood', 'Executive', 'Luxury', 'Classic', 'Metropolitan', 'Sovereign',
        'Craftsman', 'Elegance', 'Grandeur', 'Moderna', 'Vintage', 'Prestige',
        'Horizon', 'Zenith', 'Titan', 'Apex', 'Harmony', 'Oasis', 'Legacy',
        'Magnum', 'InfiniWood', 'ProCraft', 'SilverWood', 'LuminaWood', 'StarlightWood',
        'NirvanaFurniture', 'VanguardWood', 'AeroWood'
      ],
      tagsList: ['furniture', 'bed-frame', 'hardwood', 'upholstered', 'sofa-bed', 'recliner'],
      basePrice: 55000,
      priceStep: 10000,
      images: [
        'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=800&q=80',
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
        'https://images.unsplash.com/photo-1506898667547-42e2b3a4fe21?w=800&q=80',
        'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&q=80'
      ]
    },
    {
      slug: 'beddings-linens',
      count: 200,
      prefix: 'VITA-BDG',
      types: [
        'Royal Egyptian Cotton Duvet Set',
        'Shield Waterproof Mattress Protector',
        'All-Season Quilted Comforter',
        'Pure Bamboo Sheet Set',
        'Deep Pocket Fitted Bedsheet',
        'Weighted Deep Sleep Blanket',
        'Pure Mulberry Silk Pillowcase Set',
        'Quilted Mattress Topper Pad',
        'Hypoallergenic Duvet Insert',
        'Linen Breathable Comforter'
      ],
      qualifiers: [
        'SilkySoft', 'Egyptian', 'Royal', 'HotelLuxe', 'PureBamboo', 'ComfortShield',
        'QuiltedRest', 'SatinWeave', 'VelvetTouch', 'BreezeAir', 'ThermoRest', 'CloudSoft',
        'LuxeLinen', 'UltraSoft', 'PureCotton', 'OrganicRest', 'SovereignSheet',
        'ImperiaLinen', 'ZenithLinen', 'PrestigeLinen', 'MonarchLinen', 'TitanLinen',
        'QuantumLinen', 'ApexLinen', 'HarmonyLinen', 'OasisLinen', 'LegacyLinen',
        'MagnumLinen', 'InfiniLinen', 'ProSheet', 'SilverSheet', 'LuminaLinen',
        'StarlightLinen', 'NirvanaLinen', 'VanguardLinen', 'AeroLinen', 'VividLinen',
        'BioLinen', 'OptimaLinen', 'EleganceLinen'
      ],
      tagsList: ['beddings', 'egyptian-cotton', 'waterproof', 'duvet', 'sheets', 'comforter'],
      basePrice: 18000,
      priceStep: 2500,
      images: [
        'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800&q=80',
        'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80',
        'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&q=80'
      ]
    },
    {
      slug: 'nursery-kids',
      count: 100,
      prefix: 'VITA-KID',
      types: [
        'Baby Care Cot Mattress',
        'Kids Play & Fold Cushion Mat',
        'Toddler First Ortho Pillow',
        'Infant Anti-Bacterial Bumper Set',
        'Junior Ergonomic Mini Chair',
        'Nursery Waterproof Sheet Protector',
        'Baby Nest Lounger Pod',
        'Kids Soft Foam Sofa Bed',
        'Toddler Nap Mat Roll',
        'Junior High-Density Cot Pad'
      ],
      qualifiers: [
        'SafeNest', 'LittleCloud', 'TinyRest', 'JuniorCare', 'BabyShield', 'ToddlerSoft',
        'PlayTime', 'CozyBaby', 'MiniComfort', 'SweetDreams', 'PureBaby', 'NurseryLuxe',
        'BabyRest', 'InfantSafe', 'LittleStar', 'CuddleNest', 'TinySteps', 'JuniorRest',
        'BabyJoy', 'KidsHaven'
      ],
      tagsList: ['nursery', 'baby-cot', 'kids', 'playmat', 'anti-bacterial', 'toddler'],
      basePrice: 22000,
      priceStep: 3000,
      images: [
        'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800&q=80',
        'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=800&q=80'
      ]
    }
  ];

  for (const cat of categoriesConfig) {
    for (let i = 0; i < cat.count; i++) {
      const type = cat.types[i % cat.types.length];
      const qualifier = cat.qualifiers[i % cat.qualifiers.length];
      const name = `Vita ${qualifier} ${type} ${Math.floor(i / cat.qualifiers.length) > 0 ? `#${Math.floor(i / cat.qualifiers.length) + 1}` : ''}`.trim();
      const slug = `vita-${qualifier.toLowerCase()}-${type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${idCounter}`;
      
      const price1 = cat.basePrice + (i * cat.priceStep) % 150000;
      const comparePrice1 = Math.round(price1 * 1.15);
      const sku1 = `${cat.prefix}-${idCounter}-A`;

      const price2 = Math.round(price1 * 1.25);
      const comparePrice2 = Math.round(price2 * 1.15);
      const sku2 = `${cat.prefix}-${idCounter}-B`;

      const primaryImg = cat.images[i % cat.images.length];
      const secondaryImg = cat.images[(i + 1) % cat.images.length];

      products.push({
        name,
        slug,
        categorySlug: cat.slug,
        description: `Experience uncompromised comfort with the ${name}. Expertly engineered by Vitafoam using high-performance materials designed for maximum durability, posture support, and optimal sleep temperature regulation.`,
        tags: [cat.tagsList[i % cat.tagsList.length], cat.tagsList[(i + 2) % cat.tagsList.length], 'vitafoam', 'premium'],
        images: [
          { url: primaryImg, alt: `${name} Angle View`, isPrimary: true },
          { url: secondaryImg, alt: `${name} Detail View`, isPrimary: false }
        ],
        variants: [
          {
            sku: sku1,
            name: 'Standard Edition',
            price: price1,
            compareAtPrice: comparePrice1,
            firmness: i % 2 === 0 ? 'medium' : 'firm',
            dimensions: { length: 190, width: 137, height: 25, unit: 'cm' },
            weight: { value: 25 + (i % 20), unit: 'kg' },
            isAvailable: true,
            stockQuantity: 50 + (i * 3) % 100
          },
          {
            sku: sku2,
            name: 'Deluxe / King Edition',
            price: price2,
            compareAtPrice: comparePrice2,
            firmness: i % 3 === 0 ? 'extra-firm' : 'medium',
            dimensions: { length: 200, width: 183, height: 30, unit: 'cm' },
            weight: { value: 35 + (i % 20), unit: 'kg' },
            isAvailable: true,
            stockQuantity: 40 + (i * 5) % 80
          }
        ],
        specifications: {
          'Brand': 'Vitafoam Nigeria',
          'Quality Grade': 'Export Premium Grade A',
          'Warranty': `${3 + (i % 10)} Years Manufacturer Warranty`,
          'Material': 'High-Resilience Polyurethane & Quilted Breathable Fabric'
        },
        warrantyTerms: `${3 + (i % 10)} Years coverage against sagging and structural degradation.`,
        isFeatured: i % 7 === 0,
        rating: Number((4.2 + (i % 8) * 0.1).toFixed(1)),
        reviewCount: 15 + (i * 7) % 120
      });

      idCounter++;
    }
  }

  return products;
}

const PRODUCTS_DATA = generate1000Products();

const ARTICLES_DATA = [
  {
    title: 'The Ultimate Guide to Choosing the Right Mattress for Back Pain',
    slug: 'the-ultimate-guide-to-choosing-the-right-mattress-for-back-pain',
    tags: ['Back Care', 'Orthopaedic', 'Sleep Tips'],
    excerpt: 'Discover how spinal alignment during sleep impacts chronic lower back stiffness, and how targeted firmness levels relieve lumbosacral pressure.',
    coverImage: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80',
    content: `# The Ultimate Guide to Choosing the Right Mattress for Back Pain

Chronic back pain is one of the most common causes of disrupted sleep, morning stiffness, and daytime fatigue. When your spine is not properly supported during the 7 to 9 hours you spend in bed each night, the muscles along your lumbar spine remain strained instead of recovering.

## Understanding Spinal Alignment

A supportive mattress does not mean a rock-hard sleeping surface. The key is neutral spinal alignment:
- Side Sleepers: Need a mattress that allows the hips and shoulders to sink slightly while maintaining a straight line from the neck down to the tailbone.
- Back Sleepers: Require firm support under the lumbar curve to prevent the lower back from sagging hammock-style.
- Stomach Sleepers: Need a firmer mattress surface to keep the hips elevated and prevent unnatural arching of the spine.

## Orthopaedic vs. Semi-Orthopaedic Foam Cores

1. Orthopaedic High-Density Foam: Engineered specifically to distribute body weight evenly across high-pressure zones (hips, lower back, and shoulders). It minimizes sag and keeps the lumbosacral region supported.
2. Memory Foam Contour Layers: Adapts dynamically to body heat and contours to the natural curve of the lower back, reducing pinpoint pressure points.

## How to Test Your Current Mattress

If you wake up with lower back stiffness that gradually eases after 30 minutes of stretching and walking around, your mattress is likely failing to support your spine correctly. Consider upgrading to an orthopaedic density mattress like the Vita Spring Flex or Vita Supreme Semi-Orthopaedic Mattress.`,
    isPublished: true,
    publishedAt: new Date(),
  },
  {
    title: 'How Memory Foam vs. Natural Latex Compares for Hot Sleepers',
    slug: 'memory-foam-vs-natural-latex-for-hot-sleepers',
    tags: ['Mattress Technology', 'Cooling', 'Sleep Health'],
    excerpt: 'Demystifying open-cell visco-elastic memory foam and natural Dunlop latex to help hot sleepers regulate nighttime temperature effectively.',
    coverImage: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&q=80',
    content: `# How Memory Foam vs. Natural Latex Compares for Hot Sleepers

Sleeping hot can cause frequent night awakenings, tossing, and turning. Understanding the material science behind your mattress core is essential for staying cool throughout tropical nights.

## Visco-Elastic Memory Foam

Memory foam is renowned for its pressure-relieving contouring. However, traditional dense memory foam can retain body heat if unvented.

- Cooling Gel Innovations: Modern memory foam mattresses incorporate micro-gel bead technology and open-cell structures that actively dissipate trapped heat.
- Best For: Sleepers seeking maximum joint pressure relief and zero motion transfer when sharing a bed with a partner.

## 100% Natural Dunlop Latex

Harvested from organic rubber trees, natural latex is inherently breathable due to its open-cell pinhole structure.

- Natural Airflow: Air circulates freely through latex layers, preventing thermal buildup without needing synthetic cooling additives.
- Buoyant Bounce: Unlike memory foam, which gives a "sinking in" feeling, latex offers a responsive "floating on top" sensation.
- Best For: Eco-conscious buyers, allergy sufferers, and combination sleepers who turn frequently during the night.

## The Verdict for Hot Climates

If thermal comfort is your top priority, natural latex mattresses or cooling gel-infused hybrid mattresses (such as the Vita Cool Gel Hybrid) provide the most consistent temperature regulation.`,
    isPublished: true,
    publishedAt: new Date(),
  },
  {
    title: '5 Science-Backed Evening Habits for Deeper REM Sleep',
    slug: '5-science-backed-evening-habits-for-deeper-rem-sleep',
    tags: ['Sleep Wellness', 'Lifestyle', 'Mindfulness'],
    excerpt: 'Practical bedtime rituals, light exposure management, and mattress comfort tips that optimize your sleep cycles for restorative recovery.',
    coverImage: 'https://images.unsplash.com/photo-1505693314120-0d443867891c?w=800&q=80',
    content: `# 5 Science-Backed Evening Habits for Deeper REM Sleep

Rapid Eye Movement (REM) sleep and deep slow-wave sleep are essential stages for cognitive consolidation, cellular repair, and emotional resilience. Here are five evidence-based practices to improve sleep depth.

## 1. Dim Artificial Blue Light 90 Minutes Before Bed
Artificial light from smartphones, tablets, and televisions suppresses natural melatonin secretion. Switch to warm ambient lighting in your bedroom during the evening hours.

## 2. Maintain a Consistent Sleep-Wake Window
Going to bed and waking up at the same times every day stabilizes your body's internal circadian clock, making it easier to fall asleep effortlessly.

## 3. Keep Your Bedroom Cool and Well-Ventilated
Your body temperature needs to drop by approximately 1°C to initiate sleep. Keep your bedroom well-ventilated or use breathable cotton bed linens.

## 4. Eliminate Pressure Points with Ergonomic Bedding
Discomfort from an aging or uneven mattress causes micro-arousals—brief awakenings that reset your sleep cycle and reduce deep REM sleep duration.

## 5. Practice 10 Minutes of Evening Decompression
Engage in low-stimulation activities such as light reading, gentle stretching, or breathing exercises to lower your heart rate before climbing into bed.`,
    isPublished: true,
    publishedAt: new Date(),
  },
  {
    title: 'Selecting the Perfect Neck Support Pillow for Side & Back Sleepers',
    slug: 'selecting-the-perfect-neck-support-pillow',
    tags: ['Pillows', 'Ergonomics', 'Neck Care'],
    excerpt: 'Uncover how contoured cervical pillows and microfiber lofts maintain neck alignment and prevent morning shoulder stiffness.',
    coverImage: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=800&q=80',
    content: `# Selecting the Perfect Neck Support Pillow for Side & Back Sleepers

While much attention is given to mattress selection, your pillow accounts for roughly 25% of your total sleeping surface. An ill-fitted pillow can tilt your head unnaturally, straining cervical muscles.

## Pillow Selection by Sleep Position

### For Side Sleepers
Side sleepers need a higher loft (thickness) pillow to fill the gap between the mattress surface and the side of the head, keeping the neck parallel to the bed.
- Recommended: Contoured memory foam pillows like the Vita Ergo Contour Memory Pillow.

### For Back Sleepers
Back sleepers require a medium-loft pillow that supports the natural curve of the neck without pushing the chin forward onto the chest.
- Recommended: Microfiber hotel-grade pillows or dual-contoured memory foam pads.

### For Combination Sleepers
If you shift between side and back positions during the night, choose a responsive pillow with dual-zone height zones.

## Pillow Hygiene & Maintenance
- Protective Covers: Use breathable zip covers to shield pillow cores against sweat and moisture.
- Replacement Cycle: Replace synthetic microfiber pillows every 18 to 24 months, and memory foam pillows every 3 years.`,
    isPublished: true,
    publishedAt: new Date(),
  },
  {
    title: 'Nursery Sleep Safety: How to Choose a Hypoallergenic Baby Cot Mattress',
    slug: 'nursery-sleep-safety-hypoallergenic-baby-cot-mattress',
    tags: ['Nursery & Kids', 'Baby Care', 'Hypoallergenic'],
    excerpt: 'Essential safety guidelines for infant sleep surfaces, firm mattress density recommendations, and anti-bacterial cover selections.',
    coverImage: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800&q=80',
    content: `# Nursery Sleep Safety: How to Choose a Hypoallergenic Baby Cot Mattress

Creating a safe, hygienic, and comfortable sleep environment for your infant is every parent's top priority. Pediatricians emphasize that infant mattresses require completely different specifications than adult beds.

## Key Factors for Infant Cot Mattresses

### 1. Firmness is Safety Priority #1
Unlike adults who enjoy plush cushioning, infants need a firm, flat sleep surface. A firm mattress prevents the infant's face from sinking into the foam, ensuring unimpeded breathing.

### 2. Hypoallergenic & Anti-Bacterial Core
Infant immune systems are still developing. Ensure the mattress core utilizes medical-grade, anti-bacterial polyurethane foam that resists dust mites and microbial growth.

### 3. Waterproof & Wipe-Clean Covers
Diaper leaks and spit-ups are inevitable in the nursery. Choose cot mattresses featuring non-toxic, fluid-resistant covers like the Vita Baby Care Cot Mattress for quick cleaning and sanitation.

### 4. Precise Cot Fit
Ensure there are no gaps wider than two fingers between the edge of the mattress and the cot frame to prevent entrapment hazards.`,
    isPublished: true,
    publishedAt: new Date(),
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
    console.log('\n🧹 Clearing old products, inventory records, and articles...');
    const deleteProductsResult = await ProductModel.deleteMany({});
    const deleteInventoryResult = await InventoryModel.deleteMany({});
    const deleteArticlesResult = await ArticleModel.deleteMany({});
    console.log(
      `   Deleted ${deleteProductsResult.deletedCount} product(s), ${deleteInventoryResult.deletedCount} inventory record(s), and ${deleteArticlesResult.deletedCount} article(s).`,
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
      const cleanVariants = p.variants.map((v: any) => {
        const { stockQuantity, ...rest } = v;
        return rest;
      });

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

    // 5. Ensure an Editorial User exists for authorId
    console.log('\n✍️ Ensuring Editorial Author User exists...');
    let authorUser = await UserModel.findOne({ email: 'editorial@vitafoam.com.ng' }).exec();
    if (!authorUser) {
      authorUser = await UserModel.create({
        firstName: 'Vitafoam',
        lastName: 'Editorial Team',
        email: 'editorial@vitafoam.com.ng',
        role: 'admin',
      });
      console.log(`   ✨ Created Editorial Author User (ID: ${authorUser._id})`);
    } else {
      console.log(`   ➔ Found Editorial Author User (ID: ${authorUser._id})`);
    }

    // 6. Seed 5 Articles
    console.log('\n📰 Seeding 5 Vitafoam Articles...');
    let seededArticlesCount = 0;
    for (const article of ARTICLES_DATA) {
      const createdArticle = await ArticleModel.create({
        ...article,
        authorId: authorUser._id,
      });
      seededArticlesCount++;
      console.log(`   [${seededArticlesCount}/5] Created Article: "${createdArticle.title}" (Slug: ${createdArticle.slug})`);
    }

    console.log('\n==================================================');
    console.log(`🎉 SUCCESS: Database, Inventory & Articles seeding complete!`);
    console.log(`   - Total Categories Available: ${categoryMap.size}`);
    console.log(`   - Total Products Seeded: ${insertedCount}`);
    console.log(`   - Total Inventory Stock Records Created: ${inventoryCount}`);
    console.log(`   - Total Articles Seeded: ${seededArticlesCount}`);
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
