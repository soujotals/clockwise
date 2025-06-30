import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  limit 
} from 'firebase/firestore';
import type { Notification as NotificationData, NotificationType } from '@/types';

const NOTIFICATIONS_COLLECTION = 'notifications';

export const notificationService = {
  async createNotification(notification: Omit<NotificationData, 'id' | 'createdAt'>): Promise<NotificationData> {
    const notificationsCollection = collection(db, NOTIFICATIONS_COLLECTION);
    const docRef = await addDoc(notificationsCollection, {
      ...notification,
      createdAt: serverTimestamp()
    });
    
    return { 
      ...notification, 
      id: docRef.id,
      createdAt: new Date().toISOString()
    };
  },

  async getUserNotifications(userId: string, limit_count: number = 20): Promise<NotificationData[]> {
    const notificationsCollection = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(
      notificationsCollection,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limit_count)
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        expiresAt: data.expiresAt?.toDate?.()?.toISOString() || data.expiresAt,
      } as NotificationData;
    });
  },

  async getUnreadNotifications(userId: string): Promise<NotificationData[]> {
    const notificationsCollection = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(
      notificationsCollection,
      where('userId', '==', userId),
      where('isRead', '==', false),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        expiresAt: data.expiresAt?.toDate?.()?.toISOString() || data.expiresAt,
      } as NotificationData;
    });
  },

  async markAsRead(notificationId: string): Promise<void> {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(docRef, {
      isRead: true
    });
  },

  async markAllAsRead(userId: string): Promise<void> {
    const unreadNotifications = await this.getUnreadNotifications(userId);
    const updatePromises = unreadNotifications.map(notification => 
      this.markAsRead(notification.id)
    );
    await Promise.all(updatePromises);
  },

  // Smart notification creation methods
  async createClockInReminder(userId: string, scheduledTime: Date): Promise<NotificationData> {
    return this.createNotification({
      userId,
      type: 'reminder_clock_in',
      title: 'Hora de Bater Ponto!',
      message: 'Não se esqueça de registrar sua entrada.',
      isRead: false,
      metadata: { scheduledTime: scheduledTime.toISOString() }
    });
  },

  async createClockOutReminder(userId: string, workStartTime: string): Promise<NotificationData> {
    const message = `Você iniciou o trabalho às ${workStartTime}. Lembre-se de registrar sua saída.`;
    
    return this.createNotification({
      userId,
      type: 'reminder_clock_out',
      title: 'Lembrete de Saída',
      message,
      isRead: false,
      metadata: { workStartTime }
    });
  },

  async createBreakReminder(userId: string, hoursWorked: number): Promise<NotificationData> {
    return this.createNotification({
      userId,
      type: 'reminder_break',
      title: 'Hora da Pausa',
      message: `Você já trabalhou ${hoursWorked} horas. Que tal fazer uma pausa?`,
      isRead: false,
      metadata: { hoursWorked }
    });
  },

  async createOvertimeAlert(userId: string, overtimeHours: number): Promise<NotificationData> {
    return this.createNotification({
      userId,
      type: 'overtime_alert',
      title: 'Alerta de Horas Extras',
      message: `Você já trabalhou ${overtimeHours} horas extras hoje. Considere encerrar o expediente.`,
      isRead: false,
      metadata: { overtimeHours }
    });
  },

  async createAbsenceApproved(userId: string, absenceType: string, dates: string): Promise<NotificationData> {
    return this.createNotification({
      userId,
      type: 'absence_approved',
      title: 'Ausência Aprovada',
      message: `Sua solicitação de ${absenceType} para ${dates} foi aprovada.`,
      isRead: false,
      metadata: { absenceType, dates }
    });
  },

  async createAbsenceRejected(userId: string, absenceType: string, reason: string): Promise<NotificationData> {
    return this.createNotification({
      userId,
      type: 'absence_rejected',
      title: 'Ausência Rejeitada',
      message: `Sua solicitação de ${absenceType} foi rejeitada. Motivo: ${reason}`,
      isRead: false,
      metadata: { absenceType, reason }
    });
  },

  async createBankHoursLowAlert(userId: string, currentBalance: number): Promise<NotificationData> {
    return this.createNotification({
      userId,
      type: 'bank_hours_low',
      title: 'Banco de Horas Baixo',
      message: `Seu saldo atual é de ${currentBalance} horas. Considere trabalhar algumas horas extras.`,
      isRead: false,
      metadata: { currentBalance }
    });
  },

  async createPatternAnomaly(userId: string, anomalyDescription: string): Promise<NotificationData> {
    return this.createNotification({
      userId,
      type: 'pattern_anomaly',
      title: 'Padrão Anômalo Detectado',
      message: anomalyDescription,
      isRead: false,
      metadata: { anomalyDescription }
    });
  },

  async createWeeklySummary(userId: string, summaryData: any): Promise<NotificationData> {
    const { hoursWorked, efficiency, punctualityScore } = summaryData;
    const message = `Esta semana: ${hoursWorked}h trabalhadas, ${efficiency}% de eficiência, ${punctualityScore}% de pontualidade.`;
    
    return this.createNotification({
      userId,
      type: 'weekly_summary',
      title: 'Resumo Semanal',
      message,
      isRead: false,
      metadata: summaryData
    });
  },

  // Push notification support (for PWA)
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  },

  async showPushNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    if (await this.requestPermission()) {
      try {
        if ('serviceWorker' in navigator && 'registration' in navigator.serviceWorker) {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, {
            badge: '/icon-192x192.png',
            icon: '/icon-192x192.png',
            vibrate: [200, 100, 200],
            ...options
          });
        } else {
          new Notification(title, options);
        }
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
  },

  // Intelligent notification scheduling
  async scheduleSmartReminders(userId: string, userPattern: any): Promise<void> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Clock-in reminder (15 minutes before usual time)
    if (userPattern.averageStartTime) {
      const [hours, minutes] = userPattern.averageStartTime.split(':').map(Number);
      const reminderTime = new Date(tomorrow);
      reminderTime.setHours(hours, minutes - 15, 0, 0);

      if (reminderTime > now) {
        // In a real app, you'd schedule this with a job queue or service worker
        setTimeout(async () => {
          await this.createClockInReminder(userId, reminderTime);
          await this.showPushNotification('Hora de Bater Ponto!', {
            body: 'Não se esqueça de registrar sua entrada.',
            tag: 'clock-in-reminder'
          });
        }, reminderTime.getTime() - now.getTime());
      }
    }

    // Break reminder (every 4 hours during work)
    const workHours = [10, 14, 16]; // 10 AM, 2 PM, 4 PM
    workHours.forEach(hour => {
      const breakTime = new Date(tomorrow);
      breakTime.setHours(hour, 0, 0, 0);

      if (breakTime > now) {
        setTimeout(async () => {
          await this.createBreakReminder(userId, 4);
          await this.showPushNotification('Hora da Pausa', {
            body: 'Que tal fazer uma pausa?',
            tag: 'break-reminder'
          });
        }, breakTime.getTime() - now.getTime());
      }
    });
  },

  // Cleanup old notifications
  async cleanupOldNotifications(userId: string, daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const allNotifications = await this.getUserNotifications(userId, 1000);
    const oldNotifications = allNotifications.filter(notification => {
      const createdAt = new Date(notification.createdAt);
      return createdAt < cutoffDate;
    });

    // In a real implementation, you'd batch delete these
    console.log(`Would delete ${oldNotifications.length} old notifications`);
  },

  // Get notification statistics
  getNotificationStats(notifications: Notification[]): {
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
    thisWeek: number;
  } {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      byType: {} as Record<NotificationType, number>,
      thisWeek: notifications.filter(n => new Date(n.createdAt) > weekAgo).length
    };

    // Count by type
    notifications.forEach(notification => {
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
    });

    return stats;
  }
};