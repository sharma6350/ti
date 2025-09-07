
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Users, Printer, FileText, FileSpreadsheet, CalendarCog } from 'lucide-react';
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
    class: string;
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
          if (i === lunchAfterPeriod + 1) { 
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
      return new Map(); 
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


export default function TeacherTimetablePage() {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings | null>(null);
  const [schoolName, setSchoolName] = useState('');
  const [isTimetableGenerated, setIsTimetableGenerated] = useState(false);
  const [schoolId, setSchoolId] = useState<string>('');

  const getStorageKey = useCallback((key: string) => schoolId ? `${schoolId}-${key}` : null, [schoolId]);

  useEffect(() => {
    const id = localStorage.getItem('schoolID');
    if(id) setSchoolId(id);
    const name = localStorage.getItem('schoolName');
    if (name) setSchoolName(name);
  }, []);
  
  useEffect(() => {
    if (!schoolId) return;

    const timetableKey = getStorageKey('resolvedTimetable');
    if (timetableKey) {
        const storedTimetable = localStorage.getItem(timetableKey);
        if (storedTimetable) {
            try {
                let data = JSON.parse(storedTimetable);
                const parsedTimetable: TimetableEntry[] = Array.isArray(data) ? data : [];
                setTimetable(parsedTimetable);
                if (parsedTimetable.length > 0) setIsTimetableGenerated(true);
            } catch (e) {
                console.error("Failed to parse timetable data", e);
                setTimetable([]);
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
            } catch (e) {
                console.error("Failed to parse schedule settings", e);
                setScheduleSettings(null);
            }
        } else {
            setScheduleSettings(null);
        }
    }
  }, [schoolId, getStorageKey]);

  const assignedTeachers = useMemo(() => 
    [...new Set(timetable.map(item => item.teacher).filter(t => t && t !== 'Unassigned' && t !== 'N/A'))].sort(), 
  [timetable]);

  const periodTimings = useMemo(() => calculatePeriodTimings(scheduleSettings), [scheduleSettings]);

  const { periods, relevantDays, workingDaysSummary, consolidatedTimetable } = useMemo(() => {
    if (!scheduleSettings || !isTimetableGenerated) {
      return { periods: [], relevantDays: [], workingDaysSummary: "", consolidatedTimetable: new Map() };
    }

    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const relevantDays = scheduleSettings.workingDays.sort((a: string, b: string) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
    let totalPeriodsWithLunch = parseInt(scheduleSettings.totalPeriods, 10);
    if (scheduleSettings.lunchBreakAfter && parseInt(scheduleSettings.lunchBreakAfter, 10) >= 0) {
        totalPeriodsWithLunch++;
    }
    const periods = Array.from({length: totalPeriodsWithLunch }, (_, i) => i + 1);
    
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

    const consolidated = new Map<string, Map<number, ConsolidatedEntry[]>>();

    assignedTeachers.forEach(teacherName => {
        const teacherPeriods = new Map<number, ConsolidatedEntry[]>();
        periods.forEach(period => {
            const entriesForPeriod = timetable.filter(e => e.teacher === teacherName && Number(e.period) === period && e.subject !== 'Lunch Break');
            if (entriesForPeriod.length > 0) {
                const groupedBySubjClass = new Map<string, number[]>();
                entriesForPeriod.forEach(entry => {
                    const key = `${entry.subject}__${entry.class}`;
                    if (!groupedBySubjClass.has(key)) {
                        groupedBySubjClass.set(key, []);
                    }
                    groupedBySubjClass.get(key)!.push(dayNameToNumberMap[entry.day]);
                });

                const consolidatedEntries: ConsolidatedEntry[] = [];
                groupedBySubjClass.forEach((days, key) => {
                    const [subject, className] = key.split('__');
                    consolidatedEntries.push({ subject, class: className, days });
                });
                teacherPeriods.set(period, consolidatedEntries);
            }
        });
        consolidated.set(teacherName, teacherPeriods);
    });
    
    return { periods, relevantDays, workingDaysSummary: summary, consolidatedTimetable: consolidated };
  }, [scheduleSettings, timetable, assignedTeachers, isTimetableGenerated]);


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

  const getTeacherPeriodCount = (teacherName: string) => {
    return timetable.filter(entry => 
        entry.teacher === teacherName && 
        !isLunchBreak(Number(entry.period))
    ).length;
  };
  
  const generateExportData = (): ExportCell[][] => {
    const data: ExportCell[][] = [];
    const headers: ExportCell[] = [{ text: 'S.No.', bold: true }, { text: 'Teacher', bold: true }];
    periods.forEach(p => headers.push({
        text: `${getPeriodLabel(p)}\n${periodTimings.get(p) || ''}`,
        bold: true
    }));
    headers.push({ text: 'Total Periods', bold: true });
    data.push(headers);
    
    assignedTeachers.forEach((teacherName, index) => {
        const row: ExportCell[] = [{text: String(index + 1)}, { text: teacherName, bold: true }];
        const teacherEntries = consolidatedTimetable.get(teacherName);
        periods.forEach(period => {
            if (isLunchBreak(period)) {
                row.push({ text: 'Lunch' });
            } else {
                const periodEntries = teacherEntries?.get(period);
                if (periodEntries) {
                    const cellText = periodEntries.map(e => `${e.subject}\n${e.class}\n${formatDayRanges(e.days)}`).join('\n\n');
                    row.push({ text: cellText });
                } else {
                    row.push({ text: '-' });
                }
            }
        });
        row.push({ text: String(getTeacherPeriodCount(teacherName)), bold: true });
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
    exportToExcel(dataForExport, `${schoolName}_Teacher_Timetable`);
  }

  const handlePdfExport = () => {
    const dataForExport = generateExportData();
    exportToPdf(dataForExport, `${schoolName}_Teacher_Timetable`);
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
          <div className='no-print flex flex-col sm:flex-row justify-between items-center'>
            <Button asChild variant="outline" className="mb-4 sm:mb-0">
                <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <nav className="flex flex-wrap gap-2">
                <Button asChild variant="ghost"><Link href="/preview">Full View</Link></Button>
                <Button asChild variant="ghost"><Link href="/class-timetable">Class View</Link></Button>
                 <Button asChild variant="outline">
                    <Link href="/arrangement"><CalendarCog className="mr-2 h-4 w-4"/>Arrangement</Link>
                </Button>
            </nav>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Teacher-wise Timetable</CardTitle>
              <CardDescription>
                  {workingDaysSummary}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isTimetableGenerated ? (
                   <p className="text-muted-foreground mt-4 text-center py-10">No timetable generated yet. Please generate a timetable from the dashboard.</p>
              ) : ( 
                  <div className="overflow-x-auto printable-table">
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead className="w-8 p-1 font-bold text-foreground text-xs sm:text-sm">S.No.</TableHead>
                                  <TableHead className="sticky left-0 bg-card z-10 p-1 min-w-[150px] font-bold text-foreground text-xs sm:text-sm">Teacher</TableHead>
                                  {periods.map(period => (
                                      <TableHead key={period} className="text-center p-1 text-xs font-bold text-foreground">
                                          <div>{getPeriodLabel(period)}</div>
                                          <div className="text-[10px] text-muted-foreground font-normal whitespace-nowrap">{periodTimings.get(period)}</div>
                                      </TableHead>
                                  ))}
                                  <TableHead className="text-center p-1 min-w-[80px] font-bold text-foreground text-xs sm:text-sm">Total Periods</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {assignedTeachers.map((teacher, index) => (
                                  <TableRow key={teacher}>
                                      <TableCell className="font-medium p-1 text-center text-xs sm:text-sm">{index + 1}</TableCell>
                                      <TableCell className="font-semibold sticky left-0 bg-card z-10 p-2 text-xs sm:text-sm">{teacher}</TableCell>
                                      {periods.map(period => {
                                          const periodEntries = consolidatedTimetable.get(teacher)?.get(period);
                                          return (
                                              <TableCell key={`${teacher}-${period}`} className="text-center p-1">
                                                   {isLunchBreak(period) ? (
                                                      <span className="text-muted-foreground text-xs font-semibold">Lunch</span>
                                                   ) : periodEntries ? (
                                                      <div className="space-y-2">
                                                        {periodEntries.map(entry => (
                                                            <div key={`${entry.subject}-${entry.class}`}>
                                                              <p className="font-semibold text-xs leading-tight">{entry.subject}</p>
                                                              <p className="text-[11px] text-muted-foreground leading-tight">{entry.class}</p>
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
                                      <TableCell className="font-medium text-center p-1 text-xs sm:text-sm">{getTeacherPeriodCount(teacher)}</TableCell>
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

    