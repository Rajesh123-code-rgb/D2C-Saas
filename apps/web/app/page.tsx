'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    MessageSquare,
    Instagram,
    Zap,
    Users,
    BarChart3,
    ShoppingCart,
    Workflow,
    Check,
    Globe,
    Shield
} from 'lucide-react';

export default function LandingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            // Validate token format (basic check)
            if (token.split('.').length === 3) {
                // Store token in localStorage
                localStorage.setItem('accessToken', token);

                // Set cookie for middleware/server components
                document.cookie = `token=${token}; path=/; max-age=3600; SameSite=Strict`;

                // Redirect to dashboard
                router.push('/dashboard');
            }
        }
    }, [searchParams, router]);

    return (
        <div className="flex min-h-screen flex-col font-sans">
            {/* Header */}
            <header className="fixed top-0 z-50 w-full transition-all duration-300 bg-background/80 backdrop-blur-md border-b border-white/5">
                <div className="container flex h-16 items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-black">
                            <MessageSquare className="h-5 w-5 fill-current" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">OmniChannel</span>
                    </div>
                    <nav className="hidden gap-8 md:flex">
                        <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Features
                        </Link>
                        <Link href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Pricing
                        </Link>
                        <Link href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            About
                        </Link>
                    </nav>
                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
                            Log in
                        </Link>
                        <Button asChild className="rounded-full px-6 font-semibold" size="default">
                            <Link href="/signup">Start free</Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-[#101010] text-white">
                    <div className="container relative z-10">
                        <div className="flex flex-col lg:flex-row items-center gap-16">
                            <div className="flex-1 text-center lg:text-left">
                                <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl mb-8 leading-[1.1]">
                                    One platform.<br />
                                    <span className="text-primary">All channels.</span><br />
                                    Zero friction.
                                </h1>
                                <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                                    The only omnichannel platform you need to drive sales on WhatsApp, Instagram, and Email. Automate everything, engage everywhere.
                                </p>
                                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                                    <Button size="lg" className="rounded-full h-14 px-8 text-lg w-full sm:w-auto font-bold" asChild>
                                        <Link href="/signup">
                                            Start free now
                                        </Link>
                                    </Button>
                                    <Button size="lg" variant="outline" className="rounded-full h-14 px-8 text-lg w-full sm:w-auto border-gray-700 hover:bg-gray-800 text-white" asChild>
                                        <Link href="#features">See how it works</Link>
                                    </Button>
                                </div>
                                <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-sm text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        <span>No credit card required</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        <span>14-day free trial</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 w-full max-w-[600px] lg:max-w-none relative">
                                <div className="absolute -inset-4 bg-primary/20 rounded-full blur-3xl opacity-20"></div>
                                <div className="relative aspect-square rounded-[3rem] overflow-hidden bg-gradient-to-br from-gray-800 to-black border border-gray-800 shadow-2xl">
                                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=1632')] bg-cover bg-center opacity-80 mix-blend-overlay"></div>
                                    <div className="absolute inset-0 flex items-center justify-center p-8">
                                        <div className="bg-black/80 backdrop-blur border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                                    <MessageSquare className="h-5 w-5 text-green-500" />
                                                </div>
                                                <div>
                                                    <div className="h-2 w-24 bg-gray-700 rounded mb-1"></div>
                                                    <div className="h-2 w-16 bg-gray-700 rounded"></div>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="h-2 w-full bg-gray-800 rounded"></div>
                                                <div className="h-2 w-5/6 bg-gray-800 rounded"></div>
                                                <div className="h-2 w-4/6 bg-gray-800 rounded"></div>
                                            </div>
                                            <div className="mt-6 flex gap-3">
                                                <div className="h-8 flex-1 bg-primary rounded-lg"></div>
                                                <div className="h-8 w-8 bg-gray-800 rounded-lg"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Social Proof */}
                <section className="py-12 border-b bg-white">
                    <div className="container">
                        <p className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider mb-8">
                            Trusted by 50,000+ ambitious brands
                        </p>
                        <div className="flex flex-wrap justify-center items-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-8 w-24 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section id="features" className="py-24 bg-white">
                    <div className="container">
                        <div className="max-w-3xl mx-auto text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900">
                                Everything you need to grow
                            </h2>
                            <p className="text-xl text-gray-600">
                                Powerful features to manage all your customer conversations and boost sales.
                            </p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                {
                                    icon: MessageSquare,
                                    title: "Unified Inbox",
                                    desc: "Manage WhatsApp, Instagram, and Email conversations in one streamlined interface."
                                },
                                {
                                    icon: Workflow,
                                    title: "Visual Automation",
                                    desc: "Build powerful flows with our bold, no-code visual editor. Drag, drop, done."
                                },
                                {
                                    icon: Zap,
                                    title: "Campaigns",
                                    desc: "Send targeted blasts on WhatsApp and Email to drive instant revenue."
                                },
                                {
                                    icon: Users,
                                    title: "CRM",
                                    desc: "Know your customers with rich profiles, tags, and purchase history."
                                },
                                {
                                    icon: ShoppingCart,
                                    title: "E-commerce",
                                    desc: "Deep integration with Shopify & WooCommerce for abandoned cart recovery."
                                },
                                {
                                    icon: BarChart3,
                                    title: "Analytics",
                                    desc: "Real-time insights on open rates, click-throughs, and revenue generated."
                                }
                            ].map((feature, i) => (
                                <Card key={i} className="border-none shadow-sm bg-gray-50 hover:bg-white hover:shadow-xl transition-all duration-300">
                                    <CardHeader>
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-black">
                                            <feature.icon className="h-6 w-6" />
                                        </div>
                                        <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                                        <CardDescription className="text-base text-gray-600 leading-relaxed">
                                            {feature.desc}
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Integration Section */}
                <section className="py-24 bg-[#101010] text-white overflow-hidden">
                    <div className="container relative">
                        <div className="flex flex-col md:flex-row items-center gap-16">
                            <div className="flex-1">
                                <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6">
                                    INTEGRATIONS
                                </span>
                                <h2 className="text-3xl md:text-5xl font-bold mb-6">
                                    Play well with others
                                </h2>
                                <p className="text-xl text-gray-400 mb-8">
                                    Connect OmniChannel with your favorite tools. From e-commerce platforms like Shopify to payment gateways and CRMs.
                                </p>
                                <ul className="space-y-4 mb-8">
                                    {['One-click Shopify Connect', 'Custom Webhooks', 'Zapier Integration'].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-lg">
                                            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                                                <Check className="h-3 w-3 text-black font-bold" />
                                            </div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <Button size="lg" className="rounded-full px-8 font-bold" asChild>
                                    <Link href="/signup">View all integrations</Link>
                                </Button>
                            </div>
                            <div className="flex-1 relative">
                                <div className="grid grid-cols-2 gap-4">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className={`aspect-square rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-8 ${i % 2 === 0 ? 'translate-y-8' : ''}`}>
                                            <div className="w-16 h-16 rounded-full bg-white/10"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats / Interactive */}
                <section className="py-24 bg-primary text-black">
                    <div className="container text-center">
                        <h2 className="text-3xl md:text-5xl font-bold mb-16">
                            Maximize your ROI
                        </h2>
                        <div className="grid md:grid-cols-3 gap-12">
                            <div>
                                <div className="text-6xl font-extrabold mb-4">40%</div>
                                <p className="text-xl font-medium opacity-80">Increase in revenue</p>
                            </div>
                            <div>
                                <div className="text-6xl font-extrabold mb-4">2.5x</div>
                                <p className="text-xl font-medium opacity-80">Higher engagement</p>
                            </div>
                            <div>
                                <div className="text-6xl font-extrabold mb-4">24/7</div>
                                <p className="text-xl font-medium opacity-80">Automated support</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-[#050505] text-white py-20 border-t border-white/10">
                    <div className="container">
                        <div className="grid md:grid-cols-4 gap-12 mb-16">
                            <div className="col-span-1 md:col-span-1">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-black">
                                        <MessageSquare className="h-5 w-5 fill-current" />
                                    </div>
                                    <span className="text-xl font-bold">OmniChannel</span>
                                </div>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    The all-in-one platform for modern customer communication. Built for growth, designed for simplicity.
                                </p>
                            </div>
                            <div>
                                <h4 className="font-bold mb-6">Product</h4>
                                <ul className="space-y-4 text-gray-500 text-sm">
                                    <li><Link href="#" className="hover:text-primary transition-colors">Features</Link></li>
                                    <li><Link href="#" className="hover:text-primary transition-colors">Pricing</Link></li>
                                    <li><Link href="#" className="hover:text-primary transition-colors">Integrations</Link></li>
                                    <li><Link href="#" className="hover:text-primary transition-colors">Changelog</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold mb-6">Company</h4>
                                <ul className="space-y-4 text-gray-500 text-sm">
                                    <li><Link href="#" className="hover:text-primary transition-colors">About</Link></li>
                                    <li><Link href="#" className="hover:text-primary transition-colors">Careers</Link></li>
                                    <li><Link href="#" className="hover:text-primary transition-colors">Blog</Link></li>
                                    <li><Link href="#" className="hover:text-primary transition-colors">Contact</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold mb-6">Legal</h4>
                                <ul className="space-y-4 text-gray-500 text-sm">
                                    <li><Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                                    <li><Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                                    <li><Link href="#" className="hover:text-primary transition-colors">Cookie Policy</Link></li>
                                </ul>
                            </div>
                        </div>
                        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-sm text-gray-600">
                            <p>© 2026 OmniChannel Inc. All rights reserved.</p>
                            <div className="flex gap-6 mt-4 md:mt-0">
                                <Globe className="h-5 w-5 hover:text-white cursor-pointer transition-colors" />
                                <Instagram className="h-5 w-5 hover:text-white cursor-pointer transition-colors" />
                                <Shield className="h-5 w-5 hover:text-white cursor-pointer transition-colors" />
                            </div>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}
