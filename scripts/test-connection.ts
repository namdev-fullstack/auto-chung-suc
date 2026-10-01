import { config } from 'dotenv';
config();

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('Firebase Config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
});

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized');
} else {
  app = getApps()[0];
  console.log('✅ Using existing Firebase app');
}

const db = getFirestore(app);
console.log('✅ Firestore initialized');

// Test simple write
async function testConnection() {
  try {
    console.log('Testing simple write...');
    const testDoc = {
      test: true,
      message: 'Connection test',
      timestamp: new Date(),
    };
    
    const docRef = await addDoc(collection(db, 'test'), testDoc);
    console.log('✅ Successfully wrote test document:', docRef.id);
    
    // Test read
    console.log('Testing read...');
    const querySnapshot = await getDocs(collection(db, 'test'));
    console.log(`✅ Successfully read ${querySnapshot.size} documents`);
    
    console.log('\n✅ Firebase connection is working perfectly!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testConnection();
