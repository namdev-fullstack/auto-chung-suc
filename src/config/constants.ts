export const DEFAULT_SERVICE_TYPES = [
  {
    id: 'FULL_3_RUONG',
    name: 'Làm Full 3 Rương',
    price: 99000,
  },
  {
    id: 'RUONG_SS',
    name: 'Rương SS',
    price: 60000,
  },
  {
    id: 'RUONG_S_PLUS_PLUS',
    name: 'Rương S++',
    price: 30000,
  },
  {
    id: 'RUONG_S_PLUS',
    name: 'Rương S+',
    price: 15000,
  },
];

export type ServiceTypeId = string;

export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ERROR: 'error',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PAID: 'paid',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const EMPLOYEE_ROLE = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
} as const;

export type EmployeeRole = (typeof EMPLOYEE_ROLE)[keyof typeof EMPLOYEE_ROLE];
