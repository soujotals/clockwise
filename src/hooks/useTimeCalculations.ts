"use client";

import { useMemo } from "react";
import {
  differenceInMilliseconds,
  isSameDay,
  eachDayOfInterval,
  startOfToday,
  startOfDay,
} from "date-fns";
import { TimeEntry } from "@/services/time-entry.service";
import { Workdays, AppSettings } from "@/services/settings.service";

type WorkdayStatus = 'NOT_STARTED' | 'WORKING_BEFORE_BREAK' | 'ON_BREAK' | 'WORKING_AFTER_BREAK' | 'FINISHED';

const dayMap: (keyof Workdays)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const formatDuration = (milliseconds: number) => {
  if (milliseconds < 0) milliseconds = 0;
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor((milliseconds % 3600000) / 60000);
  return `${String(hours).padStart(2, "0")}h${String(minutes).padStart(2, "0")}m`;
};

export function useTimeCalculations(
  timeEntries: TimeEntry[],
  now: Date,
  workHoursPerDay: number,
  workdays: Workdays,
  settings: AppSettings | null
) {
  
  const { workdayStatus, currentEntry } = useMemo(() => {
    const todayEntries = timeEntries
      .filter(entry => isSameDay(new Date(entry.startTime), now))
      .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    const activeEntry = todayEntries.find(entry => !entry.endTime);

    let status: WorkdayStatus;

    if (todayEntries.length === 0) {
        status = 'NOT_STARTED';
    } else if (todayEntries.length === 1 && activeEntry) {
        status = 'WORKING_BEFORE_BREAK';
    } else if (todayEntries.length === 1 && !activeEntry) {
        status = 'ON_BREAK';
    } else if (todayEntries.length === 2 && activeEntry) {
        status = 'WORKING_AFTER_BREAK';
    } else if (todayEntries.length >= 2 && !activeEntry) {
        status = 'FINISHED';
    } else {
        status = 'FINISHED';
    }
    
    return { workdayStatus: status, currentEntry: activeEntry || null };
  }, [timeEntries, now]);

  const dailyHours = useMemo(() => {
    let total = timeEntries
      .filter(e => e.endTime && isSameDay(new Date(e.startTime), now))
      .reduce((acc, entry) => {
        return acc + differenceInMilliseconds(new Date(entry.endTime!), new Date(entry.startTime));
      }, 0);
    
    if (currentEntry) {
      total += differenceInMilliseconds(now, new Date(currentEntry.startTime));
    }
    
    return total;
  }, [timeEntries, now, currentEntry]);

  const elapsedTime = useMemo(() => {
    if (currentEntry) {
      return differenceInMilliseconds(now, new Date(currentEntry.startTime));
    }
    return 0;
  }, [now, currentEntry]);

  const progress = useMemo(() => {
    const totalMilliseconds = workHoursPerDay * 60 * 60 * 1000;
    if (totalMilliseconds === 0) return 0;
    return Math.min(100, (dailyHours / totalMilliseconds) * 100);
  }, [dailyHours, workHoursPerDay]);

  const timeBank = useMemo(() => {
    const today = startOfToday();
    
    if (timeEntries.length === 0 && !settings?.timeBankAdjustment) {
      return "+00h00m";
    }

    const firstEntryDate = timeEntries.length > 0 ? timeEntries.reduce((earliest, entry) => {
        const entryDate = new Date(entry.startTime);
        return entryDate < earliest ? entryDate : earliest;
    }, new Date()) : new Date();

    const firstDay = startOfDay(firstEntryDate);
    const allDaysToConsider = eachDayOfInterval({ start: firstDay, end: today });

    let totalWorkedMs = 0;
    let totalTargetMs = 0;

    const isConfiguredWorkday = (date: Date): boolean => {
      const dayIndex = date.getDay();
      const dayKey = dayMap[dayIndex];
      return workdays[dayKey];
    };
    
    const todayEntries = timeEntries.filter(e => isSameDay(new Date(e.startTime), today));
    const isTodayFinished = todayEntries.length > 0 && todayEntries.every(e => e.endTime);

    allDaysToConsider.forEach(day => {
      const isToday = isSameDay(day, today);
      
      const entriesOnDay = timeEntries.filter(e => isSameDay(new Date(e.startTime), day) && e.endTime);
      const dailyTotal = entriesOnDay.reduce((total, entry) => {
        return total + differenceInMilliseconds(new Date(entry.endTime!), new Date(entry.startTime));
      }, 0);

      totalWorkedMs += dailyTotal;

      if (isConfiguredWorkday(day)) {
        if (!isToday || (isToday && isTodayFinished)) {
          totalTargetMs += workHoursPerDay * 60 * 60 * 1000;
        }
      }
    });

    const bankMs = totalWorkedMs - totalTargetMs;
    const finalBankMs = bankMs + (settings?.timeBankAdjustment || 0);
    const sign = finalBankMs >= 0 ? "+" : "-";
    return `${sign}${formatDuration(Math.abs(finalBankMs))}`;
  }, [timeEntries, workHoursPerDay, workdays, settings]);

  const predictedEndTime = useMemo(() => {
    if (!settings || workdayStatus === 'NOT_STARTED' || workdayStatus === 'FINISHED') {
        return null;
    }

    const todayEntries = timeEntries
        .filter(entry => isSameDay(new Date(entry.startTime), now))
        .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    if (todayEntries.length === 0) return null;

    const firstEntryTime = new Date(todayEntries[0].startTime);
    const workDurationMs = workHoursPerDay * 3600000;
    
    let breakDurationMs = 0;
            
    if ((workdayStatus === 'WORKING_AFTER_BREAK') && todayEntries.length > 1 && todayEntries[0].endTime && todayEntries[1]?.startTime) {
         const breakStartTime = new Date(todayEntries[0].endTime);
         const breakEndTime = new Date(todayEntries[1].startTime);
         breakDurationMs = differenceInMilliseconds(breakEndTime, breakStartTime);
    } else {
         breakDurationMs = (settings.breakDuration || 0) * 60000;
    }
    
    const endTime = new Date(firstEntryTime.getTime() + workDurationMs + breakDurationMs);
    return endTime;

  }, [timeEntries, now, settings, workHoursPerDay, workdayStatus]);

  const lastEvent = useMemo(() => {
    const todayEntries = timeEntries
      .filter(e => isSameDay(new Date(e.startTime), now))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    if (todayEntries.length === 0) return { label: 'Nenhum registro hoje', time: null };

    const allEvents = todayEntries.slice(0, 2).flatMap((entry, entryIndex) => {
        const events = [];
        if (entryIndex === 0) {
            events.push({ time: entry.startTime, type: 'Entrada' });
            if (entry.endTime) events.push({ time: entry.endTime, type: 'Saída p/ Intervalo' });
        } else {
            events.push({ time: entry.startTime, type: 'Retorno do Intervalo' });
            if (entry.endTime) events.push({ time: entry.endTime, type: 'Saída' });
        }
        return events;
    }).sort((a,b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const last = allEvents[0];
    if (!last) return { label: 'Nenhum registro hoje', time: null };

    return { label: last.type, time: last.time };
  }, [timeEntries, now]);

  return {
    workdayStatus,
    currentEntry,
    dailyHours,
    elapsedTime,
    progress,
    timeBank,
    predictedEndTime,
    lastEvent,
    formatDuration,
  };
}