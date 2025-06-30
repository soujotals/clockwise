import { useState, useEffect } from "react";
import type { User } from "firebase/auth";
import { TimeEntry, getTimeEntries } from "@/services/time-entry.service";
import { AppSettings, getSettings, Workdays } from "@/services/settings.service";
import { useToast } from "@/hooks/use-toast";

const defaultWorkdays: Workdays = {
  sun: false,
  mon: true,
  tue: true,
  wed: true,
  thu: true,
  fri: true,
  sat: false,
};

export function useDashboardData(user: User) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [workHoursPerDay, setWorkHoursPerDay] = useState(8);
  const [workdays, setWorkdays] = useState<Workdays>(defaultWorkdays);
  const [is24hFormat, setIs24hFormat] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [entries, settingsData] = await Promise.all([
          getTimeEntries(user.uid),
          getSettings(user.uid),
        ]);
        
        setTimeEntries(entries);
        setSettings(settingsData);
        
        if (settingsData) {
          const savedWorkdays = settingsData.workdays || defaultWorkdays;
          setWorkdays(savedWorkdays);
          const numberOfWorkDays = Object.values(savedWorkdays).filter(Boolean).length;
          if (numberOfWorkDays > 0) {
            setWorkHoursPerDay((settingsData.weeklyHours || 40) / numberOfWorkDays);
          } else {
            setWorkHoursPerDay(0);
          }
          setIs24hFormat(settingsData.is24hFormat ?? true);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({
          title: "Erro de conexão",
          description: "Não foi possível carregar os dados. Verifique a sua conexão e as configurações do Firebase.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user, toast]);

  return {
    isLoading,
    timeEntries,
    setTimeEntries,
    settings,
    workHoursPerDay,
    workdays,
    is24hFormat,
  };
}