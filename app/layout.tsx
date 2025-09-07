
import type { Metadata } from "next";
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth"; // Assuming AuthProvider is correctly defined here

export const metadata: Metadata = {
  title: "School Timetable Generator | AI Timetable Maker | Data Management",
  description: "Efficiently create and manage your school timetable with our AI-powered generator. A complete solution for school timetable and data management needs. Handles teachers, subjects, and classes effortlessly.",
  keywords: "timetable, school timetable, timetable generator, school timetable software, data management, schedule maker, class schedule, school schedule app"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
       <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet"></link>
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}

    