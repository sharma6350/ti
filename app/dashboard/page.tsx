
'use client';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookMarked, FileUp, Hourglass, School, Edit, Megaphone, X, CalendarCog, LayoutGrid, User, Users, LogOut } from 'lucide-react';
import TeacherDataUpload from '@/components/dashboard/TeacherDataUpload';
import SubjectManager from '@/components/dashboard/SubjectManager';
import ScheduleSetup from '@/components/dashboard/ScheduleSetup';
import TimetableGenerator from '@/components/dashboard/TimetableGenerator';
import ClassManager from '@/components/dashboard/ClassManager';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Announcement {
    message: string;
    timestamp: string;
}

export default function DashboardPage() {
  const [isTimetableGenerated, setIsTimetableGenerated] = useState(false);
  const { schoolId, schoolName, logout, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);

  const getStorageKey = useCallback((key: string) => schoolId ? `${schoolId}-${key}` : null, [schoolId]);

  useEffect(() => {
    if (!isLoading) {
      if (isAdmin) {
        router.push('/admin/dashboard');
      } else if (!schoolId) {
        router.push('/');
      }
    }
  }, [schoolId, isAdmin, isLoading, router]);
  
  const checkTimetableExists = useCallback(() => {
    if (!schoolId) return;
    const storageKey = getStorageKey('resolvedTimetable');
    if (!storageKey) return;
    try {
      const storedTimetable = localStorage.getItem(storageKey);
      const data = storedTimetable ? JSON.parse(storedTimetable) : [];
      setIsTimetableGenerated(Array.isArray(data) && data.length > 0);
    } catch (e) {
      setIsTimetableGenerated(false);
    }
  },[schoolId, getStorageKey]);


  useEffect(() => {
    checkTimetableExists();
    
    const handleStorageChange = (event: StorageEvent) => {
      const storageKey = getStorageKey('resolvedTimetable');
      if (event.key === storageKey || event.key === null) { // event.key is null when storage is cleared
        checkTimetableExists();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [schoolId, checkTimetableExists, getStorageKey]);

   useEffect(() => {
    try {
        const storedAnnouncement = localStorage.getItem('adminAnnouncement');
        if (storedAnnouncement) {
            const announcementData: Announcement = JSON.parse(storedAnnouncement);
            const dismissedTimestamp = localStorage.getItem('dismissedAnnouncementTimestamp');

            if (dismissedTimestamp !== announcementData.timestamp) {
                setAnnouncement(announcementData);
                setIsAnnouncementVisible(true);
            }
        }
    } catch(e) {
        console.error("Failed to parse announcement", e);
        setAnnouncement(null);
    }
  }, []);

  const handleDismissAnnouncement = () => {
    if(announcement) {
        try {
            localStorage.setItem('dismissedAnnouncementTimestamp', announcement.timestamp);
            setIsAnnouncementVisible(false);
        } catch (e) {
            console.error("Failed to set dismissed timestamp", e);
        }
    }
  }

  if (isLoading || (!isAdmin && !schoolId)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <p>Loading...</p>
        </div>
      )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card/80 backdrop-blur-lg border-b sticky top-0 z-40">
        <div className="container mx-auto flex justify-between items-center h-16 px-4">
          <div className="text-lg font-bold text-foreground">
            <h1 className="text-xl font-bold text-foreground">{schoolName || 'Dashboard'}</h1>
            <p className="text-xs text-muted-foreground">School ID: {schoolId || 'N/A'}</p>
          </div>
           <div className="flex items-center gap-2">
            <Button onClick={() => logout()} variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
           </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {announcement && isAnnouncementVisible && (
            <Alert className="mb-6 border-accent/50 relative bg-accent/10">
                <Megaphone className="h-4 w-4 text-accent" />
                <AlertTitle className="font-bold text-accent">Important Announcement</AlertTitle>
                <AlertDescription>
                    {announcement.message}
                </AlertDescription>
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={handleDismissAnnouncement}>
                    <X className="h-4 w-4"/>
                    <span className="sr-only">Dismiss</span>
                </Button>
            </Alert>
        )}
        
        {isTimetableGenerated && (
             <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Timetable Ready</CardTitle>
                    <CardDescription>Your timetable is generated. You can now view, edit or manage daily arrangements.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button asChild>
                      <Link href="/preview"><LayoutGrid className="mr-2 h-4 w-4"/>Full Preview</Link>
                  </Button>
                  <Button asChild variant="outline">
                      <Link href="/teacher-timetable"><User className="mr-2 h-4 w-4"/>Teacher-wise</Link>
                  </Button>
                  <Button asChild variant="outline">
                      <Link href="/class-timetable"><Users className="mr-2 h-4 w-4"/>Class-wise</Link>
                  </Button>
                  <Button asChild variant="outline">
                      <Link href="/edit-timetable"><Edit className="mr-2 h-4 w-4"/>Edit Timetable</Link>
                  </Button>
                  <Button asChild variant="outline">
                      <Link href="/arrangement"><CalendarCog className="mr-2 h-4 w-4"/>Arrangement</Link>
                  </Button>
                </CardContent>
             </Card>
           )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileUp /> 1. Upload & Manage Teacher Data</CardTitle>
                 <CardDescription>Upload an Excel file with teacher names and subjects, or add them manually.</CardDescription>
              </CardHeader>
              <CardContent>
                <TeacherDataUpload />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BookMarked /> 2. Manage Subjects</CardTitle>
                </CardHeader>
                <CardContent>
                  <SubjectManager />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><School /> 3. Manage Classes &amp; Sections</CardTitle>
                </CardHeader>
                <CardContent>
                  <ClassManager />
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="lg:col-span-1 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Hourglass /> 4. Timing and Days</CardTitle>
                 <CardDescription>Set up the daily schedule structure for your school.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScheduleSetup />
              </CardContent>
            </Card>
          </div>
        </div>

        <section className="mt-8">
          <Card className="bg-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">5. Generate Your Timetable</CardTitle>
              <CardDescription className="text-muted-foreground">
                Once all data is provided above, generate a conflict-free timetable.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimetableGenerator isTimetableGenerated={isTimetableGenerated} />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

    