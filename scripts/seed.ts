import { config } from 'dotenv';
config();

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, collection, addDoc, setDoc, doc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let db: Firestore;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}
db = getFirestore(app);

const SERVICE_TYPES = {
  FULL_3_RUONG: { id: 'FULL_3_RUONG', name: 'Làm Full 3 Rương', price: 99000 },
  RUONG_SS: { id: 'RUONG_SS', name: 'Rương SS', price: 60000 },
  RUONG_S_PLUS_PLUS: { id: 'RUONG_S_PLUS_PLUS', name: 'Rương S++', price: 30000 },
  RUONG_S_PLUS: { id: 'RUONG_S_PLUS', name: 'Rương S+', price: 15000 },
};

const generateTrackingToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const createServices = async () => {
  console.log('Creating services...');
  const now = Timestamp.now();
  const services = Object.values(SERVICE_TYPES);

  for (let i = 0; i < services.length; i++) {
    const service = services[i];
    await setDoc(doc(db, 'services', service.id), {
      name: service.name,
      price: service.price,
      active: true,
      sortOrder: i,
      createdAt: now,
    });
    console.log(`Created service: ${service.name}`);
  }
};

const createEmployees = async () => {
  console.log('Creating employees...');
  
  const now = Timestamp.now();
  
  const employees = [
    {
      name: 'Nguyễn Văn A',
      email: 'emp_a@example.com',
      role: 'employee',
      active: true,
      createdAt: now,
    },
    {
      name: 'Trần Văn B',
      email: 'emp_b@example.com',
      role: 'employee',
      active: true,
      createdAt: now,
    },
    {
      name: 'Lê Văn C',
      email: 'emp_c@example.com',
      role: 'employee',
      active: true,
      createdAt: now,
    },
    {
      name: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
      active: true,
      createdAt: now,
    },
  ];

  const employeeIds: Record<string, string> = {};

  for (const employee of employees) {
    const docRef = await addDoc(collection(db, 'employees'), employee);
    employeeIds[employee.name] = docRef.id;
    console.log(`Created employee: ${employee.name} with ID: ${docRef.id}`);
  }

  return employeeIds;
};

const createOrders = async (employeeIds: Record<string, string>) => {
  console.log('Creating orders...');

  const dates = ['2026-09-27', '2026-09-28', '2026-09-29'];
  const serviceTypes = Object.keys(SERVICE_TYPES) as Array<keyof typeof SERVICE_TYPES>;
  const statuses = ['pending', 'processing', 'completed', 'error'] as const;
  
  let orderCount = 0;

  // Orders for each date
  for (const date of dates) {
    // Day 29/09 has more orders as per example
    const numOrders = date === '2026-09-29' ? 14 : 3;

    for (let i = 0; i < numOrders; i++) {
      const serviceType = serviceTypes[i % serviceTypes.length];
      const status = statuses[i % statuses.length];
      const employeeNames = ['Nguyễn Văn A', 'Trần Văn B', 'Lê Văn C'];
      const employeeName = employeeNames[i % employeeNames.length];
      const employeeId = employeeIds[employeeName];
      
      const isPaid = status !== 'pending' || Math.random() > 0.3;
      const now = Timestamp.now();
      
      const orderData = {
        eventCode: `EVENT${date.replace(/-/g, '')}${String(i + 1).padStart(3, '0')}`,
        serviceType,
        amount: SERVICE_TYPES[serviceType].price,
        paymentStatus: isPaid ? 'paid' : 'unpaid',
        status,
        employeeId: status === 'pending' ? null : employeeId,
        employeeName: status === 'pending' ? null : employeeName,
        employeeEmail: status === 'pending' ? null : (employeeName === 'Nguyễn Văn A' ? 'emp_a@example.com' : employeeName === 'Trần Văn B' ? 'emp_b@example.com' : 'emp_c@example.com'),
        businessDate: date,
        trackingToken: generateTrackingToken(),
        errorMessage: status === 'error' ? 'Lỗi xử lý đơn hàng' : null,
        paymentTransactionId: isPaid ? `TXN_${Date.now()}_${orderCount}` : null,
        paymentContent: isPaid ? `Thanh toán đơn hàng ${orderCount}` : null,
        createdAt: now,
        paidAt: isPaid ? now : null,
        assignedAt: status !== 'pending' ? now : null,
        completedAt: status === 'completed' ? now : null,
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      orderCount++;
      console.log(`Created order ${orderCount}: ${docRef.id} - ${serviceType} - ${status} - ${date}`);
    }
  }

  // Add some pending orders without employees
  for (let i = 0; i < 2; i++) {
    const serviceType = serviceTypes[i % serviceTypes.length];
    const now = Timestamp.now();
    
    const orderData = {
      eventCode: `EVENT20260929${String(orderCount + 1).padStart(3, '0')}`,
      serviceType,
      amount: SERVICE_TYPES[serviceType].price,
      paymentStatus: 'paid',
      status: 'pending',
      employeeId: null,
      employeeName: null,
      employeeEmail: null,
      businessDate: '2026-09-29',
      trackingToken: generateTrackingToken(),
      errorMessage: null,
      paymentTransactionId: `TXN_${Date.now()}_${orderCount}`,
      paymentContent: `Thanh toán đơn hàng ${orderCount}`,
      createdAt: now,
      paidAt: now,
      assignedAt: null,
      completedAt: null,
    };

    const docRef = await addDoc(collection(db, 'orders'), orderData);
    orderCount++;
    console.log(`Created pending order ${orderCount}: ${docRef.id} - ${serviceType} - no employee`);
  }

  console.log(`Total orders created: ${orderCount}`);
};

const main = async () => {
  try {
    console.log('Starting seed...');
    
    await createServices();
    const employeeIds = await createEmployees();
    await createOrders(employeeIds);
    
    console.log('Seed completed successfully!');
    console.log('\nEmployee credentials (for testing):');
    console.log('Employee A: emp_a@example.com');
    console.log('Employee B: emp_b@example.com');
    console.log('Employee C: emp_c@example.com');
    console.log('Admin: admin@example.com');
    console.log('\nNote: You need to create these users in Firebase Authentication manually.');
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

main();
