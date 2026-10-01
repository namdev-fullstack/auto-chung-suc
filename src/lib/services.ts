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

const mapService = (id: string, data: Record<string, unknown>): Service => ({
  id,
  name: String(data.name ?? id),
  price: Number(data.price ?? 0),
  active: data.active !== false,
  sortOrder: Number(data.sortOrder ?? 0),
});

const sortServices = (services: Service[]) =>
  [...services].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'vi'));

export const getServices = async (): Promise<Service[]> => {
  const snapshot = await getDocs(collection(db, SERVICES_COLLECTION));

  return sortServices(
    snapshot.docs.map((item) => mapService(item.id, item.data() as Record<string, unknown>))
  );
};

export const getActiveServices = async (): Promise<Service[]> => {
  const services = await getServices();
  if (services.length === 0) {
    return DEFAULT_SERVICE_TYPES.map((service, index) => ({
      ...service,
      active: true,
      sortOrder: index,
    }));
  }

  return services.filter((service) => service.active);
};

export const seedDefaultServices = async (): Promise<void> => {
  const existing = await getServices();
  if (existing.length > 0) return;

  await Promise.all(
    DEFAULT_SERVICE_TYPES.map((service, index) =>
      setDoc(doc(db, SERVICES_COLLECTION, service.id), {
        name: service.name,
        price: service.price,
        active: true,
        sortOrder: index,
      })
    )
  );
};

export const getServiceById = async (serviceId: string): Promise<Service | null> => {
  const snapshot = await getDoc(doc(db, SERVICES_COLLECTION, serviceId));
  if (snapshot.exists()) {
    return mapService(snapshot.id, snapshot.data() as Record<string, unknown>);
  }

  const fallback = DEFAULT_SERVICE_TYPES.find((service) => service.id === serviceId);
  if (!fallback) return null;

  return { ...fallback, active: true, sortOrder: 0 };
};

export const createService = async (input: CreateServiceInput): Promise<Service> => {
  const payload = {
    name: input.name.trim(),
    price: Number(input.price),
    active: input.active,
    sortOrder: input.sortOrder ?? Date.now(),
  };

  const docRef = await addDoc(collection(db, SERVICES_COLLECTION), payload);
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
};

export const deleteService = async (serviceId: string): Promise<void> => {
  await deleteDoc(doc(db, SERVICES_COLLECTION, serviceId));
};

export const getServiceLabel = (services: Service[], serviceType: string): string => {
  const match = services.find((service) => service.id === serviceType);
  if (match) return match.name;

  const fallback = DEFAULT_SERVICE_TYPES.find((service) => service.id === serviceType);
  return fallback?.name || serviceType;
};
