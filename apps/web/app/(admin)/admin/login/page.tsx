'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/admin/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Invalid credentials');
            }

            // Store token and admin data
            localStorage.setItem('admin_token', data.accessToken);
            localStorage.setItem('admin_user', JSON.stringify(data.admin));

            // Redirect to dashboard
            router.push('/admin/dashboard');
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
            <div className="w-full max-w-md">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-600 mb-4">
                        <Shield className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                    <p className="text-slate-400 mt-1">Sign in to access the admin dashboard</p>
                </div>

                {/* Login Form */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-300">
                                Email Address
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-300">
                                Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </Button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-500 text-sm mt-6">
                    Protected area. Unauthorized access is prohibited.
                </p>
            </div>
        </div>
    );
}
