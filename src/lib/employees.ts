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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Employee } from '@/types/database';

const EMPLOYEES_COLLECTION = 'employees';

export const createEmployee = async (employee: Omit<Employee, 'id' | 'createdAt'>): Promise<Employee> => {
  const employeeData = {
    ...employee,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, EMPLOYEES_COLLECTION), employeeData);
  const employeeSnapshot = await getDoc(docRef);
  
  if (!employeeSnapshot.exists()) {
    throw new Error('Failed to create employee');
  }

  return {
    id: employeeSnapshot.id,
    ...employeeSnapshot.data(),
  } as Employee;
};

export const getEmployeeById = async (employeeId: string): Promise<Employee | null> => {
  const employeeDoc = await getDoc(doc(db, EMPLOYEES_COLLECTION, employeeId));
  
  if (!employeeDoc.exists()) {
    return null;
  }

  return {
    id: employeeDoc.id,
    ...employeeDoc.data(),
  } as Employee;
};

export const getEmployeeByEmail = async (email: string): Promise<Employee | null> => {
  const q = query(
    collection(db, EMPLOYEES_COLLECTION),
    where('email', '==', email)
  );
  
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as Employee;
};

export const getAllEmployees = async (): Promise<Employee[]> => {
  const q = query(collection(db, EMPLOYEES_COLLECTION), orderBy('name'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Employee[];
};

export const updateEmployee = async (
  employeeId: string,
  updates: Partial<Omit<Employee, 'id' | 'createdAt'>>
): Promise<void> => {
  await updateDoc(doc(db, EMPLOYEES_COLLECTION, employeeId), updates);
};
