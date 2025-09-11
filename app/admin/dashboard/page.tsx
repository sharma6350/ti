
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { LogOut, UserPlus, Edit, Trash2, Shield, Users, BarChart, Megaphone, Settings, CheckCircle, XCircle, CalendarClock, DollarSign, Bell, QrCode, FileImage, MessageSquare, Briefcase, AlertTriangle, KeyRound, FileSpreadsheet, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { exportToExcel, exportToPdf, type ExportCell } from '@/lib/export';
import {
  getSchools,
  addSchool,
  updateSchool,
  deleteSchool,
  getSubscriptionPlans,
  saveSubscriptionPlans,
  getPendingSubscriptions,
  addPendingSubscription,
  deletePendingSubscription,
  getAnnouncement,
  saveAnnouncement,
  clearAnnouncement,
} from '../actions';
import { School, SubscriptionPlan, PendingSubscription, Announcement } from '@/lib/firebase';

export default function AdminDashboard() {
  const { isAdmin, logout, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allSchools, setAllSchools] = useState<School[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [schoolNameInput, setSchoolNameInput] = useState('');
  const [schoolIdInput, setSchoolIdInput] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
  const [pendingSubscriptions, setPendingSubscriptions] = useState<PendingSubscription[]>([]);

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [selectedSchoolForSub, setSelectedSchoolForSub] = useState<School | null>(null);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState('');
  const [subscriptionPlans, setSubscriptionPlans] = useState<Record<string, SubscriptionPlan>>({
    monthly: { name: 'Monthly', price: '' },
    halfYearly: { name: 'Half-Yearly', price: '' },
    annually: { name: 'Annually', price: '' },
  });

  const [trialDays, setTrialDays] = useState('30');

  const getSubscriptionStatus = useCallback((school: School): { text: string; icon: React.ElementType; color: string } => {
    const now = new Date();
    if (school.subscriptionEndDate) {
      const endDate = new Date(school.subscriptionEndDate);
      if (endDate >= now) {
        return { text: `Active until ${format(endDate, 'dd MMM yyyy')}`, icon: CheckCircle, color: 'text-green-600' };
      } else {
        return { text: `Expired on ${format(endDate, 'dd MMM yyyy')}`, icon: XCircle, color: 'text-destructive' };
      }
    }
    if (school.signupDate) {
      const trialEndDate = addDays(new Date(school.signupDate), parseInt(trialDays, 10));
      if (trialEndDate >= now) {
        return { text: `Trial ends ${format(trialEndDate, 'dd MMM yyyy')}`, icon: CalendarClock, color: 'text-amber-600' };
      } else {
        return { text: 'Trial expired', icon: XCircle, color: 'text-destructive' };
      }
    }
    return { text: 'No active subscription', icon: XCircle, color: 'text-destructive' };
  }, [trialDays]);

  const refreshAllData = useCallback(async () => {
    const [schools, plans, pending, announcementData] = await Promise.all([
      getSchools(),
      getSubscriptionPlans(),
      getPendingSubscriptions(),
      getAnnouncement(),
    ]);
    setAllSchools(schools);
    setSubscriptionPlans(plans);
    setPendingSubscriptions(pending);
    setCurrentAnnouncement(announcementData || null);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push('/');
    } else if (isAdmin) {
      refreshAllData();
    }
  }, [isAdmin, isLoading, router, refreshAllData]);

  const openModal = (mode: 'add' | 'edit', school?: School) => {
    setModalMode(mode);
    if (mode === 'edit' && school) {
      setCurrentSchool(school);
      setSchoolNameInput(school.name);
      setSchoolIdInput(school.id);
    } else {
      setCurrentSchool(null);
      setSchoolNameInput('');
      setSchoolIdInput('');
    }
    setIsModalOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!schoolNameInput.trim() || !schoolIdInput.trim()) {
      toast({ title: 'School Name and ID cannot be empty.', variant: 'destructive' });
      return;
    }

    if (modalMode === 'add') {
      const newSchool: School = { name: schoolNameInput.trim(), id: schoolIdInput.trim(), signupDate: new Date().toISOString() };
      await addSchool(newSchool);
      toast({ title: 'School added successfully.' });
    } else {
      if (!currentSchool) return;
      const updatedSchool: School = { ...currentSchool, name: schoolNameInput.trim(), id: schoolIdInput.trim() };
      await updateSchool(updatedSchool);
      toast({ title: 'School updated successfully.' });
    }

    refreshAllData();
    setIsModalOpen(false);
  };

  const handleDeleteSchool = async (schoolToDelete: School) => {
    await deleteSchool(schoolToDelete.id);
    refreshAllData();
    toast({ title: `School "${schoolToDelete.name}" deleted.` });
  };

  const handlePublishAnnouncement = async () => {
    if (!announcement.trim()) {
      toast({ title: 'Announcement message cannot be empty.', variant: 'destructive' });
      return;
    }
    const newAnnouncement: Announcement = {
      message: announcement.trim(),
      timestamp: new Date().toISOString(),
    };
    await saveAnnouncement(newAnnouncement);
    setCurrentAnnouncement(newAnnouncement);
    toast({ title: 'Announcement published successfully!' });
    setAnnouncement('');
  };

  const handleClearAnnouncement = async () => {
    await clearAnnouncement();
    setCurrentAnnouncement(null);
    toast({ title: 'Announcement cleared.' });
  };

  const handleSubscriptionPlanChange = (plan: 'monthly' | 'halfYearly' | 'annually', price: string) => {
    setSubscriptionPlans(prev => ({ ...prev, [plan]: { ...prev[plan], price } }));
  };

  const handleSaveSubscriptionPlans = async () => {
    await saveSubscriptionPlans(subscriptionPlans);
    toast({ title: 'Subscription plans saved.' });
  };

  const openSubscriptionModal = (school: School) => {
    setSelectedSchoolForSub(school);
    setSubscriptionEndDate(school.subscriptionEndDate ? format(new Date(school.subscriptionEndDate), 'yyyy-MM-dd') : '');
    setIsSubModalOpen(true);
  };

  const handleUpdateSubscription = async () => {
    if (!selectedSchoolForSub || !subscriptionEndDate) return;

    const updatedSchool = { ...selectedSchoolForSub, subscriptionEndDate };
    await updateSchool(updatedSchool);
    refreshAllData();
    setIsSubModalOpen(false);
    toast({ title: `Subscription for ${selectedSchoolForSub.name} updated.` });
  };

  const handleApproveSubscription = (pendingSub: PendingSubscription) => {
    const school = allSchools.find(s => s.id === pendingSub.schoolId);
    if (school) {
      deletePendingSubscription(pendingSub.id); // Assuming 'id' is available on pendingSub
      openSubscriptionModal(school);
    } else {
      toast({ title: 'School not found', variant: 'destructive' });
    }
  };

  const handleRejectSubscription = async (pendingSub: PendingSubscription) => {
    await deletePendingSubscription(pendingSub.id); // Assuming 'id' is available on pendingSub
    refreshAllData();
    toast({ title: 'Subscription request rejected.' });
  };

  const getSchoolNameById = (id: string) => allSchools.find(s => s.id === id)?.name || id;

  if (isLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <main className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><Shield /> Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage schools, view system activity, and broadcast messages.</p>
          </div>
          <Button onClick={() => logout()} variant="outline" className="mt-4 sm:mt-0">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </header>

        <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                <TabsTrigger value="users"><Users className="mr-2 h-4 w-4"/>User Management</TabsTrigger>
                <TabsTrigger value="subscriptions"><DollarSign className="mr-2 h-4 w-4" />Subscriptions</TabsTrigger>
                <TabsTrigger value="pending">
                    <Bell className="mr-2 h-4 w-4"/>Pending
                    {pendingSubscriptions.length > 0 && <Badge className="ml-2">{pendingSubscriptions.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4"/>Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-6">
                <Card className="bg-card">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="mb-4 sm:mb-0">
                                <CardTitle>Registered Schools</CardTitle>
                                <CardDescription>View, edit, or delete school accounts.</CardDescription>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <Button onClick={() => openModal('add')} size="sm">
                                    <UserPlus className="mr-2 h-4 w-4" /> Add School
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[60vh] w-full">
                            <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>School Name</TableHead>
                                    <TableHead className="hidden sm:table-cell">School ID</TableHead>
                                    <TableHead className="hidden md:table-cell">Signup Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {allSchools.map((school) => (
                                    <TableRow key={school.id}>
                                    <TableCell className="font-medium">{school.name}</TableCell>
                                    <TableCell className="hidden sm:table-cell">{school.id}</TableCell>
                                    <TableCell className="hidden md:table-cell">{school.signupDate ? format(new Date(school.signupDate), 'dd MMM yyyy') : 'N/A'}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => openModal('edit', school)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteSchool(school)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                            {allSchools.length === 0 && <p className="text-center text-muted-foreground py-8">No schools registered yet.</p>}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="subscriptions" className="mt-6">
                 <Card className="bg-card">
                    <CardHeader>
                        <CardTitle>School Subscriptions</CardTitle>
                        <CardDescription>Manage trial periods and subscription statuses for all schools.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[60vh] w-full">
                           <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>School Name</TableHead>
                                    <TableHead>Subscription Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {allSchools.map((school) => {
                                  const status = getSubscriptionStatus(school);
                                  return (
                                    <TableRow key={school.id}>
                                    <TableCell className="font-medium">{school.name}</TableCell>
                                    <TableCell className={cn("flex items-center gap-2", status.color)}>
                                      <status.icon className="h-4 w-4" /> {status.text}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button variant="outline" size="sm" onClick={() => openSubscriptionModal(school)}>Manage</Button>
                                    </TableCell>
                                    </TableRow>
                                  );
                                })}
                                </TableBody>
                            </Table>
                            {allSchools.length === 0 && <p className="text-center text-muted-foreground py-8">No schools to manage.</p>}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </TabsContent>

             <TabsContent value="pending" className="mt-6">
                <Card className="bg-card">
                    <CardHeader>
                        <CardTitle>Pending Subscription Requests</CardTitle>
                        <CardDescription>Review and approve subscription requests after payment verification.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ScrollArea className="h-[60vh] w-full">
                           <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>School</TableHead>
                                    <TableHead className="hidden md:table-cell">Plan</TableHead>
                                    <TableHead>Payment Proof</TableHead>
                                    <TableHead className="hidden lg:table-cell">Timestamp</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {pendingSubscriptions.map((sub) => (
                                    <TableRow key={sub.id}>
                                    <TableCell>{getSchoolNameById(sub.schoolId)}</TableCell>
                                    <TableCell className="hidden md:table-cell">{sub.planName}</TableCell>
                                    <TableCell>
                                        <Button variant="link" size="sm" className="p-0 h-auto" >
                                            <FileImage className="h-4 w-4 mr-1" /> View
                                        </Button>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell">{new Date(sub.timestamp).toLocaleString()}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="secondary" size="sm" onClick={() => handleApproveSubscription(sub)}>Approve</Button>
                                        <Button variant="destructive" size="sm" onClick={() => handleRejectSubscription(sub)}>Reject</Button>
                                    </TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                            {pendingSubscriptions.length === 0 && <p className="text-center text-muted-foreground py-8">No pending requests.</p>}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="settings" className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card className="bg-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Megaphone /> Broadcast Message</CardTitle>
                        <CardDescription>Post an announcement that will be visible to all users on their dashboard.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {currentAnnouncement && (
                            <div className="p-4 bg-muted rounded-lg border">
                                <p className="text-sm font-semibold">Current Announcement:</p>
                                <p className="text-sm text-muted-foreground mt-1">{currentAnnouncement.message}</p>
                                <p className="text-xs text-muted-foreground/70 mt-2">Posted on: {new Date(currentAnnouncement.timestamp).toLocaleString()}</p>
                            </div>
                        )}
                        <div>
                            <Label htmlFor="announcement" className="sr-only">New Announcement</Label>
                            <Textarea
                                id="announcement"
                                placeholder="Type your announcement here..."
                                value={announcement}
                                onChange={(e) => setAnnouncement(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-4">
                            <Button onClick={handlePublishAnnouncement} className="flex-grow">
                                {currentAnnouncement ? 'Update Announcement' : 'Publish Announcement'}
                            </Button>
                            {currentAnnouncement && (
                                <Button onClick={handleClearAnnouncement} variant="destructive" className="flex-grow">
                                    Clear Announcement
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card">
                    <CardHeader>
                        <CardTitle>Subscription Plans</CardTitle>
                        <CardDescription>Set the prices for your subscription plans. This is for display purposes.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="monthlyPrice">Monthly Price</Label>
                                <Input id="monthlyPrice" placeholder="e.g., 10" value={subscriptionPlans.monthly.price} onChange={(e) => handleSubscriptionPlanChange('monthly', e.target.value)} />
                            </div>
                             <div>
                                <Label htmlFor="halfYearlyPrice">Half-Yearly Price</Label>
                                <Input id="halfYearlyPrice" placeholder="e.g., 50" value={subscriptionPlans.halfYearly.price} onChange={(e) => handleSubscriptionPlanChange('halfYearly', e.target.value)} />
                            </div>
                             <div>
                                <Label htmlFor="annuallyPrice">Annual Price</Label>
                                <Input id="annuallyPrice" placeholder="e.g., 90" value={subscriptionPlans.annually.price} onChange={(e) => handleSubscriptionPlanChange('annually', e.target.value)} />
                            </div>
                        </div>
                        <Button onClick={handleSaveSubscriptionPlans}>Save Plans</Button>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalMode === 'add' ? 'Add New School' : 'Edit School'}</DialogTitle>
            <DialogDescription>
              {modalMode === 'add' ? `Create a new school account with a ${trialDays}-day trial.` : 'Update the details for this school.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="schoolName">School Name</label>
              <Input
                id="schoolName"
                value={schoolNameInput}
                onChange={(e) => setSchoolNameInput(e.target.value)}
                placeholder="e.g., Springfield Elementary"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="schoolId">School ID</label>
              <Input
                id="schoolId"
                value={schoolIdInput}
                onChange={(e) => setSchoolIdInput(e.target.value)}
                placeholder="e.g., SP-ELEM-01"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveChanges}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSubModalOpen} onOpenChange={setIsSubModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Manage Subscription</DialogTitle>
                <DialogDescription>
                    Update the subscription for {selectedSchoolForSub?.name}.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="subEndDate">Subscription End Date</Label>
                    <Input id="subEndDate" type="date" value={subscriptionEndDate} onChange={(e) => setSubscriptionEndDate(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Select a date to activate or extend the subscription. Clear the date to deactivate.</p>
                </div>
                <div className="flex gap-2 justify-center">
                    <Button variant="secondary" size="sm" onClick={() => setSubscriptionEndDate(format(addDays(new Date(), 30), 'yyyy-MM-dd'))}>+1 Month</Button>
                    <Button variant="secondary" size="sm" onClick={() => setSubscriptionEndDate(format(addDays(new Date(), 182), 'yyyy-MM-dd'))}>+6 Months</Button>
                    <Button variant="secondary" size="sm" onClick={() => setSubscriptionEndDate(format(addDays(new Date(), 365), 'yyyy-MM-dd'))}>+1 Year</Button>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsSubModalOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdateSubscription}>Update Subscription</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
