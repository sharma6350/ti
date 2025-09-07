
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { LogOut, UserPlus, Edit, Trash2, Shield, Users, BarChart, Megaphone, Settings, CheckCircle, XCircle, CalendarClock, DollarSign, Bell, QrCode, FileImage, MessageSquare, ArrowLeft, Printer, FileText, FileSpreadsheet, GripVertical, Search, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import SchoolHeader from '@/components/shared/SchoolHeader';
import { exportToExcel, exportToPdf, type ExportCell } from '@/lib/export';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TimetableEntry {
  day: string;
  period: number;
  class: string;
  subject: string;
  teacher: string;
}

interface Teacher {
  Name: string;
  Subjects: string;
}

interface ScheduleSettings {
  totalPeriods: string;
  startTime: string;
  periodDuration: string;
  workingDays: string[];
  lunchBreakAfter: string;
  lunchBreakDuration: string;
}

type ArrangementViewMode = 'class' | 'teacher';

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

export default function ArrangementPage() {
  const [dailyArrangement, setDailyArrangement] = useState<TimetableEntry[]>([]);
  const [allTeachers, setAllTeachers] = useState<string[]>([]);
  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [allClasses, setAllClasses] = useState<string[]>([]);
  const [periodTimings, setPeriodTimings] = useState<Map<number, string>>(new Map());
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);
  const [editedFields, setEditedFields] = useState<{ subject: string; teacher: string }>({ subject: '', teacher: '' });
  const [absentTeachers, setAbsentTeachers] = useState<Set<string>>(new Set());
  const [selectedDay, setSelectedDay] = useState<string>('');
  const { toast } = useToast();
  const [schoolId, setSchoolId] = useState<string>('');
  const [schoolName, setSchoolName] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [draggedTeacher, setDraggedTeacher] = useState<string | null>(null);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ArrangementViewMode>('class');

  const getStorageKey = useCallback((key: string) => schoolId ? `${schoolId}-${key}` : null, [schoolId]);

  useEffect(() => {
    const id = localStorage.getItem('schoolID');
    const name = localStorage.getItem('schoolName');
    if (id) setSchoolId(id);
    if (name) setSchoolName(name);
    setCurrentDate(new Date().toLocaleDateString('en-GB'));
  }, []);

  useEffect(() => {
    if (!schoolId) return;

    const teachersKey = getStorageKey('teacherData');
    if (teachersKey) {
        const storedTeachers = localStorage.getItem(teachersKey);
        if (storedTeachers) {
            try {
                const teacherData: Teacher[] = JSON.parse(storedTeachers);
                const uniqueTeachers = [...new Set(teacherData.map(t => t.Name))].sort();
                setAllTeachers(uniqueTeachers);
            } catch(e) { setAllTeachers([]); }
        }
    }
    
    const subjectsKey = getStorageKey('subjects');
    if(subjectsKey) {
        const storedSubjects = localStorage.getItem(subjectsKey);
        if(storedSubjects) {
             try {
                const subjectData: {name: string}[] = JSON.parse(storedSubjects);
                setAllSubjects(subjectData.map(s => s.name).sort());
            } catch (e) { setAllSubjects([]); }
        }
    }
    
    const classesKey = getStorageKey('classesAndSections');
    if (classesKey) {
        const storedClasses = localStorage.getItem(classesKey);
        if (storedClasses) {
             try {
                const classData: {name: string, sections: string[]}[] = JSON.parse(storedClasses);
                setAllClasses(classData.flatMap(c => c.sections.map(s => `${c.name} ${s}`)).sort());
            } catch(e) { setAllClasses([]); }
        }
    }

    const timetableKey = getStorageKey('resolvedTimetable');
    if (timetableKey) {
        const storedTimetable = localStorage.getItem(timetableKey);
        if (storedTimetable) {
             try { setDailyArrangement(JSON.parse(storedTimetable)); } catch (e) { setDailyArrangement([]); }
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
                if (settings.workingDays && settings.workingDays.length > 0) {
                    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                    const sortedDays = settings.workingDays.sort((a,b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
                    setSelectedDay(sortedDays[0]);
                }
            } catch (e) { setScheduleSettings(null); }
        }
    }
  }, [schoolId, getStorageKey]);

  const { periods, relevantDays, dailyTimetable, availableTeachersForModal, availableTeachersForPanel, absentTeachersArray, allTeachersForView } = useMemo(() => {
    const absentTeachersArray = Array.from(absentTeachers);
    const presentTeachers = allTeachers.filter(t => !absentTeachers.has(t));
    const availableTeachersForModal = [...presentTeachers];
    const availableTeachersForPanel = presentTeachers.filter(t => t.toLowerCase().includes(teacherSearchTerm.toLowerCase()));
    const allTeachersForView = [...allTeachers].sort();

    if (scheduleSettings && selectedDay) {
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const relevantDays = scheduleSettings.workingDays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
      
      let totalPeriodsWithLunch = parseInt(scheduleSettings.totalPeriods, 10);
      if (scheduleSettings.lunchBreakAfter && parseInt(scheduleSettings.lunchBreakAfter, 10) > 0) {
        totalPeriodsWithLunch++;
      }
      const periods = Array.from({ length: totalPeriodsWithLunch }, (_, i) => i + 1);
      
      const filteredTimetable = dailyArrangement.filter(entry => entry.day === selectedDay);

      return { periods, relevantDays, dailyTimetable: filteredTimetable, availableTeachersForModal, availableTeachersForPanel, absentTeachersArray, allTeachersForView };
    }
    return { periods: [], relevantDays: [], dailyTimetable: [], availableTeachersForModal, availableTeachersForPanel, absentTeachersArray, allTeachersForView };
  }, [scheduleSettings, dailyArrangement, selectedDay, allTeachers, absentTeachers, teacherSearchTerm]);

  const handleCellClick = (entry: TimetableEntry) => {
    if (isLunchBreak(entry.period)) return; 
    setSelectedEntry(entry);
    setEditedFields({
        subject: entry.subject,
        teacher: entry.teacher
    });
    setIsModalOpen(true);
  };
  
  const updateTeacherForEntry = (entryToUpdate: TimetableEntry, teacherName: string) => {
     if (isLunchBreak(entryToUpdate.period)) return;

    const conflict = dailyArrangement.find(
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

    const updatedTimetable = dailyArrangement.map((entry) =>
      entry.day === entryToUpdate.day &&
      entry.period === entryToUpdate.period &&
      entry.class === entryToUpdate.class
        ? { ...entry, teacher: teacherName }
        : entry
    );
    
    setDailyArrangement(updatedTimetable);
    toast({ title: 'Arrangement updated temporarily.' });
  };

  const handleSaveChanges = () => {
    if (!selectedEntry || !editedFields.teacher || !editedFields.subject) return;

     const conflict = dailyArrangement.find(
      (entry) =>
        entry.day === selectedEntry.day &&
        entry.period === selectedEntry.period &&
        entry.teacher === editedFields.teacher &&
        editedFields.teacher !== 'Unassigned' &&
        entry.class !== selectedEntry.class
    );

    if (conflict) {
      toast({
        title: 'Scheduling Conflict',
        description: `${editedFields.teacher} is already assigned to ${conflict.class} during this period.`,
        variant: 'destructive',
      });
      return;
    }

    const updatedTimetable = dailyArrangement.map((entry) =>
      entry.day === selectedEntry.day &&
      entry.period === selectedEntry.period &&
      entry.class === selectedEntry.class
        ? { ...entry, subject: editedFields.subject, teacher: editedFields.teacher }
        : entry
    );
    
    setDailyArrangement(updatedTimetable);
    toast({ title: 'Arrangement updated temporarily.' });
    setIsModalOpen(false);
    setSelectedEntry(null);
  };
  
  const getEntryForClass = (className: string, period: number) => {
    return dailyTimetable.find((entry) => entry.class === className && entry.period === period);
  };
  
  const getEntryForTeacher = (teacherName: string, period: number) => {
    return dailyTimetable.find((entry) => entry.teacher === teacherName && entry.period === period);
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
    const headers: ExportCell[] = [{ text: viewMode === 'class' ? 'Class' : 'Teacher', bold: true }];
    periods.forEach(p => headers.push({
      text: `${isLunchBreak(p) ? 'Lunch' : `P${getDisplayPeriodNumber(p)}`}\n${periodTimings.get(p) || ''}`,
      bold: true
    }));
    data.push(headers);
    
    const entityList = viewMode === 'class' ? allClasses : allTeachersForView;

    entityList.forEach(entityName => {
      const row: ExportCell[] = [{ text: entityName, bold: true }];
      periods.forEach(period => {
        if (isLunchBreak(period)) {
          row.push({ text: 'Lunch' });
        } else {
          const entry = viewMode === 'class' ? getEntryForClass(entityName, period) : getEntryForTeacher(entityName, period);
          if (entry) {
            const isShortage = entry.teacher === 'Unassigned';
            const isAbsent = absentTeachers.has(entry.teacher);
            const mainText = viewMode === 'class' ? `${entry.subject}\n${entry.teacher}` : `${entry.subject}\n${entry.class}`;
            row.push({ text: mainText, bold: isShortage, color: isShortage || isAbsent ? 'FF0000' : '000000' });
          } else {
            row.push({ text: '-' });
          }
        }
      });
      data.push(row);
    });

    return data;
  };
  
  const handlePrint = () => {
    window.print();
  };

  const handleExcelExport = () => {
    const dataForExport = generateExportData().map(row => 
        row.map(cell => cell.text)
    );
    exportToExcel(dataForExport, `${schoolName}_Arrangement_${selectedDay}`);
  };

  const handlePdfExport = () => {
    const dataForExport = generateExportData();
    exportToPdf(dataForExport, `${schoolName}_Arrangement_${selectedDay}`);
  };

  const toggleAbsentTeacher = (teacher: string) => {
      setAbsentTeachers(prev => {
          const newSet = new Set(prev);
          if (newSet.has(teacher)) {
              newSet.delete(teacher);
          } else {
              newSet.add(teacher);
          }
          return newSet;
      });
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
          </div>
          
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-grow">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>Daily Arrangement</CardTitle>
                        <CardDescription>Select a day, mark teachers absent, and drag available teachers to fill slots. Changes are temporary.</CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">{selectedDay}</p>
                        <p className="text-sm text-muted-foreground">{currentDate}</p>
                      </div>
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row gap-4 items-end">
                      <div className="w-full sm:w-auto">
                        <Select value={selectedDay} onValueChange={setSelectedDay}>
                            <SelectTrigger id="day-select" className="w-full sm:w-[180px]"><SelectValue placeholder="Select a day"/></SelectTrigger>
                            <SelectContent>
                                {relevantDays.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                            </SelectContent>
                        </Select>
                      </div>
                       <ToggleGroup type="single" value={viewMode} onValueChange={(value) => {if(value) setViewMode(value as ArrangementViewMode)}} >
                          <ToggleGroupItem value="class" aria-label="Class View">
                              <Users className="mr-2 h-4 w-4" /> Class View
                          </ToggleGroupItem>
                          <ToggleGroupItem value="teacher" aria-label="Teacher View">
                              <User className="mr-2 h-4 w-4" /> Teacher View
                          </ToggleGroupItem>
                      </ToggleGroup>
                  </div>
                </CardHeader>
                <CardContent>
                  {dailyTimetable.length === 0 ? (
                      <div className="text-center py-10">
                          <p className="text-muted-foreground">No timetable data found for this day.</p>
                      </div>
                  ) : (
                      <div className="overflow-x-auto printable-table">
                         {viewMode === 'class' ? (
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead className="min-w-[120px] p-1 text-xs font-bold text-foreground">Class</TableHead>
                                      {periods.map(period => (
                                          <TableHead key={period} className="text-center p-1 text-xs font-bold text-foreground">
                                              <div className='whitespace-nowrap'>{isLunchBreak(period) ? 'Lunch' : `P${getDisplayPeriodNumber(period)}`}</div>
                                              <div className="text-[10px] text-muted-foreground font-normal whitespace-nowrap">{periodTimings.get(period)}</div>
                                          </TableHead>
                                      ))}
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {allClasses.map((className) => (
                                      <TableRow key={className}>
                                          <TableCell className="font-semibold sticky left-0 bg-card z-10 p-1 text-xs">{className}</TableCell>
                                          {periods.map(period => {
                                              const entry = getEntryForClass(className, period);
                                              const isAbsentTeacherPeriod = entry && absentTeachers.has(entry.teacher);
                                              return (
                                                  <TableCell 
                                                      key={`${className}-${period}`} 
                                                      className={cn("text-center p-1 border", 
                                                          isAbsentTeacherPeriod && "bg-destructive/80 text-destructive-foreground",
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
                                                              <p className={cn("text-[11px] leading-tight", entry.teacher === 'Unassigned' ? "text-destructive-foreground font-bold" : "text-muted-foreground")}>{entry.teacher}</p>
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
                          ) : (
                             <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead className="min-w-[120px] p-1 text-xs font-bold text-foreground">Teacher</TableHead>
                                      {periods.map(period => (
                                          <TableHead key={period} className="text-center p-1 text-xs font-bold text-foreground">
                                              <div className='whitespace-nowrap'>{isLunchBreak(period) ? 'Lunch' : `P${getDisplayPeriodNumber(period)}`}</div>
                                              <div className="text-[10px] text-muted-foreground font-normal whitespace-nowrap">{periodTimings.get(period)}</div>
                                          </TableHead>
                                      ))}
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {allTeachersForView.map((teacherName) => {
                                      const isAbsent = absentTeachers.has(teacherName);
                                      return (
                                          <TableRow key={teacherName} className={cn(isAbsent && "bg-destructive/30")}>
                                              <TableCell className="font-semibold sticky left-0 bg-card z-10 p-1 text-xs">{teacherName}</TableCell>
                                              {periods.map(period => {
                                                  const entry = getEntryForTeacher(teacherName, period);
                                                  return (
                                                      <TableCell 
                                                          key={`${teacherName}-${period}`} 
                                                          className={cn("text-center p-1 border", 
                                                              !isLunchBreak(period) && !isAbsent && "cursor-pointer hover:bg-muted",
                                                              draggedTeacher && 'border-dashed border-primary'
                                                          )}
                                                          onClick={() => entry && !isAbsent && handleCellClick(entry)}
                                                          onDragOver={(e) => e.preventDefault()}
                                                          onDrop={(e) => entry && !isAbsent && handleDrop(e, entry)}
                                                      >
                                                          {isLunchBreak(period) ? (
                                                              <span className="text-muted-foreground text-xs">L</span>
                                                          ) : entry ? (
                                                              <div>
                                                                  <p className="font-semibold text-xs leading-tight">{entry.subject}</p>
                                                                  <p className="text-[11px] text-muted-foreground leading-tight">{entry.class}</p>
                                                              </div>
                                                          ) : (
                                                              <span className="text-muted-foreground">-</span>
                                                          )}
                                                      </TableCell>
                                                  )
                                              })}
                                          </TableRow>
                                      );
                                  })}
                              </TableBody>
                          </Table>
                          )}
                      </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="w-full lg:w-80 flex-shrink-0 no-print space-y-4">
              <Card>
                <CardHeader className='p-4'>
                  <CardTitle className='text-lg'>Arrangement Tools</CardTitle>
                </CardHeader>
                <CardContent className="p-2 space-y-4">
                    <div>
                         <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search teachers..." className="pl-8" value={teacherSearchTerm} onChange={e => setTeacherSearchTerm(e.target.value)} />
                        </div>
                        <ScrollArea className='h-48 mt-2 border rounded-md'>
                            <div className="space-y-1 p-2">
                                {allTeachers.filter(t => t.toLowerCase().includes(teacherSearchTerm.toLowerCase())).map(teacher => (
                                    <div key={teacher} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                                        <span className='text-sm font-medium'>{teacher}</span>
                                        <Button size="sm" variant={absentTeachers.has(teacher) ? 'secondary' : 'outline'} onClick={() => toggleAbsentTeacher(teacher)}>
                                            {absentTeachers.has(teacher) ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
                                            <span className="ml-2">{absentTeachers.has(teacher) ? 'Absent' : 'Present'}</span>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    <div>
                        <Label>Available for Substitution</Label>
                        <p className="text-xs text-muted-foreground mb-2">Drag a teacher onto a slot to substitute.</p>
                        <ScrollArea className='h-48 border rounded-md'>
                            <div className="space-y-1 p-2">
                                {['Unassigned', ...availableTeachersForPanel].map(teacher => (
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
                    </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
         {dailyTimetable.length > 0 && (
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
                <DialogTitle>Make Arrangement</DialogTitle>
                <DialogDescription>
                    Assign a new teacher or subject for {selectedEntry?.class} during Period {selectedEntry ? getDisplayPeriodNumber(selectedEntry.period) : ''} on {selectedEntry?.day}.
                </DialogDescription>
            </DialogHeader>
            {selectedEntry && (
                <div className="grid gap-4 py-4">
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
                        <Label htmlFor="teacher-select-modal" className="text-right">Available Teacher</Label>
                        <Select value={editedFields.teacher} onValueChange={(value) => setEditedFields(f => ({...f, teacher: value}))}>
                            <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Unassigned">Unassigned</SelectItem>
                                {availableTeachersForModal.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveChanges}>Save Arrangement</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    