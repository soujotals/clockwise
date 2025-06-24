"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  format,
  differenceInMilliseconds,
  isSameDay,
  startOfWeek,
  eachDayOfInterval,
  isWeekend,
  isBefore,
  startOfToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Clock,
  TrendingUp,
  BarChart,
  Settings,
  LogIn,
  LogOut,
  Coffee,
  Play,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


type TimeEntry = {
  id: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string
};

type WorkdayStatus = 'NOT_STARTED' | 'WORKING_MORNING' | 'ON_BREAK' | 'WORKING_AFTERNOON' | 'DAY_ENDED';

const WORK_HOURS_PER_DAY = 8;

const formatDuration = (milliseconds: number) => {
  if (milliseconds < 0) milliseconds = 0;
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor((milliseconds % 3600000) / 60000);
  return `${String(hours).padStart(2, "0")}h${String(minutes).padStart(
    2,
    "0"
  )}m`;
};

const formatTime = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, "HH:mm");
};

export default function RegistroFacilPage() {
  const [isClient, setIsClient] = useState(false);
  const [now, setNow] = useState(new Date());
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [workdayStatus, setWorkdayStatus] = useState<WorkdayStatus>('NOT_STARTED');

  useEffect(() => {
    setIsClient(true);
    const storedEntries = localStorage.getItem("timeEntries");
    if (storedEntries) {
      const parsedEntries: TimeEntry[] = JSON.parse(storedEntries);
      
      const today = new Date();
      const todayEntries = parsedEntries.filter(e => isSameDay(new Date(e.startTime), today));
      
      // Clear entries from previous days for simplicity
      setTimeEntries(todayEntries);
      
      const todayActiveEntry = todayEntries.find(e => !e.endTime);
      const todayCompletedEntries = todayEntries.filter(e => e.endTime);

      if (todayCompletedEntries.length === 0 && !todayActiveEntry) {
        setWorkdayStatus('NOT_STARTED');
      } else if (todayCompletedEntries.length === 0 && todayActiveEntry) {
        setWorkdayStatus('WORKING_MORNING');
        setCurrentEntry(todayActiveEntry);
      } else if (todayCompletedEntries.length === 1 && !todayActiveEntry) {
        setWorkdayStatus('ON_BREAK');
      } else if (todayCompletedEntries.length === 1 && todayActiveEntry) {
        setWorkdayStatus('WORKING_AFTERNOON');
        setCurrentEntry(todayActiveEntry);
      } else if (todayCompletedEntries.length >= 2) {
        setWorkdayStatus('DAY_ENDED');
      }
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem("timeEntries", JSON.stringify(timeEntries));
    }
  }, [timeEntries, isClient]);
  
  const handleClockAction = useCallback(() => {
    const actionTime = new Date().toISOString();
    switch (workdayStatus) {
      case 'NOT_STARTED': { // Action: Entrada
        const newEntry: TimeEntry = { id: crypto.randomUUID(), startTime: actionTime };
        setTimeEntries(prev => [...prev, newEntry]);
        setCurrentEntry(newEntry);
        setWorkdayStatus('WORKING_MORNING');
        break;
      }
      case 'WORKING_MORNING': { // Action: Pausa
        if (currentEntry) {
          const updatedEntry = { ...currentEntry, endTime: actionTime };
          setTimeEntries(prev => prev.map(e => (e.id === currentEntry.id ? updatedEntry : e)));
          setCurrentEntry(null);
          setWorkdayStatus('ON_BREAK');
        }
        break;
      }
      case 'ON_BREAK': { // Action: Retorno
        const newEntry: TimeEntry = { id: crypto.randomUUID(), startTime: actionTime };
        setTimeEntries(prev => [...prev, newEntry]);
        setCurrentEntry(newEntry);
        setWorkdayStatus('WORKING_AFTERNOON');
        break;
      }
      case 'WORKING_AFTERNOON': { // Action: Saída
        if (currentEntry) {
          const updatedEntry = { ...currentEntry, endTime: actionTime };
          setTimeEntries(prev => prev.map(e => (e.id === currentEntry.id ? updatedEntry : e)));
          setCurrentEntry(null);
          setWorkdayStatus('DAY_ENDED');
        }
        break;
      }
      case 'DAY_ENDED':
        break;
    }
  }, [workdayStatus, currentEntry]);

  const elapsedTime = useMemo(() => {
    if (currentEntry) {
      return differenceInMilliseconds(now, new Date(currentEntry.startTime));
    }
    return 0;
  }, [now, currentEntry]);

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

  const progress = useMemo(() => {
    const totalMilliseconds = WORK_HOURS_PER_DAY * 60 * 60 * 1000;
    if (totalMilliseconds === 0) return 0;
    return Math.min(100, (dailyHours / totalMilliseconds) * 100);
  }, [dailyHours]);

  const timeBank = useMemo(() => {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const today = startOfToday();
    const daysInWeekSoFar = eachDayOfInterval({ start: weekStart, end: today });
  
    const storedEntries: TimeEntry[] = isClient ? JSON.parse(localStorage.getItem("timeEntries") || "[]") : [];
  
    let workedMs = 0;
    let targetMs = 0;
  
    // Calculate for past days in the week
    daysInWeekSoFar.forEach(day => {
      if (!isWeekend(day) && isBefore(day, today)) {
        targetMs += WORK_HOURS_PER_DAY * 60 * 60 * 1000;
        const entriesOnDay = storedEntries.filter(e => isSameDay(new Date(e.startTime), day) && e.endTime);
        const dailyTotal = entriesOnDay.reduce((total, entry) => {
          return total + differenceInMilliseconds(new Date(entry.endTime!), new Date(entry.startTime));
        }, 0);
        workedMs += dailyTotal;
      }
    });
  
    // Add today's progress
    const totalWorkedMs = workedMs + dailyHours;
  
    const bankMs = totalWorkedMs - targetMs;
    const sign = bankMs >= 0 ? "+" : "-";
    return `${sign}${formatDuration(Math.abs(bankMs))}`;
  }, [dailyHours, now, isClient]);

  const lastEvent = useMemo(() => {
    if (timeEntries.length === 0) return { label: 'Nenhum registro hoje', time: null };

    const lastEntry = timeEntries[timeEntries.length - 1];

    if (!lastEntry.endTime) { // Active entry
        if (timeEntries.length === 1) return { label: 'Entrada às', time: lastEntry.startTime };
        return { label: 'Retorno às', time: lastEntry.startTime };
    } else { // Completed entry
        if (timeEntries.length === 1) return { label: 'Pausa às', time: lastEntry.endTime };
        return { label: 'Saída às', time: lastEntry.endTime };
    }
  }, [timeEntries]);
  
  const historyEvents = useMemo(() => {
    const events: { label: string; time: string }[] = [];
    const todayEntriesSorted = [...timeEntries].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    todayEntriesSorted.forEach((entry, index) => {
        if (index === 0) {
            events.push({ label: 'Entrada', time: entry.startTime });
            if (entry.endTime) events.push({ label: 'Pausa', time: entry.endTime });
        } else if (index === 1) {
            events.push({ label: 'Retorno', time: entry.startTime });
            if (entry.endTime) events.push({ label: 'Saída', time: entry.endTime });
        }
    });

    return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [timeEntries]);
  
  const buttonConfig = useMemo(() => {
    switch (workdayStatus) {
      case 'NOT_STARTED': return { text: ['Registrar', 'Entrada'], icon: LogIn, disabled: false };
      case 'WORKING_MORNING': return { text: ['Registrar', 'Pausa'], icon: Coffee, disabled: false };
      case 'ON_BREAK': return { text: ['Registrar', 'Retorno'], icon: Play, disabled: false };
      case 'WORKING_AFTERNOON': return { text: ['Registrar', 'Saída'], icon: LogOut, disabled: false };
      case 'DAY_ENDED': return { text: ['Expediente', 'Encerrado'], icon: CheckCircle2, disabled: true };
    }
  }, [workdayStatus]);

  const statusLabel = useMemo(() => {
    switch (workdayStatus) {
      case 'NOT_STARTED': return 'Fora do expediente';
      case 'WORKING_MORNING': return `Em expediente desde ${formatTime(currentEntry?.startTime || now)}`;
      case 'ON_BREAK': return 'Em pausa';
      case 'WORKING_AFTERNOON': return `Em expediente desde ${formatTime(currentEntry?.startTime || now)}`;
      case 'DAY_ENDED': return 'Expediente encerrado';
    }
  }, [workdayStatus, currentEntry, now]);

  if (!isClient) {
    return <div className="dark bg-background flex min-h-screen items-center justify-center" />;
  }

  return (
    <main className="bg-background text-foreground flex flex-col items-center justify-center min-h-screen p-4 space-y-6 md:space-y-8 font-body text-center">
      <div className="absolute top-6 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white">Registro Fácil</h1>
        <p className="text-muted-foreground capitalize">
          {format(now, "dd/MM/yyyy - eeee", { locale: ptBR })}
        </p>
      </div>

      <div className="flex items-center gap-2 text-lg text-muted-foreground">
        <Clock size={18} />
        <span>{statusLabel}</span>
      </div>

      <div className="w-full max-w-xs md:max-w-sm">
        <div className="flex justify-between items-center mb-1 text-sm">
          <span className="flex items-center gap-2 font-semibold">
            <TrendingUp size={18} className="text-primary" /> Progresso do dia
          </span>
          <span className="text-muted-foreground">
            {formatDuration(dailyHours)} / {WORK_HOURS_PER_DAY}h
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-center text-sm mt-1 text-muted-foreground">
          {progress.toFixed(0)}% concluído
        </p>
      </div>

      <Button
        onClick={handleClockAction}
        disabled={buttonConfig.disabled}
        className="w-40 h-40 md:w-48 md:h-48 rounded-full flex flex-col items-center justify-center text-xl md:text-2xl font-bold shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105 disabled:bg-muted disabled:scale-100 disabled:cursor-not-allowed"
      >
        <buttonConfig.icon className="mb-2" size={32} />
        <span>{buttonConfig.text[0]}</span>
        <span className="text-base font-normal">{buttonConfig.text[1]}</span>
      </Button>

      {(workdayStatus === 'WORKING_MORNING' || workdayStatus === 'WORKING_AFTERNOON') && (
        <div className="text-4xl font-mono tracking-widest">
            {formatDuration(elapsedTime)}
        </div>
      )}

      <div className="flex justify-between items-center w-full max-w-xs md:max-w-sm p-4 bg-muted/50 rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">Último registro</p>
          <p className="text-lg font-semibold text-white">
            {lastEvent.time ? `${lastEvent.label} ${formatTime(lastEvent.time)}` : lastEvent.label}
          </p>
        </div>
        <Clock size={24} className="text-muted-foreground" />
      </div>

      <div className="flex justify-between items-center w-full max-w-xs md:max-w-sm p-4 bg-muted/50 rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">Banco de horas (semana)</p>
          <p className="text-lg font-semibold text-accent">
            {timeBank}
          </p>
        </div>
        <TrendingUp size={24} className="text-accent" />
      </div>

      <div className="flex gap-4 pt-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="bg-muted/50 border-muted-foreground/20 hover:bg-muted">
              <BarChart className="mr-2 h-4 w-4" /> Histórico
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Histórico do Dia</AlertDialogTitle>
              <AlertDialogDescription>
                Seus registros de ponto para hoje, {format(now, "dd/MM/yyyy")}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <ScrollArea className="h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead className="text-right">Horário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyEvents.length > 0 ? historyEvents.map(event => (
                    <TableRow key={event.label}>
                      <TableCell>{event.label}</TableCell>
                      <TableCell className="text-right">{format(new Date(event.time), 'HH:mm:ss')}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                       <TableCell colSpan={2} className="text-center">Nenhum registro hoje.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
            <AlertDialogFooter>
              <AlertDialogCancel>Fechar</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button variant="outline" className="bg-muted/50 border-muted-foreground/20 hover:bg-muted" asChild>
          <Link href="/settings">
            <Settings className="mr-2 h-4 w-4" /> Configurações
          </Link>
        </Button>
      </div>
    </main>
  );
}
