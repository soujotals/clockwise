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

  const statusColors = {
    'NOT_STARTED': 'bg-gray-400',
    'WORKING_BEFORE_BREAK': 'bg-green-500',
    'ON_BREAK': 'bg-orange-500',
    'WORKING_AFTER_BREAK': 'bg-green-500',
    'FINISHED': 'bg-blue-500',
  };

  const isActive = workdayStatus === 'WORKING_BEFORE_BREAK' || workdayStatus === 'WORKING_AFTER_BREAK';

  return (
    <div className="flex items-center justify-center gap-3 animate-in fade-in-0 duration-500 delay-100">
      {/* Status dot with pulse animation */}
      <div className="relative">
        <div className={`w-3 h-3 rounded-full ${statusColors[workdayStatus]}`} />
        
        {/* Pulse effect for active states */}
        {isActive && (
          <div className={`absolute inset-0 w-3 h-3 rounded-full animate-ping ${statusColors[workdayStatus]} opacity-75`} />
        )}
      </div>

      <p className="text-lg text-center text-muted-foreground">
        {statusLabel}
      </p>
    </div>
  );
}