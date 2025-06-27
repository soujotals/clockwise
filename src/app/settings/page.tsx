
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
      <header className="flex items-center p-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ArrowLeft />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="text-xl font-bold ml-4">Configurações</h1>
         {hasChanges && (
            <Button onClick={handleSave} className="ml-auto" size="sm">
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
            </Button>
        )}
      </header>

      <main className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto w-full flex-grow animate-in fade-in-0 duration-500">
        <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-100">
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <Briefcase className="text-primary" />
                    Jornada de Trabalho
                </CardTitle>
                 <CardDescription>
                    Defina sua carga horária e dias de trabalho para calcular sua meta diária.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Label htmlFor="weekly-hours">Carga horária semanal</Label>
                        <div className="flex items-center gap-2 mt-2">
                            <Input
                                id="weekly-hours"
                                type="number"
                                value={weeklyHours}
                                onChange={(e) => setWeeklyHours(e.target.value)}
                                className="w-24 bg-input border-border" />
                            <span>horas</span>
                        </div>
                    </div>
                     <div>
                        <Label htmlFor="work-start-time">Horário de início</Label>
                        <div className="flex items-center gap-2 mt-2">
                           <Input
                                id="work-start-time"
                                type="time"
                                value={workStartTime}
                                onChange={(e) => setWorkStartTime(e.target.value)}
                                className="w-32 bg-input border-border"
                            />
                        </div>
                    </div>
                </div>
                 <div className="flex justify-between items-center">
                    <div>
                        <Label htmlFor="break-duration">Duração do intervalo (padrão)</Label>
                         <p className="text-sm text-muted-foreground">Define a duração padrão do seu intervalo em minutos.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            id="break-duration"
                            type="number"
                            value={breakDuration}
                            onChange={(e) => setBreakDuration(e.target.value)}
                            className="w-24 bg-input border-border"
                        />
                        <span>minutos</span>
                    </div>
                </div>

                <div className="space-y-2">
                <Label>Dias da semana</Label>
                <div className="flex items-center gap-2 flex-wrap">
                    {(Object.keys(dayLabels) as Array<keyof typeof dayLabels>).map((day) => (
                    <TooltipProvider key={day} delayDuration={100}>
                        <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                            variant={workdays[day] ? "default" : "outline"}
                            size="icon"
                            onClick={() => handleToggleDay(day)}
                            className="rounded-full w-9 h-9"
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
                <CardContent className="p-3">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-primary text-sm">Distribuição automática</p>
                            <p className="text-sm text-primary/80">{dailyHoursDistribution}</p>
                        </div>
                    </div>
                </CardContent>
                </Card>
            </CardContent>
        </Card>

        <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-200">
             <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <Bell className="text-primary"/>
                    Notificações e Exibição
                </CardTitle>
                <CardDescription>
                    Personalize os lembretes e o formato de exibição das horas.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <div className="flex justify-between items-center">
                    <div>
                        <Label htmlFor="reminders" className="font-semibold">Lembretes de ponto</Label>
                        <p className="text-sm text-muted-foreground">Receba notificações para registrar os pontos.</p>
                    </div>
                    <Switch id="reminders" checked={enableReminders} onCheckedChange={handleEnableRemindersChange} />
                </div>
                 <div className="flex justify-between items-center">
                    <div>
                        <Label htmlFor="time-format">Formato de hora (12h/24h)</Label>
                         <p className="text-sm text-muted-foreground">Escolha como as horas são exibidas.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-sm transition-colors ${!is24hFormat ? 'text-foreground' : 'text-muted-foreground'}`}>12h</span>
                        <Switch id="time-format" checked={is24hFormat} onCheckedChange={setIs24hFormat} />
                        <span className={`text-sm transition-colors ${is24hFormat ? 'text-foreground' : 'text-muted-foreground'}`}>24h</span>
                    </div>
                </div>
            </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pt-8">
            Registro Fácil v1.2.0
        </p>
      </main>
    </div>
  );
}
