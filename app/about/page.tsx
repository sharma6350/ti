
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl">
                <CardHeader>
                    <CardTitle className="text-2xl sm:text-3xl">About Time-Table Manager</CardTitle>
                    <CardDescription>The ultimate solution for educational planning, time management, and seamless school scheduling.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[60vh] p-1">
                        <div className="space-y-6 text-sm text-muted-foreground pr-4">
                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-2">Revolutionize Your School's Scheduling</h3>
                                <p>
                                Welcome to the future of **time management** and **educational planning**. Our powerful **web application** is the definitive **education software** for creating a balanced **school timetable** and an organized **class schedule**. Whether you're looking for a student organizer, an academic planner, or a college schedule maker, our **timetable app** provides a seamless, **online timetable** experience. This is the **school scheduling software** designed to bring clarity and efficiency to your institution.
                                </p>
                            </section>
                            
                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-2">Automatic, Customizable, and Conflict-Free</h3>
                                <p>
                                As a premier **teacher timetable maker** and **student schedule planner**, our platform excels as an **online time table generator**. The system features **automatic timetable software** that intelligently avoids scheduling conflicts, making it the perfect **school bell schedule maker**. Create a fully **customizable school timetable** or a **digital class schedule** with our intuitive tools. This is the ideal **online scheduling app for schools**, from small institutions to large universities needing a robust **university class scheduler**.
                                </p>
                            </section>
                            
                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-2">Advanced Features for Modern Schools</h3>
                                <p>
                                Discover why we're considered the **best app for managing class schedule** challenges. Our **school timetable web app for teachers** simplifies managing assignments for **multiple teachers**, while our **easy timetable builder for students** makes organization a breeze. If you've ever asked **how to create a school schedule** or **how to avoid class conflicts**, our platform is the answer. It's more than just a **free class schedule app for students**; it's a comprehensive **online planner for high school** and beyond. We offer robust solutions for educators searching for **school timetable software in India** and beyond.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-foreground mb-2">Content and SEO Strategy</h3>
                                <p>
                                To attract users in their research phase, we focus on creating valuable content around key informational keywords. Our guides and blog posts cover topics like **"how to create a timetable,"** **"time management for students,"** and **"how to organize your school life."** We also delve into the **"benefits of a digital timetable"** and compare the **"best timetable apps for students."** This strategy helps establish our authority and positions our app as the definitive solution early in the user's journey.
                                </p>
                            </section>
                        </div>
                    </ScrollArea>
                    <div className="mt-6 flex justify-start">
                        <Button asChild variant="outline">
                            <Link href="/">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Login
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
