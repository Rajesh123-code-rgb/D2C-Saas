'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Check,
    X,
    Zap,
    Crown,
    Building2,
    Users,
    ArrowRight,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Plan {
    id: string;
    tier: string;
    displayName: string;
    description: string;
    monthlyPrice: number;
    yearlyPrice: number;
    features: {
        maxContacts: number;
        maxAgents: number;
        maxAutomations: number;
        maxMessagesPerMonth: number;
        maxCampaignsPerMonth: number;
        aiFeatures: boolean;
        customIntegrations: boolean;
        prioritySupport: boolean;
        dedicatedAccount: boolean;
        whiteLabeling: boolean;
        apiAccess: boolean;
        advancedAnalytics: boolean;
    };
    isPopular: boolean;
}

const planIcons: Record<string, any> = {
    free: Zap,
    starter: Users,
    pro: Crown,
    enterprise: Building2,
};

const featureLabels: Record<string, string> = {
    maxContacts: 'Contacts',
    maxAgents: 'Team Members',
    maxAutomations: 'Automations',
    maxMessagesPerMonth: 'Messages / Month',
    maxCampaignsPerMonth: 'Campaigns / Month',
    aiFeatures: 'AI Features',
    customIntegrations: 'Custom Integrations',
    prioritySupport: 'Priority Support',
    dedicatedAccount: 'Dedicated Account Manager',
    whiteLabeling: 'White Labeling',
    apiAccess: 'API Access',
    advancedAnalytics: 'Advanced Analytics',
};

export default function PricingPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const response = await fetch('/api/billing/plans');
                const data = await response.json();
                setPlans(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error fetching plans:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    const formatLimit = (limit: number) => {
        if (limit === -1) return 'Unlimited';
        if (limit >= 1000) return `${(limit / 1000).toFixed(0)}K`;
        return limit.toString();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
            {/* Header */}
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="container flex h-16 items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl">
                        <Zap className="h-6 w-6 text-primary" />
                        CommutePro
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/login">
                            <Button variant="ghost">Sign In</Button>
                        </Link>
                        <Link href="/signup">
                            <Button>Get Started</Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="py-20 text-center">
                <div className="container">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                        Simple, Transparent Pricing
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                        Choose the plan that fits your business. All plans include core features with no hidden fees.
                    </p>

                    {/* Billing Toggle */}
                    <div className="inline-flex items-center bg-muted p-1 rounded-lg mb-12">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={cn(
                                'px-6 py-2 rounded-md text-sm font-medium transition-colors',
                                billingCycle === 'monthly' ? 'bg-background shadow' : 'text-muted-foreground'
                            )}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingCycle('yearly')}
                            className={cn(
                                'px-6 py-2 rounded-md text-sm font-medium transition-colors',
                                billingCycle === 'yearly' ? 'bg-background shadow' : 'text-muted-foreground'
                            )}
                        >
                            Yearly <span className="ml-2 text-green-600 bg-green-100 px-2 py-0.5 rounded text-xs">Save 20%</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="pb-20">
                <div className="container">
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                        {plans.map((plan) => {
                            const Icon = planIcons[plan.tier] || Zap;
                            const monthlyPrice = parseFloat(String(plan.monthlyPrice)) || 0;
                            const yearlyPrice = parseFloat(String(plan.yearlyPrice)) || 0;
                            const price = billingCycle === 'monthly' ? monthlyPrice : yearlyPrice / 12;

                            return (
                                <Card key={plan.id} className={cn(
                                    'relative flex flex-col',
                                    plan.isPopular && 'border-primary shadow-xl scale-105'
                                )}>
                                    {plan.isPopular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                            <span className="bg-primary text-primary-foreground text-sm font-medium px-4 py-1 rounded-full">
                                                Most Popular
                                            </span>
                                        </div>
                                    )}
                                    <CardHeader className="text-center pb-4">
                                        <div className="mx-auto p-4 rounded-full bg-muted mb-4">
                                            <Icon className="h-8 w-8" />
                                        </div>
                                        <CardTitle className="text-2xl">{plan.displayName}</CardTitle>
                                        <CardDescription className="mt-2">{plan.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 flex flex-col">
                                        <div className="text-center mb-8">
                                            <span className="text-5xl font-bold">${price.toFixed(0)}</span>
                                            <span className="text-muted-foreground">/month</span>
                                            {billingCycle === 'yearly' && monthlyPrice > 0 && (
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Billed ${yearlyPrice.toFixed(0)} yearly
                                                </p>
                                            )}
                                        </div>
                                        <ul className="space-y-3 text-sm mb-8 flex-1">
                                            <li className="flex items-center gap-3">
                                                <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                                                <span>{formatLimit(plan.features.maxContacts)} Contacts</span>
                                            </li>
                                            <li className="flex items-center gap-3">
                                                <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                                                <span>{formatLimit(plan.features.maxMessagesPerMonth)} Messages/mo</span>
                                            </li>
                                            <li className="flex items-center gap-3">
                                                <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                                                <span>{formatLimit(plan.features.maxAgents)} Team Members</span>
                                            </li>
                                            <li className="flex items-center gap-3">
                                                <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                                                <span>{formatLimit(plan.features.maxAutomations)} Automations</span>
                                            </li>
                                            <li className="flex items-center gap-3">
                                                {plan.features.aiFeatures ? (
                                                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                                                ) : (
                                                    <X className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                                )}
                                                <span className={!plan.features.aiFeatures ? 'text-muted-foreground' : ''}>
                                                    AI Features
                                                </span>
                                            </li>
                                            <li className="flex items-center gap-3">
                                                {plan.features.prioritySupport ? (
                                                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                                                ) : (
                                                    <X className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                                )}
                                                <span className={!plan.features.prioritySupport ? 'text-muted-foreground' : ''}>
                                                    Priority Support
                                                </span>
                                            </li>
                                        </ul>
                                        <Link href="/signup" className="block">
                                            <Button
                                                className="w-full"
                                                variant={plan.isPopular ? 'default' : 'outline'}
                                                size="lg"
                                            >
                                                {plan.tier === 'free' ? 'Start Free' : 'Get Started'}
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Feature Comparison Table */}
            <section className="py-20 bg-muted/50">
                <div className="container">
                    <h2 className="text-3xl font-bold text-center mb-12">Compare All Features</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-4 px-4 font-medium">Feature</th>
                                    {plans.map((plan) => (
                                        <th key={plan.id} className="text-center py-4 px-4 font-medium">
                                            {plan.displayName}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Object.keys(featureLabels).map((feature) => (
                                    <tr key={feature} className="border-b">
                                        <td className="py-4 px-4">{featureLabels[feature]}</td>
                                        {plans.map((plan) => {
                                            const value = plan.features[feature as keyof typeof plan.features];
                                            return (
                                                <td key={plan.id} className="text-center py-4 px-4">
                                                    {typeof value === 'boolean' ? (
                                                        value ? (
                                                            <Check className="h-5 w-5 text-green-600 mx-auto" />
                                                        ) : (
                                                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                                                        )
                                                    ) : (
                                                        formatLimit(value)
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20">
                <div className="container text-center">
                    <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
                    <p className="text-xl text-muted-foreground mb-8">
                        Start your 14-day free trial. No credit card required.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Link href="/signup">
                            <Button size="lg">
                                Start Free Trial
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="/">
                            <Button variant="outline" size="lg">
                                Contact Sales
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t py-8">
                <div className="container text-center text-sm text-muted-foreground">
                    <p>© 2024 CommutePro. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
