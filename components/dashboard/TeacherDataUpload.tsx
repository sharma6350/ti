
'use client';
import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Plus, Edit, Trash2, Save, XCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Teacher {
  id: number;
  Name: string;
  Subjects: string;
}

export default function TeacherDataUpload() {
  const [teacherData, setTeacherData] = useState<Teacher[]>([]);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editedTeacher, setEditedTeacher] = useState<Partial<Teacher>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const getStorageKey = (key: string) => schoolId ? `${schoolId}-${key}` : null;

  useEffect(() => {
    const id = localStorage.getItem('schoolID');
    setSchoolId(id);
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    try {
      const storageKey = getStorageKey('teacherData');
      if (!storageKey) return;
      const storedData = localStorage.getItem(storageKey);
      if (storedData) {
        const parsedJson: Omit<Teacher, 'id'>[] = JSON.parse(storedData);
        const dataWithIds = parsedJson.map((teacher, index) => ({
          ...teacher,
          id: index + 1,
        }));
        setTeacherData(dataWithIds);
      } else {
        setTeacherData([]);
      }
    } catch (error) {
        console.error("Failed to load or parse teacher data from localStorage", error);
        const storageKey = getStorageKey('teacherData');
        if(storageKey) localStorage.removeItem(storageKey);
    }
  }, [schoolId]);

  const persistData = (data: Teacher[]) => {
    const storageKey = getStorageKey('teacherData');
    if (!storageKey) return;
    const dataToStore = data.map(({id, ...rest}) => rest);
    localStorage.setItem(storageKey, JSON.stringify(dataToStore));
    setTeacherData(data);
  };

  const handleFileUpload = () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select an Excel file to upload.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (!e.target?.result) throw new Error("File could not be read.");
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) throw new Error(`Sheet "${sheetName}" not found.`);
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);
        
        if (!Array.isArray(json) || json.length === 0) {
            throw new Error("The Excel file seems to be empty or in the wrong format.");
        }

        const formattedData = json.map((row, index) => ({
            id: index + 1,
            Name: String(row.Name || ''),
            Subjects: String(row.Subjects || '')
        }));

        persistData(formattedData);
        
        toast({
          title: 'Upload Successful',
          description: 'Teacher data has been uploaded and stored.',
        });
      } catch (error: any) {
        setTeacherData([]);
        const storageKey = getStorageKey('teacherData');
        if (storageKey) localStorage.removeItem(storageKey);
        toast({
          title: 'Upload Failed',
          description: error.message || 'There was an error parsing the Excel file.',
          variant: 'destructive',
        });
      }
    };
    reader.onerror = () => {
        toast({ title: 'File Read Error', description: 'The selected file could not be read.', variant: 'destructive' });
    }
    reader.readAsArrayBuffer(file);
  };
  
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Name: "Dr. Alan Grant", Subjects: "Paleontology, Geology" },
      { Name: "Dr. Ellie Sattler", Subjects: "Paleobotany" },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Teachers");
    XLSX.writeFile(wb, "Teacher_Data_Template.xlsx");
  };

  const handleAddRow = () => {
    const newId = teacherData.length > 0 ? Math.max(...teacherData.map(t => t.id)) + 1 : 1;
    const newTeacher: Teacher = { id: newId, Name: 'New Teacher', Subjects: 'Subjects' };
    const newData = [...teacherData, newTeacher];
    setTeacherData(newData);
    setEditingRow(newId);
    setEditedTeacher({ ...newTeacher });
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingRow(teacher.id);
    setEditedTeacher({...teacher});
  };

  const handleCancel = () => {
    const originalTeacher = teacherData.find(t => t.id === editingRow);
    if (originalTeacher?.Name === 'New Teacher' && originalTeacher?.Subjects === 'Subjects') {
        const newData = teacherData.filter(t => t.id !== editingRow);
        setTeacherData(newData);
    }
    setEditingRow(null);
    setEditedTeacher({});
  };

  const handleSave = () => {
    if(!editedTeacher.Name || !editedTeacher.Subjects || editedTeacher.Name.trim() === '' || editedTeacher.Subjects.trim() === '') {
      toast({ title: "Fields cannot be empty", variant: "destructive" });
      return;
    }
    const newData = teacherData.map(t => (t.id === editingRow ? { ...t, ...editedTeacher } : t));
    persistData(newData as Teacher[]);
    setEditingRow(null);
    setEditedTeacher({});
    toast({ title: 'Teacher data saved.' });
  };
  
  const handleDelete = (id: number) => {
    const newData = teacherData.filter(t => t.id !== id);
    persistData(newData);
    toast({ title: 'Teacher entry deleted.' });
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof Omit<Teacher, 'id'>) => {
    setEditedTeacher(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input type="file" ref={fileInputRef} accept=".xlsx, .xls" className="flex-grow" />
        <Button onClick={handleFileUpload} variant="secondary" className='w-full sm:w-auto'>Upload</Button>
        <Button onClick={downloadTemplate} variant="outline" size="sm" className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Template
        </Button>
      </div>
      <div className="flex justify-between items-center pt-4 border-t">
        <h4 className="text-sm font-medium">Teacher List ({teacherData.length})</h4>
        <Button onClick={handleAddRow} size="sm" variant="outline">
          <Plus className="mr-2 h-4 w-4" /> Add Teacher
        </Button>
      </div>
      <div className='max-h-60 overflow-y-auto w-full'>
        <Table>
            <TableHeader className='sticky top-0 bg-muted'>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead className="text-right w-24">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {teacherData.length > 0 ? teacherData.map((teacher) => (
                    <TableRow key={teacher.id}>
                        {editingRow === teacher.id ? (
                          <>
                            <TableCell>
                              <Input value={editedTeacher.Name} onChange={(e) => handleInputChange(e, 'Name')} className="h-8"/>
                            </TableCell>
                            <TableCell>
                              <Input value={editedTeacher.Subjects} onChange={(e) => handleInputChange(e, 'Subjects')} className="h-8"/>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave}><Save className="h-4 w-4 text-green-600"/></Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}><XCircle className="h-4 w-4 text-red-600"/></Button>
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-medium">{teacher.Name}</TableCell>
                            <TableCell>{teacher.Subjects}</TableCell>
                            <TableCell className="text-right">
                               <div className="flex gap-1 justify-end">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(teacher)}><Edit className="h-4 w-4"/></Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(teacher.id)}><Trash2 className="h-4 w-4"/></Button>
                              </div>
                            </TableCell>
                          </>
                        )}
                    </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No teacher data yet. Upload an Excel file or add teachers manually.
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
        </Table>
      </div>
    </div>
  );
}
