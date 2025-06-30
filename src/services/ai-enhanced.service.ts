import { TimeEntry, AIInsight, AutomationRule, AnalyticsData } from '@/types';
import { analyticsService } from './analytics.service';

export const aiEnhancedService = {
  async analyzePatterns(userId: string, timeEntries: TimeEntry[]): Promise<AIInsight[]> {
    // For now, using fallback insights - AI integration can be added later
    return this.getFallbackInsights(userId, timeEntries);
  },

  async suggestOptimizations(userData: {
    userId: string;
    timeEntries: TimeEntry[];
    settings: any;
    currentShift?: any;
  }): Promise<AIInsight[]> {
    // Using fallback optimizations for now
    return this.getFallbackOptimizations(userData.userId);
  },

  async detectAnomalies(entries: TimeEntry[]): Promise<AIInsight[]> {
    // Simple rule-based anomaly detection
    return this.getBasicAnomalies(entries);
  },

  async generatePredictions(
    userId: string,
    timeEntries: TimeEntry[],
    currentEntry?: TimeEntry
  ): Promise<AIInsight[]> {
    return this.getFallbackPredictions(userId, currentEntry);
  },

  async generateSmartReminders(
    userId: string, 
    userData: any
  ): Promise<{ title: string; message: string; scheduledTime: string }[]> {
    return this.getFallbackReminders();
  },

  async chatQuery(
    userId: string,
    query: string,
    context: {
      timeEntries: TimeEntry[];
      analytics?: AnalyticsData;
      recentInsights?: AIInsight[];
    }
  ): Promise<string> {
    // Basic rule-based responses
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('horas') || queryLower.includes('trabalho')) {
      const totalHours = context.timeEntries.filter(e => e.endTime).length * 8; // Approximate
      return `Você trabalhou aproximadamente ${totalHours} horas registradas no sistema.`;
    }
    
    if (queryLower.includes('banco') || queryLower.includes('saldo')) {
      return 'Verifique seu saldo de banco de horas na página de relatórios para informações detalhadas.';
    }
    
    if (queryLower.includes('falta') || queryLower.includes('ausência')) {
      return 'Para solicitar ausências, acesse a seção de solicitações no menu principal.';
    }
    
    return 'Posso ajudar você com informações sobre seu controle de ponto. Pergunte sobre horas trabalhadas, banco de horas ou ausências.';
  },

  // Simple rule-based anomaly detection
  getBasicAnomalies(entries: TimeEntry[]): AIInsight[] {
    const anomalies: AIInsight[] = [];
    const recentEntries = entries.slice(-30);
    
    // Check for very long work days (>12 hours)
    recentEntries.forEach(entry => {
      if (entry.endTime) {
        const duration = (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60);
        if (duration > 12) {
          anomalies.push({
            id: `anomaly-long-${entry.id}`,
            userId: '',
            type: 'anomaly_detection',
            title: 'Jornada Muito Longa',
            description: `Jornada de ${duration.toFixed(1)} horas detectada em ${new Date(entry.startTime).toLocaleDateString()}.`,
            confidence: 0.9,
            actionable: true,
            suggestedActions: ['Verificar registro', 'Confirmar horas extras'],
            metadata: { entryId: entry.id, duration },
            createdAt: new Date().toISOString()
          });
        }
      }
    });
    
    return anomalies;
  },

  // Fallback methods for when AI service is unavailable
  getFallbackInsights(userId: string, timeEntries: TimeEntry[]): AIInsight[] {
    const analytics = analyticsService.generateFullAnalytics(timeEntries);
    const insights: AIInsight[] = [];

    if (analytics.productivity.efficiency < 80) {
      insights.push({
        id: `fallback-${Date.now()}-1`,
        userId,
        type: 'pattern_analysis',
        title: 'Eficiência Baixa Detectada',
        description: `Sua eficiência atual é de ${analytics.productivity.efficiency}%. Considere revisar seus horários de trabalho.`,
        confidence: 0.8,
        actionable: true,
        suggestedActions: ['Revisar horários', 'Verificar interrupções', 'Melhorar planejamento'],
        metadata: {},
        createdAt: new Date().toISOString()
      });
    }

    if (analytics.predictions.burnoutRisk === 'high') {
      insights.push({
        id: `fallback-${Date.now()}-2`,
        userId,
        type: 'pattern_analysis',
        title: 'Alto Risco de Burnout',
        description: 'Detectamos sinais de sobrecarga. É importante fazer pausas regulares.',
        confidence: 0.9,
        actionable: true,
        suggestedActions: ['Fazer pausas', 'Reduzir horas extras', 'Consultar supervisor'],
        metadata: {},
        createdAt: new Date().toISOString()
      });
    }

    return insights;
  },

  getFallbackOptimizations(userId: string): AIInsight[] {
    return [
      {
        id: `optimization-${Date.now()}-1`,
        userId,
        type: 'optimization_suggestion',
        title: 'Otimize seus Horários',
        description: 'Configure lembretes para manter consistência nos horários de entrada e saída.',
        confidence: 0.8,
        actionable: true,
        suggestedActions: ['Configurar alarmes', 'Estabelecer rotina', 'Preparar ambiente'],
        metadata: {},
        createdAt: new Date().toISOString()
      }
    ];
  },

  getFallbackPredictions(userId: string, currentEntry?: TimeEntry): AIInsight[] {
    const predictions: AIInsight[] = [];

    if (currentEntry && !currentEntry.endTime) {
      const startTime = new Date(currentEntry.startTime);
      const predictedEnd = new Date(startTime.getTime() + 8 * 60 * 60 * 1000); // 8 hours later
      
      predictions.push({
        id: `prediction-${Date.now()}-1`,
        userId,
        type: 'prediction',
        title: 'Previsão de Saída',
        description: `Baseado em seu padrão, você deve sair às ${predictedEnd.toTimeString().substring(0, 5)}.`,
        confidence: 0.7,
        actionable: false,
        suggestedActions: [],
        metadata: { predictionType: 'end_time' },
        createdAt: new Date().toISOString()
      });
    }

    return predictions;
  },

  getFallbackReminders(): { title: string; message: string; scheduledTime: string }[] {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 45, 0, 0);

    return [
      {
        title: 'Lembrete de Entrada',
        message: 'Não se esqueça de bater o ponto ao chegar!',
        scheduledTime: tomorrow.toISOString()
      }
    ];
  }
};