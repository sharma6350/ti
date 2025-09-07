
'use client';

import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface SchoolInfoProps {
  schoolName: string | null;
  schoolId: string | null;
  onLogout: () => void;
}

export default function SchoolInfo({ schoolName, schoolId, onLogout }: SchoolInfoProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
      <div>
        <h1 className="text-3xl font-bold text-primary">{schoolName || 'Dashboard'}</h1>
        <p className="text-sm text-muted-foreground">School ID: {schoolId || 'N/A'}</p>
      </div>
      <div className="sm:ml-auto">
        <Button onClick={onLogout} variant="outline" size="sm">
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </div>
    </div>
  );
}
