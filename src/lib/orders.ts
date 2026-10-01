import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Order, CreateOrderInput, UpdateOrderStatusInput, ClaimOrderInput } from '@/types/database';

const ORDERS_COLLECTION = 'orders';

export const generateTrackingToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const createOrder = async (input: CreateOrderInput): Promise<Order> => {
  const trackingToken = generateTrackingToken();
  const businessDate = new Date().toISOString().split('T')[0];
  
  const orderData = {
    eventCode: input.eventCode,
    serviceType: input.serviceType,
    amount: input.amount,
    paymentStatus: 'unpaid' as const,
    status: 'pending' as const,
    employeeId: null,
    employeeName: null,
    businessDate,
    trackingToken,
    errorMessage: null,
    paymentTransactionId: null,
    paymentContent: null,
    createdAt: serverTimestamp(),
    paidAt: null,
    assignedAt: null,
    completedAt: null,
  };

  const docRef = await addDoc(collection(db, ORDERS_COLLECTION), orderData);
  const orderSnapshot = await getDoc(docRef);
  
  if (!orderSnapshot.exists()) {
    throw new Error('Failed to create order');
  }

  return {
    id: orderSnapshot.id,
    ...orderSnapshot.data(),
  } as Order;
};

export const getOrderById = async (orderId: string): Promise<Order | null> => {
  const orderDoc = await getDoc(doc(db, ORDERS_COLLECTION, orderId));
  
  if (!orderDoc.exists()) {
    return null;
  }

  return {
    id: orderDoc.id,
    ...orderDoc.data(),
  } as Order;
};

export const getOrderByTrackingToken = async (trackingToken: string): Promise<Order | null> => {
  const q = query(
    collection(db, ORDERS_COLLECTION),
    where('trackingToken', '==', trackingToken)
  );
  
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as Order;
};

export const subscribeToOrder = (orderId: string, callback: (order: Order | null) => void) => {
  return onSnapshot(doc(db, ORDERS_COLLECTION, orderId), (docSnapshot) => {
    if (!docSnapshot.exists()) {
      callback(null);
      return;
    }

    callback({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    } as Order);
  });
};

export const claimOrder = async (orderId: string, input: ClaimOrderInput): Promise<void> => {
  await runTransaction(db, async (transaction) => {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const orderDoc = await transaction.get(orderRef);

    if (!orderDoc.exists()) {
      throw new Error('Order not found');
    }

    const orderData = orderDoc.data();

    if (orderData.status !== 'pending') {
      throw new Error('Order is not in pending status');
    }

    if (orderData.employeeId !== null) {
      throw new Error('Order is already claimed by another employee');
    }

    transaction.update(orderRef, {
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      employeeEmail: input.employeeEmail,
      status: 'processing',
      assignedAt: serverTimestamp(),
      businessDate: new Date().toISOString().split('T')[0],
    });
  });
};

export const updateOrderStatus = async (
  orderId: string,
  input: UpdateOrderStatusInput
): Promise<void> => {
  const updateData: any = {
    status: input.status,
  };

  if (input.status === 'completed') {
    updateData.completedAt = serverTimestamp();
  }

  if (input.status === 'error' && input.errorMessage) {
    updateData.errorMessage = input.errorMessage;
  }

  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), updateData);
};

export const processPayment = async (
  orderId: string,
  paymentTransactionId: string,
  paymentContent: string,
  amount: number
): Promise<void> => {
  await runTransaction(db, async (transaction) => {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const orderDoc = await transaction.get(orderRef);

    if (!orderDoc.exists()) {
      throw new Error('Order not found');
    }

    const orderData = orderDoc.data();

    if (orderData.paymentTransactionId === paymentTransactionId) {
      throw new Error('Payment transaction already processed');
    }

    if (orderData.amount !== amount) {
      throw new Error('Payment amount does not match order amount');
    }

    transaction.update(orderRef, {
      paymentStatus: 'paid',
      paymentTransactionId,
      paymentContent,
      paidAt: serverTimestamp(),
    });
  });
};

export const getOrders = async (filters?: {
  employeeId?: string;
  employeeEmail?: string;
  businessDate?: string;
  status?: string;
  serviceType?: string;
}): Promise<Order[]> => {
  try {
    let q = query(collection(db, ORDERS_COLLECTION), orderBy('createdAt', 'desc'));

    if (filters?.employeeId) {
      q = query(q, where('employeeId', '==', filters.employeeId));
    }

    if (filters?.employeeEmail) {
      q = query(q, where('employeeEmail', '==', filters.employeeEmail));
    }

    if (filters?.businessDate) {
      q = query(q, where('businessDate', '==', filters.businessDate));
    }

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    if (filters?.serviceType) {
      q = query(q, where('serviceType', '==', filters.serviceType));
    }

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Order[];
  } catch (error) {
    console.error('Error in getOrders:', error);
    return [];
  }
};

export const getOrdersForStatistics = async (filters: {
  businessDate: string;
  employeeId?: string;
  employeeEmail?: string;
}): Promise<Order[]> => {
  let q = query(
    collection(db, ORDERS_COLLECTION),
    where('businessDate', '==', filters.businessDate),
    where('paymentStatus', '==', 'paid'),
    where('status', '!=', 'cancelled')
  );

  if (filters.employeeId) {
    q = query(q, where('employeeId', '==', filters.employeeId));
  }

  if (filters.employeeEmail) {
    q = query(q, where('employeeEmail', '==', filters.employeeEmail));
  }

  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Order[];
};
