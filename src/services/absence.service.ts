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
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { AbsenceRequest } from '@/types';

const getAbsenceCollection = (userId: string) => 
  collection(db, `users/${userId}/absenceRequests`);

export const absenceService = {
  async createRequest(userId: string, request: Omit<AbsenceRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<AbsenceRequest> {
    if (!userId) throw new Error("User not authenticated");
    
    const absenceCollection = getAbsenceCollection(userId);
    const docRef = await addDoc(absenceCollection, {
      ...request,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return { 
      ...request, 
      id: docRef.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  async getUserRequests(userId: string): Promise<AbsenceRequest[]> {
    if (!userId) return [];
    
    const absenceCollection = getAbsenceCollection(userId);
    const q = query(absenceCollection, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        approvedAt: data.approvedAt?.toDate?.()?.toISOString() || data.approvedAt,
      } as AbsenceRequest;
    });
  },

  async getPendingRequests(managerUserId: string): Promise<AbsenceRequest[]> {
    // Em uma implementação real, isso buscaria requests de usuários sob gerência
    // Por simplicidade, retorna requests pendentes de todos os usuários
    try {
      const allRequests: AbsenceRequest[] = [];
      // Esta seria uma query mais complexa em produção
      return allRequests.filter(req => req.status === 'pending');
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      return [];
    }
  },

  async approveRequest(
    userId: string, 
    requestId: string, 
    approverId: string,
    comments?: string
  ): Promise<void> {
    if (!userId) throw new Error("User not authenticated");
    
    const docRef = doc(db, `users/${userId}/absenceRequests`, requestId);
    await updateDoc(docRef, {
      status: 'approved',
      approvedBy: approverId,
      approvedAt: serverTimestamp(),
      comments,
      updatedAt: serverTimestamp()
    });
  },

  async rejectRequest(
    userId: string, 
    requestId: string, 
    approverId: string,
    rejectionReason: string
  ): Promise<void> {
    if (!userId) throw new Error("User not authenticated");
    
    const docRef = doc(db, `users/${userId}/absenceRequests`, requestId);
    await updateDoc(docRef, {
      status: 'rejected',
      approvedBy: approverId,
      rejectionReason,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  },

  async updateRequest(
    userId: string, 
    requestId: string, 
    updates: Partial<AbsenceRequest>
  ): Promise<void> {
    if (!userId) throw new Error("User not authenticated");
    
    const docRef = doc(db, `users/${userId}/absenceRequests`, requestId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  async deleteRequest(userId: string, requestId: string): Promise<void> {
    if (!userId) throw new Error("User not authenticated");
    
    const docRef = doc(db, `users/${userId}/absenceRequests`, requestId);
    await deleteDoc(docRef);
  },

  async getRequestById(userId: string, requestId: string): Promise<AbsenceRequest | null> {
    if (!userId) return null;
    
    const docRef = doc(db, `users/${userId}/absenceRequests`, requestId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        approvedAt: data.approvedAt?.toDate?.()?.toISOString() || data.approvedAt,
      } as AbsenceRequest;
    }
    
    return null;
  },

  calculateHoursAffected(startDate: string, endDate: string, workHoursPerDay: number = 8): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir o último dia
    return diffDays * workHoursPerDay;
  }
};