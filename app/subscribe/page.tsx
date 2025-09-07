
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Star, ArrowLeft, Upload } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SubscriptionPlan {
    name: string;
    price: string;
}

interface SubscriptionPlans {
    monthly: SubscriptionPlan;
    halfYearly: SubscriptionPlan;
    annually: SubscriptionPlan;
}

interface PendingSubscription {
    schoolId: string;
    planName: string;
    paymentScreenshot: string;
    timestamp: string;
}

export default function SubscribePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [schoolId, setSchoolId] = useState<string | null>(null);
    const [schoolName, setSchoolName] = useState<string>('');
    const [plans, setPlans] = useState<SubscriptionPlans | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
    const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);

    useEffect(() => {
        try {
            const id = localStorage.getItem('schoolIDForRenewal');
            if (!id) {
                toast({ title: "No school ID found for renewal.", description: "Please go back to the login page and use the 'Renew Subscription' button.", variant: "destructive" });
                router.push('/');
                return;
            }
            
            const schools = JSON.parse(localStorage.getItem('registeredSchools') || '[]');
            const school = schools.find((s: any) => s.id === id);

            setSchoolId(id);
            setSchoolName(school?.name || 'Your School');
            
            const storedPlans = localStorage.getItem('subscriptionPlans');
            if (storedPlans) {
                setPlans(JSON.parse(storedPlans));
            }

            const storedQRCode = localStorage.getItem('paymentQRCode');
            if (storedQRCode) {
                setQrCode(storedQRCode);
            }
        } catch (error) {
            toast({title: "Error loading page", description: "Could not load subscription details.", variant: "destructive"});
            router.push('/');
        }

    }, [router, toast]);
    
    const handleSelectPlan = (plan: SubscriptionPlan) => {
        if (!plan.price) {
            toast({ title: "Price not set", description: "The admin has not set a price for this plan yet.", variant: "destructive"});
            return;
        }
        setSelectedPlan(plan);
        setPaymentScreenshot(null);
    };

    const handleScreenshotUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPaymentScreenshot(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmitPayment = () => {
        if (!paymentScreenshot) {
            toast({ title: "Payment screenshot is required", variant: "destructive" });
            return;
        }
        if (!schoolId || !selectedPlan) return;

        const newPendingSub: PendingSubscription = {
            schoolId,
            planName: selectedPlan.name,
            paymentScreenshot: paymentScreenshot,
            timestamp: new Date().toISOString()
        };

        const pendingSubs = JSON.parse(localStorage.getItem('pendingSubscriptions') || '[]');
        pendingSubs.push(newPendingSub);
        localStorage.setItem('pendingSubscriptions', JSON.stringify(pendingSubs));
        
        setSelectedPlan(null);
        setPaymentScreenshot(null);
        toast({
            title: "Subscription Request Submitted",
            description: "Your request has been sent to the admin for verification. Your account will be activated shortly.",
            duration: 5000,
        });
        router.push('/');
    };
    
    const handleBackToPlans = () => {
        setSelectedPlan(null);
    }

    const planFeatures = [
        "Full Timetable Generation",
        "Teacher & Class Management",
        "Manual Timetable Editing",
        "Daily Arrangement",
        "PDF & Excel Exports"
    ];

    return (
        <main className="min-h-screen w-full flex items-center justify-center p-4 bg-background relative">
            <Card className="w-full max-w-4xl shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold text-primary">
                        {selectedPlan ? `Complete Payment for ${selectedPlan.name}` : "Subscription Expired"}
                    </CardTitle>
                    <CardDescription>
                        {selectedPlan ? `Scan the QR code to pay ₹${selectedPlan.price}` : `Welcome, ${schoolName}. Your trial or subscription has ended. Please choose a plan.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {selectedPlan ? (
                        <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                             <div className="flex-shrink-0 text-center">
                                <div className="p-4 border rounded-md bg-white inline-block">
                                   <Image
                                        src={qrCode || "https://placehold.co/250x250.png"}
                                        alt="UPI QR Code"
                                        width={250}
                                        height={250}
                                        data-ai-hint="QR code"
                                    />
                                </div>
                                <p className="text-2xl font-bold mt-4">Amount: ₹{selectedPlan?.price}</p>
                                <p className="text-muted-foreground">Scan with any UPI app</p>
                            </div>
                            <div className="w-full max-w-sm space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="screenshot">Upload Payment Screenshot</Label>
                                    <Input 
                                        id="screenshot" 
                                        type="file"
                                        accept="image/*"
                                        onChange={handleScreenshotUpload}
                                    />
                                    {paymentScreenshot && (
                                        <div className="p-2 border rounded-md mt-2">
                                            <Image src={paymentScreenshot} alt="Screenshot preview" width={100} height={200} className="w-auto h-auto max-h-48 mx-auto" />
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground">After paying, upload a screenshot of the successful transaction.</p>
                                </div>
                                 <div className="flex flex-col gap-2">
                                    <Button onClick={handleSubmitPayment} size="lg" disabled={!paymentScreenshot}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Submit for Verification
                                    </Button>
                                    <Button variant="outline" onClick={handleBackToPlans}>
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Back to Plans
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-6">
                            {plans ? (
                                <>
                                    <PlanCard 
                                        plan={plans.monthly} 
                                        title="Monthly" 
                                        features={planFeatures} 
                                        onSelect={handleSelectPlan} 
                                    />
                                    <PlanCard 
                                        plan={plans.halfYearly} 
                                        title="Half-Yearly" 
                                        features={planFeatures} 
                                        onSelect={handleSelectPlan}
                                        popular
                                    />
                                    <PlanCard 
                                        plan={plans.annually} 
                                        title="Annually" 
                                        features={planFeatures} 
                                        onSelect={handleSelectPlan}
                                    />
                                </>
                            ) : (
                                <p className="col-span-3 text-center text-muted-foreground">Subscription plans are not configured yet. Please contact the administrator.</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}

function PlanCard({ plan, title, features, onSelect, popular = false }: { plan: SubscriptionPlan, title: string, features: string[], onSelect: (plan: SubscriptionPlan) => void, popular?: boolean }) {
    return (
        <Card className={`flex flex-col ${popular ? 'border-primary shadow-primary/20 shadow-lg' : ''}`}>
             {popular && (
                <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-semibold rounded-t-lg flex items-center justify-center gap-2">
                    <Star className="w-4 h-4"/> Most Popular
                </div>
            )}
            <CardHeader className="flex-grow text-center">
                <CardTitle>{title}</CardTitle>
                <p className="text-4xl font-bold">₹{plan?.price || 'N/A'}</p>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow">
                <ul className="space-y-2 text-muted-foreground flex-grow mb-6">
                    {features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
                 <Button onClick={() => onSelect(plan)} className="w-full mt-auto" disabled={!plan?.price}>
                    Choose Plan
                </Button>
            </CardContent>
        </Card>
    )
}

    