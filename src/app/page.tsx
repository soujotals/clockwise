"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  format,
  differenceInMilliseconds,
  isSameDay,
  startOfWeek,
  eachDayOfInterval,
  isBefore,
  startOfToday,
  startOfDay,
  parse,
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";


type TimeEntry = {
  id: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string
};

type WorkdayStatus = 'NOT_STARTED' | 'WORKING_MORNING' | 'ON_BREAK' | 'WORKING_AFTERNOON' | 'DAY_ENDED';

type Workdays = {
  sun: boolean;
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
  sat: boolean;
};

const defaultWorkdays: Workdays = {
  sun: false,
  mon: true,
  tue: true,
  wed: true,
  thu: true,
  fri: true,
  sat: false,
};

const dayMap: (keyof Workdays)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

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
  const [editingEvent, setEditingEvent] = useState<{ id: string } | null>(null);
  const [workHoursPerDay, setWorkHoursPerDay] = useState(8);
  const [workdays, setWorkdays] = useState<Workdays>(defaultWorkdays);

  useEffect(() => {
    setIsClient(true);
    
    const storedSettings = localStorage.getItem('appSettings');
    if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        const savedWorkdays = settings.workdays || defaultWorkdays;
        setWorkdays(savedWorkdays);
        const numberOfWorkDays = Object.values(savedWorkdays).filter(Boolean).length;
        if (numberOfWorkDays > 0) {
            setWorkHoursPerDay((settings.weeklyHours || 40) / numberOfWorkDays);
        } else {
            setWorkHoursPerDay(0);
        }
    }

    const storedEntries = localStorage.getItem("timeEntries");
    if (storedEntries) {
      const parsedEntries: TimeEntry[] = JSON.parse(storedEntries);
      setTimeEntries(parsedEntries);
      
      const today = new Date();
      const todayEntries = parsedEntries.filter(e => isSameDay(new Date(e.startTime), today));
      const todayActiveEntry = todayEntries.find(e => !e.endTime);
      const todayCompletedEntries = todayEntries.filter(e => e.endTime);

      if (todayActiveEntry) {
          setCurrentEntry(todayActiveEntry);
          if (todayCompletedEntries.length === 0) {
              setWorkdayStatus('WORKING_MORNING');
          } else {
              setWorkdayStatus('WORKING_AFTERNOON');
          }
      } else {
          setCurrentEntry(null);
          if (todayCompletedEntries.length === 0) {
              setWorkdayStatus('NOT_STARTED');
          } else if (todayCompletedEntries.length === 1) {
              setWorkdayStatus('ON_BREAK');
          } else {
              setWorkdayStatus('DAY_ENDED');
          }
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
      case 'DAY_ENDED': { // Action: Retorno (Loop)
        const newEntry: TimeEntry = { id: crypto.randomUUID(), startTime: actionTime };
        setTimeEntries(prev => [...prev, newEntry]);
        setCurrentEntry(newEntry);
        setWorkdayStatus('WORKING_AFTERNOON');
        break;
      }
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
    const totalMilliseconds = workHoursPerDay * 60 * 60 * 1000;
    if (totalMilliseconds === 0) return 0;
    return Math.min(100, (dailyHours / totalMilliseconds) * 100);
  }, [dailyHours, workHoursPerDay]);

  const timeBank = useMemo(() => {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const today = startOfToday();
    const daysInWeekSoFar = eachDayOfInterval({ start: weekStart, end: today });
  
    const storedEntries: TimeEntry[] = timeEntries;
  
    let workedMs = 0;
    let targetMs = 0;

    const isConfiguredWorkday = (date: Date): boolean => {
      const dayIndex = date.getDay();
      const dayKey = dayMap[dayIndex];
      return workdays[dayKey];
    };
  
    daysInWeekSoFar.forEach(day => {
      if (isConfiguredWorkday(day) && isBefore(day, today)) {
        targetMs += workHoursPerDay * 60 * 60 * 1000;
        const entriesOnDay = storedEntries.filter(e => isSameDay(new Date(e.startTime), day) && e.endTime);
        const dailyTotal = entriesOnDay.reduce((total, entry) => {
          return total + differenceInMilliseconds(new Date(entry.endTime!), new Date(entry.startTime));
        }, 0);
        workedMs += dailyTotal;
      }
    });
  
    const totalWorkedMs = workedMs + dailyHours;
  
    const bankMs = totalWorkedMs - targetMs;
    const sign = bankMs >= 0 ? "+" : "-";
    return `${sign}${formatDuration(Math.abs(bankMs))}`;
  }, [dailyHours, now, timeEntries, workHoursPerDay, workdays]);

  const lastEvent = useMemo(() => {
    const todayEntries = timeEntries.filter(e => isSameDay(new Date(e.startTime), now));
    if (todayEntries.length === 0) return { label: 'Nenhum registro hoje', time: null };

    const allEvents = todayEntries.flatMap(e => {
        const events = [{ time: e.startTime, isStart: true }];
        if (e.endTime) {
            events.push({ time: e.endTime, isStart: false });
        }
        return events;
    }).sort((a,b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const last = allEvents[0];
    if (!last) return { label: 'Nenhum registro hoje', time: null };

    const completedEntriesCount = todayEntries.filter(e => e.endTime).length;
    
    if (last.isStart) {
      return { label: completedEntriesCount === 0 ? 'Entrada às' : 'Retorno às', time: last.time };
    } else {
      return { label: completedEntriesCount === 1 ? 'Pausa às' : 'Saída às', time: last.time };
    }
  }, [timeEntries, now]);
  
  const generalHistory = useMemo(() => {
    const entriesByDay = timeEntries.reduce((acc, entry) => {
      const dayKey = format(startOfDay(new Date(entry.startTime)), 'yyyy-MM-dd');
      if (!acc[dayKey]) {
        acc[dayKey] = [];
      }
      acc[dayKey].push(entry);
      return acc;
    }, {} as Record<string, TimeEntry[]>);

    const historyWithEvents = Object.entries(entriesByDay).map(([day, entries]) => {
      const sortedEntries = [...entries].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
      const dayEvents = sortedEntries.flatMap((entry, index) => {
        const events = [];
        events.push({
          id: `${entry.id}-start`,
          label: index === 0 ? 'Entrada' : 'Retorno',
          time: entry.startTime,
          entryId: entry.id,
          fieldToEdit: 'startTime' as const
        });

        if (entry.endTime) {
          events.push({
            id: `${entry.id}-end`,
            label: index === 0 ? 'Pausa' : 'Saída',
            time: entry.endTime,
            entryId: entry.id,
            fieldToEdit: 'endTime' as const
          });
        }
        return events;
      });

      dayEvents.sort((a,b) => new Date(a.time).getTime() - new Date(b.time).getTime());

      return {
        day,
        events: dayEvents,
      };
    });

    return historyWithEvents.sort((a, b) => parse(b.day, 'yyyy-MM-dd', new Date()).getTime() - parse(a.day, 'yyyy-MM-dd', new Date()).getTime());
  }, [timeEntries]);

  const handleUpdateTime = (entryId: string, field: 'startTime' | 'endTime', newTimeValue: string) => {
    setTimeEntries(prevEntries => {
      const newEntries = prevEntries.map(entry => {
        if (entry.id === entryId) {
          const originalDate = new Date(entry[field] || entry.startTime);
          const [hours, minutes] = newTimeValue.split(':').map(Number);
          
          const updatedDate = new Date(
            originalDate.getFullYear(),
            originalDate.getMonth(),
            originalDate.getDate(),
            hours,
            minutes,
            0, // seconds
            0 // milliseconds
          );

          return { ...entry, [field]: updatedDate.toISOString() };
        }
        return entry;
      });
      return newEntries;
    });
    setEditingEvent(null);
  };
  
  const buttonConfig = useMemo(() => {
    switch (workdayStatus) {
      case 'NOT_STARTED': return { text: ['Registrar', 'Entrada'], icon: LogIn, disabled: false };
      case 'WORKING_MORNING': return { text: ['Registrar', 'Pausa'], icon: Coffee, disabled: false };
      case 'ON_BREAK': return { text: ['Registrar', 'Retorno'], icon: Play, disabled: false };
      case 'WORKING_AFTERNOON': return { text: ['Registrar', 'Saída'], icon: LogOut, disabled: false };
      case 'DAY_ENDED': return { text: ['Registrar', 'Retorno'], icon: Play, disabled: false };
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
    <main className="bg-background text-foreground flex flex-col items-center justify-center min-h-screen p-4 space-y-4 md:space-y-6 font-body text-center">
      <div className="text-center">
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
            {formatDuration(dailyHours)} / {workHoursPerDay > 0 ? `${formatDuration(workHoursPerDay * 3600000)}` : '0h'}
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
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Histórico Geral</AlertDialogTitle>
              <AlertDialogDescription>
                Seus registros de ponto. Clique em um horário para editar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <ScrollArea className="h-96 pr-6">
                {generalHistory.length > 0 ? (
                    <Accordion type="multiple" className="w-full">
                        {generalHistory.map(({ day, events }) => (
                            <AccordionItem value={day} key={day}>
                                <AccordionTrigger>
                                    {format(parse(day, 'yyyy-MM-dd', new Date()), "PPP", { locale: ptBR })} - {format(parse(day, 'yyyy-MM-dd', new Date()), "eeee", { locale: ptBR })}
                                </AccordionTrigger>
                                <AccordionContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Evento</TableHead>
                                                <TableHead className="text-right">Horário</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {events.map(event => (
                                                <TableRow key={event.id}>
                                                    <TableCell>{event.label}</TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {editingEvent?.id === event.id ? (
                                                            <Input
                                                                type="time"
                                                                defaultValue={format(new Date(event.time), "HH:mm")}
                                                                onBlur={(e) => handleUpdateTime(event.entryId, event.fieldToEdit, e.target.value)}
                                                                autoFocus
                                                                className="w-24 float-right"
                                                            />
                                                        ) : (
                                                            <button className="p-1 rounded hover:bg-muted" onClick={() => setEditingEvent({ id: event.id })}>
                                                                {format(new Date(event.time), 'HH:mm:ss')}
                                                            </button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <p className="text-center text-muted-foreground py-10">Nenhum registro encontrado.</p>
                )}
            </ScrollArea>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEditingEvent(null)}>Fechar</AlertDialogCancel>
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
