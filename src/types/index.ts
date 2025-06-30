// Tipos existentes
export type TimeEntry = {
  id: string;
  startTime: string;
  endTime?: string;
  location?: LocationInfo;
  shiftId?: string;
  notes?: string;
  isManualEntry?: boolean;
  approvedBy?: string;
};

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
  timeBankAdjustment?: number;
  is24hFormat?: boolean;
  enableReminders?: boolean;
  workStartTime?: string;
  breakDuration?: number;
  enableGeolocation?: boolean;
  allowedLocations?: string[];
  enableShifts?: boolean;
  defaultShiftId?: string;
  updatedAt?: any;
};

// Novas funcionalidades - Sistema de Justificativas
export type AbsenceRequest = {
  id: string;
  userId: string;
  type: 'sick_leave' | 'vacation' | 'personal' | 'medical_certificate' | 'maternity' | 'paternity';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  attachments?: string[];
  hoursAffected: number;
  createdAt: string;
  updatedAt: string;
};

// Sistema de Geolocalização
export type Location = {
  id: string;
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  radius: number; // metros de tolerância
  allowedUsers: string[];
  isActive: boolean;
  type: 'office' | 'home_office' | 'client' | 'remote';
  createdAt: string;
  updatedAt: string;
};

export type LocationInfo = {
  coordinates: { lat: number; lng: number };
  address: string;
  locationId?: string;
  accuracy?: number;
  timestamp: string;
};

// Sistema de Turnos
export type Shift = {
  id: string;
  name: string;
  startTime: string; // "08:00"
  endTime: string;   // "17:00"
  breakDuration: number; // minutos
  tolerance: number; // minutos de tolerância
  daysOfWeek: number[]; // [1,2,3,4,5] = seg-sex
  isActive: boolean;
  color: string;
  description?: string;
  overtimeRules?: OvertimeRule[];
  createdAt: string;
  updatedAt: string;
};

export type UserShift = {
  id: string;
  userId: string;
  shiftId: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
};

export type OvertimeRule = {
  afterHours: number; // horas para considerar extra
  multiplier: number; // 1.5 = 50% extra
  maxDaily?: number; // máximo diário
  maxWeekly?: number; // máximo semanal
};

// Sistema de Permissões
export type UserRole = 'admin' | 'manager' | 'hr' | 'employee';

export type Permission = 
  | 'view_own_data'
  | 'edit_own_data' 
  | 'view_team_data'
  | 'edit_team_data'
  | 'approve_absences'
  | 'manage_locations'
  | 'manage_shifts'
  | 'manage_users'
  | 'view_reports'
  | 'export_data'
  | 'manage_settings';

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  managerId?: string;
  teamIds: string[];
  departmentId?: string;
  employeeId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// Analytics e Relatórios
export type TimePattern = {
  userId: string;
  averageStartTime: string;
  averageEndTime: string;
  punctualityScore: number; // 0-100
  totalHoursWorked: number;
  overtimeHours: number;
  absenceDays: number;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  periodStart: string;
  periodEnd: string;
  trends: {
    punctuality: 'improving' | 'declining' | 'stable';
    hours: 'increasing' | 'decreasing' | 'stable';
  };
};

export type AnalyticsData = {
  productivity: {
    hoursWorked: number;
    hoursTarget: number;
    efficiency: number;
  };
  punctuality: {
    onTimeArrivals: number;
    lateArrivals: number;
    averageDelay: number;
  };
  patterns: {
    peakHours: string[];
    preferredBreakTimes: string[];
    mostProductiveDays: string[];
  };
  predictions: {
    expectedEndTime?: string;
    bankHoursForecast: number;
    burnoutRisk: 'low' | 'medium' | 'high';
  };
};

// Notificações
export type NotificationType = 
  | 'reminder_clock_in'
  | 'reminder_clock_out'
  | 'reminder_break'
  | 'overtime_alert'
  | 'absence_approved'
  | 'absence_rejected'
  | 'bank_hours_low'
  | 'pattern_anomaly'
  | 'weekly_summary';

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  expiresAt?: string;
};

// Gamificação
export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'punctuality' | 'consistency' | 'productivity' | 'wellness';
  criteria: {
    type: 'streak' | 'total' | 'average' | 'milestone';
    value: number;
    period?: 'daily' | 'weekly' | 'monthly';
  };
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
};

export type UserAchievement = {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: string;
  progress: number; // 0-100
};

export type Leaderboard = {
  period: 'weekly' | 'monthly' | 'quarterly';
  category: 'punctuality' | 'hours' | 'achievements';
  rankings: {
    userId: string;
    userName: string;
    score: number;
    position: number;
  }[];
  lastUpdated: string;
};

// Bem-estar
export type WellnessMetric = {
  userId: string;
  date: string;
  hoursWorked: number;
  breaksTaken: number;
  averageBreakDuration: number;
  consecutiveWorkDays: number;
  stressLevel?: 1 | 2 | 3 | 4 | 5;
  energyLevel?: 1 | 2 | 3 | 4 | 5;
  workLifeBalance?: 1 | 2 | 3 | 4 | 5;
  burnoutRisk: 'low' | 'medium' | 'high';
};

export type WellnessAlert = {
  id: string;
  userId: string;
  type: 'excessive_hours' | 'no_breaks' | 'consecutive_days' | 'burnout_risk';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  suggestions: string[];
  createdAt: string;
  acknowledgedAt?: string;
};

// Auditoria
export type AuditLog = {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, { from: any; to: any }>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
};

// Integração e Export
export type ExportRequest = {
  id: string;
  userId: string;
  type: 'timesheet' | 'attendance' | 'analytics' | 'full_export';
  format: 'csv' | 'excel' | 'pdf';
  filters: {
    startDate: string;
    endDate: string;
    userIds?: string[];
    includeArchived?: boolean;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
};

// IA e Automação
export type AIInsight = {
  id: string;
  userId: string;
  type: 'pattern_analysis' | 'optimization_suggestion' | 'anomaly_detection' | 'prediction';
  title: string;
  description: string;
  confidence: number; // 0-1
  actionable: boolean;
  suggestedActions?: string[];
  metadata: Record<string, any>;
  createdAt: string;
  dismissedAt?: string;
};

export type AutomationRule = {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'time_based' | 'event_based' | 'condition_based';
    conditions: Record<string, any>;
  };
  actions: {
    type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end' | 'notification' | 'calculation';
    parameters: Record<string, any>;
  }[];
  isActive: boolean;
  userId?: string; // null = global rule
  createdAt: string;
  lastTriggered?: string;
};