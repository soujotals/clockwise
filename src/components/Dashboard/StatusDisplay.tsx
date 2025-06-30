"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TimeEntry } from "@/services/time-entry.service";
import { isSameDay } from "date-fns";

type WorkdayStatus = 'NOT_STARTED' | 'WORKING_BEFORE_BREAK' | 'ON_BREAK' | 'WORKING_AFTER_BREAK' | 'FINISHED';

interface StatusDisplayProps {
  workdayStatus: WorkdayStatus;
  currentEntry: TimeEntry | null;
  timeEntries: TimeEntry[];
  now: Date;
  is24hFormat: boolean;
}

export function StatusDisplay({
  workdayStatus,
  currentEntry,
  timeEntries,
  now,
  is24hFormat,
}: StatusDisplayProps) {
  const timeFormatString = is24hFormat ? 'HH:mm' : 'hh:mm a';

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, timeFormatString, { locale: ptBR });
  };

  const statusLabel = (() => {
    const todayEntries = timeEntries
      .filter(entry => isSameDay(new Date(entry.startTime), now))
      .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
    switch (workdayStatus) {
      case 'NOT_STARTED': 
        return 'Fora do expediente';
      case 'WORKING_BEFORE_BREAK':
        return `Em expediente desde ${formatTime(currentEntry?.startTime || now)}`;
      case 'ON_BREAK': {
        const firstEntry = todayEntries[0];
        if(firstEntry?.endTime) return `Em intervalo desde ${formatTime(firstEntry.endTime)}`;
        return 'Em intervalo';
      }
      case 'WORKING_AFTER_BREAK':
        return `Trabalhando desde ${formatTime(currentEntry?.startTime || now)}`;
      case 'FINISHED': {
         const lastEntry = todayEntries[todayEntries.length -1];
         if(lastEntry?.endTime) return `Expediente encerrado às ${formatTime(lastEntry.endTime)}`;
         return 'Expediente encerrado';
      }
      default:
        return 'Status desconhecido';
    }
  })();

  return (
    <p className="text-lg text-center text-muted-foreground animate-in fade-in-0 duration-500 delay-100">
      {statusLabel}
    </p>
  );
}