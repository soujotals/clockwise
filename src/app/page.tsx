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
  isAfter,
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

const formatTime = (date: Date) => {
  return format(date, "HH:mm");
};

export default function RegistroFacilPage() {
  const [isClient, setIsClient] = useState(false);
  const [now, setNow] = useState(new Date());
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);

  useEffect(() => {
    setIsClient(true);
    const storedEntries = localStorage.getItem("timeEntries");
    if (storedEntries) {
      const parsedEntries: TimeEntry[] = JSON.parse(storedEntries);
      setTimeEntries(parsedEntries);
      const activeEntry = parsedEntries.find((entry) => !entry.endTime);
      if (activeEntry) {
        setCurrentEntry(activeEntry);
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

  const elapsedTime = useMemo(() => {
    if (currentEntry) {
      return differenceInMilliseconds(now, new Date(currentEntry.startTime));
    }
    return 0;
  }, [now, currentEntry]);

  const handleToggleClock = useCallback(() => {
    if (currentEntry) {
      // Clock Out
      const updatedEntry = { ...currentEntry, endTime: new Date().toISOString() };
      setTimeEntries((prev) =>
        prev.map((e) => (e.id === currentEntry.id ? updatedEntry : e))
      );
      setCurrentEntry(null);
    } else {
      // Clock In
      const newEntry: TimeEntry = {
        id: crypto.randomUUID(),
        startTime: new Date().toISOString(),
      };
      setCurrentEntry(newEntry);
      setTimeEntries((prev) => [...prev, newEntry]);
    }
  }, [currentEntry]);

  const completedEntries = useMemo(
    () => timeEntries.filter((e) => e.endTime),
    [timeEntries]
  );
  
  const dailyHours = useMemo(() => {
    const todayEntries = completedEntries.filter((e) =>
      isSameDay(new Date(e.startTime), now)
    );
    let total = todayEntries.reduce((total, entry) => {
      if (!entry.endTime) return total;
      return total + differenceInMilliseconds(new Date(entry.endTime), new Date(entry.startTime));
    }, 0);
    if (currentEntry && isSameDay(new Date(currentEntry.startTime), now)) {
        total += elapsedTime;
    }
    return total;
  }, [completedEntries, now, currentEntry, elapsedTime]);

  const progress = useMemo(() => {
    const totalMilliseconds = WORK_HOURS_PER_DAY * 60 * 60 * 1000;
    if (totalMilliseconds === 0) return 0;
    return Math.min(100, (dailyHours / totalMilliseconds) * 100);
  }, [dailyHours]);

  const lastEntryToday = useMemo(() => {
    const todayCompletedEntries = completedEntries
      .filter((e) => isSameDay(new Date(e.startTime), now) && e.endTime)
      .sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    return todayCompletedEntries[0];
  }, [completedEntries, now]);

  const timeBank = useMemo(() => {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const today = startOfToday();
    
    // Consider only days from the start of the week up to yesterday
    const daysInWeekSoFar = eachDayOfInterval({ start: weekStart, end: today });

    let workedMs = 0;
    let targetMs = 0;

    daysInWeekSoFar.forEach(day => {
        if (!isWeekend(day)) {
            // Only add target hours for past workdays
             if (isBefore(day, today)) {
                targetMs += WORK_HOURS_PER_DAY * 60 * 60 * 1000;
             }

            const entriesOnDay = completedEntries.filter(e => isSameDay(new Date(e.startTime), day));
            const dailyTotal = entriesOnDay.reduce((total, entry) => {
                 if (!entry.endTime) return total;
                 return total + differenceInMilliseconds(new Date(entry.endTime), new Date(entry.startTime));
            }, 0);
            workedMs += dailyTotal;
        }
    });

    // Add today's progress to the total worked time
    const currentDayWorkedMs = dailyHours;

    const bankMs = (workedMs + currentDayWorkedMs) - targetMs;
    
    const sign = bankMs >= 0 ? "+" : "-";
    return `${sign}${formatDuration(Math.abs(bankMs))}`;
  }, [completedEntries, dailyHours, now]);
  
  const todayEntriesForHistory = useMemo(() => {
    return timeEntries
      .filter(e => isSameDay(new Date(e.startTime), now))
      .sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [timeEntries, now]);


  if (!isClient) {
    return (
      <div className="dark bg-background flex min-h-screen items-center justify-center" />
    );
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
        <span>{currentEntry ? `Em expediente desde ${formatTime(new Date(currentEntry.startTime))}` : "Fora do expediente"}</span>
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
        onClick={handleToggleClock}
        className="w-40 h-40 md:w-48 md:h-48 rounded-full flex flex-col items-center justify-center text-xl md:text-2xl font-bold shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105"
      >
        {currentEntry ? (
          <>
            <LogOut className="mb-2" size={32} />
            <span>Registrar</span>
            <span className="text-base font-normal">Saída</span>
          </>
        ) : (
          <>
            <LogIn className="mb-2" size={32} />
            <span>Registrar</span>
            <span className="text-base font-normal">Entrada</span>
          </>
        )}
      </Button>
       {currentEntry && (
        <div className="text-4xl font-mono tracking-widest">
            {formatDuration(elapsedTime)}
        </div>
       )}

      <div className="flex justify-between items-center w-full max-w-xs md:max-w-sm p-4 bg-muted/50 rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">Último registro</p>
          <p className="text-lg font-semibold text-white">
            {lastEntryToday && lastEntryToday.endTime ? `Saída às ${formatTime(new Date(lastEntryToday.endTime!))}` : "Nenhum registro hoje"}
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
                    <TableHead>Entrada</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead className="text-right">Duração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayEntriesForHistory.length > 0 ? todayEntriesForHistory.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.startTime), 'HH:mm:ss')}</TableCell>
                      <TableCell>{entry.endTime ? format(new Date(entry.endTime), 'HH:mm:ss') : 'Em andamento'}</TableCell>
                      <TableCell className="text-right">{entry.endTime ? formatDuration(differenceInMilliseconds(new Date(entry.endTime), new Date(entry.startTime))) : '-'}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                       <TableCell colSpan={3} className="text-center">Nenhum registro hoje.</TableCell>
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
