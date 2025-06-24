"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { DateRange } from "react-day-picker";
import {
  addDays,
  format,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  differenceInMilliseconds,
  isSameDay,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  LogIn,
  LogOut,
  BarChart,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";

type TimeEntry = {
  id: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string
};

const formatDuration = (milliseconds: number) => {
  if (milliseconds < 0) milliseconds = 0;
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor((milliseconds % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
};

export default function ClockwisePage() {
  const [isClient, setIsClient] = useState(false);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [reportRange, setReportRange] = useState<DateRange | undefined>({
    from: startOfWeek(new Date()),
    to: endOfWeek(new Date()),
  });

  useEffect(() => {
    setIsClient(true);
    const storedEntries = localStorage.getItem("timeEntries");
    if (storedEntries) {
      const parsedEntries: TimeEntry[] = JSON.parse(storedEntries);
      setTimeEntries(parsedEntries);
      const activeEntry = parsedEntries.find((entry) => !entry.endTime);
      if (activeEntry) {
        setCurrentEntry(activeEntry);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("timeEntries", JSON.stringify(timeEntries));
  }, [timeEntries]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (currentEntry) {
      interval = setInterval(() => {
        setElapsedTime(
          differenceInMilliseconds(new Date(), new Date(currentEntry.startTime))
        );
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentEntry]);

  const handleClockIn = useCallback(() => {
    if (currentEntry) return;
    const newEntry: TimeEntry = {
      id: crypto.randomUUID(),
      startTime: new Date().toISOString(),
    };
    setCurrentEntry(newEntry);
    setTimeEntries((prev) => [...prev, newEntry]);
    setElapsedTime(0);
  }, [currentEntry]);

  const handleClockOut = useCallback(() => {
    if (!currentEntry) return;
    const now = new Date().toISOString();
    const updatedEntry = { ...currentEntry, endTime: now };
    setTimeEntries((prev) =>
      prev.map((e) => (e.id === currentEntry.id ? updatedEntry : e))
    );
    setCurrentEntry(null);
    setElapsedTime(0);
  }, [currentEntry]);

  const completedEntries = useMemo(
    () => timeEntries.filter((e) => e.endTime),
    [timeEntries]
  );

  const calculateTotalHours = (entries: TimeEntry[]) => {
    return entries.reduce((total, entry) => {
      if (entry.endTime) {
        const duration = differenceInMilliseconds(
          new Date(entry.endTime),
          new Date(entry.startTime)
        );
        return total + duration;
      }
      return total;
    }, 0);
  };

  const dailyHours = useMemo(() => {
    const todayEntries = completedEntries.filter((e) =>
      isSameDay(new Date(e.startTime), new Date())
    );
    return calculateTotalHours(todayEntries);
  }, [completedEntries]);

  const weeklyHours = useMemo(() => {
    const start = startOfWeek(new Date());
    const end = endOfWeek(new Date());
    const weekEntries = completedEntries.filter((e) =>
      isWithinInterval(new Date(e.startTime), { start, end })
    );
    return calculateTotalHours(weekEntries);
  }, [completedEntries]);

  const reportHours = useMemo(() => {
    if (!reportRange?.from || !reportRange?.to) return 0;
    const reportEntries = completedEntries.filter((e) =>
      isWithinInterval(new Date(e.startTime), {
        start: reportRange.from!,
        end: reportRange.to!,
      })
    );
    return calculateTotalHours(reportEntries);
  }, [completedEntries, reportRange]);

  const calendarDayEntries = useMemo(() => {
    const daysWithEntries = new Set<string>();
    completedEntries.forEach((entry) => {
      daysWithEntries.add(format(new Date(entry.startTime), "yyyy-MM-dd"));
    });
    return Array.from(daysWithEntries).map(
      (dateStr) => new Date(dateStr + "T12:00:00")
    );
  }, [completedEntries]);

  const handleDownloadReport = useCallback(() => {
    if (!reportRange?.from || !reportRange?.to) return;
    const reportEntries = completedEntries
      .filter((e) =>
        isWithinInterval(new Date(e.startTime), {
          start: reportRange.from!,
          end: reportRange.to!,
        })
      )
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  
    let csvContent = "data:text/csv;charset=utf-8,Date,Clock In,Clock Out,Duration (HH:MM)\n";
  
    reportEntries.forEach(entry => {
      if (entry.endTime) {
        const date = format(new Date(entry.startTime), "yyyy-MM-dd");
        const clockIn = format(new Date(entry.startTime), "HH:mm:ss");
        const clockOut = format(new Date(entry.endTime), "HH:mm:ss");
        
        const durationMs = differenceInMilliseconds(new Date(entry.endTime), new Date(entry.startTime));
        const hours = Math.floor(durationMs / 3600000);
        const minutes = Math.floor((durationMs % 3600000) / 60000);
        const durationFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  
        csvContent += `${date},${clockIn},${clockOut},${durationFormatted}\n`;
      }
    });

    const totalHours = Math.floor(reportHours / 3600000);
    const totalMinutes = Math.floor((reportHours % 3600000) / 60000);
    csvContent += `\nTotal,,,"${totalHours}h ${totalMinutes}m"`;
  
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `clockwise_report_${format(reportRange.from, "yyyy-MM-dd")}_to_${format(reportRange.to, "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [completedEntries, reportRange, reportHours]);

  if (!isClient) {
    return null; // or a loading skeleton
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="p-4 border-b">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold font-headline text-primary">
              Clockwise
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "eeee, MMMM do")}
          </p>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1 flex flex-col gap-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-6 h-6" />
                  Time Control
                </CardTitle>
                <CardDescription>
                  Start or stop your work timer.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                {currentEntry && (
                  <div className="text-5xl font-mono bg-secondary text-secondary-foreground rounded-lg p-4 w-full text-center">
                    {formatDuration(elapsedTime)}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 w-full">
                  <Button
                    size="lg"
                    onClick={handleClockIn}
                    disabled={!!currentEntry}
                  >
                    <LogIn className="mr-2 h-5 w-5" /> Clock In
                  </Button>
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={handleClockOut}
                    disabled={!currentEntry}
                  >
                    <LogOut className="mr-2 h-5 w-5" /> Clock Out
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">
                  {formatDuration(dailyHours)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total hours worked today.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weekly Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-accent">
                  {formatDuration(weeklyHours)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total hours this week.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-6 h-6" />
                  Work Calendar
                </CardTitle>
                <CardDescription>
                  Days with logged time are highlighted.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="multiple"
                  selected={calendarDayEntries}
                  modifiersClassNames={{
                    selected: "bg-primary text-primary-foreground",
                  }}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="w-6 h-6" />
                  Reports
                </CardTitle>
                <CardDescription>
                  Generate a report for a specific period.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !reportRange && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {reportRange?.from ? (
                          reportRange.to ? (
                            <>
                              {format(reportRange.from, "LLL dd, y")} -{" "}
                              {format(reportRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(reportRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={reportRange?.from}
                        selected={reportRange}
                        onSelect={setReportRange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <p className="text-sm font-medium">Total hours in period:</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatDuration(reportHours)}
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                 <Button onClick={handleDownloadReport} disabled={!reportRange?.from || !reportRange?.to}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Report
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
      <footer className="py-4 mt-8 border-t">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Clockwise. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
