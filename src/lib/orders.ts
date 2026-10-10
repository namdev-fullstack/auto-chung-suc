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
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Order, CreateOrderInput, UpdateOrderStatusInput, ClaimOrderInput } from '@/types/database';
import { PaymentStatus } from '@/config/constants';

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
    transferConfirmedAt: null,
    copied: false,
    copiedAt: null,
    copiedBy: null,
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

    if (orderData.paymentStatus !== 'paid') {
      throw new Error('Đơn hàng chưa được thanh toán hoặc chưa được duyệt thanh toán');
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

  if (input.employeeId !== undefined) {
    updateData.employeeId = input.employeeId;
    updateData.employeeName = input.employeeName ?? null;
    updateData.employeeEmail = input.employeeEmail ?? null;
    if (input.employeeId) {
      updateData.assignedAt = serverTimestamp();
    }
  }

  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), updateData);
};

export const confirmPaymentTransfer = async (orderId: string): Promise<void> => {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  await updateDoc(orderRef, {
    paymentStatus: 'pending_verification',
    transferConfirmedAt: serverTimestamp(),
  });
};

export const updateOrderPaymentStatus = async (
  orderId: string,
  paymentStatus: PaymentStatus,
  options?: {
    autoSetProcessing?: boolean;
    employee?: { id: string; name: string; email: string } | null;
  }
): Promise<void> => {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  const updateData: any = {
    paymentStatus,
  };

  if (paymentStatus === 'paid') {
    updateData.paidAt = serverTimestamp();
    if (options?.autoSetProcessing) {
      updateData.status = 'processing';
      if (options.employee) {
        updateData.employeeId = options.employee.id;
        updateData.employeeName = options.employee.name;
        updateData.employeeEmail = options.employee.email;
        updateData.assignedAt = serverTimestamp();
      }
    }
  } else if (paymentStatus === 'unpaid') {
    updateData.paidAt = null;
    updateData.paymentTransactionId = null;
  }

  await updateDoc(orderRef, updateData);
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
  paymentStatus?: string;
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

    if (filters?.paymentStatus) {
      q = query(q, where('paymentStatus', '==', filters.paymentStatus));
    }

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Order[];
  } catch (error) {
    console.warn('Index query failed, falling back to client-filtered query:', error);
    try {
      const fallbackSnapshot = await getDocs(collection(db, ORDERS_COLLECTION));
      let list = fallbackSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];

      if (filters?.employeeId) list = list.filter((o) => o.employeeId === filters.employeeId);
      if (filters?.employeeEmail) list = list.filter((o) => o.employeeEmail === filters.employeeEmail);
      if (filters?.businessDate) list = list.filter((o) => o.businessDate === filters.businessDate);
      if (filters?.status) list = list.filter((o) => o.status === filters.status);
      if (filters?.serviceType) list = list.filter((o) => o.serviceType === filters.serviceType);
      if (filters?.paymentStatus) list = list.filter((o) => o.paymentStatus === filters.paymentStatus);

      list.sort((a, b) => {
        const tA = (a.createdAt as any)?.toMillis?.() || (a.createdAt as any)?.seconds * 1000 || 0;
        const tB = (b.createdAt as any)?.toMillis?.() || (b.createdAt as any)?.seconds * 1000 || 0;
        return tB - tA;
      });

      return list;
    } catch (fallbackErr) {
      console.error('Error in getOrders fallback:', fallbackErr);
      return [];
    }
  }
};

export const getOrdersForStatistics = async (filters: {
  startDate?: string;
  endDate?: string;
  businessDate?: string;
  employeeId?: string;
  employeeEmail?: string;
}): Promise<Order[]> => {
  try {
    const snapshot = await getDocs(collection(db, ORDERS_COLLECTION));
    let list = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Order[];

    // Chỉ thống kê các đơn đã thanh toán và không bị hủy
    list = list.filter((o) => o.paymentStatus === 'paid' && o.status !== 'cancelled');

    if (filters.employeeEmail) {
      list = list.filter((o) => o.employeeEmail === filters.employeeEmail);
    }

    if (filters.employeeId) {
      list = list.filter((o) => o.employeeId === filters.employeeId);
    }

    if (filters.startDate && filters.endDate) {
      list = list.filter((o) => {
        const orderDate =
          o.businessDate ||
          ((o.createdAt as any)?.toDate
            ? (o.createdAt as any).toDate().toISOString().split('T')[0]
            : '');
        return orderDate >= filters.startDate! && orderDate <= filters.endDate!;
      });
    } else if (filters.businessDate) {
      list = list.filter((o) => o.businessDate === filters.businessDate);
    }

    list.sort((a, b) => {
      const tA = (a.createdAt as any)?.toMillis?.() || (a.createdAt as any)?.seconds * 1000 || 0;
      const tB = (b.createdAt as any)?.toMillis?.() || (b.createdAt as any)?.seconds * 1000 || 0;
      return tB - tA;
    });

    return list;
  } catch (error) {
    console.error('Error in getOrdersForStatistics:', error);
    return [];
  }
};

export const markOrdersAsCopied = async (
  orderIds: string[],
  employeeInfo: { name?: string | null; email?: string | null }
): Promise<void> => {
  if (orderIds.length === 0) return;
  const batch = writeBatch(db);
  const copiedBy = employeeInfo.name || employeeInfo.email || 'Hệ thống';

  for (const id of orderIds) {
    const ref = doc(db, ORDERS_COLLECTION, id);
    batch.update(ref, {
      copied: true,
      copiedAt: serverTimestamp(),
      copiedBy,
    });
  }

  await batch.commit();
};

export const resetOrderCopiedStatus = async (orderId: string): Promise<void> => {
  const ref = doc(db, ORDERS_COLLECTION, orderId);
  await updateDoc(ref, {
    copied: false,
    copiedAt: null,
    copiedBy: null,
  });
};

