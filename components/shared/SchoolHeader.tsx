
'use client';

import type { FC } from 'react';

interface SchoolHeaderProps {
  schoolName: string;
  schoolId: string;
}

const SchoolHeader: FC<SchoolHeaderProps> = ({ schoolName, schoolId }) => {
  return (
    <div className="mb-6 text-center">
      <h1 className="text-2xl font-bold text-primary inline-flex items-baseline gap-3">
        {schoolName || 'Your School'} 
        <span className="text-sm font-medium text-muted-foreground">
          (ID: {schoolId || 'N/A'})
        </span>
      </h1>
    </div>
  );
};

export default SchoolHeader;
