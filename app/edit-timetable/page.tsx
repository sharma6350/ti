
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Printer, FileText, FileSpreadsheet, GripVertical, User, Users, CalendarCog, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import SchoolHeader from '@/components/shared/SchoolHeader';
import { exportToExcel, exportToPdf, type ExportCell } from '@/lib/export';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TimetableEntry {
  day: string;
  period: number;
  class: string;
  subject: string;
  teacher: string;
}

interface ClassAndSection {
  id: string;
  name: string;
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

interface Teacher {
  Name: string;
  Subjects: string;
}

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

export default function EditTimetablePage() {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [allClasses, setAllClasses] = useState<string[]>([]);
  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [allTeachers, setAllTeachers] = useState<string[]>([]);
  const [periodTimings, setPeriodTimings] = useState<Map<number, string>>(new Map());
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);
  const [editedFields, setEditedFields] = useState<{day: string, class: string, period: number, subject: string, teacher: string}>({ day: '', class: '', period: 1, subject: '', teacher: '' });
  const [schoolName, setSchoolName] = useState('');
  const [draggedTeacher, setDraggedTeacher] = useState<string | null>(null);
  const { toast } = useToast();
  const [schoolId, setSchoolId] = useState<string>('');

  const getStorageKey = useCallback((key: string) => schoolId ? `${schoolId}-${key}` : null, [schoolId]);

  useEffect(() => {
    const id = localStorage.getItem('schoolID');
    if (id) setSchoolId(id);
    const name = localStorage.getItem('schoolName');
    if (name) setSchoolName(name);
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
                console.error("Error parsing class data from localStorage", e);
                setAllClasses([]);
            }
        } else {
            setAllClasses([]);
        }
    }

    const subjectsKey = getStorageKey('subjects');
    if(subjectsKey) {
        const storedSubjects = localStorage.getItem(subjectsKey);
        if(storedSubjects) {
            try {
                const subjectData: {name: string}[] = JSON.parse(storedSubjects);
                setAllSubjects(subjectData.map(s => s.name).sort());
            } catch (e) {
                 console.error("Error parsing subject data from localStorage", e);
                 setAllSubjects([]);
            }
        }
    }

    const teachersKey = getStorageKey('teacherData');
    if (teachersKey) {
        const storedTeachers = localStorage.getItem(teachersKey);
        if (storedTeachers) {
            try {
                const teacherData: Teacher[] = JSON.parse(storedTeachers);
                const uniqueTeachers = [...new Set(teacherData.map(t => t.Name))].sort();
                setAllTeachers(uniqueTeachers);
            } catch(e) {
                console.error("Error parsing teacher data from localStorage", e);
                setAllTeachers([]);
            }
        } else {
            setAllTeachers([]);
        }
    }

    const timetableKey = getStorageKey('resolvedTimetable');
    if (timetableKey) {
        const storedTimetable = localStorage.getItem(timetableKey);
        if (storedTimetable) {
            try {
                let data = JSON.parse(storedTimetable);
                setTimetable(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error("Error parsing timetable data from localStorage", e);
                setTimetable([]);
            }
        } else {
            setTimetable([]);
        }
    }

    const settingsKey = getStorageKey('scheduleSettings');
    if (settingsKey) {
        const storedSettings = localStorage.getItem(settingsKey);
        if (storedSettings) {
            try {
                const settings: ScheduleSettings = JSON.parse(storedSettings);
                setScheduleSettings(settings);
                setPeriodTimings(calculatePeriodTimings(settings));
            } catch (e) {
                console.error("Error parsing schedule settings from localStorage", e);
                setScheduleSettings(null);
            }
        } else {
            setScheduleSettings(null);
        }
    }
  }, [schoolId, getStorageKey]);

  const { periods, relevantDays } = useMemo(() => {
    if (scheduleSettings) {
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const relevantDays = scheduleSettings.workingDays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
      let totalPeriodsWithLunch = parseInt(scheduleSettings.totalPeriods, 10);
      if (scheduleSettings.lunchBreakAfter && parseInt(scheduleSettings.lunchBreakAfter, 10) > 0) {
        totalPeriodsWithLunch++;
      }
      const periods = Array.from({ length: totalPeriodsWithLunch }, (_, i) => i + 1);
      return { periods, relevantDays };
    }
    return { periods: [], relevantDays: [] };
  }, [scheduleSettings]);

  const handleCellClick = (entry: TimetableEntry) => {
    if (isLunchBreak(entry.period)) return; 
    setSelectedEntry(entry);
    setEditedFields({
        day: entry.day,
        class: entry.class,
        period: entry.period,
        subject: entry.subject,
        teacher: entry.teacher
    });
    setIsModalOpen(true);
  };

  const updateTeacherForEntry = (entryToUpdate: TimetableEntry, teacherName: string) => {
     if (isLunchBreak(entryToUpdate.period)) return;

    const conflict = timetable.find(
      (entry) =>
        entry.day === entryToUpdate.day &&
        entry.period === entryToUpdate.period &&
        entry.teacher === teacherName &&
        teacherName !== 'Unassigned' &&
        entry.class !== entryToUpdate.class
    );

    if (conflict) {
      toast({
        title: 'Scheduling Conflict',
        description: `${teacherName} is already assigned to ${conflict.class} during this period.`,
        variant: 'destructive',
      });
      return;
    }

    const updatedTimetable = timetable.map((entry) =>
      entry.day === entryToUpdate.day &&
      entry.period === entryToUpdate.period &&
      entry.class === entryToUpdate.class
        ? { ...entry, teacher: teacherName }
        : entry
    );
    
    const storageKey = getStorageKey('resolvedTimetable');
    if (storageKey) {
        setTimetable(updatedTimetable);
        localStorage.setItem(storageKey, JSON.stringify(updatedTimetable));
        toast({ title: 'Timetable updated successfully!' });
    }
  };

  const handleSaveChanges = () => {
    if (!selectedEntry || !editedFields.teacher || !editedFields.subject) return;

    const { day: newDay, class: newClass, period: newPeriod, subject: newSubject, teacher: newTeacher } = editedFields;

    // Check for conflicts in the new slot
    const teacherConflict = timetable.find(e => 
        e.day === newDay && 
        e.period === newPeriod && 
        e.teacher === newTeacher &&
        newTeacher !== 'Unassigned' &&
        (e.class !== selectedEntry.class || e.period !== selectedEntry.period || e.day !== selectedEntry.day)
    );
    if(teacherConflict) {
        toast({ title: 'Teacher Conflict', description: `${newTeacher} is already assigned to ${teacherConflict.class} at this time.`, variant: 'destructive' });
        return;
    }

    const classConflict = timetable.find(e => 
        e.day === newDay && 
        e.period === newPeriod &&
        e.class === newClass &&
        (e.class !== selectedEntry.class || e.period !== selectedEntry.period || e.day !== selectedEntry.day)
    );
    if(classConflict) {
        toast({ title: 'Class Conflict', description: `${newClass} already has a subject scheduled at this time.`, variant: 'destructive' });
        return;
    }

    // Update the timetable
    const updatedTimetable = timetable.map(entry => {
        if (entry.class === selectedEntry.class && entry.day === selectedEntry.day && entry.period === selectedEntry.period) {
            return {
                ...entry,
                day: newDay,
                class: newClass,
                period: newPeriod,
                subject: newSubject,
                teacher: newTeacher,
            };
        }
        return entry;
    });

    const storageKey = getStorageKey('resolvedTimetable');
    if (storageKey) {
        setTimetable(updatedTimetable);
        localStorage.setItem(storageKey, JSON.stringify(updatedTimetable));
        toast({ title: 'Timetable updated successfully!' });
    }

    setIsModalOpen(false);
    setSelectedEntry(null);
  };
  
  const handleDragStart = (teacherName: string) => {
    setDraggedTeacher(teacherName);
  };

  const handleDrop = (e: React.DragEvent<HTMLTableCellElement>, entry: TimetableEntry) => {
    e.preventDefault();
    if (draggedTeacher) {
      updateTeacherForEntry(entry, draggedTeacher);
    }
    setDraggedTeacher(null);
  };

  const getEntryForAll = (className: string, day: string, period: number) => {
    return timetable.find((entry) => entry.class === className && entry.day === day && Number(entry.period) === period);
  };

  const isLunchBreak = (period: number) => {
    if (scheduleSettings?.lunchBreakAfter) {
      return period === parseInt(scheduleSettings.lunchBreakAfter, 10) + 1;
    }
    return false;
  };
  
  const getDisplayPeriodNumber = (period: number) => {
    if (scheduleSettings) {
      const lunchAfter = parseInt(scheduleSettings.lunchBreakAfter, 10);
      if(isNaN(lunchAfter)) return period;
      if (period > lunchAfter) return period - 1;
    }
    return period;
  };
  
  const generateExportData = (): ExportCell[][] => {
    const data: ExportCell[][] = [];
    const headers: ExportCell[] = [{ text: 'Class', bold: true, color: '000000' }];
    relevantDays.forEach(day => {
        periods.forEach(p => {
            const timing = periodTimings.get(p) || '';
            const headerText = `${day.substring(0, 3)}-${isLunchBreak(p) ? 'L' : `P${getDisplayPeriodNumber(p)}`}\n${timing}`;
            headers.push({ text: headerText, bold: true, color: '000000' });
        });
    });
    data.push(headers);

    allClasses.forEach(className => {
      const row: ExportCell[] = [{ text: className, bold: true, color: '000000' }];
      relevantDays.forEach(day => {
        periods.forEach(period => {
           if(isLunchBreak(period)) {
              row.push({ text: 'Lunch Break' });
           } else {
            const entry = getEntryForAll(className, day, period);
            if (entry) {
                const isShortage = entry.teacher === 'Unassigned';
                const cell: ExportCell = {
                    text: `${entry.subject}\n${entry.teacher}`,
                    bold: isShortage,
                    color: isShortage ? 'FF0000' : '000000'
                };
                row.push(cell);
            } else {
                row.push({ text: '-' });
            }
           }
        });
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
    exportToExcel(dataForExport, `${schoolName}_Editable_Timetable`);
  }

  const handlePdfExport = () => {
    const dataForExport = generateExportData();
    exportToPdf(dataForExport, `${schoolName}_Editable_Timetable`);
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-2 sm:p-4 lg:p-6">
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
      <main className="w-full mx-auto">
        <div id="printable-area">
          <SchoolHeader schoolName={schoolName} schoolId={schoolId} />
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 no-print">
              <Button asChild variant="outline">
                  <Link href="/dashboard">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Dashboard
                  </Link>
              </Button>
              <nav className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
                  <Button asChild variant="outline">
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
                      <Link href="/arrangement">
                        <CalendarCog className="mr-2 h-4 w-4" /> Arrangement
                      </Link>
                  </Button>
              </nav>
          </div>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-grow lg:w-[calc(100%-18rem)]">
              <Card>
                <CardHeader>
                  <CardTitle>Edit Timetable</CardTitle>
                  <CardDescription>Click a cell to edit, or drag a teacher from the list on the right. Changes are saved automatically.</CardDescription>
                </CardHeader>
                <CardContent>
                  {timetable.length === 0 ? (
                      <div className="text-center py-10">
                          <p className="text-muted-foreground">No timetable data found. Please generate one from the dashboard.</p>
                      </div>
                  ) : (
                      <div className="overflow-x-auto printable-table">
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead className="w-8 p-1 text-xs font-bold text-foreground">S.No.</TableHead>
                                      <TableHead className="sticky left-0 bg-card z-10 min-w-[100px] p-1 text-xs font-bold text-foreground">Class</TableHead>
                                      {relevantDays.map(day => (
                                          periods.map(period => (
                                              <TableHead key={`${day}-${period}`} className="text-center p-1 text-xs font-bold text-foreground">
                                                  <div className='whitespace-nowrap'>{day.substring(0,3)}-{isLunchBreak(period) ? 'L' : `P${getDisplayPeriodNumber(period)}`}</div>
                                                  <div className="text-[10px] text-muted-foreground font-normal whitespace-nowrap">{periodTimings.get(period)}</div>
                                              </TableHead>
                                          ))
                                      ))}
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {allClasses.map((className, index) => (
                                      <TableRow key={className}>
                                          <TableCell className="font-medium p-1 text-center text-xs">{index + 1}</TableCell>
                                          <TableCell className="font-semibold sticky left-0 bg-card z-10 p-1 text-xs">{className}</TableCell>
                                          {relevantDays.map(day => (
                                              periods.map(period => {
                                                  const entry = getEntryForAll(className, day, period);
                                                  const isShortage = entry?.teacher === 'Unassigned';
                                                  return (
                                                      <TableCell 
                                                          key={`${className}-${day}-${period}`} 
                                                          className={cn("text-center p-1 border", 
                                                              isShortage && "bg-destructive/20",
                                                              !isLunchBreak(period) && "cursor-pointer hover:bg-muted",
                                                              draggedTeacher && 'border-dashed border-primary'
                                                          )}
                                                          onClick={() => entry && handleCellClick(entry)}
                                                          onDragOver={(e) => e.preventDefault()}
                                                          onDrop={(e) => entry && handleDrop(e, entry)}
                                                      >
                                                          {isLunchBreak(period) ? (
                                                              <span className="text-muted-foreground text-xs">L</span>
                                                          ) : entry ? (
                                                              <div>
                                                                  <p className="font-semibold text-xs leading-tight">{entry.subject}</p>
                                                                  <p className={cn("text-[11px] leading-tight", isShortage ? "text-destructive font-bold" : "text-muted-foreground")}>{entry.teacher}</p>
                                                              </div>
                                                          ) : (
                                                              <span className="text-muted-foreground">-</span>
                                                          )}
                                                      </TableCell>
                                                  )
                                              })
                                          ))}
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                      </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="w-full lg:w-64 flex-shrink-0 no-print">
              <Card>
                <CardHeader className='p-4'>
                  <CardTitle className='text-lg'>Teachers</CardTitle>
                  <CardDescription className='text-xs'>Drag a teacher onto a timetable slot to assign them.</CardDescription>
                </CardHeader>
                <CardContent className='p-2'>
                  <ScrollArea className='h-[60vh] max-h-[calc(100vh-20rem)]'>
                    <div className="space-y-2">
                      {['Unassigned', ...allTeachers].map(teacher => (
                        <div
                          key={teacher}
                          draggable
                          onDragStart={() => handleDragStart(teacher)}
                          className='flex items-center p-2 border rounded-md cursor-grab active:cursor-grabbing bg-secondary hover:bg-muted'
                        >
                          <GripVertical className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className='text-sm font-medium'>{teacher}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Assignment</DialogTitle>
                <DialogDescription>
                    Change the details for this period. The system will check for conflicts.
                </DialogDescription>
            </DialogHeader>
            {selectedEntry && (
                <div className="grid gap-4 py-4">
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="day-select-modal" className="text-right">Day</Label>
                        <Select value={editedFields.day} onValueChange={(value) => setEditedFields(f => ({...f, day: value}))}>
                            <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {relevantDays.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="class-select-modal" className="text-right">Class</Label>
                        <Select value={editedFields.class} onValueChange={(value) => setEditedFields(f => ({...f, class: value}))}>
                            <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {allClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="period-select-modal" className="text-right">Period</Label>
                        <Select value={String(editedFields.period)} onValueChange={(value) => setEditedFields(f => ({...f, period: Number(value)}))}>
                            <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {periods.filter(p => !isLunchBreak(p)).map(p => (
                                    <SelectItem key={p} value={String(p)}>
                                        {`P${getDisplayPeriodNumber(p)} (${periodTimings.get(p)})`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="subject-select-modal" className="text-right">Subject</Label>
                        <Select value={editedFields.subject} onValueChange={(value) => setEditedFields(f => ({...f, subject: value}))}>
                            <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {allSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="teacher-select-modal" className="text-right">Teacher</Label>
                        <Select value={editedFields.teacher} onValueChange={(value) => setEditedFields(f => ({...f, teacher: value}))}>
                            <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Unassigned">Unassigned</SelectItem>
                                {allTeachers.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveChanges}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    