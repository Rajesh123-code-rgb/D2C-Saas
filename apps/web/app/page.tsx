import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    MessageSquare,
    Instagram,
    Mail,
    Zap,
    Users,
    BarChart3,
    ShoppingCart,
    Workflow,
    Check,
    ArrowRight,
} from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="flex min-h-screen flex-col">
            {/* Navigation */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                            <MessageSquare className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-bold">OmniChannel</span>
                    </div>
                    <nav className="hidden gap-6 md:flex">
                        <Link href="#features" className="text-sm font-medium hover:text-primary">
                            Features
                        </Link>
                        <Link href="#pricing" className="text-sm font-medium hover:text-primary">
                            Pricing
                        </Link>
                        <Link href="#about" className="text-sm font-medium hover:text-primary">
                            About
                        </Link>
                    </nav>
                    <div className="flex gap-2">
                        <Button variant="ghost" asChild>
                            <Link href="/login">Login</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/signup">Get Started</Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero Section */}
                <section className="container relative overflow-hidden py-20 md:py-32">
                    <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-background" />
                    <div className="mx-auto max-w-4xl text-center">
                        <div className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                            ✨ The Future of Customer Communication
                        </div>
                        <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
                            Unify WhatsApp, Instagram & Email in{' '}
                            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                                One Platform
                            </span>
                        </h1>
                        <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
                            Manage all your customer conversations, automate marketing campaigns, and grow your
                            business with our enterprise-grade omnichannel platform.
                        </p>
                        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                            <Button size="lg" asChild>
                                <Link href="/signup">
                                    Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button size="lg" variant="outline" asChild>
                                <Link href="#features">Learn More</Link>
                            </Button>
                        </div>
                        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-primary" />
                                No credit card required
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-primary" />
                                14-day free trial
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-primary" />
                                Cancel anytime
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="container py-20">
                    <div className="mb-12 text-center">
                        <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Everything You Need</h2>
                        <p className="text-lg text-muted-foreground">
                            Powerful features to manage all your customer communications
                        </p>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader>
                                <MessageSquare className="mb-2 h-10 w-10 text-primary" />
                                <CardTitle>Unified Inbox</CardTitle>
                                <CardDescription>
                                    Manage WhatsApp, Instagram, and Email conversations in one place
                                </CardDescription>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader>
                                <Workflow className="mb-2 h-10 w-10 text-primary" />
                                <CardTitle>Visual Automation</CardTitle>
                                <CardDescription>
                                    Build powerful no-code automations with our drag-and-drop builder
                                </CardDescription>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader>
                                <Users className="mb-2 h-10 w-10 text-primary" />
                                <CardTitle>Advanced CRM</CardTitle>
                                <CardDescription>
                                    Unified customer profiles with tags, custom fields, and lifecycle tracking
                                </CardDescription>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader>
                                <Zap className="mb-2 h-10 w-10 text-primary" />
                                <CardTitle>Marketing Campaigns</CardTitle>
                                <CardDescription>
                                    Send targeted WhatsApp and email campaigns to segmented audiences
                                </CardDescription>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader>
                                <ShoppingCart className="mb-2 h-10 w-10 text-primary" />
                                <CardTitle>E-commerce Integration</CardTitle>
                                <CardDescription>
                                    Connect Shopify and WooCommerce for order automation
                                </CardDescription>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader>
                                <BarChart3 className="mb-2 h-10 w-10 text-primary" />
                                <CardTitle>Analytics & Reports</CardTitle>
                                <CardDescription>
                                    Track performance with detailed analytics and insights
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </div>
                </section>

                {/* Channels Section */}
                <section className="border-y bg-muted/50 py-20">
                    <div className="container">
                        <div className="mb-12 text-center">
                            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Multi-Channel Support</h2>
                            <p className="text-lg text-muted-foreground">
                                Connect all your favorite platforms in minutes
                            </p>
                        </div>
                        <div className="grid gap-8 md:grid-cols-3">
                            <Card className="text-center">
                                <CardHeader>
                                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                                        <MessageSquare className="h-8 w-8 text-green-600" />
                                    </div>
                                    <CardTitle>WhatsApp Business</CardTitle>
                                    <CardDescription>
                                        Official WhatsApp Cloud API integration with template messaging and catalog
                                        sharing
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="text-center">
                                <CardHeader>
                                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-100">
                                        <Instagram className="h-8 w-8 text-pink-600" />
                                    </div>
                                    <CardTitle>Instagram Business</CardTitle>
                                    <CardDescription>
                                        Direct messaging, story replies, and comment automation for your Instagram
                                        Business account
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="text-center">
                                <CardHeader>
                                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                                        <Mail className="h-8 w-8 text-blue-600" />
                                    </div>
                                    <CardTitle>Email Marketing</CardTitle>
                                    <CardDescription>
                                        Send transactional emails and marketing campaigns with SendGrid or AWS SES
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="container py-20">
                    <div className="mb-12 text-center">
                        <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Simple, Transparent Pricing</h2>
                        <p className="text-lg text-muted-foreground">
                            Choose the plan that fits your business needs
                        </p>
                    </div>
                    <div className="grid gap-8 md:grid-cols-3">
                        <Card>
                            <CardHeader>
                                <CardTitle>Starter</CardTitle>
                                <CardDescription>Perfect for small businesses</CardDescription>
                                <div className="mt-4">
                                    <span className="text-4xl font-bold">$49</span>
                                    <span className="text-muted-foreground">/month</span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        <span>1,000 conversations/month</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        <span>3 team members</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        <span>WhatsApp + Email</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        <span>Basic automation</span>
                                    </li>
                                </ul>
                                <Button className="mt-6 w-full" variant="outline">
                                    Start Free Trial
                                </Button>
                            </CardContent>
                        </Card>
                        <Card className="border-primary shadow-lg">
                            <div className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                                Popular
                            </div>
                            <CardHeader>
                                <CardTitle>Professional</CardTitle>
                                <CardDescription>For growing teams</CardDescription>
                                <div className="mt-4">
                                    <span className="text-4xl font-bold">$149</span>
                                    <span className="text-muted-foreground">/month</span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        <span>10,000 conversations/month</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        <span>10 team members</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        <span>All channels</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        <span>Advanced automation</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        <span>E-commerce integration</span>
                                    </li>
                                </ul>
                                <Button className="mt-6 w-full">Start Free Trial</Button>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Enterprise</CardTitle>
                                <CardDescription>For large organizations</CardDescription>
                                <div className="mt-4">
                                    <span className="text-4xl font-bold">Custom</span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        <span>Unlimited conversations</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        <span>Unlimited team members</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        <span>All channels</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        <span>Custom integrations</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        <span>Dedicated support</span>
                                    </li>
                                </ul>
                                <Button className="mt-6 w-full" variant="outline">
                                    Contact Sales
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="border-t bg-primary py-20 text-primary-foreground">
                    <div className="container text-center">
                        <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Ready to Get Started?</h2>
                        <p className="mb-8 text-lg opacity-90">
                            Join thousands of businesses using OmniChannel to grow their customer relationships
                        </p>
                        <Button size="lg" variant="secondary" asChild>
                            <Link href="/signup">
                                Start Your Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t py-12">
                <div className="container">
                    <div className="grid gap-8 md:grid-cols-4">
                        <div>
                            <div className="mb-4 flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                                    <MessageSquare className="h-5 w-5 text-primary-foreground" />
                                </div>
                                <span className="font-bold">OmniChannel</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Enterprise omnichannel communication platform for modern businesses.
                            </p>
                        </div>
                        <div>
                            <h3 className="mb-4 font-semibold">Product</h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <Link href="#features" className="hover:text-foreground">
                                        Features
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#pricing" className="hover:text-foreground">
                                        Pricing
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="hover:text-foreground">
                                        Documentation
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="mb-4 font-semibold">Company</h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <Link href="#about" className="hover:text-foreground">
                                        About
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="hover:text-foreground">
                                        Blog
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="hover:text-foreground">
                                        Contact
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="mb-4 font-semibold">Legal</h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <Link href="#" className="hover:text-foreground">
                                        Privacy Policy
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="hover:text-foreground">
                                        Terms of Service
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="hover:text-foreground">
                                        Cookie Policy
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
                        © 2024 OmniChannel. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
