'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ArrowLeft, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  format,
  differenceInMilliseconds,
  isSameDay,
  eachDayOfInterval,
  isBefore,
  startOfToday,
  startOfDay,
} from 'date-fns';
import { TimeEntry, getTimeEntries } from '@/services/time-entry.service';
import { Workdays, getSettings } from '@/services/settings.service';

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
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [workHoursPerDay, setWorkHoursPerDay] = useState(8);
    const [workdays, setWorkdays] = useState<Workdays>(defaultWorkdays);
    const [now, setNow] = useState(new Date());

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
            const [entries, settings] = await Promise.all([
                getTimeEntries(user.uid),
                getSettings(user.uid)
            ]);
            setTimeEntries(entries);
            if (settings) {
                const savedWorkdays = settings.workdays || defaultWorkdays;
                setWorkdays(savedWorkdays);
                const numberOfWorkDays = Object.values(savedWorkdays).filter(Boolean).length;
                if (numberOfWorkDays > 0) {
                    setWorkHoursPerDay((settings.weeklyHours || 40) / numberOfWorkDays);
                } else {
                    setWorkHoursPerDay(0);
                }
            }
            setIsLoading(false);
        };
        fetchData();
    }, [user]);
    
    useEffect(() => {
        if (isLoading) return;
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, [isLoading]);

    const timeBank = useMemo(() => {
        const today = startOfToday();

        if (timeEntries.length === 0) {
            return formatDuration(0);
        }

        const currentEntry = timeEntries
            .filter(entry => isSameDay(new Date(entry.startTime), now))
            .find(entry => !entry.endTime);
        
        let dailyHours = timeEntries
            .filter(e => e.endTime && isSameDay(new Date(e.startTime), now))
            .reduce((acc, entry) => {
            return acc + differenceInMilliseconds(new Date(entry.endTime!), new Date(entry.startTime));
            }, 0);
        
        if (currentEntry) {
            dailyHours += differenceInMilliseconds(now, new Date(currentEntry.startTime));
        }

        const firstEntryDate = timeEntries.reduce((earliest, entry) => {
            const entryDate = new Date(entry.startTime);
            return entryDate < earliest ? entryDate : earliest;
        }, new Date());
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
        
        return formatDuration(bankMs);
    }, [now, timeEntries, workHoursPerDay, workdays]);
    
    if (authLoading || isLoading) {
        return <div className="dark bg-background flex min-h-screen items-center justify-center"><Clock className="animate-spin h-10 w-10 text-primary" /></div>;
    }

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

            <main className="p-4 md:p-6 space-y-8 max-w-2xl mx-auto w-full flex-grow animate-in fade-in-0 duration-500">
                <section className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-100">
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
