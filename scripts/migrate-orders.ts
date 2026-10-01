import { config } from 'dotenv';
config();

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

const employeeEmailMap: Record<string, string> = {
  'Nguyễn Văn A': 'emp_a@example.com',
  'Trần Văn B': 'emp_b@example.com',
  'Lê Văn C': 'emp_c@example.com',
};

const migrateOrders = async () => {
  console.log('Starting migration...');
  
  try {
    const ordersRef = collection(db, 'orders');
    const querySnapshot = await getDocs(ordersRef);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const docSnapshot of querySnapshot.docs) {
      const orderData = docSnapshot.data();
      
      // Skip if already has employeeEmail
      if (orderData.employeeEmail) {
        skippedCount++;
        continue;
      }
      
      // Add employeeEmail based on employeeName
      if (orderData.employeeName && employeeEmailMap[orderData.employeeName]) {
        await updateDoc(doc(db, 'orders', docSnapshot.id), {
          employeeEmail: employeeEmailMap[orderData.employeeName],
        });
        updatedCount++;
        console.log(`Updated order ${docSnapshot.id}: ${orderData.employeeName} -> ${employeeEmailMap[orderData.employeeName]}`);
      } else {
        skippedCount++;
      }
    }
    
    console.log(`Migration completed! Updated: ${updatedCount}, Skipped: ${skippedCount}`);
  } catch (error) {
    console.error('Migration error:', error);
  }
};

migrateOrders();
