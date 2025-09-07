
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';

interface ClassAndSection {
  id: string;
  name: string;
  sections: string[];
}

export default function ClassManager() {
  const [className, setClassName] = useState('');
  const [currentSection, setCurrentSection] = useState('');
  const [pendingSections, setPendingSections] = useState<string[]>([]);
  const [classes, setClasses] = useState<ClassAndSection[]>([]);
  const { toast } = useToast();
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const getStorageKey = (key: string) => schoolId ? `${schoolId}-${key}` : null;

  useEffect(() => {
    const id = localStorage.getItem('schoolID');
    setSchoolId(id);
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    const storageKey = getStorageKey('classesAndSections');
    if (!storageKey) return;
    const storedClasses = localStorage.getItem(storageKey);
    if (storedClasses) {
      try {
        setClasses(JSON.parse(storedClasses));
      } catch (e) {
        console.error("Failed to parse classes from localStorage", e);
        setClasses([]);
      }
    } else {
      setClasses([]);
    }
  }, [schoolId]);

  const persistClasses = (newClasses: ClassAndSection[]) => {
    const storageKey = getStorageKey('classesAndSections');
    if (!storageKey) return;
    setClasses(newClasses);
    localStorage.setItem(storageKey, JSON.stringify(newClasses));
  };

  const handleAddSection = () => {
    const trimmedSection = currentSection.trim();
    if (!trimmedSection) {
      toast({ title: 'Section name cannot be empty.', variant: 'destructive' });
      return;
    }
    if (pendingSections.map(s => s.toLowerCase()).includes(trimmedSection.toLowerCase())) {
        toast({ title: 'This section has already been added.', variant: 'destructive' });
        return;
    }
    setPendingSections([...pendingSections, trimmedSection]);
    setCurrentSection('');
  };

  const handleRemovePendingSection = (sectionToRemove: string) => {
    setPendingSections(pendingSections.filter(s => s !== sectionToRemove));
  }

  const handleAddClass = () => {
    const trimmedClassName = className.trim();

    if (!trimmedClassName) {
      toast({ title: 'Class name cannot be empty.', variant: 'destructive' });
      return;
    }
    if (pendingSections.length === 0) {
      toast({ title: 'Please add at least one section.', variant: 'destructive' });
      return;
    }
    if (classes.some(c => c.name.toLowerCase() === trimmedClassName.toLowerCase())) {
      toast({ title: 'This class name already exists.', variant: 'destructive' });
      return;
    }

    const newClass: ClassAndSection = {
      id: new Date().toISOString(),
      name: trimmedClassName,
      sections: pendingSections
    };

    persistClasses([...classes, newClass]);
    setClassName('');
    setPendingSections([]);
    setCurrentSection('');
    toast({ title: `Class "${trimmedClassName}" added.` });
  };

  const handleDeleteClass = (id: string) => {
    const classToDelete = classes.find(c => c.id === id);
    const newClasses = classes.filter(c => c.id !== id);
    persistClasses(newClasses);
    toast({ title: `Class "${classToDelete?.name}" removed.` });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4 p-4 border rounded-lg">
        <div>
            <Label htmlFor="className">Class Name</Label>
            <Input
            id="className"
            placeholder="e.g., Grade 10"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            />
        </div>

        <div>
            <Label htmlFor="sectionName">Section Name</Label>
            <div className="flex gap-2">
                <Input
                id="sectionName"
                placeholder="e.g., A"
                value={currentSection}
                onChange={(e) => setCurrentSection(e.target.value)}
                onKeyDown={(e) => {if(e.key === 'Enter') { e.preventDefault(); handleAddSection();}}}
                />
                <Button onClick={handleAddSection} variant="outline" size="icon" aria-label="Add Section">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        </div>

        {pendingSections.length > 0 && (
            <div className="space-y-2">
                 <Label>Sections to be added</Label>
                <div className="flex flex-wrap gap-2">
                    {pendingSections.map(sec => (
                        <Badge key={sec} variant="secondary">
                            {sec}
                            <button onClick={() => handleRemovePendingSection(sec)} className="ml-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5" aria-label={`Remove ${sec}`}>
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            </div>
        )}
        
        <Button onClick={handleAddClass} variant="secondary" className="w-full">
          <Plus className="mr-2 h-4 w-4" /> Add Class
        </Button>
      </div>

      <ScrollArea className="h-40 w-full rounded-md border p-2">
        <div className="space-y-2">
            {classes.length > 0 ? classes.map((c) => (
                <Card key={c.id}>
                    <CardContent className="p-2 flex justify-between items-center">
                        <div>
                            <p className="font-semibold">{c.name}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {c.sections.map(sec => <Badge key={sec} variant="outline">{sec}</Badge>)}
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClass(c.id)} aria-label={`Delete class ${c.name}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </CardContent>
                </Card>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-4">No classes added yet.</p>
            )}
        </div>
      </ScrollArea>
    </div>
  );
}

    