'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  format,
  differenceInMilliseconds,
  isSameDay,
  startOfWeek,
  eachDayOfInterval,
  isBefore,
  startOfToday,
} from 'date-fns';

type TimeEntry = {
  id: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string
};

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
    if (milliseconds === 0) return "00h00m";
    const sign = milliseconds < 0 ? "-" : "+";
    const absMillis = Math.abs(milliseconds);
    const hours = Math.floor(absMillis / 3600000);
    const minutes = Math.floor((absMillis % 3600000) / 60000);
    return `${sign}${String(hours).padStart(2, "0")}h${String(minutes).padStart(
    2,
    "0"
    )}m`;
};


export default function ReportsPage() {
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [workHoursPerDay, setWorkHoursPerDay] = useState(8);
    const [workdays, setWorkdays] = useState<Workdays>(defaultWorkdays);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const storedEntries = localStorage.getItem('timeEntries');
        if (storedEntries) {
            setTimeEntries(JSON.parse(storedEntries));
        }
        
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
        
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const timeBank = useMemo(() => {
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const today = startOfToday();
        const daysInWeekSoFar = eachDayOfInterval({ start: weekStart, end: today });
      
        const storedEntries: TimeEntry[] = timeEntries;
        
        const currentEntry = storedEntries
            .filter(entry => isSameDay(new Date(entry.startTime), now))
            .find(entry => !entry.endTime);
        
        let dailyHours = storedEntries
            .filter(e => e.endTime && isSameDay(new Date(e.startTime), now))
            .reduce((acc, entry) => {
            return acc + differenceInMilliseconds(new Date(entry.endTime!), new Date(entry.startTime));
            }, 0);
        
        if (currentEntry) {
            dailyHours += differenceInMilliseconds(now, new Date(currentEntry.startTime));
        }

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
      
        if (isConfiguredWorkday(today)) {
            targetMs += workHoursPerDay * 60 * 60 * 1000;
        }
      
        const totalWorkedMs = workedMs + dailyHours;
      
        const bankMs = totalWorkedMs - targetMs;
        
        return formatDuration(bankMs);
    }, [now, timeEntries, workHoursPerDay, workdays]);


    return (
        <div className="bg-background text-foreground min-h-screen flex flex-col font-sans">
            <header className="flex items-center p-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
                <Button variant="ghost" size="icon" asChild>
                <Link href="/">
                    <ArrowLeft />
                    <span className="sr-only">Voltar</span>
                </Link>
                </Button>
                <h1 className="text-xl font-bold ml-4">Relatórios</h1>
            </header>

            <main className="p-4 md:p-6 space-y-8 max-w-2xl mx-auto w-full flex-grow">
                <section className="space-y-6">
                    <h2 className="text-lg font-semibold flex items-center gap-3">
                        <TrendingUp className="text-primary" />
                        Resumo do Banco de Horas
                    </h2>

                    <Card className="w-full text-center">
                        <CardHeader>
                            <CardTitle>Saldo Atual</CardTitle>
                            <CardDescription>Seu saldo de horas acumulado até o momento.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className={`text-6xl font-bold ${timeBank.startsWith('+') || timeBank === "00h00m" ? 'text-primary' : 'text-destructive'}`}>
                                {timeBank}
                            </p>
                        </CardContent>
                    </Card>
                </section>
            </main>
        </div>
    );
}
