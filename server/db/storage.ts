import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

// Paths for local document persistence if MongoDB server is not configured in environment
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'luxeattire_db.json');

// Interface for general document
export interface DocumentItem {
  _id: string;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

// Global in-memory document tables loaded from/persisted to file
interface LocalDatabase {
  users: DocumentItem[];
  products: DocumentItem[];
  categories: DocumentItem[];
  orders: DocumentItem[];
  carts: DocumentItem[];
  wishlists: DocumentItem[];
  coupons: DocumentItem[];
  reviews: DocumentItem[];
  notifications: DocumentItem[];
  emailLogs: DocumentItem[];
  auditLogs: DocumentItem[];
  settings: DocumentItem[];
}

const defaultDbState: LocalDatabase = {
  users: [],
  products: [],
  categories: [],
  orders: [],
  carts: [],
  wishlists: [],
  coupons: [],
  reviews: [],
  notifications: [],
  emailLogs: [],
  auditLogs: [],
  settings: [
    {
      _id: 'default_store_settings',
      hero: {
        title: 'Elevate Your Signature Style',
        subtitle: 'Discover meticulously curated luxury apparel crafted for timeless modern elegance.',
        ctaText: 'Shop New Arrivals',
        ctaLink: '/products',
        secondaryCtaText: 'Explore Collections',
        secondaryCtaLink: '/categories',
        bannerImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1600&auto=format&fit=crop',
        badge: 'Spring / Summer 2026'
      },
      announcementBar: {
        text: 'Complimentary Worldwide Shipping on Orders Over $200 · Use Code LUXE15 for 15% Off',
        isActive: true
      },
      updatedAt: new Date().toISOString()
    }
  ]
};

let localDb: LocalDatabase = { ...defaultDbState };
let isConnectedToMongo = false;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load database from file
function loadDatabaseFromFile() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      localDb = { ...defaultDbState, ...parsed };
      console.log('[Database] Loaded local persistent document store successfully.');
    } else {
      saveDatabaseToFile();
    }
  } catch (err) {
    console.error('[Database] Error loading local db file, initializing fresh:', err);
    saveDatabaseToFile();
  }
}

// Atomic save to file
function saveDatabaseToFile() {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(localDb, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[Database] Failed to save local db to disk:', err);
  }
}

// Initialize persistence
loadDatabaseFromFile();

// ---- MongoDB (Compass) primary store ----
const COLLECTION_NAMES = [
  'users',
  'products',
  'categories',
  'orders',
  'carts',
  'wishlists',
  'coupons',
  'reviews',
  'notifications',
  'emailLogs',
  'auditLogs',
  'settings',
] as const;

const genericSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    id: { type: String },
  },
  { strict: false, versionKey: false }
);

function getMongoModel(collectionName: string): any {
  if (mongoose.models[collectionName]) {
    return mongoose.models[collectionName] as any;
  }
  return mongoose.model(collectionName, genericSchema, collectionName) as any;
}

function toPlain<T>(doc: any): T {
  if (!doc) return doc;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (obj._id !== undefined) obj._id = String(obj._id);
  if (!obj.id && obj._id) obj.id = String(obj._id);
  if (obj._doc) delete obj._doc;
  if (obj.__v !== undefined) delete obj.__v;
  return obj as T;
}

function getNested(obj: any, dottedKey: string): any {
  return dottedKey.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), obj);
}

// Optional MongoDB Mongoose Connection — MongoDB Compass IS the primary store when reachable
export async function initDatabaseConnection(): Promise<void> {
  let uri = process.env.MONGODB_URI?.trim() || 'mongodb://127.0.0.1:27017/shopfusion';
  // Normalize localhost -> 127.0.0.1 to avoid ::1 resolution issues on Windows
  uri = uri.replace('mongodb://localhost', 'mongodb://127.0.0.1');
  try {
    console.log('[Database] Connecting to MongoDB Compass at', uri.replace(/:([^:@]+)@/, ':****@'));
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      dbName: 'shopfusion',
    });
    isConnectedToMongo = true;
    console.log('[Database] MongoDB Compass connection established (db: shopfusion). MongoDB is now PRIMARY store.');
    await ensureDefaultSettingsInMongo();
    await migrateLocalFileToMongoOnce();
  } catch (err) {
    console.warn('[Database] MongoDB Compass unreachable. Falling back to local persistent document store.', err);
    isConnectedToMongo = false;
  }
}

async function ensureDefaultSettingsInMongo() {
  try {
    const Settings = getMongoModel('settings');
    const existing = await Settings.findById('default_store_settings').lean();
    if (!existing) {
      const seed = defaultDbState.settings[0];
      await Settings.create({ ...seed, _id: 'default_store_settings', id: 'default_store_settings' });
      console.log('[Database] Seeded default_store_settings into MongoDB.');
    }
  } catch (e) {
    console.warn('[Database] Could not ensure default settings in Mongo:', e);
  }
}

// One-way migration: local JSON file -> MongoDB Compass (only fills empty collections)
async function migrateLocalFileToMongoOnce() {
  try {
    for (const name of COLLECTION_NAMES) {
      const Model = getMongoModel(name);
      const mongoCount = await Model.countDocuments({});
      const localItems = (localDb as any)[name] as DocumentItem[];
      if (mongoCount === 0 && localItems && localItems.length > 0) {
        const docs = localItems.map(d => ({
          ...d,
          _id: String((d as any)._id || (d as any).id || generateUniqueId()),
          id: String((d as any).id || (d as any)._id),
        }));
        await Model.insertMany(docs, { ordered: false });
        console.log(`[Database] Migrated ${docs.length} local '${name}' docs -> MongoDB Compass.`);
      }
    }
  } catch (e) {
    console.warn('[Database] Local -> Mongo migration skipped:', (e as Error).message);
  }
}

export function isMongoActive(): boolean {
  return isConnectedToMongo;
}

// Helper to generate consistent unique ID
export function generateUniqueId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `${prefix}${timestamp}_${randomStr}`;
}

// Generic Collection Repository — MongoDB Compass PRIMARY, local file fallback/cache
export class LocalCollection<T extends DocumentItem> {
  private collectionName: keyof LocalDatabase;

  constructor(collectionName: keyof LocalDatabase) {
    this.collectionName = collectionName;
  }

  private get model(): any {
    return getMongoModel(this.collectionName as string);
  }

  private useMongo(): boolean {
    return isConnectedToMongo && mongoose.connection.readyState === 1;
  }

  private buildMongoFilter(filter?: Record<string, any>): Record<string, any> {
    if (!filter || Object.keys(filter).length === 0) return {};
    const out: Record<string, any> = {};
    for (const [key, rawValue] of Object.entries(filter)) {
      if (rawValue === undefined) continue;
      // Pass RegExp and operator objects straight to Mongo — dotted keys work natively
      out[key] = rawValue as any;
    }
    return out;
  }

  private matchesLocal(item: any, filter?: Record<string, any>): boolean {
    if (!filter || Object.keys(filter).length === 0) return true;
    return Object.entries(filter).every(([key, rawValue]) => {
      const value = rawValue as any;
      if (value === undefined) return true;
      const fieldVal = getNested(item, key);
      if (value instanceof RegExp) {
        return value.test(String(fieldVal ?? ''));
      }
      if (typeof value === 'object' && value !== null) {
        if ('$in' in value && Array.isArray(value.$in)) {
          return (value.$in as any[]).includes(fieldVal);
        }
        if ('$gte' in value && fieldVal < value.$gte) return false;
        if ('$lte' in value && fieldVal > value.$lte) return false;
        if ('$gt' in value && fieldVal <= value.$gt) return false;
        if ('$lt' in value && fieldVal >= value.$lt) return false;
        if ('$ne' in value && fieldVal === value.$ne) return false;
        return true;
      }
      return fieldVal === value;
    });
  }

  // --- local cache helpers (keeps disk fallback warm) ---
  private get items(): T[] {
    return (localDb[this.collectionName] as T[]) || [];
  }

  private set items(val: T[]) {
    (localDb[this.collectionName] as any) = val;
    saveDatabaseToFile();
  }

  private upsertLocal(doc: any) {
    const list = [...this.items];
    const idx = list.findIndex(d => (d as any)._id === doc._id || (d as any).id === doc._id || (d as any).id === doc.id);
    if (idx === -1) list.unshift(doc);
    else list[idx] = doc;
    this.items = list;
  }

  private removeLocalById(id: string) {
    const list = [...this.items];
    const idx = list.findIndex(d => (d as any)._id === id || (d as any).id === id);
    if (idx !== -1) {
      const removed = list.splice(idx, 1)[0];
      this.items = list;
      return removed;
    }
    return null;
  }

  async find(filter?: Partial<Record<keyof T | string, any>>, options?: { sort?: Record<string, 1 | -1>; limit?: number; skip?: number }): Promise<T[]> {
    if (this.useMongo()) {
      try {
        let q = this.model.find(this.buildMongoFilter(filter as any)).lean();
        if (options?.sort) q = q.sort(options.sort as any);
        if (options?.skip !== undefined) q = q.skip(options.skip);
        if (options?.limit !== undefined) q = q.limit(options.limit);
        const docs: any[] = await q.exec();
        return docs.map((d: any) => toPlain<T>(d));
      } catch (e) {
        console.warn(`[Database] Mongo find failed on '${this.collectionName}', using local fallback:`, (e as Error).message);
      }
    }
    let result = [...this.items].filter(item => this.matchesLocal(item, filter as any));

    if (options?.sort) {
      const [sortField, sortDir] = Object.entries(options.sort)[0] || [];
      if (sortField) {
        result.sort((a, b) => {
          const valA = getNested(a, sortField);
          const valB = getNested(b, sortField);
          if (valA === valB) return 0;
          if (valA === undefined || valA === null) return 1;
          if (valB === undefined || valB === null) return -1;
          const cmp = valA > valB ? 1 : -1;
          return sortDir === -1 ? -cmp : cmp;
        });
      }
    }

    if (options?.skip !== undefined) {
      result = result.slice(options.skip);
    }
    if (options?.limit !== undefined) {
      result = result.slice(0, options.limit);
    }

    return result;
  }

  async findOne(filter: Partial<Record<keyof T | string, any>>): Promise<T | null> {
    const results = await this.find(filter, { limit: 1 });
    return results[0] || null;
  }

  async findById(id: string): Promise<T | null> {
    if (this.useMongo()) {
      try {
        const doc =
          (await this.model.findById(id).lean().exec().catch(() => null)) ||
          (await this.model.findOne({ id }).lean().exec());
        return doc ? toPlain<T>(doc) : null;
      } catch (e) {
        console.warn(`[Database] Mongo findById failed on '${this.collectionName}':`, (e as Error).message);
      }
    }
    const item = this.items.find(doc => doc._id === id || doc.id === id);
    return item || null;
  }

  async create(data: Partial<T>): Promise<T> {
    const now = new Date().toISOString();
    const strId = String((data as any)._id || (data as any).id || generateUniqueId());
    const doc: any = {
      ...data,
      _id: strId,
      id: strId,
      createdAt: (data as any).createdAt || now,
      updatedAt: now,
    };

    if (this.useMongo()) {
      try {
        const created = await this.model.create(doc);
        const plain = toPlain<T>(created);
        this.upsertLocal(plain); // keep local cache warm
        return plain;
      } catch (e) {
        console.warn(`[Database] Mongo create failed on '${this.collectionName}', using local:`, (e as Error).message);
      }
    }

    const list = this.items;
    list.unshift(doc);
    this.items = list;
    return doc as T;
  }

  async findByIdAndUpdate(id: string, update: Partial<T>): Promise<T | null> {
    const payload = { ...(update as any), updatedAt: new Date().toISOString() };
    delete payload._id;

    if (this.useMongo()) {
      try {
        let updated =
          (await this.model.findByIdAndUpdate(id, { $set: payload }, { returnDocument: 'after' }).lean().exec().catch(() => null)) as any;
        if (!updated) {
          updated = (await this.model.findOneAndUpdate({ id }, { $set: payload }, { returnDocument: 'after' }).lean().exec()) as any;
        }
        if (updated) {
          const plain = toPlain<T>(updated);
          this.upsertLocal(plain);
          return plain;
        }
      } catch (e) {
        console.warn(`[Database] Mongo update failed on '${this.collectionName}':`, (e as Error).message);
      }
    }

    const list = [...this.items];
    const index = list.findIndex(doc => doc._id === id || doc.id === id);
    if (index === -1) return null;

    const existing = list[index];
    const updatedLocal: T = {
      ...existing,
      ...update,
      _id: existing._id,
      id: existing.id || existing._id,
      updatedAt: new Date().toISOString(),
    } as T;

    list[index] = updatedLocal;
    this.items = list;
    return updatedLocal;
  }

  async findByIdAndDelete(id: string): Promise<T | null> {
    if (this.useMongo()) {
      try {
        let removed =
          (await this.model.findByIdAndDelete(id).lean().exec().catch(() => null)) as any;
        if (!removed) {
          removed = (await this.model.findOneAndDelete({ id }).lean().exec()) as any;
        }
        if (removed) {
          this.removeLocalById(id);
          return toPlain<T>(removed);
        }
      } catch (e) {
        console.warn(`[Database] Mongo delete failed on '${this.collectionName}':`, (e as Error).message);
      }
    }
    const list = [...this.items];
    const index = list.findIndex(doc => doc._id === id || doc.id === id);
    if (index === -1) return null;

    const removed = list.splice(index, 1)[0];
    this.items = list;
    return removed;
  }

  async deleteMany(filter: Partial<Record<keyof T | string, any>>): Promise<number> {
    const mongoFilter = this.buildMongoFilter(filter as any);
    if (this.useMongo()) {
      try {
        // deleteMany({}) must wipe collection — local matchesLocal returns true for empty filter too
        const res = await this.model.deleteMany(mongoFilter).exec();
        const remaining = this.items.filter(item => !this.matchesLocal(item, filter as any));
        (this as any).items = remaining;
        return res.deletedCount ?? 0;
      } catch (e) {
        console.warn(`[Database] Mongo deleteMany failed on '${this.collectionName}':`, (e as Error).message);
      }
    }
    const list = this.items;
    const initialLen = list.length;
    // empty filter => delete all; matchesLocal({}, item) is true, and local Object.entries({}) path matches nothing -> handle explicitly
    const hasFilter = filter && Object.keys(filter).length > 0;
    const remaining = hasFilter
      ? list.filter(item => !this.matchesLocal(item, filter as any))
      : [];
    this.items = remaining;
    return initialLen - remaining.length;
  }

  async countDocuments(filter?: Partial<Record<keyof T | string, any>>): Promise<number> {
    if (this.useMongo()) {
      try {
        return await this.model.countDocuments(this.buildMongoFilter(filter as any)).exec();
      } catch (e) {
        console.warn(`[Database] Mongo count failed on '${this.collectionName}':`, (e as Error).message);
      }
    }
    const matches = await this.find(filter);
    return matches.length;
  }
}

// Export database collection instances
export const db = {
  users: new LocalCollection<any>('users'),
  products: new LocalCollection<any>('products'),
  categories: new LocalCollection<any>('categories'),
  orders: new LocalCollection<any>('orders'),
  carts: new LocalCollection<any>('carts'),
  wishlists: new LocalCollection<any>('wishlists'),
  coupons: new LocalCollection<any>('coupons'),
  reviews: new LocalCollection<any>('reviews'),
  notifications: new LocalCollection<any>('notifications'),
  emailLogs: new LocalCollection<any>('emailLogs'),
  auditLogs: new LocalCollection<any>('auditLogs'),
  settings: new LocalCollection<any>('settings'),
};