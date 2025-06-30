import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { Shift, UserShift, OvertimeRule } from '@/types';

const SHIFTS_COLLECTION = 'shifts';
const USER_SHIFTS_COLLECTION = 'userShifts';

export const shiftService = {
  async createShift(shift: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'>): Promise<Shift> {
    const shiftsCollection = collection(db, SHIFTS_COLLECTION);
    const docRef = await addDoc(shiftsCollection, {
      ...shift,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return { 
      ...shift, 
      id: docRef.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  async getAllShifts(): Promise<Shift[]> {
    const shiftsCollection = collection(db, SHIFTS_COLLECTION);
    const q = query(shiftsCollection, where('isActive', '==', true), orderBy('name'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      } as Shift;
    });
  },

  async getShiftById(shiftId: string): Promise<Shift | null> {
    const docRef = doc(db, SHIFTS_COLLECTION, shiftId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      } as Shift;
    }
    
    return null;
  },

  async updateShift(shiftId: string, updates: Partial<Shift>): Promise<void> {
    const docRef = doc(db, SHIFTS_COLLECTION, shiftId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  async deleteShift(shiftId: string): Promise<void> {
    const docRef = doc(db, SHIFTS_COLLECTION, shiftId);
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: serverTimestamp()
    });
  },

  // User Shift Management
  async assignUserToShift(userShift: Omit<UserShift, 'id' | 'createdAt'>): Promise<UserShift> {
    const userShiftsCollection = collection(db, USER_SHIFTS_COLLECTION);
    const docRef = await addDoc(userShiftsCollection, {
      ...userShift,
      createdAt: serverTimestamp()
    });
    
    return { 
      ...userShift, 
      id: docRef.id,
      createdAt: new Date().toISOString()
    };
  },

  async getUserCurrentShift(userId: string): Promise<{ userShift: UserShift; shift: Shift } | null> {
    const userShiftsCollection = collection(db, USER_SHIFTS_COLLECTION);
    const q = query(
      userShiftsCollection,
      where('userId', '==', userId),
      where('isActive', '==', true),
      orderBy('startDate', 'desc')
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const userShiftDoc = snapshot.docs[0];
    const userShiftData = userShiftDoc.data();
    const userShift = {
      id: userShiftDoc.id,
      ...userShiftData,
      createdAt: userShiftData.createdAt?.toDate?.()?.toISOString() || userShiftData.createdAt,
    } as UserShift;
    
    const shift = await this.getShiftById(userShift.shiftId);
    if (!shift) return null;
    
    return { userShift, shift };
  },

  async getUserShiftHistory(userId: string): Promise<Array<{ userShift: UserShift; shift: Shift }>> {
    const userShiftsCollection = collection(db, USER_SHIFTS_COLLECTION);
    const q = query(
      userShiftsCollection,
      where('userId', '==', userId),
      orderBy('startDate', 'desc')
    );
    const snapshot = await getDocs(q);
    
    const results = [];
    for (const doc of snapshot.docs) {
      const userShiftData = doc.data();
      const userShift = {
        id: doc.id,
        ...userShiftData,
        createdAt: userShiftData.createdAt?.toDate?.()?.toISOString() || userShiftData.createdAt,
      } as UserShift;
      
      const shift = await this.getShiftById(userShift.shiftId);
      if (shift) {
        results.push({ userShift, shift });
      }
    }
    
    return results;
  },

  async updateUserShift(userShiftId: string, updates: Partial<UserShift>): Promise<void> {
    const docRef = doc(db, USER_SHIFTS_COLLECTION, userShiftId);
    await updateDoc(docRef, updates);
  },

  // Shift Logic Helpers
  isTimeWithinShift(time: Date, shift: Shift): boolean {
    const timeString = time.toTimeString().substring(0, 5); // "HH:MM"
    const dayOfWeek = time.getDay();
    
    if (!shift.daysOfWeek.includes(dayOfWeek)) {
      return false;
    }
    
    return timeString >= shift.startTime && timeString <= shift.endTime;
  },

  isTimeWithinTolerance(actualTime: Date, expectedTime: string, toleranceMinutes: number): boolean {
    const [hours, minutes] = expectedTime.split(':').map(Number);
    const expected = new Date(actualTime);
    expected.setHours(hours, minutes, 0, 0);
    
    const diffMs = Math.abs(actualTime.getTime() - expected.getTime());
    const diffMinutes = diffMs / (1000 * 60);
    
    return diffMinutes <= toleranceMinutes;
  },

  calculateOvertimeHours(hoursWorked: number, shift: Shift): number {
    const shiftDurationHours = this.calculateShiftDuration(shift);
    const overtime = hoursWorked - shiftDurationHours;
    return Math.max(0, overtime);
  },

  calculateShiftDuration(shift: Shift): number {
    const [startHours, startMinutes] = shift.startTime.split(':').map(Number);
    const [endHours, endMinutes] = shift.endTime.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    let endTotalMinutes = endHours * 60 + endMinutes;
    
    // Handle overnight shifts
    if (endTotalMinutes < startTotalMinutes) {
      endTotalMinutes += 24 * 60;
    }
    
    const durationMinutes = endTotalMinutes - startTotalMinutes - shift.breakDuration;
    return durationMinutes / 60; // Convert to hours
  },

  getShiftStatus(currentTime: Date, shift: Shift): 'before' | 'during' | 'break' | 'after' | 'off_day' {
    const dayOfWeek = currentTime.getDay();
    
    if (!shift.daysOfWeek.includes(dayOfWeek)) {
      return 'off_day';
    }
    
    const timeString = currentTime.toTimeString().substring(0, 5);
    const [currentHours, currentMinutes] = timeString.split(':').map(Number);
    const currentTotalMinutes = currentHours * 60 + currentMinutes;
    
    const [startHours, startMinutes] = shift.startTime.split(':').map(Number);
    const [endHours, endMinutes] = shift.endTime.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    let endTotalMinutes = endHours * 60 + endMinutes;
    
    if (endTotalMinutes < startTotalMinutes) {
      endTotalMinutes += 24 * 60;
    }
    
    // Calculate break time (assume break is in the middle of shift)
    const shiftMiddle = startTotalMinutes + (endTotalMinutes - startTotalMinutes) / 2;
    const breakStart = shiftMiddle - shift.breakDuration / 2;
    const breakEnd = shiftMiddle + shift.breakDuration / 2;
    
    if (currentTotalMinutes < startTotalMinutes) {
      return 'before';
    } else if (currentTotalMinutes >= breakStart && currentTotalMinutes <= breakEnd) {
      return 'break';
    } else if (currentTotalMinutes > endTotalMinutes) {
      return 'after';
    } else {
      return 'during';
    }
  },

  // Default shifts for initialization
  getDefaultShifts(): Omit<Shift, 'id' | 'createdAt' | 'updatedAt'>[] {
    return [
      {
        name: 'Manhã',
        startTime: '08:00',
        endTime: '17:00',
        breakDuration: 60, // 1 hour lunch
        tolerance: 15, // 15 minutes tolerance
        daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
        isActive: true,
        color: '#3B82F6', // Blue
        description: 'Turno da manhã - 8h às 17h com 1h de almoço',
        overtimeRules: [{
          afterHours: 8,
          multiplier: 1.5,
          maxDaily: 4,
          maxWeekly: 10
        }]
      },
      {
        name: 'Tarde',
        startTime: '14:00',
        endTime: '23:00',
        breakDuration: 60,
        tolerance: 15,
        daysOfWeek: [1, 2, 3, 4, 5],
        isActive: true,
        color: '#F59E0B', // Amber
        description: 'Turno da tarde - 14h às 23h com 1h de jantar',
        overtimeRules: [{
          afterHours: 8,
          multiplier: 1.5,
          maxDaily: 4,
          maxWeekly: 10
        }]
      },
      {
        name: 'Noite',
        startTime: '22:00',
        endTime: '06:00',
        breakDuration: 60,
        tolerance: 15,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // All days
        isActive: true,
        color: '#8B5CF6', // Purple
        description: 'Turno da noite - 22h às 6h com 1h de intervalo',
        overtimeRules: [{
          afterHours: 8,
          multiplier: 2.0, // Night shift has higher multiplier
          maxDaily: 4,
          maxWeekly: 10
        }]
      },
      {
        name: 'Flexível',
        startTime: '09:00',
        endTime: '18:00',
        breakDuration: 60,
        tolerance: 60, // 1 hour tolerance for flexible schedule
        daysOfWeek: [1, 2, 3, 4, 5],
        isActive: true,
        color: '#10B981', // Emerald
        description: 'Horário flexível com 1h de tolerância',
        overtimeRules: [{
          afterHours: 8,
          multiplier: 1.5,
          maxDaily: 6,
          maxWeekly: 15
        }]
      }
    ];
  }
};