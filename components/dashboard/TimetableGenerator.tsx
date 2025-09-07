
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface TimetableEntry {
  day: string;
  period: number;
  class: string;
  subject: string;
  teacher: string;
}

interface Subject {
  name: string;
  mandatory: boolean;
}

// Fisher-Yates shuffle algorithm
const shuffle = <T,>(array: T[]): T[] => {
    let currentIndex = array.length, randomIndex;
    const newArray = [...array];

    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [newArray[currentIndex], newArray[randomIndex]] = [newArray[randomIndex], newArray[currentIndex]];
    }

    return newArray;
};

const createAndResolveTimetable = (
  teachers: any[],
  subjects: Subject[],
  totalPeriods: number,
  days: string[],
  classes: any[],
  lunchAfter: number
): TimetableEntry[] => {
    const allClassSections: string[] = classes.flatMap(c => c.sections.map((s: string) => `${c.name} ${s}`));

    if (allClassSections.length === 0 || teachers.length === 0 || subjects.length === 0) {
        throw new Error("Cannot generate timetable. Ensure classes, teachers, and subjects are added.");
    }

    const mandatorySubjects = subjects.filter(s => s.mandatory).map(s => s.name);
    const optionalSubjects = subjects.filter(s => !s.mandatory).map(s => s.name);
    
    if (subjects.length === 0) {
        throw new Error("No subjects defined. Please add subjects.");
    }
    
    const subjectToTeachersMap = new Map<string, string[]>();
    subjects.forEach(subject => {
        const ableTeachers = teachers
            .filter(t => t.Subjects.split(',').map((s:string) => s.trim().toLowerCase()).includes(subject.name.toLowerCase()))
            .map(t => t.Name);
        if (ableTeachers.length > 0) {
            subjectToTeachersMap.set(subject.name, ableTeachers);
        }
    });

    const teacherWorkload: { [teacher: string]: number } = {};
    teachers.forEach(t => teacherWorkload[t.Name] = 0);

    const timetable: TimetableEntry[] = [];
    const teacherOccupiedSlots: Record<string, boolean> = {}; // "teacher-day-period"

    for (const day of days) {
        for (const className of allClassSections) {
            let subjectsForThisClass = shuffle(subjects.map(s => s.name));
            let periodSubjects: Set<string> = new Set();
            
            for (let i = 1; i <= totalPeriods; i++) {
                const period = i <= lunchAfter ? i : i + 1;
                let assignedInPeriod = false;

                // Attempt to assign a subject that hasn't been taught today
                let subjectsToTry = shuffle(subjectsForThisClass.filter(s => !periodSubjects.has(s)));
                if(subjectsToTry.length === 0) {
                  // if all subjects for the day have been taught once, allow repeats
                  subjectsToTry = shuffle(subjectsForThisClass);
                }
                
                for(const subject of subjectsToTry) {
                    const teachersForSubject = shuffle(subjectToTeachersMap.get(subject) || []);
                    const availableTeachers = teachersForSubject.filter(t => !teacherOccupiedSlots[`${t}-${day}-${period}`]);

                    if(availableTeachers.length > 0) {
                        availableTeachers.sort((a,b) => teacherWorkload[a] - teacherWorkload[b]);
                        const teacher = availableTeachers[0];

                        timetable.push({ day, period, class: className, subject, teacher });
                        teacherOccupiedSlots[`${teacher}-${day}-${period}`] = true;
                        teacherWorkload[teacher]++;
                        periodSubjects.add(subject);
                        assignedInPeriod = true;
                        break; 
                    }
                }
                
                if (!assignedInPeriod) {
                    timetable.push({ day, period, class: className, subject: subjects[0]?.name || "N/A", teacher: 'Unassigned' });
                }
            }
        }
    }

    // Resolve conflicts by reassigning or marking as unassigned
    for (const entry of timetable) {
      if (entry.teacher !== 'Unassigned') {
        const conflicts = timetable.filter(e => e.teacher === entry.teacher && e.day === entry.day && e.period === entry.period);
        if (conflicts.length > 1) {
           // Keep the first one, mark others as unassigned
           for (let i = 1; i < conflicts.length; i++) {
             conflicts[i].teacher = 'Unassigned';
           }
        }
      }
    }


    // Add lunch breaks
    for (const day of days) {
        for (const className of allClassSections) {
            timetable.push({ day, period: lunchAfter + 1, class: className, subject: 'Lunch Break', teacher: 'N/A' });
        }
    }

    return timetable;
};


export default function TimetableGenerator({ isTimetableGenerated }: { isTimetableGenerated: boolean }) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('schoolID');
    setSchoolId(id);
  }, []);
  
  const handleGeneration = async () => {
    setIsLoading(true);
    let errorMessage = 'An unknown error occurred.';

    try {
      if (!schoolId) {
          throw new Error("School ID not found. Please log in again.");
      }
      
      const teacherStorageKey = `${schoolId}-teacherData`;
      const subjectsStorageKey = `${schoolId}-subjects`;
      const settingsStorageKey = `${schoolId}-scheduleSettings`;
      const classesStorageKey = `${schoolId}-classesAndSections`;
      const resolvedTimetableKey = `${schoolId}-resolvedTimetable`;
      
      const teacherDataString = localStorage.getItem(teacherStorageKey);
      const subjectsString = localStorage.getItem(subjectsStorageKey);
      const scheduleSettingsString = localStorage.getItem(settingsStorageKey);
      const classesAndSectionsString = localStorage.getItem(classesStorageKey);

      if (!teacherDataString || !subjectsString || !scheduleSettingsString || !classesAndSectionsString) {
        errorMessage = 'Please ensure teacher data, subjects, schedule settings, and class data are all set.';
        throw new Error(errorMessage);
      }

      const teachers = JSON.parse(teacherDataString);
      const subjects: Subject[] = JSON.parse(subjectsString);
      const scheduleSettings = JSON.parse(scheduleSettingsString);
      const { totalPeriods, workingDays, lunchBreakAfter } = scheduleSettings;
      const classesData = JSON.parse(classesAndSectionsString);
      
      if (!totalPeriods || !workingDays || workingDays.length === 0 || !lunchBreakAfter) {
        errorMessage = 'Schedule settings are incomplete. Please check Timing and Days.';
        throw new Error(errorMessage);
      }
      
      const resolvedTimetable = createAndResolveTimetable(
        teachers,
        subjects,
        parseInt(totalPeriods, 10), 
        workingDays, 
        classesData,
        parseInt(lunchBreakAfter, 10)
      );

      if (resolvedTimetable.length === 0) {
        errorMessage = 'Cannot create timetable. Check your inputs for teachers, subjects, and classes.';
        throw new Error(errorMessage);
      }
      
      localStorage.setItem(resolvedTimetableKey, JSON.stringify(resolvedTimetable));
      
      // Manually trigger a storage event for other tabs/components to pick up the change
      window.dispatchEvent(new StorageEvent('storage', { key: resolvedTimetableKey, newValue: JSON.stringify(resolvedTimetable) }));

      toast({
        title: 'Timetable Generated!',
        description: 'Redirecting you to the edit page...',
      });
      
      router.push('/edit-timetable');
      
    } catch (error: any) {
      toast({
        title: 'Generation Failed',
        description: error.message || errorMessage,
        variant: 'destructive',
        duration: 8000
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <Button 
        onClick={handleGeneration} 
        disabled={isLoading || isTimetableGenerated} 
        size="lg" 
        className="w-full text-lg font-bold tracking-wider"
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isLoading ? 'Generating...' : (isTimetableGenerated ? 'Timetable Already Exists' : 'GENERATE TIMETABLE')}
      </Button>
      {isTimetableGenerated && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Force Regenerate Timetable
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete your current timetable and generate a new one. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleGeneration}>
                Yes, Regenerate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
