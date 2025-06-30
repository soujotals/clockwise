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
import { CircularProgress } from "./CircularProgress";

type WorkdayStatus = 'NOT_STARTED' | 'WORKING_BEFORE_BREAK' | 'ON_BREAK' | 'WORKING_AFTER_BREAK' | 'FINISHED';

interface TimeCardProps {
  now: Date;
  workdayStatus: WorkdayStatus;
  elapsedTime: number;
  is24hFormat: boolean;
  onMainButtonClick: () => void;
  formatDuration: (milliseconds: number) => string;
  dailyProgress?: number;
}

const statusStyles = {
  'NOT_STARTED': {
    buttonClass: 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    pulseClass: '',
  },
  'WORKING_BEFORE_BREAK': {
    buttonClass: 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
    pulseClass: 'work-pulse',
  },
  'ON_BREAK': {
    buttonClass: 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
    pulseClass: 'break-wave',
  },
  'WORKING_AFTER_BREAK': {
    buttonClass: 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
    pulseClass: 'work-pulse',
  },
  'FINISHED': {
    buttonClass: 'bg-gradient-to-br from-gray-400 to-gray-500',
    pulseClass: '',
  },
};

export function TimeCard({
  now,
  workdayStatus,
  elapsedTime,
  is24hFormat,
  onMainButtonClick,
  formatDuration,
  dailyProgress = 0,
}: TimeCardProps) {
  const timeFormatStringWithSeconds = is24hFormat ? 'HH:mm:ss' : 'hh:mm:ss a';

  // Haptic feedback hook
  const useHaptic = () => {
    const vibrate = (pattern: number[]) => {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    };
    
    return {
      tap: () => vibrate([50]),
      success: () => vibrate([100, 50, 100]),
    };
  };

  const { tap } = useHaptic();

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

  const currentStatusStyle = statusStyles[workdayStatus];

  const handleButtonClick = () => {
    if (!buttonConfig.disabled) {
      tap(); // Haptic feedback
    }
    onMainButtonClick();
  };

  return (
    <section className="w-full space-y-4">
      <div className="flex justify-center">
        <Button
          onClick={handleButtonClick}
          disabled={buttonConfig.disabled}
          className={`w-52 h-52 rounded-full flex flex-col items-center justify-center text-xl font-bold shadow-2xl shadow-primary/20 text-white transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 disabled:opacity-70 disabled:scale-100 disabled:cursor-not-allowed animate-in fade-in-0 zoom-in-95 duration-500 delay-300 relative ${currentStatusStyle.buttonClass} ${currentStatusStyle.pulseClass}`}
                  >
            {/* Anel de progresso visual */}
            <div className="absolute inset-2 rounded-full border-4 border-white/20" />
            
            {/* Pulso animado quando trabalhando */}
            {(workdayStatus === 'WORKING_BEFORE_BREAK' || workdayStatus === 'WORKING_AFTER_BREAK') && (
              <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
            )}
            
            {/* Conteúdo do botão */}
            <div className="relative z-10 flex flex-col items-center">
              <buttonConfig.icon className="mb-3" size={48} />
              <span>{buttonConfig.text[0]}</span>
              <span className="text-base font-normal">{buttonConfig.text[1]}</span>
            </div>
          </Button>
              </div>

        {/* Cronômetro circular quando trabalhando */}
        {(workdayStatus === 'WORKING_BEFORE_BREAK' || workdayStatus === 'WORKING_AFTER_BREAK') && (
          <div className="flex justify-center animate-in fade-in-0 duration-500 delay-200">
            <CircularProgress 
              progress={dailyProgress}
              size={140}
              strokeWidth={8}
              className="mb-4"
            >
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-foreground">
                  {formatDuration(elapsedTime)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {workdayStatus === 'WORKING_BEFORE_BREAK' ? 'Trabalhando' : 'Pós-intervalo'}
                </div>
              </div>
            </CircularProgress>
          </div>
        )}
        
        <div className="flex h-16 flex-col items-center justify-center animate-in fade-in-0 duration-500 delay-200">
          <div
            className={`font-mono tracking-widest text-muted-foreground ${
              workdayStatus === 'WORKING_BEFORE_BREAK' || workdayStatus === 'WORKING_AFTER_BREAK'
                ? 'text-lg'
                : 'text-4xl sm:text-5xl'
            }`}
          >
            {format(now, timeFormatStringWithSeconds, { locale: ptBR })}
          </div>
        </div>
    </section>
  );
}