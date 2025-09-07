
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LayoutGrid, User, Users, Printer, FileText, FileSpreadsheet, Edit, CalendarCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import SchoolHeader from '@/components/shared/SchoolHeader';
import { exportToExcel, exportToPdf, type ExportCell } from '@/lib/export';

interface TimetableEntry {
  day: string;
  period: number;
  class: string;
  subject: string;
  teacher: string;
}

interface ClassAndSection {
  id: string;
  name:string;
  sections: string[];
}

interface ScheduleSettings {
  totalPeriods: string;
  startTime: string;
  periodDuration: string;
  workingDays: string[];
  lunchBreakAfter: string;
  lunchBreakDuration: string;
}

interface ConsolidatedEntry {
    subject: string;
    teacher: string;
    days: number[];
}

const dayNameToNumberMap: { [key: string]: number } = {
    'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 7
};

const numberToDay = (num: number) => Object.keys(dayNameToNumberMap).find(key => dayNameToNumberMap[key] === num);

const calculatePeriodTimings = (settings: ScheduleSettings | null): Map<number, string> => {
    const timings = new Map<number, string>();
    if (!settings || !settings.startTime || !settings.periodDuration || !settings.totalPeriods || !settings.lunchBreakAfter || !settings.lunchBreakDuration) {
        return timings;
    }

    const { startTime, periodDuration, lunchBreakAfter, lunchBreakDuration, totalPeriods } = settings;
    
    try {
      let [startHour, startMinute] = startTime.split(':').map(Number);
      if (isNaN(startHour) || isNaN(startMinute)) return new Map();
      
      let currentTime = new Date();
      currentTime.setHours(startHour, startMinute, 0, 0);

      const formatTime = (date: Date) => {
          return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase();
      };

      const lunchAfterPeriod = parseInt(lunchBreakAfter, 10);
      const lunchDur = parseInt(lunchBreakDuration, 10);
      const periodDur = parseInt(periodDuration, 10);
      const totalPeriodsNum = parseInt(totalPeriods, 10);
      
      if (isNaN(lunchAfterPeriod) || isNaN(lunchDur) || isNaN(periodDur) || isNaN(totalPeriodsNum)) return new Map();

      for (let i = 1; i <= totalPeriodsNum + 1; i++) {
        const periodStartTime = new Date(currentTime.getTime());
        if (i === lunchAfterPeriod + 1) { // This is the lunch break
          const lunchEndTime = new Date(periodStartTime.getTime() + lunchDur * 60000);
          timings.set(i, `${formatTime(periodStartTime)}-${formatTime(lunchEndTime)}`);
          currentTime = lunchEndTime;
        } else {
          const periodEndTime = new Date(periodStartTime.getTime() + periodDur * 60000);
          timings.set(i, `${formatTime(periodStartTime)}-${formatTime(periodEndTime)}`);
          currentTime = periodEndTime;
        }
      }
    } catch(e) {
      console.error("Error calculating timings:", e);
      return new Map(); // Return empty map on error
    }

    return timings;
};

const formatDayRanges = (dayNumbers: number[]): string => {
    if (!dayNumbers || dayNumbers.length === 0) return '';
    const sortedDays = [...dayNumbers].sort((a, b) => a - b);
    
    if (sortedDays.length === 1) return `(Day: ${sortedDays[0]})`;
    
    const ranges: string[] = [];
    let start = sortedDays[0];
    let end = sortedDays[0];

    for (let i = 1; i < sortedDays.length; i++) {
        if (sortedDays[i] === end + 1) {
            end = sortedDays[i];
        } else {
            ranges.push(start === end ? `${start}` : `${start}-${end}`);
            start = sortedDays[i];
            end = sortedDays[i];
        }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return `(Days: ${ranges.join(',')})`;
};

export default function PreviewPage() {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [allClasses, setAllClasses] = useState<string[]>([]);
  const [periodTimings, setPeriodTimings] = useState<Map<number, string>>(new Map());
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings | null>(null);
  const [isTimetableGenerated, setIsTimetableGenerated] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [schoolId, setSchoolId] = useState<string>('');

  const getStorageKey = useCallback((key: string) => schoolId ? `${schoolId}-${key}` : null, [schoolId]);

  useEffect(() => {
    const id = localStorage.getItem('schoolID');
    if(id) setSchoolId(id);
    const name = localStorage.getItem('schoolName');
    if(name) setSchoolName(name);
  }, []);

  useEffect(() => {
    if (!schoolId) return;

    const classesKey = getStorageKey('classesAndSections');
    if (classesKey) {
        const storedClasses = localStorage.getItem(classesKey);
        if (storedClasses) {
            try {
                const classData: ClassAndSection[] = JSON.parse(storedClasses);
                const allClassSections = classData.flatMap(c => c.sections.map(s => `${c.name} ${s}`)).sort();
                setAllClasses(allClassSections);
            } catch(e) {
                console.error("Failed to parse class data", e);
                setAllClasses([]);
            }
        } else {
            setAllClasses([]);
        }
    }

    const timetableKey = getStorageKey('resolvedTimetable');
    if (timetableKey) {
        const storedTimetable = localStorage.getItem(timetableKey);
        if (storedTimetable) {
            try {
                let data = JSON.parse(storedTimetable);
                setTimetable(Array.isArray(data) ? data : []);
                if (Array.isArray(data) && data.length > 0) {
                    setIsTimetableGenerated(true);
                }
            } catch (e) {
                console.error("Failed to parse timetable data", e);
                setTimetable([]);
                setIsTimetableGenerated(false);
            }
        } else {
            setTimetable([]);
            setIsTimetableGenerated(false);
        }
    }

    const settingsKey = getStorageKey('scheduleSettings');
    if (settingsKey) {
        const storedSettings = localStorage.getItem(settingsKey);
        if (storedSettings) {
            try {
                const settings: ScheduleSettings = JSON.parse(storedSettings);
                setScheduleSettings(settings);
                const timings = calculatePeriodTimings(settings);
                setPeriodTimings(timings);
            } catch (e) {
                console.error("Failed to parse schedule settings", e);
                setScheduleSettings(null);
            }
        } else {
            setScheduleSettings(null);
        }
    }
  }, [schoolId, getStorageKey]);

  const { periods, relevantDays, consolidatedTimetable, workingDaysSummary } = useMemo(() => {
    if (!scheduleSettings || !isTimetableGenerated) {
        return { periods: [], relevantDays: [], consolidatedTimetable: new Map(), workingDaysSummary: "No schedule generated." };
    }
    
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const relevantDays = scheduleSettings.workingDays.sort((a,b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
    let totalPeriodsWithLunch = parseInt(scheduleSettings.totalPeriods, 10);
      if (scheduleSettings.lunchBreakAfter && parseInt(scheduleSettings.lunchBreakAfter, 10) >= 0) {
          totalPeriodsWithLunch++;
      }
    const periods = Array.from({length: totalPeriodsWithLunch }, (_, i) => i + 1);

    const consolidated = new Map<string, Map<number, ConsolidatedEntry[]>>();

    allClasses.forEach(className => {
        const classPeriods = new Map<number, ConsolidatedEntry[]>();
        periods.forEach(period => {
            const entriesForPeriod = timetable.filter(e => e.class === className && Number(e.period) === period && e.subject !== 'Lunch Break');
            if (entriesForPeriod.length > 0) {
                const groupedBySubjTeacher = new Map<string, number[]>();
                entriesForPeriod.forEach(entry => {
                    const key = `${entry.subject}__${entry.teacher}`;
                    if (!groupedBySubjTeacher.has(key)) {
                        groupedBySubjTeacher.set(key, []);
                    }
                    groupedBySubjTeacher.get(key)!.push(dayNameToNumberMap[entry.day]);
                });

                const consolidatedEntries: ConsolidatedEntry[] = [];
                groupedBySubjTeacher.forEach((days, key) => {
                    const [subject, teacher] = key.split('__');
                    consolidatedEntries.push({ subject, teacher, days });
                });
                classPeriods.set(period, consolidatedEntries);
            }
        });
        consolidated.set(className, classPeriods);
    });
    
    const dayNums = relevantDays.map(day => dayNameToNumberMap[day]).sort((a, b) => a - b);
    let summary = "No working days selected.";
    if (dayNums.length > 0) {
        if (dayNums.length === 1) summary = `Showing schedule for ${numberToDay(dayNums[0])}.`;
        else {
          const ranges: string[] = [];
          let start = dayNums[0];
          let end = dayNums[0];
          for (let i = 1; i < dayNums.length; i++) {
              if (dayNums[i] === end + 1) end = dayNums[i];
              else {
                  ranges.push(start === end ? `${numberToDay(start)}` : `${numberToDay(start)} - ${numberToDay(end)}`);
                  start = dayNums[i]; end = dayNums[i];
              }
          }
          ranges.push(start === end ? `${numberToDay(start)}` : `${numberToDay(start)} - ${numberToDay(end)}`);
          summary = `Showing schedule for ${relevantDays.length} working day(s): ${ranges.join(', ')}`;
        }
    }

    return { periods, relevantDays, consolidatedTimetable: consolidated, workingDaysSummary: summary };
  }, [scheduleSettings, timetable, allClasses, isTimetableGenerated]);

  const isLunchBreak = (period: number) => {
    if (scheduleSettings && scheduleSettings.lunchBreakAfter) {
        const lunchAfterPeriod = parseInt(scheduleSettings.lunchBreakAfter, 10);
        return period === lunchAfterPeriod + 1;
    }
    return false;
  }
  
  const getDisplayPeriodNumber = (period: number) => {
    if (scheduleSettings) {
        const lunchAfter = parseInt(scheduleSettings.lunchBreakAfter, 10);
        if (isNaN(lunchAfter)) return period;
        if (period > lunchAfter) return period - 1;
    }
    return period;
  }
  
  const getPeriodLabel = (period: number) => {
    if (isLunchBreak(period)) return 'Lunch';
    return `P${getDisplayPeriodNumber(period)}`;
  }
  
  const generateExportData = (): ExportCell[][] => {
    const data: ExportCell[][] = [];
    const headers: ExportCell[] = [{ text: 'S.No.', bold: true }, { text: 'Class', bold: true }];
    periods.forEach(p => headers.push({
        text: `${getPeriodLabel(p)}\n${periodTimings.get(p) || ''}`,
        bold: true
    }));
    data.push(headers);
    
    allClasses.forEach((className, index) => {
        const row: ExportCell[] = [{text: String(index + 1)}, { text: className, bold: true }];
        const classEntries = consolidatedTimetable.get(className);
        periods.forEach(period => {
            if (isLunchBreak(period)) {
                row.push({ text: 'Lunch' });
            } else {
                const periodEntries = classEntries?.get(period);
                if (periodEntries) {
                    const cellText = periodEntries.map(e => `${e.subject}\n${e.teacher}\n${formatDayRanges(e.days)}`).join('\n\n');
                    const isShortage = periodEntries.some(e => e.teacher === 'Unassigned');
                    row.push({ text: cellText, bold: isShortage, color: isShortage ? 'FF0000' : '000000'});
                } else {
                    row.push({ text: '-' });
                }
            }
        });
        data.push(row);
    });

    return data;
  }
  
  const handlePrint = () => {
    window.print();
  }

  const handleExcelExport = () => {
    const dataForExport = generateExportData().map(row => 
        row.map(cell => cell.text)
    );
    exportToExcel(dataForExport, `${schoolName}_Timetable_Full`);
  }

  const handlePdfExport = () => {
    const dataForExport = generateExportData();
    exportToPdf(dataForExport, `${schoolName}_Timetable_Full`);
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <style>{`
        @media print {
          body {
            background-color: #fff;
          }
          .no-print { 
            display: none !important; 
          }
          #printable-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            height: auto;
            overflow: visible;
          }
          #printable-area * { 
            visibility: visible; 
          }
          .printable-table {
            font-size: 8px;
          }
          .printable-table th, .printable-table td {
            padding: 2px;
          }
        }
      `}</style>
      <main className="max-w-full mx-auto">
        <div id="printable-area">
          <SchoolHeader schoolName={schoolName} schoolId={schoolId} />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 no-print">
              <Button asChild variant="outline">
                  <Link href="/dashboard">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Dashboard
                  </Link>
              </Button>
              {isTimetableGenerated && (
               <nav className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
                  <Button asChild variant="default">
                      <Link href="/preview">
                      <LayoutGrid className="mr-2 h-4 w-4" /> Full Preview
                      </Link>
                  </Button>
                  <Button asChild variant="outline">
                      <Link href="/teacher-timetable">
                      <User className="mr-2 h-4 w-4" /> Teacher-wise
                      </Link>
                  </Button>
                  <Button asChild variant="outline">
                      <Link href="/class-timetable">
                      <Users className="mr-2 h-4 w-4" /> Class-wise
                      </Link>
                  </Button>
                  <Button asChild variant="outline">
                      <Link href="/edit-timetable">
                        <Edit className="mr-2 h-4 w-4" /> Edit Timetable
                      </Link>
                  </Button>
                   <Button asChild variant="outline">
                      <Link href="/arrangement">
                        <CalendarCog className="mr-2 h-4 w-4" /> Arrangement
                      </Link>
                  </Button>
                  </nav>
              )}
          </div>
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                  <CardTitle>Generated Timetable Preview</CardTitle>
                  <CardDescription>{workingDaysSummary}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {timetable.length === 0 ? (
                  <div className="text-center py-10">
                      <p className="text-muted-foreground">No timetable data found.</p>
                      <p className="text-muted-foreground text-sm">Please generate a timetable from the dashboard.</p>
                  </div>
              ) : (
                  <div className="overflow-x-auto printable-table">
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead className="w-8 p-1 font-bold text-foreground text-xs sm:text-sm">S.No.</TableHead>
                                  <TableHead className="min-w-[100px] p-1 font-bold text-foreground sticky left-0 bg-card z-10 text-xs sm:text-sm">Class</TableHead>
                                  {periods.map(period => (
                                      <TableHead key={period} className="text-center p-1 text-xs font-bold text-foreground">
                                          <div>{getPeriodLabel(period)}</div>
                                          <div className="text-[10px] text-muted-foreground font-normal whitespace-nowrap">{periodTimings.get(period)}</div>
                                      </TableHead>
                                  ))}
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                            {allClasses.map((className, index) => (
                              <TableRow key={className}>
                                <TableCell className="font-medium p-1 text-center text-xs sm:text-sm">{index + 1}</TableCell>
                                <TableCell className="font-semibold p-1 sticky left-0 bg-card z-10 text-xs sm:text-sm">{className}</TableCell>
                                {periods.map(period => {
                                  const periodEntries = consolidatedTimetable.get(className)?.get(period);
                                  const isShortage = periodEntries?.some(e => e.teacher === 'Unassigned');
                                  return (
                                    <TableCell key={`${className}-${period}`} className={cn("text-center p-1", isShortage && "bg-destructive/20")}>
                                      {isLunchBreak(period) ? (
                                        <span className="text-muted-foreground text-xs font-semibold">Lunch</span>
                                      ) : periodEntries ? (
                                        <div className="space-y-2">
                                          {periodEntries.map(entry => (
                                              <div key={`${entry.subject}-${entry.teacher}`}>
                                                <p className="font-semibold text-xs leading-tight">{entry.subject}</p>
                                                <p className={cn("text-[11px] leading-tight", entry.teacher === 'Unassigned' ? "text-destructive font-bold" : "text-muted-foreground")}>{entry.teacher}</p>
                                                <p className="text-[10px] text-muted-foreground font-mono">{formatDayRanges(entry.days)}</p>
                                              </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                  )
                                })}
                              </TableRow>
                            ))}
                          </TableBody>
                      </Table>
                  </div>
              )}
            </CardContent>
          </Card>
        </div>
        {timetable.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4 no-print">
            <Button onClick={handlePrint} variant="outline">
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button onClick={handleExcelExport} variant="outline">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Export to Excel
            </Button>
            <Button onClick={handlePdfExport} variant="outline">
              <FileText className="mr-2 h-4 w-4" /> Export to PDF
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

    