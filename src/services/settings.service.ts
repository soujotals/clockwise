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
  timeBankAdjustment?: number; // Adjustment in milliseconds
  is24hFormat?: boolean;
  enableReminders?: boolean;
};

const getSettingsDocRef = (userId: string) => doc(db, `users/${userId}/settings`, 'userSettings');

export const getSettings = async (userId: string): Promise<AppSettings | null> => {
  if (!userId) return null;
  const settingsDocRef = getSettingsDocRef(userId);
  const docSnap = await getDoc(settingsDocRef);
  if (docSnap.exists()) {
    return docSnap.data() as AppSettings;
  }
  return null;
};

export const saveSettings = async (userId: string, settings: Partial<AppSettings>): Promise<void> => {
  if (!userId) throw new Error("User not authenticated");
  const settingsDocRef = getSettingsDocRef(userId);
  await setDoc(settingsDocRef, settings, { merge: true });
};
