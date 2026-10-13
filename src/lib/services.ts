import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { Service, CreateServiceInput } from '@/types/database';
import { DEFAULT_SERVICE_TYPES } from '@/config/constants';

const SERVICES_COLLECTION = 'services';
const SERVICES_CACHE_KEY = 'sk_services_cache_v1';

let inMemoryServicesCache: Service[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 60s

export const invalidateServicesCache = () => {
  inMemoryServicesCache = null;
  lastCacheTime = 0;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(SERVICES_CACHE_KEY);
    } catch {
      // ignore
    }
  }
};

const mapService = (id: string, data: Record<string, unknown>): Service => ({
  id,
  name: String(data.name ?? id),
  price: Number(data.price ?? 0),
  costPrice: Number(data.costPrice ?? 0),
  originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
  active: data.active !== false,
  sortOrder: Number(data.sortOrder ?? 0),
});

const sortServices = (services: Service[]) =>
  [...services].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'vi'));

export const getCachedServicesSync = (): Service[] => {
  if (inMemoryServicesCache && inMemoryServicesCache.length > 0) {
    return inMemoryServicesCache;
  }
  if (typeof window !== 'undefined') {
    try {
      const cached = sessionStorage.getItem(SERVICES_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryServicesCache = parsed;
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }
  return DEFAULT_SERVICE_TYPES.map((service, index) => ({
    ...service,
    active: true,
    sortOrder: index,
  }));
};

export const getServices = async (): Promise<Service[]> => {
  if (!db) {
    return getCachedServicesSync();
  }
  const snapshot = await getDocs(collection(db, SERVICES_COLLECTION));

  const items = sortServices(
    snapshot.docs.map((item) => mapService(item.id, item.data() as Record<string, unknown>))
  );

  if (items.length > 0) {
    inMemoryServicesCache = items;
    lastCacheTime = Date.now();
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(items));
      } catch {
        // ignore
      }
    }
  }

  return items;
};

export const getActiveServices = async (options?: {
  forceFresh?: boolean;
  timeoutMs?: number;
}): Promise<Service[]> => {
  const timeoutMs = options?.timeoutMs ?? 3500;

  // Nếu có cache bộ nhớ còn mới và không ép làm mới -> trả về ngay lập tức không cần đợi mạng
  if (!options?.forceFresh && inMemoryServicesCache && Date.now() - lastCacheTime < CACHE_TTL) {
    return inMemoryServicesCache.filter((s) => s.active);
  }

  try {
    const fetchPromise = getServices();
    const timeoutPromise = new Promise<Service[]>((_, reject) =>
      setTimeout(() => reject(new Error('Services fetch timeout')), timeoutMs)
    );

    const services = await Promise.race([fetchPromise, timeoutPromise]);
    if (services.length === 0) {
      return DEFAULT_SERVICE_TYPES.map((service, index) => ({
        ...service,
        active: true,
        sortOrder: index,
      }));
    }

    return services.filter((service) => service.active);
  } catch (error) {
    console.warn('getActiveServices fallback to cache:', error);
    const cached = getCachedServicesSync();
    return cached.filter((service) => service.active);
  }
};

export const seedDefaultServices = async (): Promise<void> => {
  if (!db) return;
  const existing = await getServices();
  if (existing.length > 0) return;

  await Promise.all(
    DEFAULT_SERVICE_TYPES.map((service, index) =>
      setDoc(doc(db, SERVICES_COLLECTION, service.id), {
        name: service.name,
        price: service.price,
        originalPrice: service.originalPrice || 0,
        active: true,
        sortOrder: index,
      })
    )
  );
  invalidateServicesCache();
};

export const getServiceById = async (serviceId: string): Promise<Service | null> => {
  // Thử tìm trong cache trước để giảm latency
  const cachedList = inMemoryServicesCache || getCachedServicesSync();
  const cachedMatch = cachedList.find((s) => s.id === serviceId);
  if (cachedMatch) return cachedMatch;

  if (db) {
    try {
      const snapshot = await getDoc(doc(db, SERVICES_COLLECTION, serviceId));
      if (snapshot.exists()) {
        return mapService(snapshot.id, snapshot.data() as Record<string, unknown>);
      }
    } catch (e) {
      console.warn('getServiceById fetch error:', e);
    }
  }

  const fallback = DEFAULT_SERVICE_TYPES.find((service) => service.id === serviceId);
  if (!fallback) return null;

  return { ...fallback, active: true, sortOrder: 0 };
};

export const createService = async (input: CreateServiceInput): Promise<Service> => {
  const payload = {
    name: input.name.trim(),
    price: Number(input.price),
    costPrice: Number(input.costPrice ?? 0),
    originalPrice: Number(input.originalPrice ?? 0),
    active: input.active,
    sortOrder: input.sortOrder ?? Date.now(),
  };

  const docRef = await addDoc(collection(db, SERVICES_COLLECTION), payload);
  invalidateServicesCache();
  return {
    id: docRef.id,
    ...payload,
  };
};

export const updateService = async (
  serviceId: string,
  updates: Partial<Omit<Service, 'id'>>
): Promise<void> => {
  await updateDoc(doc(db, SERVICES_COLLECTION, serviceId), updates);
  invalidateServicesCache();
};

export const deleteService = async (serviceId: string): Promise<void> => {
  await deleteDoc(doc(db, SERVICES_COLLECTION, serviceId));
  invalidateServicesCache();
};

export const getServiceLabel = (services: Service[], serviceType: string): string => {
  const match = services.find((service) => service.id === serviceType);
  if (match) return match.name;

  const fallback = DEFAULT_SERVICE_TYPES.find((service) => service.id === serviceType);
  return fallback?.name || serviceType;
};

