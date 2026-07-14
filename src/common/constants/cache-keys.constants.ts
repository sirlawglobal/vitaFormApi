/**
 * Redis cache key builders.
 * All keys are functions so keys are always constructed consistently.
 * The global prefix (vitaform:) is set in Redis client config.
 */
export const CACHE_KEYS = {
  // Session
  session: (token: string) => `session:${token}`,
  userSessions: (userId: string) => `user:sessions:${userId}`,

  // OTP
  otp: (type: string, identifier: string) => `otp:${type}:${identifier}`,
  otpAttempts: (identifier: string) => `otp:attempts:${identifier}`,

  // Rate limiting
  rateLimitAuth: (ip: string) => `ratelimit:auth:${ip}`,
  rateLimitApi: (userId: string, route: string) =>
    `ratelimit:api:${userId}:${route}`,
  rateLimitOtp: (identifier: string) => `ratelimit:otp:${identifier}`,

  // Products
  product: (id: string) => `product:${id}`,
  productSlug: (slug: string) => `product:slug:${slug}`,
  productsList: (hash: string) => `products:list:${hash}`,
  categoryProducts: (categoryId: string) =>
    `category:${categoryId}:products`,
  categoriesTree: () => 'categories:tree',
  category: (id: string) => `category:${id}`,

  // Cart (primary storage)
  cart: (userId: string) => `cart:${userId}`,

  // Search
  searchPopular: () => 'search:popular',
  searchHistory: (userId: string) => `search:history:${userId}`,
  searchAutocomplete: (prefix: string) => `search:autocomplete:${prefix}`,
  searchResults: (queryHash: string) => `search:results:${queryHash}`,

  // Recommendations
  recommendation: (userId: string) => `rec:${userId}`,
  recommendationPopular: () => 'rec:popular',
  recommendationTrending: () => 'rec:trending',

  // Inventory
  inventoryLock: (sku: string) => `inventory:lock:${sku}`,
  inventoryCount: (sku: string) => `inventory:${sku}`,

  // Promotions / Coupons
  coupon: (code: string) => `coupon:${code}`,
  couponUsed: (code: string, userId: string) => `coupon:used:${code}:${userId}`,

  // AI
  aiResponse: (hash: string) => `ai:response:${hash}`,

  // Dealers
  dealers: (lat: number, lng: number, radius: number) =>
    `dealers:${lat}:${lng}:${radius}`,

  // Distributed locks
  lock: (resource: string, id: string) => `lock:${resource}:${id}`,
} as const;

/** TTL constants in seconds */
export const CACHE_TTL = {
  SESSION: 7 * 24 * 60 * 60,       // 7 days
  OTP: 5 * 60,                       // 5 minutes
  OTP_ATTEMPTS: 60 * 60,             // 1 hour
  PRODUCT: 60 * 60,                  // 1 hour
  PRODUCTS_LIST: 5 * 60,             // 5 minutes
  CATEGORY_PRODUCTS: 10 * 60,        // 10 minutes
  CATEGORIES_TREE: 60 * 60,          // 1 hour
  CART: 30 * 24 * 60 * 60,           // 30 days
  SEARCH_RESULTS: 2 * 60,            // 2 minutes
  SEARCH_AUTOCOMPLETE: 60 * 60,      // 1 hour
  RECOMMENDATION: 24 * 60 * 60,      // 24 hours
  RECOMMENDATION_POPULAR: 6 * 60 * 60, // 6 hours
  RECOMMENDATION_TRENDING: 60 * 60,  // 1 hour
  INVENTORY: 5 * 60,                 // 5 minutes
  INVENTORY_LOCK: 30,                // 30 seconds
  COUPON: 60 * 60,                   // 1 hour
  AI_RESPONSE: 60 * 60,              // 1 hour
  DEALERS: 30 * 60,                  // 30 minutes
  LOCK: 30,                          // 30 seconds
} as const;
