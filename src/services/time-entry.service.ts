import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';

export type TimeEntry = {
  id: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string
};

const getTimeEntriesCollection = (userId: string) => collection(db, `users/${userId}/timeEntries`);

export const getTimeEntries = async (userId: string): Promise<TimeEntry[]> => {
  if (!userId) return [];
  const timeEntriesCollection = getTimeEntriesCollection(userId);
  const q = query(timeEntriesCollection, orderBy('startTime', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      startTime: data.startTime,
      endTime: data.endTime,
    } as TimeEntry
  });
};

export const addTimeEntry = async (userId: string, entry: Omit<TimeEntry, 'id'>): Promise<TimeEntry> => {
  if (!userId) throw new Error("User not authenticated");
  const timeEntriesCollection = getTimeEntriesCollection(userId);
  const docRef = await addDoc(timeEntriesCollection, entry);
  return { ...entry, id: docRef.id };
};

export const updateTimeEntry = async (userId: string, entry: TimeEntry): Promise<void> => {
  if (!userId) throw new Error("User not authenticated");
  const docRef = doc(db, `users/${userId}/timeEntries`, entry.id);
  const { id, ...data } = entry;
  await setDoc(docRef, data);
};

export const deleteTimeEntry = async (userId: string, entryId: string): Promise<void> => {
  if (!userId) throw new Error("User not authenticated");
  const docRef = doc(db, `users/${userId}/timeEntries`, entryId);
  await deleteDoc(docRef);
};
