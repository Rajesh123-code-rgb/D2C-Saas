'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';

export default function SignupPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        companyName: '',
        companySlug: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        // Auto-generate slug from company name
        if (name === 'companyName') {
            const slug = value
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
            setFormData((prev) => ({
                ...prev,
                companySlug: slug,
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.signup(formData);
            // Token and user data are automatically stored by API client
            router.push('/dashboard');
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Signup failed';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-4 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                        <MessageSquare className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl">Create an account</CardTitle>
                        <CardDescription>Start your 14-day free trial. No credit card required.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input
                                    id="firstName"
                                    name="firstName"
                                    placeholder="John"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    id="lastName"
                                    name="lastName"
                                    placeholder="Doe"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="john@example.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="Min. 8 characters"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                minLength={8}
                                disabled={loading}
                            />
                            <p className="text-xs text-muted-foreground">
                                Must contain uppercase, lowercase, and a number
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input
                                id="companyName"
                                name="companyName"
                                placeholder="Acme Corporation"
                                value={formData.companyName}
                                onChange={handleChange}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="companySlug">Company Slug</Label>
                            <Input
                                id="companySlug"
                                name="companySlug"
                                placeholder="acme-corp"
                                value={formData.companySlug}
                                onChange={handleChange}
                                required
                                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                                disabled={loading}
                            />
                            <p className="text-xs text-muted-foreground">
                                Your workspace URL: {formData.companySlug || 'your-company'}.omnichannel.app
                            </p>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Creating account...' : 'Create Account'}
                        </Button>

                        <p className="text-xs text-center text-muted-foreground">
                            By signing up, you agree to our{' '}
                            <Link href="/terms" className="underline hover:text-foreground">
                                Terms of Service
                            </Link>{' '}
                            and{' '}
                            <Link href="/privacy" className="underline hover:text-foreground">
                                Privacy Policy
                            </Link>
                        </p>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        Already have an account?{' '}
                        <Link href="/login" className="font-medium text-primary hover:underline">
                            Sign in
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
