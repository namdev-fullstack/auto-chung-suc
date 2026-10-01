import { Timestamp } from 'firebase/firestore';
import { ServiceTypeId, OrderStatus, PaymentStatus, EmployeeRole } from '@/config/constants';

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  active: boolean;
  createdAt: Timestamp;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  active: boolean;
  sortOrder: number;
}

export interface Order {
  id: string;
  eventCode: string;
  serviceType: ServiceTypeId;
  amount: number;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  employeeId: string | null;
  employeeName: string | null;
  employeeEmail: string | null;
  businessDate: string;
  trackingToken: string;
  errorMessage: string | null;
  paymentTransactionId: string | null;
  paymentContent: string | null;
  createdAt: Timestamp;
  paidAt: Timestamp | null;
  assignedAt: Timestamp | null;
  completedAt: Timestamp | null;
}

export interface CreateOrderInput {
  eventCode: string;
  serviceType: ServiceTypeId;
  amount: number;
}

export interface UpdateOrderStatusInput {
  status: OrderStatus;
  errorMessage?: string;
}

export interface ClaimOrderInput {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
}

export interface PaymentWebhookInput {
  orderId: string;
  paymentTransactionId: string;
  paymentContent: string;
  amount: number;
}

export interface CreateServiceInput {
  name: string;
  price: number;
  active: boolean;
  sortOrder?: number;
}
