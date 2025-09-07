
'use client';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';

interface DayOption {
  value: string;
  label: string;
  num: number;
}

const initialDays: DayOption[] = [
    { value: 'monday', label: 'Monday', num: 1 },
    { value: 'tuesday', label: 'Tuesday', num: 2 },
    { value: 'wednesday', label: 'Wednesday', num: 3 },
    { value: 'thursday', label: 'Thursday', num: 4 },
    { value: 'friday', label: 'Friday', num: 5 },
    { value: 'saturday', label: 'Saturday', num: 6 },
    { value: 'sunday', label: 'Sunday', num: 7 },
];

export default function ScheduleSetup() {
  const [totalPeriods, setTotalPeriods] = useState('');
  const [startTime, setStartTime] = useState('');
  const [periodDuration, setPeriodDuration] = useState('');
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [lunchBreakAfter, setLunchBreakAfter] = useState('');
  const [lunchBreakDuration, setLunchBreakDuration] = useState('');
  const [allDays, setAllDays] = useState<DayOption[]>(initialDays);
  const [newDayInput, setNewDayInput] = useState('');
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const { toast } = useToast();

  const dayNameToNumberMap: { [key: string]: number } = useMemo(() => 
    allDays.reduce((acc, day) => {
        acc[day.label] = day.num;
        return acc;
    }, {} as { [key: string]: number })
  , [allDays]);

  const getStorageKey = (key: string) => schoolId ? `${schoolId}-${key}` : null;

  useEffect(() => {
    const id = localStorage.getItem('schoolID');
    setSchoolId(id);
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    const storageKey = getStorageKey('scheduleSettings');
    if (!storageKey) return;
    const storedSettings = localStorage.getItem(storageKey);
    if (storedSettings) {
      try {
        const { totalPeriods, startTime, workingDays, lunchBreakAfter, lunchBreakDuration, periodDuration, allDays: storedAllDays } = JSON.parse(storedSettings);
        setTotalPeriods(totalPeriods || '');
        setStartTime(startTime || '');
        setPeriodDuration(periodDuration || '');
        setWorkingDays(workingDays || []);
        setLunchBreakAfter(lunchBreakAfter || '');
        setLunchBreakDuration(lunchBreakDuration || '');
        if (storedAllDays && Array.isArray(storedAllDays) && storedAllDays.length > 0) {
          setAllDays(storedAllDays);
        } else {
          setAllDays(initialDays);
        }
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    } else {
        // Reset to default if nothing is stored for this school ID
        setTotalPeriods('');
        setStartTime('');
        setPeriodDuration('');
        setWorkingDays([]);
        setLunchBreakAfter('');
        setLunchBreakDuration('');
        setAllDays(initialDays);
    }
  }, [schoolId]);

  const setSettings = () => {
    const storageKey = getStorageKey('scheduleSettings');
    if (!storageKey) return;
    if (parseInt(totalPeriods) > 0 && startTime && workingDays.length > 0 && parseInt(lunchBreakAfter) > 0 && parseInt(lunchBreakDuration) > 0 && parseInt(periodDuration) > 0) {
      const settings = { totalPeriods, startTime, workingDays, lunchBreakAfter, lunchBreakDuration, periodDuration, allDays };
      localStorage.setItem(storageKey, JSON.stringify(settings));
      toast({ title: 'Schedule settings have been saved.' });
    } else {
        toast({ title: 'Please provide valid inputs for all fields.', variant: 'destructive' });
    }
  };

  const handleToggleDay = (dayLabel: string) => {
    setWorkingDays(prev => {
        const newWorkingDays = prev.includes(dayLabel) 
            ? prev.filter(d => d !== dayLabel) 
            : [...prev, dayLabel];
        
        return newWorkingDays.sort((a,b) => (dayNameToNumberMap[a] || 0) - (dayNameToNumberMap[b] || 0));
    });
  };

  const handleAddDay = () => {
    const trimmedDay = newDayInput.trim();
    if (!trimmedDay) {
        toast({ title: "Day name cannot be empty.", variant: "destructive" });
        return;
    }
    const dayValue = trimmedDay.toLowerCase().replace(/\s/g, '');
    if (allDays.some(d => d.value === dayValue)) {
        toast({ title: "This day already exists.", variant: "destructive" });
        return;
    }
    const newDay: DayOption = {
        value: dayValue,
        label: trimmedDay,
        num: allDays.length > 0 ? Math.max(...allDays.map(d => d.num)) + 1 : 1,
    };
    setAllDays([...allDays, newDay].sort((a,b) => a.num - b.num));
    setNewDayInput('');
    toast({ title: `Day "${trimmedDay}" added.` });
  };

  const handleDeleteDay = (dayValueToDelete: string) => {
    const dayLabelToDelete = allDays.find(d => d.value === dayValueToDelete)?.label;
    setAllDays(prev => prev.filter(d => d.value !== dayValueToDelete));
    if(dayLabelToDelete) {
      setWorkingDays(prev => prev.filter(d => d !== dayLabelToDelete));
    }
    toast({ title: `Day "${dayLabelToDelete}" removed.` });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="totalPeriods" className="text-xs">Periods/Day</Label>
          <Input
            id="totalPeriods"
            type="number"
            placeholder="e.g., 8"
            value={totalPeriods}
            onChange={(e) => setTotalPeriods(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="startTime" className="text-xs">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="periodDuration" className="text-xs">Period Duration (min)</Label>
          <Input
            id="periodDuration"
            type="number"
            placeholder="e.g., 45"
            value={periodDuration}
            onChange={(e) => setPeriodDuration(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="lunchBreakAfter" className="text-xs">Lunch After Period</Label>
          <Input
            id="lunchBreakAfter"
            type="number"
            placeholder="e.g., 4"
            value={lunchBreakAfter}
            onChange={(e) => setLunchBreakAfter(e.target.value)}
          />
        </div>
        <div className='col-span-2'>
          <Label htmlFor="lunchBreakDuration" className="text-xs">Lunch Duration (min)</Label>
          <Input
            id="lunchBreakDuration"
            type="number"
            placeholder="e.g., 30"
            value={lunchBreakDuration}
            onChange={(e) => setLunchBreakDuration(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label className="text-xs d-block mb-2">Working Days</Label>
         <Card>
          <CardContent className="p-2 space-y-2">
            <ScrollArea className="h-24">
              <div className="space-y-2 p-2">
                {allDays.map(day => (
                  <div key={day.value} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={day.value}
                        checked={workingDays.includes(day.label)}
                        onCheckedChange={() => handleToggleDay(day.label)}
                      />
                      <Label htmlFor={day.value} className="font-normal cursor-pointer">{day.label}</Label>
                    </div>
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDay(day.value);
                        }}>
                            <Trash2 className="h-4 w-4 text-destructive/70"/>
                       </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className='flex gap-2 p-2 border-t'>
                <Input 
                  placeholder="Add new day..." 
                  value={newDayInput}
                  onChange={(e) => setNewDayInput(e.target.value)}
                  onKeyDown={(e) => {if(e.key === 'Enter') { e.preventDefault(); handleAddDay();}}}
                />
                <Button variant="secondary" size="icon" onClick={handleAddDay}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Button onClick={setSettings} className="w-full" variant="secondary">Save Schedule</Button>
    </div>
  );
}

    