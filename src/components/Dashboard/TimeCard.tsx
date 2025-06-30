"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LogIn,
  LogOut,
  Play,
  Coffee,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type WorkdayStatus = 'NOT_STARTED' | 'WORKING_BEFORE_BREAK' | 'ON_BREAK' | 'WORKING_AFTER_BREAK' | 'FINISHED';

interface TimeCardProps {
  now: Date;
  workdayStatus: WorkdayStatus;
  elapsedTime: number;
  is24hFormat: boolean;
  onMainButtonClick: () => void;
  formatDuration: (milliseconds: number) => string;
}

export function TimeCard({
  now,
  workdayStatus,
  elapsedTime,
  is24hFormat,
  onMainButtonClick,
  formatDuration,
}: TimeCardProps) {
  const timeFormatStringWithSeconds = is24hFormat ? 'HH:mm:ss' : 'hh:mm:ss a';

  const buttonConfig = (() => {
    switch (workdayStatus) {
      case 'NOT_STARTED':
        return { text: ['Registrar', 'Entrada'], icon: LogIn, disabled: false };
      case 'WORKING_BEFORE_BREAK':
        return { text: ['Sair para', 'Intervalo'], icon: Coffee, disabled: false };
      case 'ON_BREAK':
        return { text: ['Retornar do', 'Intervalo'], icon: Play, disabled: false };
      case 'WORKING_AFTER_BREAK':
        return { text: ['Registrar', 'Saída'], icon: LogOut, disabled: false };
      case 'FINISHED':
      default:
        return { text: ['Expediente', 'Encerrado'], icon: CheckCircle, disabled: true };
    }
  })();

  return (
    <section className="w-full space-y-4">
      <div className="flex justify-center">
        <Button
          onClick={onMainButtonClick}
          disabled={buttonConfig.disabled}
          className="w-44 h-44 rounded-full flex flex-col items-center justify-center text-xl font-bold shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105 disabled:bg-muted disabled:scale-100 disabled:cursor-not-allowed animate-in fade-in-0 zoom-in-95 duration-500 delay-300"
        >
          <buttonConfig.icon className="mb-2" size={36} />
          <span>{buttonConfig.text[0]}</span>
          <span className="text-base font-normal">{buttonConfig.text[1]}</span>
        </Button>
      </div>
      
      <div className="flex h-24 flex-col items-center justify-center animate-in fade-in-0 duration-500 delay-200">
        {(workdayStatus === 'WORKING_BEFORE_BREAK' || workdayStatus === 'WORKING_AFTER_BREAK') && (
          <div className="text-4xl font-mono tracking-widest">
            {formatDuration(elapsedTime)}
          </div>
        )}
        <div
          className={`font-mono tracking-widest text-muted-foreground ${
            workdayStatus === 'WORKING_BEFORE_BREAK' || workdayStatus === 'WORKING_AFTER_BREAK'
              ? 'text-lg mt-1'
              : 'text-4xl sm:text-5xl'
          }`}
        >
          {format(now, timeFormatStringWithSeconds, { locale: ptBR })}
        </div>
      </div>
    </section>
  );
}