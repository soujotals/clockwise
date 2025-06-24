'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Briefcase, Clock, Bell, Info, Save } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const [weeklyHours, setWeeklyHours] = useState<string | number>(40);
  const [initialWeeklyHours, setInitialWeeklyHours] = useState<string | number>(40);
  const [is24hFormat, setIs24hFormat] = useState(true);
  const [enableReminders, setEnableReminders] = useState(true);

  useEffect(() => {
    const savedSettingsRaw = localStorage.getItem('appSettings');
    if (savedSettingsRaw) {
      const settings = JSON.parse(savedSettingsRaw);
      const hours = settings.weeklyHours || 40;
      setWeeklyHours(hours);
      setInitialWeeklyHours(hours);
    }
  }, []);
  
  const handleSave = () => {
    const savedSettingsRaw = localStorage.getItem('appSettings');
    const savedSettings = savedSettingsRaw ? JSON.parse(savedSettingsRaw) : {};
    
    const newSettings = {
      ...savedSettings,
      weeklyHours: Number(weeklyHours),
    };

    localStorage.setItem('appSettings', JSON.stringify(newSettings));
    setInitialWeeklyHours(Number(weeklyHours));
    toast({
      title: "Configuração Salva",
      description: "Sua carga horária semanal foi atualizada.",
    });
  };

  const weeklyHoursChanged = Number(weeklyHours) !== Number(initialWeeklyHours);

  const dailyHoursDistribution = useMemo(() => {
    const totalDecimalHours = Number(weeklyHours) / 5;
    if (isNaN(totalDecimalHours) || totalDecimalHours <= 0) {
      return "8h por dia útil (segunda a sexta-feira)";
    }

    const hours = Math.floor(totalDecimalHours);
    const minutes = Math.round((totalDecimalHours - hours) * 60);

    if (minutes === 0) {
        return `${hours}h por dia útil (segunda a sexta-feira)`;
    }

    return `${hours}h${String(minutes).padStart(2, '0')}m por dia útil (segunda a sexta-feira)`;
  }, [weeklyHours]);

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <header className="flex items-center p-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ArrowLeft />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="text-xl font-bold ml-4">Configurações</h1>
      </header>

      <main className="p-4 md:p-6 space-y-8 max-w-2xl mx-auto w-full flex-grow">
        {/* Minha Jornada de Trabalho */}
        <section className="space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-3">
            <Briefcase className="text-primary" />
            Minha Jornada de Trabalho
          </h2>

          <div className="space-y-4 pl-9">
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="weekly-hours">Carga horária semanal</Label>
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-transparent">
                                    <Info size={14} className="text-muted-foreground" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Defina o total de horas de trabalho esperadas para a semana.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Input
                        id="weekly-hours"
                        type="number"
                        value={weeklyHours}
                        onChange={(e) => setWeeklyHours(e.target.value)}
                        className="w-24 bg-input border-border" />
                      <span>horas</span>
                    </div>
                    {weeklyHoursChanged && (
                      <Button onClick={handleSave} size="sm">
                        <Save className="mr-2 h-4 w-4" />
                        Salvar
                      </Button>
                    )}
                </div>
                 <p className="text-xs text-muted-foreground mt-1">Exemplo: 40h, 44h, 30h - conforme seu contrato de trabalho</p>
            </div>
          
            <div className="p-4 rounded-lg border border-primary bg-primary/10">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="font-semibold">Distribuição automática</p>
                        <p className="text-sm">{dailyHoursDistribution}</p>
                    </div>
                </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Exibição */}
        <section className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-3">
                <Clock className="text-primary"/>
                Exibição
            </h2>
            <div className="flex justify-between items-center pl-9">
                <div>
                    <Label htmlFor="time-format">Formato de hora</Label>
                    <p className="text-sm text-muted-foreground">12h (AM/PM) ou 24h</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-sm transition-colors ${!is24hFormat ? 'text-foreground' : 'text-muted-foreground'}`}>12h</span>
                    <Switch id="time-format" checked={is24hFormat} onCheckedChange={setIs24hFormat} />
                    <span className={`text-sm transition-colors ${is24hFormat ? 'text-foreground' : 'text-muted-foreground'}`}>24h</span>
                </div>
            </div>
        </section>
        
        <Separator />

        {/* Notificações */}
        <section className="space-y-4">
             <h2 className="text-lg font-semibold flex items-center gap-3">
                <Bell className="text-primary"/>
                Notificações
            </h2>
            <div className="flex justify-between items-center pl-9">
                <div>
                    <Label htmlFor="reminders" className="cursor-pointer">Lembretes de ponto</Label>
                    <p className="text-sm text-muted-foreground">Receba notificações para registrar o ponto</p>
                </div>
                <Switch id="reminders" checked={enableReminders} onCheckedChange={setEnableReminders} />
            </div>
        </section>
      </main>

      <footer className="text-center p-8 mt-auto">
        <Separator className="mb-8" />
        <p className="font-bold">Registro Fácil</p>
        <p className="text-sm text-muted-foreground">Versão 1.0.0</p>
        <p className="text-xs text-muted-foreground mt-2">Controle simples e eficiente do seu ponto</p>
      </footer>
    </div>
  );
}
