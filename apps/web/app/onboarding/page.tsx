'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ArrowRight,
    ArrowLeft,
    Check,
    SkipForward,
    Loader2,
    Building2,
    Store,
    MessageSquare,
    Users,
    PartyPopper,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingStatus {
    completed: boolean;
    skipped: boolean;
    currentStep: number;
    stepsCompleted: string[];
    stepsSkipped: string[];
    storeConnected: boolean;
    channelConnected: boolean;
    teamInvited: boolean;
    currentStepName: string;
    isComplete: boolean;
}

const STEPS = [
    { id: 'welcome', name: 'Welcome', icon: Building2, description: 'Set up your workspace' },
    { id: 'connect-store', name: 'Connect Store', icon: Store, description: 'Link your e-commerce store' },
    { id: 'connect-channel', name: 'Connect Channel', icon: MessageSquare, description: 'Add communication channels' },
    { id: 'invite-team', name: 'Invite Team', icon: Users, description: 'Bring your team on board' },
    { id: 'complete', name: 'Complete', icon: PartyPopper, description: 'You\'re all set!' },
];

export default function OnboardingPage() {
    const router = useRouter();
    const [status, setStatus] = useState<OnboardingStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    const fetchStatus = useCallback(async () => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/onboarding/status`,
                { credentials: 'include' }
            );
            if (response.ok) {
                const data = await response.json();
                setStatus(data);
                setCurrentStep(data.currentStep || 0);

                // If already complete, redirect to dashboard
                if (data.isComplete) {
                    router.push('/dashboard');
                }
            }
        } catch (error) {
            console.error('Error fetching onboarding status:', error);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const apiCall = async (endpoint: string, body?: any) => {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/onboarding/${endpoint}`,
            {
                method: endpoint === 'status' ? 'GET' : 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined,
            }
        );
        return response.json();
    };

    const handleNext = async () => {
        setActionLoading(true);
        try {
            const stepId = STEPS[currentStep].id;
            await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/onboarding/step`,
                {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ step: stepId, completed: true }),
                }
            );

            if (currentStep === STEPS.length - 1) {
                await apiCall('complete');
                router.push('/dashboard');
            } else {
                setCurrentStep(prev => prev + 1);
                await fetchStatus();
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSkipStep = async () => {
        setActionLoading(true);
        try {
            const stepId = STEPS[currentStep].id;
            await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/onboarding/skip-step`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ step: stepId }),
                }
            );

            if (currentStep === STEPS.length - 2) {
                // If skipping the second to last step (invite team), go to complete
                setCurrentStep(STEPS.length - 1);
            } else {
                setCurrentStep(prev => prev + 1);
            }
            await fetchStatus();
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSkipAll = async () => {
        setActionLoading(true);
        try {
            await apiCall('skip-all');
            router.push('/dashboard');
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const step = STEPS[currentStep];
    const isLastStep = currentStep === STEPS.length - 1;
    const isCompleteStep = step.id === 'complete';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-primary">OmniChannel</h1>
                    <p className="text-muted-foreground mt-2">Let's get you started</p>
                </div>

                {/* Progress Steps */}
                <div className="mb-8">
                    <div className="flex items-center justify-between relative">
                        {/* Progress line */}
                        <div className="absolute left-0 right-0 top-5 h-0.5 bg-muted" />
                        <div
                            className="absolute left-0 top-5 h-0.5 bg-primary transition-all duration-500"
                            style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
                        />

                        {STEPS.map((s, index) => {
                            const StepIcon = s.icon;
                            const isCompleted = status?.stepsCompleted?.includes(s.id) || index < currentStep;
                            const isSkipped = status?.stepsSkipped?.includes(s.id);
                            const isCurrent = index === currentStep;

                            return (
                                <div key={s.id} className="flex flex-col items-center relative z-10">
                                    <div
                                        className={cn(
                                            'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                                            isCompleted && !isSkipped
                                                ? 'bg-primary border-primary text-white'
                                                : isSkipped
                                                    ? 'bg-yellow-100 border-yellow-500 text-yellow-600'
                                                    : isCurrent
                                                        ? 'bg-white border-primary text-primary'
                                                        : 'bg-white border-muted text-muted-foreground'
                                        )}
                                    >
                                        {isCompleted && !isSkipped ? (
                                            <Check className="h-5 w-5" />
                                        ) : isSkipped ? (
                                            <SkipForward className="h-4 w-4" />
                                        ) : (
                                            <StepIcon className="h-5 w-5" />
                                        )}
                                    </div>
                                    <span className={cn(
                                        'text-xs mt-2 font-medium hidden sm:block',
                                        isCurrent ? 'text-primary' : 'text-muted-foreground'
                                    )}>
                                        {s.name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content Card */}
                <Card className="shadow-lg">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <step.icon className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">{step.name}</CardTitle>
                        <CardDescription>{step.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="pt-6">
                        {/* Step Content */}
                        {step.id === 'welcome' && (
                            <div className="text-center space-y-4">
                                <p className="text-muted-foreground">
                                    Welcome to OmniChannel! We'll help you set up your workspace in just a few steps.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                    <div className="p-4 border rounded-lg">
                                        <Store className="h-8 w-8 text-primary mx-auto mb-2" />
                                        <h4 className="font-medium">Connect Store</h4>
                                        <p className="text-sm text-muted-foreground">Link Shopify or WooCommerce</p>
                                    </div>
                                    <div className="p-4 border rounded-lg">
                                        <MessageSquare className="h-8 w-8 text-primary mx-auto mb-2" />
                                        <h4 className="font-medium">Add Channels</h4>
                                        <p className="text-sm text-muted-foreground">WhatsApp, Email, Instagram</p>
                                    </div>
                                    <div className="p-4 border rounded-lg">
                                        <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                                        <h4 className="font-medium">Invite Team</h4>
                                        <p className="text-sm text-muted-foreground">Add team members</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step.id === 'connect-store' && (
                            <div className="space-y-4">
                                <p className="text-center text-muted-foreground mb-6">
                                    Connect your e-commerce store to sync products, orders, and customers.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Button
                                        variant="outline"
                                        className="h-24 flex flex-col gap-2"
                                        onClick={() => router.push('/settings/stores')}
                                    >
                                        <Store className="h-8 w-8 text-green-600" />
                                        <span>Shopify</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-24 flex flex-col gap-2"
                                        onClick={() => router.push('/settings/stores')}
                                    >
                                        <Store className="h-8 w-8 text-purple-600" />
                                        <span>WooCommerce</span>
                                    </Button>
                                </div>
                                <p className="text-center text-sm text-muted-foreground mt-4">
                                    You can add more stores later from Settings → Stores
                                </p>
                            </div>
                        )}

                        {step.id === 'connect-channel' && (
                            <div className="space-y-4">
                                <p className="text-center text-muted-foreground mb-6">
                                    Add communication channels to reach your customers.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Button
                                        variant="outline"
                                        className="h-24 flex flex-col gap-2"
                                        onClick={() => router.push('/channels')}
                                    >
                                        <MessageSquare className="h-8 w-8 text-green-600" />
                                        <span>WhatsApp</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-24 flex flex-col gap-2"
                                        onClick={() => router.push('/channels')}
                                    >
                                        <MessageSquare className="h-8 w-8 text-blue-600" />
                                        <span>Email</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-24 flex flex-col gap-2"
                                        onClick={() => router.push('/channels')}
                                    >
                                        <MessageSquare className="h-8 w-8 text-pink-600" />
                                        <span>Instagram</span>
                                    </Button>
                                </div>
                                <p className="text-center text-sm text-muted-foreground mt-4">
                                    You can add more channels later from the Channels page
                                </p>
                            </div>
                        )}

                        {step.id === 'invite-team' && (
                            <div className="space-y-4">
                                <p className="text-center text-muted-foreground mb-6">
                                    Invite team members to collaborate on customer conversations.
                                </p>
                                <div className="text-center">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={() => router.push('/settings')}
                                    >
                                        <Users className="h-5 w-5 mr-2" />
                                        Go to Team Settings
                                    </Button>
                                </div>
                                <p className="text-center text-sm text-muted-foreground mt-4">
                                    You can invite team members later from Settings
                                </p>
                            </div>
                        )}

                        {step.id === 'complete' && (
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                                    <PartyPopper className="h-10 w-10 text-green-600" />
                                </div>
                                <h3 className="text-xl font-semibold">You're all set!</h3>
                                <p className="text-muted-foreground">
                                    Your workspace is ready. Head to the dashboard to get started.
                                </p>
                                {status && (status.stepsSkipped?.length || 0) > 0 && (
                                    <p className="text-sm text-yellow-600">
                                        You skipped some steps. You can complete them anytime from Settings.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between mt-8 pt-6 border-t">
                            <div>
                                {currentStep > 0 && !isCompleteStep && (
                                    <Button variant="ghost" onClick={handleBack} disabled={actionLoading}>
                                        <ArrowLeft className="h-4 w-4 mr-2" />
                                        Back
                                    </Button>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {!isCompleteStep && (
                                    <Button
                                        variant="ghost"
                                        onClick={handleSkipStep}
                                        disabled={actionLoading}
                                    >
                                        <SkipForward className="h-4 w-4 mr-2" />
                                        Skip this step
                                    </Button>
                                )}

                                <Button onClick={handleNext} disabled={actionLoading}>
                                    {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    {isCompleteStep ? 'Go to Dashboard' : 'Next'}
                                    {!isCompleteStep && <ArrowRight className="h-4 w-4 ml-2" />}
                                </Button>
                            </div>
                        </div>

                        {/* Skip All Option */}
                        {!isCompleteStep && (
                            <div className="text-center mt-4">
                                <Button
                                    variant="link"
                                    className="text-muted-foreground"
                                    onClick={handleSkipAll}
                                    disabled={actionLoading}
                                >
                                    Skip all and go to Dashboard
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
