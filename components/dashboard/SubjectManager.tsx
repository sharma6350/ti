
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { X, Edit, Save, XCircle, Star } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

interface Subject {
  name: string;
  mandatory: boolean;
}

export default function SubjectManager() {
  const [subjectInput, setSubjectInput] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editedValue, setEditedValue] = useState('');
  const { toast } = useToast();
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const getStorageKey = (key: string) => schoolId ? `${schoolId}-${key}` : null;

  useEffect(() => {
    const id = localStorage.getItem('schoolID');
    setSchoolId(id);
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    const storageKey = getStorageKey('subjects');
    if (!storageKey) return;
    const storedSubjects = localStorage.getItem(storageKey);
    if (storedSubjects) {
      try {
        const parsed = JSON.parse(storedSubjects);
        // Ensure data integrity from older versions
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
          const newSubjects = parsed.map(name => ({ name, mandatory: false }));
          persistSubjects(newSubjects);
        } else {
          setSubjects(parsed);
        }
      } catch (e) {
        console.error("Failed to parse subjects from localStorage", e);
        setSubjects([]);
      }
    } else {
      setSubjects([]);
    }
  }, [schoolId]);
  
  const persistSubjects = (newSubjects: Subject[]) => {
    const storageKey = getStorageKey('subjects');
    if (!storageKey) return;
    setSubjects(newSubjects);
    localStorage.setItem(storageKey, JSON.stringify(newSubjects));
  };

  const addSubject = () => {
    const trimmedSubject = subjectInput.trim();
    if (trimmedSubject && !subjects.some(s => s.name.toLowerCase() === trimmedSubject.toLowerCase())) {
      const newSubject: Subject = { name: trimmedSubject, mandatory: isMandatory };
      const newSubjects = [...subjects, newSubject];
      persistSubjects(newSubjects);
      setSubjectInput('');
      setIsMandatory(false);
      toast({ title: `Subject "${trimmedSubject}" added.` });
    } else if (!trimmedSubject) {
        toast({ title: 'Subject name cannot be empty.', variant: 'destructive' });
    } else {
        toast({ title: 'This subject already exists.', variant: 'destructive' });
    }
  };
  
  const removeSubject = (subjectToRemove: Subject) => {
    const newSubjects = subjects.filter(s => s.name !== subjectToRemove.name);
    persistSubjects(newSubjects);
    toast({ title: `Subject "${subjectToRemove.name}" removed.` });
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setEditedValue(subject.name);
  };

  const handleCancel = () => {
    setEditingSubject(null);
    setEditedValue('');
  };

  const handleSave = () => {
    const trimmedValue = editedValue.trim();
    if (!trimmedValue) {
      toast({ title: "Subject name cannot be empty.", variant: "destructive" });
      return;
    }
    if (subjects.some(s => s.name.toLowerCase() === trimmedValue.toLowerCase()) && trimmedValue.toLowerCase() !== editingSubject?.name.toLowerCase()) {
      toast({ title: "This subject already exists.", variant: "destructive" });
      return;
    }

    if (editingSubject) {
        const newSubjects = subjects.map(s => s.name === editingSubject.name ? { ...s, name: trimmedValue } : s);
        persistSubjects(newSubjects);
        handleCancel();
        toast({ title: `Subject updated to "${trimmedValue}".` });
    }
  };
  
  const toggleMandatory = (subjectToUpdate: Subject) => {
      const newSubjects = subjects.map(s => s.name === subjectToUpdate.name ? {...s, mandatory: !s.mandatory} : s);
      persistSubjects(newSubjects);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div className="flex-grow">
          <Label htmlFor="subject-input">Subject Name</Label>
          <Input
            id="subject-input"
            placeholder="e.g., Mathematics"
            value={subjectInput}
            onChange={(e) => setSubjectInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSubject()}
          />
        </div>
        <div className="flex items-center space-x-2 pb-2">
            <Checkbox id="mandatory" checked={isMandatory} onCheckedChange={(checked) => setIsMandatory(checked as boolean)}/>
            <Label htmlFor="mandatory">Mandatory</Label>
        </div>
        <Button onClick={addSubject} variant="secondary">Add</Button>
      </div>
      <div className="flex flex-wrap gap-2 pt-2 min-h-[2.5rem]">
        {subjects.map((s, index) => (
          <div key={`${s.name}-${index}`}>
            {editingSubject?.name === s.name ? (
              <div className="flex items-center gap-1.5 py-1 px-2.5 bg-secondary rounded-full">
                <Input value={editedValue} onChange={(e) => setEditedValue(e.target.value)} className="h-6 w-32 bg-background"/>
                <button onClick={handleSave} className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5"><Save className="h-4 w-4 text-green-600"/></button>
                <button onClick={handleCancel} className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5"><XCircle className="h-4 w-4 text-red-600"/></button>
              </div>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1.5 py-1 px-2.5 text-sm">
                 <button onClick={() => toggleMandatory(s)} aria-label={`Toggle mandatory for ${s.name}`}>
                    <Star className={`h-4 w-4 transition-colors ${s.mandatory ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} />
                 </button>
                {s.name}
                <button onClick={() => handleEdit(s)} className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5" aria-label={`Edit ${s.name}`}>
                  <Edit className="h-3 w-3" />
                </button>
                <button onClick={() => removeSubject(s)} className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5" aria-label={`Remove ${s.name}`}>
                    <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
