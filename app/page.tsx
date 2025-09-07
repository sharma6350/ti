
'use client';

import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LifeBuoy, BookOpenCheck, CalendarCog, Users, FileUp, ShieldCheck, Clock, FileSpreadsheet, Edit, Settings, Info, Briefcase, Zap, Palette, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';

const formSchema = z.object({
  schoolName: z.string().optional(),
  schoolID: z.string().min(1, { message: 'School ID is required.' }),
  password: z.string().optional(),
});

const supportFormSchema = z.object({
    schoolId: z.string().optional(),
    subject: z.string().min(1, { message: 'Subject is required.'}),
    message: z.string().min(10, { message: 'Message must be at least 10 characters long.'})
});

type FormValues = z.infer<typeof formSchema>;
type SupportFormValues = z.infer<typeof supportFormSchema>;

export default function AuthPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { login, signup, schoolId: currentSchoolId, isAdmin, loginAdmin, isLoading, getAdminCredentials, getSchools } = useAuth();
  const [activeTab, setActiveTab] = useState('signin');
  const [adminId, setAdminId] = useState('');
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [renewalSchoolId, setRenewalSchoolId] = useState('');
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [trialDays, setTrialDays] = useState('30');
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const creds = getAdminCredentials();
        setAdminId(creds.id);
        const storedTrialDays = localStorage.getItem('trialPeriodDays');
        setTrialDays(storedTrialDays || '30');
    }
  }, [getAdminCredentials]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      schoolName: '',
      schoolID: '',
      password: '',
    },
  });

  const supportForm = useForm<SupportFormValues>({
      resolver: zodResolver(supportFormSchema),
      defaultValues: {
          schoolId: '',
          subject: '',
          message: ''
      }
  });
  
  useEffect(() => {
    if (!isLoading) {
      if (isAdmin) {
        router.push('/admin/dashboard');
      } else if (currentSchoolId) {
        router.push('/dashboard');
      }
    }
  }, [currentSchoolId, isAdmin, router, isLoading]);

  const handleSignup: SubmitHandler<FormValues> = (data) => {
    try {
      if (!data.schoolName || data.schoolName.trim() === '') {
        form.setError('schoolName', { type: 'manual', message: 'School name is required for signup.' });
        return;
      }
      signup(data.schoolName.trim(), data.schoolID.trim());
      toast({ title: "Signup successful!", description: `Welcome, ${data.schoolName.trim()}! Your ${trialDays}-day free trial has started.` });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Signup Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };
  
  const handleLogin: SubmitHandler<FormValues> = (data) => {
    const id = data.schoolID.trim();
    const password = data.password?.trim() || '';

    if (id.toLowerCase() === adminId.toLowerCase() && adminId) {
      try {
        loginAdmin(password);
        toast({ title: "Admin login successful!", description: `Welcome, Administrator!` });
        router.push('/admin/dashboard');
      } catch (error: any) {
        toast({ title: 'Admin Login Failed', description: error.message, variant: 'destructive' });
      }
      return;
    }

    try {
      const loggedInSchoolName = login(id);
      toast({ title: "Login successful!", description: `Welcome back, ${loggedInSchoolName}!` });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRenewSubscription = () => {
    const trimmedId = renewalSchoolId.trim();
    if (!trimmedId) {
      toast({ title: 'School ID is required', description: 'Please enter the School ID to renew.', variant: 'destructive'});
      return;
    }

    const schools = getSchools();
    const schoolExists = schools.some(s => s.id.toLowerCase() === trimmedId.toLowerCase());

    if (!schoolExists) {
        toast({ title: 'School ID not found', description: 'Please check the ID and try again.', variant: 'destructive'});
        return;
    }
    
    try {
        localStorage.setItem('schoolIDForRenewal', trimmedId);
        setIsRenewModalOpen(false);
        router.push('/subscribe');
    } catch (e) {
        toast({ title: 'An error occurred', description: 'Could not prepare for subscription renewal.', variant: 'destructive'});
    }
  };

  const handleSupportSubmit: SubmitHandler<SupportFormValues> = (data) => {
      try {
          const supportMessages = JSON.parse(localStorage.getItem('supportMessages') || '[]');
          const newMessage = { ...data, timestamp: new Date().toISOString(), id: `support-${Date.now()}` };
          supportMessages.unshift(newMessage);
          localStorage.setItem('supportMessages', JSON.stringify(supportMessages));
          toast({
              title: "Message Sent!",
              description: "Thank you for your feedback. The admin will review your message shortly."
          });
          setIsSupportModalOpen(false);
          supportForm.reset();
      } catch (error) {
          toast({ title: "Failed to send message", description: "There was an error storing your message. Please try again.", variant: 'destructive' });
      }
  }
  
  if (isLoading || currentSchoolId || isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  const mainFeatures = [
    { icon: <CalendarCog className="w-6 h-6 text-primary"/>, title: "Conflict-Free Timetable", description: "Intelligent algorithm ensures no teacher or class is double-booked." },
    { icon: <Users className="w-6 h-6 text-primary"/>, title: "Easy Data Management", description: "Manage teachers, subjects, and classes with a simple, intuitive interface." },
    { icon: <FileUp className="w-6 h-6 text-primary"/>, title: "Simple Data Upload", description: "Quickly upload teacher data using our pre-formatted Excel template." },
    { icon: <Clock className="w-6 h-6 text-primary"/>, title: "Flexible Scheduling", description: "Customize periods, working days, and break times to fit your school's needs." },
    { icon: <ShieldCheck className="w-6 h-6 text-primary"/>, title: "Secure & Private", description: "All your data is stored securely in your browser, not on our servers." },
    { icon: <Briefcase className="w-6 h-6 text-primary"/>, title: "Daily Arrangement", description: "Handle substitutions for absent teachers with an interactive interface." },
  ];

  const infoCards = [
      { icon: <Zap className="w-8 h-8 text-primary"/>, title: "Fast & Efficient", description: "Our powerful algorithm generates complex timetables in seconds, saving you hours of manual work." },
      { icon: <Palette className="w-8 h-8 text-primary"/>, title: "Fully Customizable", description: "Adapt every aspect of the schedule, from period timings to working days, to fit your school's unique needs."},
      { icon: <Lock className="w-8 h-8 text-primary"/>, title: "Offline & Secure", description: "Works entirely in your browser. Your data stays on your computer, ensuring complete privacy and security."},
      { icon: <Edit className="w-8 h-8 text-primary"/>, title: "Editable Timetable", description: "After generation, you can manually fine-tune and edit the timetable to make perfect adjustments." },
      { icon: <FileSpreadsheet className="w-8 h-8 text-primary"/>, title: "Export Options", description: "Easily export your final timetables to both PDF and Excel formats for printing and sharing." },
  ];
  

 return (
    <div className="w-full bg-background text-foreground flex flex-col min-h-screen">
      <main className="flex-grow w-full flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 relative">
          
          <div className="w-full lg:w-1/2 lg:pr-8">
            <div className="text-center lg:text-left mb-8 lg:mb-10">
              <div className="flex items-center justify-center lg:justify-start gap-4 mb-4">
                <BookOpenCheck className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
                <h1 className="text-3xl sm:text-4xl font-bold">Time-Table Manager</h1>
              </div>
              <p className="text-base sm:text-lg text-muted-foreground">
                The smart, simple, and secure way to build conflict-free school schedules.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {mainFeatures.map(feature => (
                <div key={feature.title} className="flex items-start gap-4">
                  <div className="flex-shrink-0 bg-primary/10 p-3 rounded-full">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="w-full max-w-md lg:w-1/2 mt-8 lg:mt-0">
            <Card className="w-full bg-card backdrop-blur-sm" style={{boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05)'}}>
              <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl sm:text-3xl font-bold">Welcome Back!</CardTitle>
                  <CardDescription className="pt-1">Select an option to continue</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="signin" className="w-full" onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2 bg-muted/70 rounded-lg p-1 mx-auto mb-4" style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                        <TabsTrigger value="signin" className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md rounded-md transition-all duration-300 py-1.5 font-semibold" style={activeTab === 'signin' ? { transform: 'translateY(-1px)', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' } : {}}>Sign In</TabsTrigger>
                        <TabsTrigger value="signup" className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md rounded-md transition-all duration-300 py-1.5 font-semibold" style={activeTab === 'signup' ? { transform: 'translateY(-1px)', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' } : {}}>Sign Up</TabsTrigger>
                    </TabsList>
                  <TabsContent value="signin">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4 pt-4">
                        <FormField
                          control={form.control}
                          name="schoolID"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>School or Admin ID</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter School or Admin ID" {...field} onChange={(e) => field.onChange(e.target.value)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Enter password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="space-y-2 pt-2">
                          <Button type="submit" className={cn("w-full btn-3d")} size="lg">
                            Sign In
                          </Button>
                          <Button type="button" variant="link" className="w-full text-primary" onClick={() => setIsRenewModalOpen(true)}>
                            Renew Subscription
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </TabsContent>
                  <TabsContent value="signup">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleSignup)} className="space-y-4 pt-4">
                        <FormField
                          control={form.control}
                          name="schoolName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>School Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Northwood High" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="schoolID"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Create a School ID</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., NH-12345" {...field} onChange={(e) => field.onChange(e.target.value.trim())} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="pt-2">
                          <Button type="submit" className={cn("w-full btn-3d")} size="lg">
                            Sign Up For Free Trial
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        <section className="w-full max-w-6xl mx-auto mt-16 lg:mt-24">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold">Why Choose Our Timetable Manager?</h2>
                <p className="text-muted-foreground mt-2">Everything you need for seamless school scheduling, all in one place.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {infoCards.slice(0, 3).map(card => (
                    <Card key={card.title} className="text-center p-6">
                        <div className="flex justify-center items-center mb-4 bg-primary/10 rounded-full w-16 h-16 mx-auto">
                            {card.icon}
                        </div>
                        <h3 className="text-xl font-semibold mb-2">{card.title}</h3>
                        <p className="text-muted-foreground">{card.description}</p>
                    </Card>
                ))}
            </div>
             {infoCards.length > 3 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                    {infoCards.slice(3).map(card => (
                        <Card key={card.title} className="text-center p-6">
                            <div className="flex justify-center items-center mb-4 bg-primary/10 rounded-full w-16 h-16 mx-auto">
                                {card.icon}
                            </div>
                            <h3 className="text-xl font-semibold mb-2">{card.title}</h3>
                            <p className="text-muted-foreground">{card.description}</p>
                        </Card>
                    ))}
                </div>
            )}
        </section>

        <Button asChild variant="outline" className="fixed bottom-4 left-4 z-50 rounded-full h-12 shadow-lg flex items-center gap-2 px-4">
            <Link href="/about">
                <Info className="h-5 w-5"/>
                <span className="">About</span>
            </Link>
        </Button>
        
        <Dialog open={isSupportModalOpen} onOpenChange={setIsSupportModalOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="fixed bottom-4 right-4 z-50 rounded-full h-12 shadow-lg flex items-center gap-2 px-4">
                    <LifeBuoy className="h-5 w-5"/>
                    <span className="">Support</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Contact Support</DialogTitle>
                    <DialogDescription>
                        Have a question, feedback, or a complaint? Let us know.
                    </DialogDescription>
                </DialogHeader>
                <Form {...supportForm}>
                    <form onSubmit={supportForm.handleSubmit(handleSupportSubmit)} className="space-y-4">
                        <FormField control={supportForm.control} name="schoolId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>School ID (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter your School ID if applicable" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={supportForm.control} name="subject" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Subject</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Feedback on Timetable Generation" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={supportForm.control} name="message" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Your Message</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Please describe your issue or feedback in detail." {...field} rows={5} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="submit">Submit Message</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        <Dialog open={isRenewModalOpen} onOpenChange={setIsRenewModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Renew Subscription</DialogTitle>
                    <DialogDescription>
                        Please enter your School ID to proceed to the renewal page.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="renewalId">School ID</Label>
                        <Input id="renewalId" placeholder="Enter your School ID" value={renewalSchoolId} onChange={(e) => setRenewalSchoolId(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRenewModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleRenewSubscription}>Proceed to Renew</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </main>

      <footer className="w-full text-center py-4 px-4 flex justify-center items-center gap-4">
          <p className="text-xs text-gray-500">
          App Developed By 
          <a
              href="https://www.linkedin.com/in/surender-sharma-7a9187175"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline ml-1"
          >
              Surender Sharma
          </a>
          </p>
      </footer>
    </div>
  );
}

    