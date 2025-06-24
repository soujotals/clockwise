import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';

export type TimeEntry = {
  id: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string
};

const timeEntriesCollection = collection(db, 'timeEntries');

export const getTimeEntries = async (): Promise<TimeEntry[]> => {
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

export const addTimeEntry = async (entry: Omit<TimeEntry, 'id'>): Promise<TimeEntry> => {
  const docRef = await addDoc(timeEntriesCollection, entry);
  return { ...entry, id: docRef.id };
};

export const updateTimeEntry = async (entry: TimeEntry): Promise<void> => {
  const docRef = doc(db, 'timeEntries', entry.id);
  const { id, ...data } = entry;
  await setDoc(docRef, data);
};

export const deleteTimeEntry = async (entryId: string): Promise<void> => {
  const docRef = doc(db, 'timeEntries', entryId);
  await deleteDoc(docRef);
};
