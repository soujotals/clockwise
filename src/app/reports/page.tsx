
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ArrowLeft, Clock, TrendingUp, Pencil, Calendar as CalendarIcon, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
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
  startOfToday,
  startOfDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TimeEntry, getTimeEntries } from '@/services/time-entry.service';
import { Workdays, AppSettings, getSettings, saveSettings } from '@/services/settings.service';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

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

const formatTotalDuration = (milliseconds: number) => {
    if (milliseconds < 0) milliseconds = 0;
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    return `${String(hours).padStart(2, "0")}h${String(minutes).padStart(
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
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
    const [adjustmentValue, setAdjustmentValue] = useState("00:00");
    const [adjustmentSign, setAdjustmentSign] = useState('+');
    const [month, setMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<Date | undefined>();
    const [is24hFormat, setIs24hFormat] = useState(true);

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
                setIs24hFormat(settingsData.is24hFormat ?? true);
            }
            setIsLoading(false);
        };
        fetchData();
    }, [user]);

    const timeFormatStringWithSeconds = useMemo(() => is24hFormat ? 'HH:mm:ss' : 'hh:mm:ss a', [is24hFormat]);
    
    const dailyTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        if (!timeEntries) return totals;

        timeEntries.forEach(entry => {
            if (entry.endTime) {
                const dayKey = format(new Date(entry.startTime), 'yyyy-MM-dd');
                const duration = differenceInMilliseconds(new Date(entry.endTime!), new Date(entry.startTime));
                if (duration > 0) {
                    if (totals[dayKey]) {
                        totals[dayKey] += duration;
                    } else {
                        totals[dayKey] = duration;
                    }
                }
            }
        });
        return totals;
    }, [timeEntries]);

    const timeBank = useMemo(() => {
        const today = startOfToday();

        if (timeEntries.length === 0 && !settings?.timeBankAdjustment) {
            return formatDuration(0);
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

        const todayEntries = timeEntries.filter(e => isSameDay(new Date(e.startTime), today));
        const isTodayFinished = todayEntries.length > 0 && todayEntries.every(e => e.endTime);

        allDaysToConsider.forEach(day => {
            const isToday = isSameDay(day, today);
            
            if (isToday && !isTodayFinished) return;

            const entriesOnDay = timeEntries.filter(e => isSameDay(new Date(e.startTime), day) && e.endTime);
            const dailyTotal = entriesOnDay.reduce((total, entry) => {
                return total + differenceInMilliseconds(new Date(entry.endTime!), new Date(entry.startTime));
            }, 0);
            totalWorkedMs += dailyTotal;

            if (isConfiguredWorkday(day)) {
               totalTargetMs += workHoursPerDay * 60 * 60 * 1000;
            }
        });
        
        const bankMs = totalWorkedMs - totalTargetMs;
        const finalBankMs = bankMs + (settings?.timeBankAdjustment || 0);
        return formatDuration(finalBankMs);
    }, [timeEntries, workHoursPerDay, userWorkdays, settings]);
    
    const selectedDayDetails = useMemo(() => {
      if (!selectedDay) return null;

      const entriesForDay = timeEntries
        .filter(e => isSameDay(new Date(e.startTime), selectedDay))
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .slice(0, 2);

      const events = entriesForDay.flatMap((entry, entryIndex) => {
          const eventList: {label: string, time: string}[] = [];
          if(entryIndex === 0) {
              eventList.push({ label: 'Entrada', time: entry.startTime });
              if (entry.endTime) {
                  eventList.push({ label: 'Saída p/ Intervalo', time: entry.endTime });
              }
          } else {
              eventList.push({ label: 'Retorno do Intervalo', time: entry.startTime });
              if (entry.endTime) {
                  eventList.push({ label: 'Saída', time: entry.endTime });
              }
          }
          return eventList;
      }).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

      const totalMillis = entriesForDay.reduce((acc, entry) => {
          if(entry.endTime) {
              return acc + differenceInMilliseconds(new Date(entry.endTime), new Date(entry.startTime));
          }
          return acc;
      }, 0);

      return {
          date: selectedDay,
          total: totalMillis,
          events
      };
    }, [selectedDay, timeEntries]);

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

        const adjustmentDeltaMs = (hours * 3600000 + minutes * 60000) * (adjustmentSign === '+' ? 1 : -1);
        const currentAdjustmentMs = settings?.timeBankAdjustment || 0;
        const newTotalAdjustmentMs = currentAdjustmentMs + adjustmentDeltaMs;

        try {
            await saveSettings(user.uid, { timeBankAdjustment: newTotalAdjustmentMs });
            
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

            <main className="p-4 md:p-6 space-y-8 max-w-5xl mx-auto w-full flex-grow animate-in fade-in-0 duration-500">
                <section className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-100">
                    <h2 className="text-lg font-semibold flex items-center gap-3">
                        <TrendingUp className="text-primary" />
                        Resumo do Banco de Horas
                    </h2>

                    <Card className="w-full text-center relative max-w-md mx-auto transition-all hover:shadow-md">
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-muted-foreground hover:text-foreground" onClick={() => setIsAdjustmentDialogOpen(true)}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Ajustar Saldo</span>
                        </Button>
                        <CardHeader>
                            <CardTitle>Saldo Atual</CardTitle>
                            <CardDescription>Seu saldo de horas acumulado até o momento.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className={`text-4xl sm:text-5xl font-bold ${timeBank.startsWith('+') || timeBank === "00h00m" ? 'text-primary' : 'text-destructive'}`}>
                                {timeBank}
                            </p>
                        </CardContent>
                    </Card>
                </section>

                <section className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-200">
                    <h2 className="text-lg font-semibold flex items-center gap-3">
                        <CalendarIcon className="text-primary" />
                        Registros por Dia
                    </h2>
                    <Card className="transition-all hover:shadow-md">
                       <CardContent className="flex flex-col md:flex-row p-0 md:p-4 gap-4 md:gap-8">
                            <div className="p-4 pb-0 md:p-0 md:w-auto flex justify-center">
                                <Calendar
                                    mode="single"
                                    selected={selectedDay}
                                    onSelect={setSelectedDay}
                                    month={month}
                                    onMonthChange={setMonth}
                                    locale={ptBR}
                                    className="p-0"
                                    classNames={{
                                        head_cell: "text-muted-foreground rounded-md w-12 font-normal text-[0.8rem] text-center",
                                        cell: "h-12 w-12 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                                        day: "h-full w-full p-1 font-normal flex flex-col items-center justify-center rounded-md relative group",
                                    }}
                                    components={{
                                        DayContent: ({ date, displayMonth }) => {
                                            const dayKey = format(date, 'yyyy-MM-dd');
                                            const totalMillis = dailyTotals[dayKey];
                                            const isCurrentMonth = date.getMonth() === displayMonth.getMonth();

                                            return (
                                                <>
                                                    <span>{format(date, 'd')}</span>
                                                    {totalMillis > 0 && isCurrentMonth ? (
                                                        <span className="text-xs font-bold mt-1 text-primary group-data-[selected]:text-primary-foreground/90">
                                                            {formatTotalDuration(totalMillis).replace('m', '').replace('h', ':')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs mt-1">&nbsp;</span>
                                                    )}
                                                </>
                                            );
                                        }
                                    }}
                                />
                            </div>
                            <Separator orientation="vertical" className="mx-2 hidden md:block" />
                            <div className="flex-1 md:min-w-[280px] p-4 md:p-0">
                                {selectedDayDetails ? (
                                    <div className="animate-in fade-in-0">
                                        <h3 className="text-base font-semibold mb-4">
                                            {format(selectedDayDetails.date, "PPP", { locale: ptBR })}
                                        </h3>
                                        {selectedDayDetails.events.length > 0 ? (
                                            <div className="space-y-3">
                                                {selectedDayDetails.events.map((event, index) => (
                                                    <div key={index} className="flex items-center justify-between text-sm">
                                                        <div className="flex items-center gap-3">
                                                            <Clock size={16} className="text-muted-foreground" />
                                                            <span>{event.label}</span>
                                                        </div>
                                                        <span className="font-mono text-foreground bg-muted px-2 py-1 rounded-md text-xs">{format(new Date(event.time), timeFormatStringWithSeconds, { locale: ptBR })}</span>
                                                    </div>
                                                ))}
                                                <Separator className="my-4"/>
                                                <div className="flex items-center justify-between font-semibold text-base">
                                                    <span>Total do Dia</span>
                                                    <span className="text-primary">{formatTotalDuration(selectedDayDetails.total)}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center gap-4">
                                                <CalendarDays size={48} />
                                                <p>Nenhum registro de ponto <br/>para este dia.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center gap-4">
                                        <CalendarDays size={48} />
                                        <p>Selecione um dia no calendário <br/>para ver os detalhes.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </main>

            <AlertDialog open={isAdjustmentDialogOpen} onOpenChange={(open) => {
                setIsAdjustmentDialogOpen(open);
                if (!open) {
                    setAdjustmentValue("00:00");
                    setAdjustmentSign("+");
                }
            }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Ajustar Saldo Manualmente</AlertDialogTitle>
                  <AlertDialogDescription>
                    Adicione ou remova horas do seu saldo. O valor inserido será somado (ou subtraído) do seu banco de horas existente. Isso é útil para correções ou para registrar um saldo inicial.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex items-center gap-2 py-4">
                    <div className="flex">
                        <Button
                            variant={adjustmentSign === '+' ? 'default' : 'outline'}
                            onClick={() => setAdjustmentSign('+')}
                            className="rounded-r-none"
                        >
                            +
                        </Button>
                        <Button
                            variant={adjustmentSign === '-' ? 'destructive' : 'outline'}
                            onClick={() => setAdjustmentSign('-')}
                            className="rounded-l-none border-l-0"
                        >
                            -
                        </Button>
                    </div>
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
