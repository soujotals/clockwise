import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export type Workdays = {
  sun: boolean;
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
  sat: boolean;
};

export type AppSettings = {
  weeklyHours: number;
  workdays: Workdays;
};

const settingsDocRef = doc(db, 'settings', 'userSettings');

export const getSettings = async (): Promise<AppSettings | null> => {
  const docSnap = await getDoc(settingsDocRef);
  if (docSnap.exists()) {
    return docSnap.data() as AppSettings;
  }
  return null;
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  await setDoc(settingsDocRef, settings);
};
