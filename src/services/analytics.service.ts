import { TimeEntry, AnalyticsData, TimePattern, WellnessMetric } from '@/types';
import { 
  format, 
  differenceInMilliseconds, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  parseISO
} from 'date-fns';

export const analyticsService = {
  calculateProductivityMetrics(
    entries: TimeEntry[], 
    targetHoursPerDay: number = 8,
    period: { start: Date; end: Date }
  ): AnalyticsData['productivity'] {
    const workDays = eachDayOfInterval(period).filter(day => {
      const dayOfWeek = day.getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
    });

    const totalWorkedMs = entries.reduce((acc, entry) => {
      if (entry.endTime) {
        return acc + differenceInMilliseconds(new Date(entry.endTime), new Date(entry.startTime));
      }
      return acc;
    }, 0);

    const hoursWorked = totalWorkedMs / (1000 * 60 * 60);
    const hoursTarget = workDays.length * targetHoursPerDay;
    const efficiency = hoursTarget > 0 ? (hoursWorked / hoursTarget) * 100 : 0;

    return {
      hoursWorked: Math.round(hoursWorked * 100) / 100,
      hoursTarget,
      efficiency: Math.round(efficiency * 100) / 100
    };
  },

  calculatePunctualityMetrics(
    entries: TimeEntry[],
    expectedStartTime: string = "09:00"
  ): AnalyticsData['punctuality'] {
    const [expectedHour, expectedMinute] = expectedStartTime.split(':').map(Number);
    
    let onTimeArrivals = 0;
    let lateArrivals = 0;
    let totalDelayMs = 0;

    entries.forEach(entry => {
      const startTime = new Date(entry.startTime);
      const expectedTime = new Date(startTime);
      expectedTime.setHours(expectedHour, expectedMinute, 0, 0);

      if (startTime <= expectedTime) {
        onTimeArrivals++;
      } else {
        lateArrivals++;
        totalDelayMs += startTime.getTime() - expectedTime.getTime();
      }
    });

    const averageDelay = lateArrivals > 0 ? 
      Math.round((totalDelayMs / lateArrivals) / (1000 * 60)) : 0; // in minutes

    return {
      onTimeArrivals,
      lateArrivals,
      averageDelay
    };
  },

  analyzeWorkPatterns(entries: TimeEntry[]): AnalyticsData['patterns'] {
    const hourCounts: Record<number, number> = {};
    const breakTimes: string[] = [];
    const dayProductivity: Record<number, number> = {}; // day of week -> total hours

    entries.forEach(entry => {
      const startTime = new Date(entry.startTime);
      const hour = startTime.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;

      if (entry.endTime) {
        const endTime = new Date(entry.endTime);
        const dayOfWeek = startTime.getDay();
        const hoursWorked = differenceInMilliseconds(endTime, startTime) / (1000 * 60 * 60);
        dayProductivity[dayOfWeek] = (dayProductivity[dayOfWeek] || 0) + hoursWorked;
      }
    });

    // Find peak hours (top 3)
    const peakHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour.padStart(2, '0')}:00`);

    // Simulate break time analysis (in real app, would track break entries)
    const preferredBreakTimes = ['12:00', '15:00', '10:30'];

    // Find most productive days
    const mostProductiveDays = Object.entries(dayProductivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day]) => {
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        return dayNames[parseInt(day)];
      });

    return {
      peakHours,
      preferredBreakTimes,
      mostProductiveDays
    };
  },

  generatePredictions(
    entries: TimeEntry[],
    currentEntry?: TimeEntry
  ): AnalyticsData['predictions'] {
    const recentEntries = entries.slice(-30); // Last 30 entries
    
    // Calculate average work duration
    const completedEntries = recentEntries.filter(e => e.endTime);
    const avgDurationMs = completedEntries.length > 0 ? 
      completedEntries.reduce((acc, entry) => {
        return acc + differenceInMilliseconds(new Date(entry.endTime!), new Date(entry.startTime));
      }, 0) / completedEntries.length : 8 * 60 * 60 * 1000; // 8 hours default

    let expectedEndTime: string | undefined;
    if (currentEntry && !currentEntry.endTime) {
      const startTime = new Date(currentEntry.startTime);
      const endTime = new Date(startTime.getTime() + avgDurationMs);
      expectedEndTime = format(endTime, 'HH:mm');
    }

    // Simple bank hours forecast (would be more complex in real app)
    const totalHoursWorked = completedEntries.reduce((acc, entry) => {
      return acc + differenceInMilliseconds(new Date(entry.endTime!), new Date(entry.startTime));
    }, 0) / (1000 * 60 * 60);
    
    const workDays = Math.ceil(completedEntries.length / 2); // Approximate work days
    const avgHoursPerDay = workDays > 0 ? totalHoursWorked / workDays : 8;
    const targetHoursPerDay = 8;
    const dailyDifference = avgHoursPerDay - targetHoursPerDay;
    const bankHoursForecast = dailyDifference * 30; // 30 days forecast

    // Burnout risk assessment
    const recentAvgHours = recentEntries.slice(-10).reduce((acc, entry) => {
      if (entry.endTime) {
        return acc + differenceInMilliseconds(new Date(entry.endTime), new Date(entry.startTime)) / (1000 * 60 * 60);
      }
      return acc;
    }, 0) / 10;

    let burnoutRisk: 'low' | 'medium' | 'high' = 'low';
    if (recentAvgHours > 10) burnoutRisk = 'high';
    else if (recentAvgHours > 9) burnoutRisk = 'medium';

    return {
      expectedEndTime,
      bankHoursForecast: Math.round(bankHoursForecast * 100) / 100,
      burnoutRisk
    };
  },

  generateFullAnalytics(
    entries: TimeEntry[],
    targetHoursPerDay: number = 8,
    expectedStartTime: string = "09:00",
    period: { start: Date; end: Date } = {
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date())
    }
  ): AnalyticsData {
    const periodEntries = entries.filter(entry => {
      const entryDate = new Date(entry.startTime);
      return entryDate >= period.start && entryDate <= period.end;
    });

    return {
      productivity: this.calculateProductivityMetrics(periodEntries, targetHoursPerDay, period),
      punctuality: this.calculatePunctualityMetrics(periodEntries, expectedStartTime),
      patterns: this.analyzeWorkPatterns(periodEntries),
      predictions: this.generatePredictions(entries)
    };
  },

  generateTimePattern(
    userId: string,
    entries: TimeEntry[],
    period: 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    periodStart: Date,
    periodEnd: Date
  ): TimePattern {
    const periodEntries = entries.filter(entry => {
      const entryDate = new Date(entry.startTime);
      return entryDate >= periodStart && entryDate <= periodEnd;
    });

    const completedEntries = periodEntries.filter(e => e.endTime);
    
    // Calculate averages
    const startTimes = completedEntries.map(e => {
      const date = new Date(e.startTime);
      return date.getHours() * 60 + date.getMinutes();
    });
    
    const endTimes = completedEntries.map(e => {
      const date = new Date(e.endTime!);
      return date.getHours() * 60 + date.getMinutes();
    });

    const avgStartMinutes = startTimes.reduce((a, b) => a + b, 0) / startTimes.length || 0;
    const avgEndMinutes = endTimes.reduce((a, b) => a + b, 0) / endTimes.length || 0;

    const avgStartTime = `${Math.floor(avgStartMinutes / 60).toString().padStart(2, '0')}:${Math.floor(avgStartMinutes % 60).toString().padStart(2, '0')}`;
    const avgEndTime = `${Math.floor(avgEndMinutes / 60).toString().padStart(2, '0')}:${Math.floor(avgEndMinutes % 60).toString().padStart(2, '0')}`;

    // Calculate punctuality score
    const expectedStartMinutes = 9 * 60; // 9:00 AM
    const punctualEntries = startTimes.filter(time => time <= expectedStartMinutes + 15); // 15 min tolerance
    const punctualityScore = Math.round((punctualEntries.length / startTimes.length) * 100) || 0;

    // Calculate total hours
    const totalHoursWorked = completedEntries.reduce((acc, entry) => {
      return acc + differenceInMilliseconds(new Date(entry.endTime!), new Date(entry.startTime)) / (1000 * 60 * 60);
    }, 0);

    // Calculate overtime (assuming 8h/day standard)
    const workDays = eachDayOfInterval({ start: periodStart, end: periodEnd }).filter(day => {
      const dayOfWeek = day.getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5 && periodEntries.some(e => isSameDay(new Date(e.startTime), day));
    }).length;
    
    const expectedHours = workDays * 8;
    const overtimeHours = Math.max(0, totalHoursWorked - expectedHours);

    // Count absence days (simplified)
    const allWorkDays = eachDayOfInterval({ start: periodStart, end: periodEnd }).filter(day => {
      const dayOfWeek = day.getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    });
    const workedDays = new Set(periodEntries.map(e => format(new Date(e.startTime), 'yyyy-MM-dd'))).size;
    const absenceDays = allWorkDays.length - workedDays;

    // Simple trend analysis
    const firstHalf = completedEntries.slice(0, Math.floor(completedEntries.length / 2));
    const secondHalf = completedEntries.slice(Math.floor(completedEntries.length / 2));

    const firstHalfPunctual = firstHalf.filter(e => {
      const time = new Date(e.startTime).getHours() * 60 + new Date(e.startTime).getMinutes();
      return time <= expectedStartMinutes + 15;
    }).length / firstHalf.length;

    const secondHalfPunctual = secondHalf.filter(e => {
      const time = new Date(e.startTime).getHours() * 60 + new Date(e.startTime).getMinutes();
      return time <= expectedStartMinutes + 15;
    }).length / secondHalf.length;

    const punctualityTrend = secondHalfPunctual > firstHalfPunctual + 0.1 ? 'improving' :
                           secondHalfPunctual < firstHalfPunctual - 0.1 ? 'declining' : 'stable';

    const firstHalfAvgHours = firstHalf.reduce((acc, e) => acc + differenceInMilliseconds(new Date(e.endTime!), new Date(e.startTime)), 0) / (firstHalf.length * 1000 * 60 * 60);
    const secondHalfAvgHours = secondHalf.reduce((acc, e) => acc + differenceInMilliseconds(new Date(e.endTime!), new Date(e.startTime)), 0) / (secondHalf.length * 1000 * 60 * 60);

    const hoursTrend = secondHalfAvgHours > firstHalfAvgHours + 0.5 ? 'increasing' :
                      secondHalfAvgHours < firstHalfAvgHours - 0.5 ? 'decreasing' : 'stable';

    return {
      userId,
      averageStartTime: avgStartTime,
      averageEndTime: avgEndTime,
      punctualityScore,
      totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      absenceDays,
      period,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      trends: {
        punctuality: punctualityTrend,
        hours: hoursTrend
      }
    };
  },

  calculateWellnessMetrics(
    userId: string,
    entries: TimeEntry[],
    date: Date
  ): WellnessMetric {
    const dayEntries = entries.filter(entry => 
      isSameDay(new Date(entry.startTime), date)
    );

    const completedEntries = dayEntries.filter(e => e.endTime);
    
    const hoursWorked = completedEntries.reduce((acc, entry) => {
      return acc + differenceInMilliseconds(new Date(entry.endTime!), new Date(entry.startTime)) / (1000 * 60 * 60);
    }, 0);

    // Estimate breaks (simplified - in real app would track actual breaks)
    const breaksTaken = Math.max(1, Math.floor(hoursWorked / 4)); // Assume 1 break per 4 hours
    const averageBreakDuration = 30; // 30 minutes average

    // Calculate consecutive work days (simplified)
    const recentDays = 7;
    const recentEntries = entries.filter(entry => {
      const entryDate = new Date(entry.startTime);
      const daysDiff = Math.floor((date.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff < recentDays;
    });

    const consecutiveWorkDays = new Set(
      recentEntries.map(e => format(new Date(e.startTime), 'yyyy-MM-dd'))
    ).size;

    // Assess burnout risk
    let burnoutRisk: 'low' | 'medium' | 'high' = 'low';
    if (hoursWorked > 12 || consecutiveWorkDays > 10) {
      burnoutRisk = 'high';
    } else if (hoursWorked > 10 || consecutiveWorkDays > 7) {
      burnoutRisk = 'medium';
    }

    return {
      userId,
      date: format(date, 'yyyy-MM-dd'),
      hoursWorked: Math.round(hoursWorked * 100) / 100,
      breaksTaken,
      averageBreakDuration,
      consecutiveWorkDays,
      burnoutRisk
    };
  },

  exportToCSV(data: any[], filename: string): string {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape values that contain commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }
};