
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  format,
  differenceInMilliseconds,
  isSameDay,
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
  Play,
  Trash2,
  Pencil,
  Coffee,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeEntry, getTimeEntries, addTimeEntry, updateTimeEntry, deleteTimeEntry } from "@/services/time-entry.service";
import { Workdays, AppSettings, getSettings } from "@/services/settings.service";


type WorkdayStatus = 'NOT_STARTED' | 'WORKING_BEFORE_BREAK' | 'ON_BREAK' | 'WORKING_AFTER_BREAK' | 'FINISHED';

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
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [editingEvent, setEditingEvent] = useState<{ id: string } | null>(null);
  const [workHoursPerDay, setWorkHoursPerDay] = useState(8);
  const [workdays, setWorkdays] = useState<Workdays>(defaultWorkdays);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showEarlyLeaveWarning, setShowEarlyLeaveWarning] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.replace('/login');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [entries, settingsData] = await Promise.all([
          getTimeEntries(user.uid),
          getSettings(user.uid),
        ]);
        
        setTimeEntries(entries);
        setSettings(settingsData);
        
        if (settingsData) {
          const savedWorkdays = settingsData.workdays || defaultWorkdays;
          setWorkdays(savedWorkdays);
          const numberOfWorkDays = Object.values(savedWorkdays).filter(Boolean).length;
          if (numberOfWorkDays > 0) {
            setWorkHoursPerDay((settingsData.weeklyHours || 40) / numberOfWorkDays);
          } else {
            setWorkHoursPerDay(0);
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({
          title: "Erro de conexão",
          description: "Não foi possível carregar os dados. Verifique a sua conexão e as configurações do Firebase.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user, toast]);
  
  useEffect(() => {
    if (isLoading) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isLoading]);
  
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

  const handleClockAction = useCallback(async () => {
    if (!user || workdayStatus === 'FINISHED') return;
    const actionTime = new Date().toISOString();
    
    const todayEntries = timeEntries
      .filter(entry => isSameDay(new Date(entry.startTime), new Date()))
      .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    const activeEntry = todayEntries.find(entry => !entry.endTime);

    try {
      if (workdayStatus === 'NOT_STARTED') {
        const newEntryData = { startTime: actionTime };
        const savedEntry = await addTimeEntry(user.uid, newEntryData);
        setTimeEntries(prev => [...prev, savedEntry]);

      } else if (workdayStatus === 'WORKING_BEFORE_BREAK' && activeEntry) {
        const updatedEntry = { ...activeEntry, endTime: actionTime };
        await updateTimeEntry(user.uid, updatedEntry);
        setTimeEntries(prev => prev.map(e => (e.id === activeEntry.id ? updatedEntry : e)));

      } else if (workdayStatus === 'ON_BREAK') {
        const newEntryData = { startTime: actionTime };
        const savedEntry = await addTimeEntry(user.uid, newEntryData);
        setTimeEntries(prev => [...prev, savedEntry]);

      } else if (workdayStatus === 'WORKING_AFTER_BREAK' && activeEntry) {
        const updatedEntry = { ...activeEntry, endTime: actionTime };
        await updateTimeEntry(user.uid, updatedEntry);
        setTimeEntries(prev => prev.map(e => (e.id === activeEntry.id ? updatedEntry : e)));
      }
    } catch(error) {
      console.error("Failed to save time entry:", error);
      toast({
        title: "Erro ao Salvar",
        description: "Não foi possível registrar o ponto. Tente novamente.",
        variant: "destructive",
      });
    }
  }, [timeEntries, toast, user, workdayStatus]);

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

    const pastDays = allDaysToConsider.filter(day => isBefore(day, today));
    pastDays.forEach(day => {
        if (isConfiguredWorkday(day)) {
            totalTargetMs += workHoursPerDay * 60 * 60 * 1000;
        }

        const entriesOnDay = timeEntries.filter(e => isSameDay(new Date(e.startTime), day) && e.endTime);
        const dailyTotal = entriesOnDay.reduce((total, entry) => {
            return total + differenceInMilliseconds(new Date(entry.endTime!), new Date(entry.startTime));
        }, 0);
        totalWorkedMs += dailyTotal;
    });

    totalWorkedMs += dailyHours; 

    if (isConfiguredWorkday(today)) {
      totalTargetMs += workHoursPerDay * 60 * 60 * 1000;
    }

    const bankMs = totalWorkedMs - totalTargetMs;
    const finalBankMs = bankMs + (settings?.timeBankAdjustment || 0);
    const sign = finalBankMs >= 0 ? "+" : "-";
    return `${sign}${formatDuration(Math.abs(finalBankMs))}`;
  }, [dailyHours, timeEntries, workHoursPerDay, workdays, settings]);

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
  
  const generalHistory = useMemo(() => {
    const entriesByDay = timeEntries.reduce((acc, entry) => {
      const entryDate = new Date(entry.startTime);
      const dayKey = format(startOfDay(entryDate), 'yyyy-MM-dd');
      if (!acc[dayKey]) {
        acc[dayKey] = [];
      }
      acc[dayKey].push(entry);
      return acc;
    }, {} as Record<string, TimeEntry[]>);

    return Object.entries(entriesByDay).map(([day, entries]) => {
      const sortedEntries = [...entries]
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .slice(0, 2); 
      
      const dayEvents = sortedEntries.flatMap((entry, entryIndex) => {
          const events = [];
          
          if (entryIndex === 0) {
              events.push({
                  id: `${entry.id}-start`,
                  time: entry.startTime,
                  entryId: entry.id,
                  fieldToEdit: 'startTime' as const,
                  label: `Entrada`
              });
              if (entry.endTime) {
                  events.push({
                      id: `${entry.id}-end`,
                      time: entry.endTime,
                      entryId: entry.id,
                      fieldToEdit: 'endTime' as const,
                      label: `Saída p/ Intervalo`
                  });
              }
          } else if (entryIndex === 1) {
              events.push({
                  id: `${entry.id}-start`,
                  time: entry.startTime,
                  entryId: entry.id,
                  fieldToEdit: 'startTime' as const,
                  label: `Retorno do Intervalo`
              });
              if (entry.endTime) {
                  events.push({
                      id: `${entry.id}-end`,
                      time: entry.endTime,
                      entryId: entry.id,
                      fieldToEdit: 'endTime' as const,
                      label: `Saída`
                  });
              }
          }
          return events;
      }).sort((a,b) => new Date(a.time).getTime() - new Date(b.time).getTime());

      return {
        day,
        events: dayEvents,
      };
    }).sort((a, b) => parse(b.day, 'yyyy-MM-dd', new Date()).getTime() - parse(a.day, 'yyyy-MM-dd', new Date()).getTime());
  }, [timeEntries]);

  const handleUpdateTime = async (entryId: string, field: 'startTime' | 'endTime', newTimeValue: string) => {
    if (!user) return;
    const entryToUpdate = timeEntries.find(e => e.id === entryId);
    if (!entryToUpdate) return;

    try {
      const originalDateString = entryToUpdate[field] || entryToUpdate.startTime;
      const originalDate = new Date(originalDateString);

      const [hours, minutes] = newTimeValue.split(':').map(Number);
      
      const updatedDate = new Date(
        originalDate.getFullYear(),
        originalDate.getMonth(),
        originalDate.getDate(),
        hours,
        minutes,
        originalDate.getSeconds(),
        originalDate.getMilliseconds()
      );

      const updatedEntry = { ...entryToUpdate, [field]: updatedDate.toISOString() };

      await updateTimeEntry(user.uid, updatedEntry);

      setTimeEntries(prevEntries => prevEntries.map(e => (e.id === entryId ? updatedEntry : e)));
    } catch (error) {
      console.error("Failed to update time entry:", error);
      toast({
        title: "Erro ao Atualizar",
        description: "Não foi possível salvar a alteração. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setEditingEvent(null);
    }
  };
  
  const handleDeleteEntry = async (entryId: string) => {
    if (!user) return;
    try {
      const entryToDelete = timeEntries.find(e => e.id === entryId);
      if (!entryToDelete) return;

      const dayOfEntry = startOfDay(new Date(entryToDelete.startTime));
      
      const entriesForDay = timeEntries.filter(e => isSameDay(new Date(e.startTime), dayOfEntry));

      await Promise.all(entriesForDay.map(e => deleteTimeEntry(user.uid, e.id)));

      setTimeEntries(prevEntries => prevEntries.filter(e => !isSameDay(new Date(e.startTime), dayOfEntry)));

      toast({
        title: "Registros Excluídos",
        description: "Todos os registros de ponto do dia foram removidos com sucesso.",
      });
    } catch(error) {
      console.error("Failed to delete time entries:", error);
      toast({
        title: "Erro ao Excluir",
        description: "Não foi possível remover os registros do dia. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleMainButtonClick = () => {
    if (workdayStatus === 'WORKING_AFTER_BREAK') {
      const totalMilliseconds = workHoursPerDay * 60 * 60 * 1000;
      if (totalMilliseconds > 0 && dailyHours < totalMilliseconds) {
        setShowEarlyLeaveWarning(true);
        return;
      }
    }
    handleClockAction();
  };
  
  const buttonConfig = useMemo(() => {
    switch (workdayStatus) {
      case 'NOT_STARTED':
        return { text: ['Registrar', 'Entrada'], icon: LogIn, disabled: false };
      case 'WORKING_BEFORE_BREAK':
        return { text: ['Sair para', 'Intervalo'], icon: Coffee, disabled: false };
      case 'ON_BREAK':
        return { text: ['Retornar do', 'Intervalo'], icon: Play, disabled: false };
      case 'WORKING_AFTER_BREAK':
        return { text: ['Registrar', 'Saída'], icon: LogOut, disabled: false };
      case 'FINISHED':
      default:
        return { text: ['Expediente', 'Encerrado'], icon: CheckCircle, disabled: true };
    }
  }, [workdayStatus]);

  const statusLabel = useMemo(() => {
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
  }, [workdayStatus, currentEntry, timeEntries, now]);
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Failed to sign out:", error);
      toast({
        title: "Erro",
        description: "Não foi possível sair. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (authLoading || isLoading) {
    return <div className="dark bg-background flex min-h-screen items-center justify-center"><Clock className="animate-spin h-10 w-10 text-primary" /></div>;
  }

  return (
    <main className="bg-background text-foreground flex flex-col items-center min-h-screen p-4 font-sans">
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center flex-grow space-y-6 text-center">
        <div className="text-center animate-in fade-in-0 slide-in-from-top-4 duration-500">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Registro Fácil</h1>
          <p className="text-muted-foreground capitalize mt-1">
            {format(now, "eeee, dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>

        <div className="flex items-center gap-2 text-lg text-muted-foreground animate-in fade-in-0 slide-in-from-top-4 duration-500 delay-100">
          <Clock size={18} />
          <span>{statusLabel}</span>
        </div>

        <div className="w-full animate-in fade-in-0 slide-in-from-top-4 duration-500 delay-200">
          <div className="flex justify-between items-center mb-1 text-sm">
            <span className="flex items-center gap-2 font-semibold">
              <TrendingUp size={18} className="text-primary" /> Progresso do dia
            </span>
            <span className="text-muted-foreground font-mono">
              {formatDuration(dailyHours)} / {workHoursPerDay > 0 ? `${formatDuration(workHoursPerDay * 3600000)}` : 'N/A'}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-center text-sm mt-1 text-muted-foreground">
            {progress.toFixed(0)}% concluído
          </p>
        </div>

        <Button
          onClick={handleMainButtonClick}
          disabled={buttonConfig.disabled}
          className="w-48 h-48 md:w-56 md:h-56 rounded-full flex flex-col items-center justify-center text-xl md:text-2xl font-bold shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105 disabled:bg-muted disabled:scale-100 disabled:cursor-not-allowed animate-in fade-in-0 zoom-in-95 duration-500 delay-300"
        >
          <buttonConfig.icon className="mb-2" size={40} />
          <span>{buttonConfig.text[0]}</span>
          <span className="text-base font-normal">{buttonConfig.text[1]}</span>
        </Button>

        <div className="flex h-28 flex-col items-center justify-center">
          {(workdayStatus === 'WORKING_BEFORE_BREAK' || workdayStatus === 'WORKING_AFTER_BREAK') && (
            <div className="animate-in fade-in-0 delay-300 duration-500 text-5xl font-mono tracking-widest">
              {formatDuration(elapsedTime)}
            </div>
          )}
          <div
            className={`animate-in fade-in-0 delay-300 duration-500 font-mono tracking-widest text-muted-foreground ${
              workdayStatus === 'WORKING_BEFORE_BREAK' || workdayStatus === 'WORKING_AFTER_BREAK'
                ? 'text-lg mt-1'
                : 'text-5xl'
            }`}
          >
            {format(now, 'HH:mm:ss')}
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-400">
          <Card className="w-full bg-card">
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Último registro</p>
                <p className="text-lg font-semibold">
                  {lastEvent.time ? `${lastEvent.label} ${formatTime(lastEvent.time)}` : lastEvent.label}
                </p>
              </div>
              <Clock size={24} className="text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="w-full bg-card">
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Banco de horas</p>
                <p className={`text-lg font-semibold ${timeBank.startsWith('+') ? 'text-primary' : 'text-destructive'}`}>
                  {timeBank}
                </p>
              </div>
              <TrendingUp size={24} className={`${timeBank.startsWith('+') ? 'text-primary' : 'text-destructive'}`} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap justify-center gap-4 pt-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-500">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <BarChart className="mr-2 h-4 w-4" /> Histórico
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Histórico de Pontos</AlertDialogTitle>
                <AlertDialogDescription>
                  Revise e edite seus registros. As alterações são salvas automaticamente ao sair do campo de edição.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <ScrollArea className="h-[60vh] pr-4 -mr-2">
                  {generalHistory.length > 0 ? (
                      <div className="space-y-4">
                        {generalHistory.map(({ day, events }) => {
                            const dayDate = parse(day, 'yyyy-MM-dd', new Date());
                            const totalDayMillis = events.reduce((acc, event, index, arr) => {
                                const eventTime = new Date(event.time).getTime();
                                if (event.label === 'Saída p/ Intervalo' || event.label === 'Saída') {
                                  const correspondingStartEvent = arr.find(e => e.entryId === event.entryId && (e.label === 'Entrada' || e.label === 'Retorno do Intervalo'));
                                  if (correspondingStartEvent) {
                                    acc += eventTime - new Date(correspondingStartEvent.time).getTime();
                                  }
                                }
                                return acc;
                            }, 0);

                            return (
                                <Card key={day} className="bg-muted/30">
                                    <CardHeader className="flex flex-row items-center justify-between p-4">
                                        <div>
                                            <CardTitle className="text-base font-bold">
                                                {format(dayDate, "PPP", { locale: ptBR })}
                                            </CardTitle>
                                            <CardDescription>
                                                {format(dayDate, "eeee", { locale: ptBR })}
                                            </CardDescription>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-primary">{formatDuration(totalDayMillis)}</p>
                                            <p className="text-xs text-muted-foreground">Total trabalhado</p>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <div className="space-y-1">
                                            {events.map((event) => (
                                                <div key={event.id} className="flex items-center justify-between rounded-md p-2 hover:bg-background/50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary">
                                                          <Clock size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-sm">{event.label}</p>
                                                            <div className="font-mono text-sm text-muted-foreground">
                                                                {editingEvent?.id === event.id ? (
                                                                    <Input
                                                                        type="time"
                                                                        defaultValue={format(new Date(event.time), "HH:mm")}
                                                                        onBlur={(e) => handleUpdateTime(event.entryId, event.fieldToEdit, e.target.value)}
                                                                        autoFocus
                                                                        className="w-24 h-8 bg-input"
                                                                    />
                                                                ) : (
                                                                    <span>{format(new Date(event.time), 'HH:mm:ss')}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setEditingEvent({ id: event.id })}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Esta ação não pode ser desfeita. Isso excluirá permanentemente todos os registros de ponto para este dia.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        className={buttonVariants({ variant: "destructive" })}
                                                                        onClick={() => handleDeleteEntry(event.entryId)}>
                                                                        Excluir
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                  ) : (
                      <p className="text-center text-muted-foreground py-10">Nenhum registro encontrado.</p>
                  )}
              </ScrollArea>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setEditingEvent(null)}>Fechar</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <Button variant="outline" asChild>
            <Link href="/reports">
              <TrendingUp className="mr-2 h-4 w-4" /> Relatórios
            </Link>
          </Button>

          <Button variant="outline" asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" /> Configurações
            </Link>
          </Button>
          <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </div>
      <AlertDialog open={showEarlyLeaveWarning} onOpenChange={setShowEarlyLeaveWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar expediente mais cedo?</AlertDialogTitle>
            <AlertDialogDescription>
              Você ainda não completou sua jornada de trabalho hoje. A diferença será registrada no seu banco de horas. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClockAction}>
              Sim, encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
