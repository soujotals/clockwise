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
    <section className="w-full grid grid-cols-2 gap-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-400">
      <Card className="group transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Progresso Diário</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground transition-transform group-hover:scale-110" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{progress.toFixed(0)}%</div>
          <p className="text-xs text-muted-foreground">
            {formatDuration(dailyHours)} de{' '}
            {workHoursPerDay > 0 ? `${formatDuration(workHoursPerDay * 3600000)}` : 'N/A'}
          </p>
          <Progress value={progress} className="h-2 mt-2" />
        </CardContent>
      </Card>

      <Card className="group transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Banco de Horas</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground transition-transform group-hover:scale-110" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${timeBank.startsWith('+') || timeBank.startsWith('+00h00m') ? 'text-primary' : 'text-destructive'}`}>
            {timeBank}
          </div>
          <p className="text-xs text-muted-foreground">Saldo acumulado</p>
        </CardContent>
      </Card>

      <Card className="group transition-all hover:shadow-md">
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

      <Card className="group transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Previsão de Saída</CardTitle>
          <Timer className="h-4 w-4 text-muted-foreground transition-transform group-hover:scale-110" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {predictedEndTime ? formatTime(predictedEndTime) : '--:--'}
          </div>
          <p className="text-xs text-muted-foreground">Horário estimado de término</p>
        </CardContent>
      </Card>
    </section>
  );
}