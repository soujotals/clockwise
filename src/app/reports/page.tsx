'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ArrowLeft, Clock, TrendingUp, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
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
import { Workdays, AppSettings, getSettings, saveSettings } from '@/services/settings.service';

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
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [workHoursPerDay, setWorkHoursPerDay] = useState(8);
    const [userWorkdays, setUserWorkdays] = useState<Workdays>(defaultWorkdays);
    const [now, setNow] = useState(new Date());
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
    const [adjustmentValue, setAdjustmentValue] = useState("00:00");
    const [adjustmentSign, setAdjustmentSign] = useState('+');

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
            const [entries, settingsData] = await Promise.all([
                getTimeEntries(user.uid),
                getSettings(user.uid)
            ]);
            setTimeEntries(entries);
            setSettings(settingsData);
            if (settingsData) {
                const savedWorkdays = settingsData.workdays || defaultWorkdays;
                setUserWorkdays(savedWorkdays);
                const numberOfWorkDays = Object.values(savedWorkdays).filter(Boolean).length;
                if (numberOfWorkDays > 0) {
                    setWorkHoursPerDay((settingsData.weeklyHours || 40) / numberOfWorkDays);
                } else {
                    setWorkHoursPerDay(0);
                }
                if (settingsData.timeBankAdjustment) {
                    const absMillis = Math.abs(settingsData.timeBankAdjustment);
                    const hours = Math.floor(absMillis / 3600000);
                    const minutes = Math.floor((absMillis % 3600000) / 60000);
                    setAdjustmentValue(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
                    setAdjustmentSign(settingsData.timeBankAdjustment >= 0 ? '+' : '-');
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

        if (timeEntries.length === 0 && !settings?.timeBankAdjustment) {
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
            return userWorkdays[dayKey];
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
        return formatDuration(finalBankMs);
    }, [now, timeEntries, workHoursPerDay, userWorkdays, settings]);

    const handleSaveAdjustment = async () => {
        if (!user) return;

        const [hours, minutes] = adjustmentValue.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) {
            toast({
                title: "Formato Inválido",
                description: "Por favor, insira as horas no formato HH:mm.",
                variant: "destructive",
            });
            return;
        }

        const adjustmentMs = (hours * 3600000 + minutes * 60000) * (adjustmentSign === '+' ? 1 : -1);

        try {
            await saveSettings(user.uid, { timeBankAdjustment: adjustmentMs });
            
            const updatedSettings = await getSettings(user.uid);
            setSettings(updatedSettings);

            toast({
                title: "Ajuste Salvo",
                description: "Seu banco de horas foi atualizado.",
            });
            setIsAdjustmentDialogOpen(false);
        } catch (error) {
            console.error("Failed to save adjustment:", error);
            toast({
                title: "Erro ao Salvar",
                description: "Não foi possível salvar o ajuste. Tente novamente.",
                variant: "destructive",
            });
        }
    };
    
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

                    <Card className="w-full text-center relative">
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-muted-foreground hover:text-foreground" onClick={() => setIsAdjustmentDialogOpen(true)}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Ajustar Saldo</span>
                        </Button>
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

            <AlertDialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Ajustar Saldo Manualmente</AlertDialogTitle>
                  <AlertDialogDescription>
                    Defina um valor para adicionar ou subtrair do seu saldo de horas. Isso é útil para corrigir o saldo inicial ou registrar horas de outro sistema.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex items-center gap-2 py-4">
                    <select
                        value={adjustmentSign}
                        onChange={(e) => setAdjustmentSign(e.target.value)}
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <option value="+">+</option>
                        <option value="-">-</option>
                    </select>
                    <Input
                        id="adjustment"
                        type="time"
                        value={adjustmentValue}
                        onChange={(e) => setAdjustmentValue(e.target.value)}
                    />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSaveAdjustment}>Salvar Ajuste</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
