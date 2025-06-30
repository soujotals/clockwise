"use client";

import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EnhancedButtonProps extends ButtonProps {
  hapticFeedback?: boolean;
  pulseWhenActive?: boolean;
  workingStatus?: 'idle' | 'working' | 'break' | 'finished';
}

const useHaptic = () => {
  const vibrate = (pattern: number[]) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };
  
  return {
    success: () => vibrate([100, 50, 100]),
    tap: () => vibrate([50]),
    error: () => vibrate([500]),
  };
};

const statusStyles = {
  idle: 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
  working: 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
  break: 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
  finished: 'bg-gradient-to-br from-gray-400 to-gray-500',
};

export function EnhancedButton({
  children,
  hapticFeedback = false,
  pulseWhenActive = false,
  workingStatus = 'idle',
  className,
  onClick,
  ...props
}: EnhancedButtonProps) {
  const { tap } = useHaptic();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (hapticFeedback) {
      tap();
    }
    onClick?.(e);
  };

  const isWorking = workingStatus === 'working';
  const isFinished = workingStatus === 'finished';

  return (
    <Button
      onClick={handleClick}
      className={cn(
        'relative transition-all duration-200 ease-out',
        'active:scale-95 transform',
        'shadow-lg hover:shadow-xl',
        statusStyles[workingStatus],
        isFinished && 'cursor-not-allowed opacity-70',
        className
      )}
      disabled={isFinished}
      {...props}
    >
      {/* Anel de progresso visual */}
      <div className="absolute inset-2 rounded-full border-4 border-white/20" />
      
      {/* Pulso animado quando trabalhando */}
      {isWorking && pulseWhenActive && (
        <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
      )}
      
      {/* Conteúdo do botão */}
      <div className="relative z-10 flex flex-col items-center">
        {children}
      </div>
    </Button>
  );
}