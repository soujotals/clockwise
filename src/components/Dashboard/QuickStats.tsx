"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp,
  Clock,
  LogIn,
  Timer,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface QuickStatsProps {
  progress: number;
  dailyHours: number;
  workHoursPerDay: number;
  timeBank: string;
  lastEvent: { label: string; time: string | null };
  predictedEndTime: Date | null;
  is24hFormat: boolean;
  formatDuration: (milliseconds: number) => string;
}

export function QuickStats({
  progress,
  dailyHours,
  workHoursPerDay,
  timeBank,
  lastEvent,
  predictedEndTime,
  is24hFormat,
  formatDuration,
}: QuickStatsProps) {
  const timeFormatString = is24hFormat ? 'HH:mm' : 'hh:mm a';

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, timeFormatString, { locale: ptBR });
  };

  return (
    <section className="w-full space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-400">
      {/* Card principal destacado - Progresso Diário */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 transition-all hover:shadow-md mobile-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{progress.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">Progresso Diário</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDuration(dailyHours)} de{' '}
                  {workHoursPerDay > 0 ? `${formatDuration(workHoursPerDay * 3600000)}` : 'N/A'}
                </p>
              </div>
            </div>
            <div className="w-20">
              <Progress value={progress} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards secundários em grid 2x2 */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="group transition-all hover:shadow-md mobile-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Banco de Horas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground transition-transform group-hover:scale-110" />
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${timeBank.startsWith('+') || timeBank.startsWith('+00h00m') ? 'text-green-600' : 'text-red-500'}`}>
              {timeBank}
            </div>
            <p className="text-xs text-muted-foreground">Saldo acumulado</p>
          </CardContent>
        </Card>

              <Card className="group transition-all hover:shadow-md mobile-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último Registro</CardTitle>
            <LogIn className="h-4 w-4 text-muted-foreground transition-transform group-hover:scale-110" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {lastEvent.time ? `${lastEvent.label}` : lastEvent.label}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastEvent.time ? `às ${formatTime(lastEvent.time)}` : " "}
            </p>
          </CardContent>
        </Card>

        <Card className="group transition-all hover:shadow-md mobile-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Previsão de Saída</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground transition-transform group-hover:scale-110" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {predictedEndTime ? formatTime(predictedEndTime) : '--:--'}
            </div>
            <p className="text-xs text-muted-foreground">Horário estimado</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}