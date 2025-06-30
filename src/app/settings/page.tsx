
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ArrowLeft, Briefcase, Clock, Bell, Info, Save, Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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

const dayLabels: { [key in keyof Workdays]: string } = {
  sun: 'D',
  mon: 'S',
  tue: 'T',
  wed: 'Q',
  thu: 'Q',
  fri: 'S',
  sat: 'S',
};

const dayFullNames: { [key in keyof Workdays]: string } = {
  sun: 'Domingo',
  mon: 'Segunda',
  tue: 'Terça',
  wed: 'Quarta',
  thu: 'Quinta',
  fri: 'Sexta',
  sat: 'Sábado',
};

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  // Settings state
  const [weeklyHours, setWeeklyHours] = useState<string | number>(40);
  const [workdays, setWorkdays] = useState<Workdays>(defaultWorkdays);
  const [workStartTime, setWorkStartTime] = useState('09:00');
  const [breakDuration, setBreakDuration] = useState<string | number>(60);
  const [is24hFormat, setIs24hFormat] = useState(true);
  const [enableReminders, setEnableReminders] = useState(false);

  // Initial state for change detection
  const [initialSettings, setInitialSettings] = useState<Partial<AppSettings>>({});

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
    
    const fetchInitialSettings = async () => {
      setIsLoading(true);
      const settings = await getSettings(user.uid);
      const initial: Partial<AppSettings> = {
        weeklyHours: 40,
        workdays: defaultWorkdays,
        workStartTime: '09:00',
        breakDuration: 60,
        is24hFormat: true,
        enableReminders: false,
      };

      if (settings) {
        initial.weeklyHours = settings.weeklyHours ?? initial.weeklyHours;
        initial.workdays = settings.workdays ?? initial.workdays;
        initial.workStartTime = settings.workStartTime ?? initial.workStartTime;
        initial.breakDuration = settings.breakDuration ?? initial.breakDuration;
        initial.is24hFormat = settings.is24hFormat ?? initial.is24hFormat;
        initial.enableReminders = settings.enableReminders ?? initial.enableReminders;
      }
      
      setWeeklyHours(initial.weeklyHours!);
      setWorkdays(initial.workdays!);
      setWorkStartTime(initial.workStartTime!);
      setBreakDuration(initial.breakDuration!);
      setIs24hFormat(initial.is24hFormat!);
      setEnableReminders(initial.enableReminders!);
      
      setInitialSettings(initial);
      setIsLoading(false);
    };
    fetchInitialSettings();
  }, [user]);
  
  const handleToggleDay = (day: keyof Workdays) => {
    setWorkdays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const handleEnableRemindersChange = async (checked: boolean) => {
    setEnableReminders(checked);
    if (checked && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
         toast({ title: "Notificações já estão ativadas." });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          toast({ title: "Notificações Ativadas!", description: "Você receberá lembretes úteis." });
        } else {
          setEnableReminders(false);
          toast({ title: "Permissão Negada", description: "As notificações são necessárias para os lembretes.", variant: 'destructive' });
        }
      } else {
        setEnableReminders(false);
        toast({ title: "Notificações Bloqueadas", description: "Por favor, habilite as notificações nas configurações do seu navegador.", variant: 'destructive' });
      }
    }
  };


  const handleSave = async () => {
    if (!user) return;
    const newSettings: AppSettings = {
      weeklyHours: Number(weeklyHours),
      workdays,
      workStartTime,
      breakDuration: Number(breakDuration),
      is24hFormat,
      enableReminders,
    };

    try {
      await saveSettings(user.uid, newSettings);
      setInitialSettings(newSettings); // Update initial state to reflect saved changes
      toast({
        title: "Configurações Salvas",
        description: "Suas preferências foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: "Erro ao Salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const hasChanges = useMemo(() => {
    if (isLoading) return false;
    const currentSettings = {
        weeklyHours: Number(weeklyHours),
        workdays,
        workStartTime,
        breakDuration: Number(breakDuration),
        is24hFormat,
        enableReminders
    };
    return JSON.stringify(currentSettings) !== JSON.stringify(initialSettings);
  }, [weeklyHours, workdays, workStartTime, breakDuration, is24hFormat, enableReminders, initialSettings, isLoading]);

  const dailyHoursDistribution = useMemo(() => {
    const numberOfWorkDays = Object.values(workdays).filter(Boolean).length;
    if (numberOfWorkDays === 0) {
      return "Nenhum dia de trabalho selecionado";
    }
    
    const totalDecimalHours = Number(weeklyHours) / numberOfWorkDays;
    if (isNaN(totalDecimalHours) || totalDecimalHours <= 0) {
      return "Defina a carga horária e os dias de trabalho";
    }

    const hours = Math.floor(totalDecimalHours);
    const minutes = Math.round((totalDecimalHours - hours) * 60);
    const selectedDays = (Object.keys(workdays) as Array<keyof Workdays>)
        .filter(day => workdays[day])
        .map(day => dayFullNames[day].slice(0, 3))
        .join(', ');


    if (minutes === 0) {
        return `${hours}h por dia (${selectedDays})`;
    }

    return `${hours}h${String(minutes).padStart(2, '0')}m por dia (${selectedDays})`;
  }, [weeklyHours, workdays]);
  
  if (authLoading || isLoading) {
      return <div className="dark bg-background flex min-h-screen items-center justify-center"><Clock className="animate-spin h-10 w-10 text-primary" /></div>;
  }

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col font-sans">
      <header className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="flex items-center min-w-0">
          <Button variant="ghost" size="icon" asChild className="mr-2 shrink-0">
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <h1 className="text-lg sm:text-xl font-bold truncate">Configurações</h1>
        </div>
         {hasChanges && (
            <Button onClick={handleSave} className="shrink-0 ml-2" size="sm">
                <Save className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Salvar Alterações</span>
                <span className="sm:hidden">Salvar</span>
            </Button>
        )}
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto w-full flex-grow animate-in fade-in-0 duration-500">
        <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-100 transition-all hover:shadow-md active:scale-[0.98]">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Briefcase className="text-primary h-5 w-5" />
                    Jornada de Trabalho
                </CardTitle>
                 <CardDescription className="text-sm">
                    Defina sua carga horária e dias de trabalho para calcular sua meta diária.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                        <Label htmlFor="weekly-hours" className="text-sm font-medium">Carga horária semanal</Label>
                        <div className="flex items-center gap-2 mt-2">
                            <Input
                                id="weekly-hours"
                                type="number"
                                value={weeklyHours}
                                onChange={(e) => setWeeklyHours(e.target.value)}
                                className="w-20 sm:w-24 h-10 text-sm bg-input border-border" />
                            <span className="text-sm">horas</span>
                        </div>
                    </div>
                     <div>
                        <Label htmlFor="work-start-time" className="text-sm font-medium">Horário de início</Label>
                        <div className="relative mt-2 flex w-28 sm:w-32 items-center">
                           <Input
                                id="work-start-time"
                                type="time"
                                value={workStartTime}
                                onChange={(e) => setWorkStartTime(e.target.value)}
                                className="w-full h-10 text-sm bg-input border-border pr-8"
                            />
                            <Clock className="pointer-events-none absolute right-2 h-4 w-4 text-primary" />
                        </div>
                    </div>
                </div>
                 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div className="flex-1">
                        <Label htmlFor="break-duration" className="text-sm font-medium">Duração do intervalo (padrão)</Label>
                         <p className="text-xs sm:text-sm text-muted-foreground">Define a duração padrão do seu intervalo em minutos.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            id="break-duration"
                            type="number"
                            value={breakDuration}
                            onChange={(e) => setBreakDuration(e.target.value)}
                            className="w-20 sm:w-24 h-10 text-sm bg-input border-border"
                        />
                        <span className="text-sm">minutos</span>
                    </div>
                </div>

                <div className="space-y-3">
                <Label className="text-sm font-medium">Dias da semana</Label>
                <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                    {(Object.keys(dayLabels) as Array<keyof typeof dayLabels>).map((day) => (
                    <TooltipProvider key={day} delayDuration={100}>
                        <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                            variant={workdays[day] ? "default" : "outline"}
                            size="icon"
                            onClick={() => handleToggleDay(day)}
                            className="rounded-full w-10 h-10 sm:w-9 sm:h-9 text-sm font-medium"
                            >
                            {dayLabels[day].toUpperCase()}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{dayFullNames[day]}</p>
                        </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    ))}
                </div>
                </div>
            
                <Card className="border-primary/50 bg-primary/10">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Hourglass className="h-5 w-5 text-primary" />
                            <div>
                                <p className="font-semibold text-primary text-sm">Distribuição automática</p>
                                <p className="text-sm text-primary/80">{dailyHoursDistribution}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </CardContent>
        </Card>

        <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-200 transition-all hover:shadow-md active:scale-[0.98]">
             <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Bell className="text-primary h-5 w-5"/>
                    Notificações e Exibição
                </CardTitle>
                <CardDescription className="text-sm">
                    Personalize os lembretes e o formato de exibição das horas.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div className="flex-1">
                        <Label htmlFor="reminders" className="text-sm font-semibold">Lembretes de ponto</Label>
                        <p className="text-xs sm:text-sm text-muted-foreground">Receba notificações para registrar os pontos.</p>
                    </div>
                    <Switch id="reminders" checked={enableReminders} onCheckedChange={handleEnableRemindersChange} className="shrink-0" />
                </div>
                 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div className="flex-1">
                        <Label htmlFor="time-format" className="text-sm font-medium">Formato de hora (12h/24h)</Label>
                         <p className="text-xs sm:text-sm text-muted-foreground">Escolha como as horas são exibidas.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-sm transition-colors ${!is24hFormat ? 'text-foreground' : 'text-muted-foreground'}`}>12h</span>
                        <Switch id="time-format" checked={is24hFormat} onCheckedChange={setIs24hFormat} />
                        <span className={`text-sm transition-colors ${is24hFormat ? 'text-foreground' : 'text-muted-foreground'}`}>24h</span>
                    </div>
                </div>
            </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pt-8">
            SouTemp v1.0.0
        </p>
      </main>
    </div>
  );
}
