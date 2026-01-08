'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    Users,
    Search,
    MoreHorizontal,
    Shield,
    Mail,
    CheckCircle,
    Ban,
    Key,
    Edit,
    Trash2,
    Loader2,
    UserPlus,
    RefreshCw,
    Filter,
} from 'lucide-react';
import { CardHeader, CardContent } from '@/components/ui/card'; // Using GlassCard instead, keeping types if needed
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { usersApi, AdminUser, CreateAdminUserDto } from '@/lib/admin/api';

// Fallback mock data
const mockUsers: AdminUser[] = [
    {
        id: '1',
        email: 'admin@convoo.cloud',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'PLATFORM_ADMIN',
        status: 'active',
        lastLoginAt: '2024-12-27T10:30:00',
        twoFactorEnabled: true,
        createdAt: '2024-01-01',
        permissions: { canManageTenants: true, canManageUsers: true, canViewAnalytics: true, canManageFeatureFlags: true, canIssueCredits: true, canProcessRefunds: true },
    },
    {
        id: '2',
        email: 'support@convoo.cloud',
        firstName: 'Support',
        lastName: 'Agent',
        role: 'SUPPORT',
        status: 'active',
        lastLoginAt: '2024-12-27T09:00:00',
        twoFactorEnabled: false,
        createdAt: '2024-06-15',
        permissions: { canManageTenants: false, canManageUsers: false, canViewAnalytics: true, canManageFeatureFlags: false, canIssueCredits: true, canProcessRefunds: false },
    },
    {
        id: '3',
        email: 'viewer@convoo.cloud',
        firstName: 'Read',
        lastName: 'Only',
        role: 'VIEWER',
        status: 'inactive',
        lastLoginAt: '2024-12-20T14:00:00',
        twoFactorEnabled: false,
        createdAt: '2024-09-01',
        permissions: { canManageTenants: false, canManageUsers: false, canViewAnalytics: true, canManageFeatureFlags: false, canIssueCredits: false, canProcessRefunds: false },
    },
];

const roleColors: Record<string, string> = {
    PLATFORM_ADMIN: 'bg-neutral-800 text-white',
    SUPPORT: 'bg-neutral-800 text-white',
    VIEWER: 'bg-neutral-500/10 text-neutral-400',
};

const statusColors: Record<string, string> = {
    active: 'bg-neutral-800 text-neutral-300',
    inactive: 'bg-neutral-800 text-neutral-400',
    suspended: 'bg-neutral-800 text-neutral-400',
};

export default function UsersPage() {
    const [users, setUsers] = useState<AdminUser[]>(mockUsers);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // New user form state
    const [newUser, setNewUser] = useState<CreateAdminUserDto>({
        email: '',
        firstName: '',
        lastName: '',
        role: 'SUPPORT',
        password: '',
    });

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = {};
            if (roleFilter !== 'all') params.role = roleFilter;

            const response = await usersApi.getAll(params);
            setUsers(response.data);
        } catch (err: any) {
            console.warn('Could not fetch admin users, using mock data:', err.message);
            const filtered = mockUsers.filter((user) => {
                const matchesSearch =
                    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesRole = roleFilter === 'all' || user.role === roleFilter;
                return matchesSearch && matchesRole;
            });
            setUsers(filtered);
        } finally {
            setLoading(false);
        }
    }, [roleFilter, searchQuery]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const handleCreateUser = async () => {
        setActionLoading(true);
        try {
            const createdUser = await usersApi.create(newUser);
            setUsers((prev) => [...prev, createdUser]);
            setIsDialogOpen(false);
            setNewUser({ email: '', firstName: '', lastName: '', role: 'SUPPORT', password: '' });
        } catch (err: any) {
            console.warn('Could not create user via API, adding locally:', err.message);
            const user: AdminUser = {
                id: Date.now().toString(),
                ...newUser,
                status: 'active',
                lastLoginAt: null,
                twoFactorEnabled: false,
                createdAt: new Date().toISOString(),
                permissions: {
                    canManageTenants: newUser.role === 'PLATFORM_ADMIN',
                    canManageUsers: newUser.role === 'PLATFORM_ADMIN',
                    canViewAnalytics: true,
                    canManageFeatureFlags: newUser.role === 'PLATFORM_ADMIN',
                    canIssueCredits: newUser.role !== 'VIEWER',
                    canProcessRefunds: newUser.role === 'PLATFORM_ADMIN',
                },
            };
            setUsers((prev) => [...prev, user]);
            setIsDialogOpen(false);
            setNewUser({ email: '', firstName: '', lastName: '', role: 'SUPPORT', password: '' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleStatus = async (userId: string, newStatus: 'active' | 'suspended') => {
        try {
            await usersApi.toggleStatus(userId, newStatus);
            setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
            );
        } catch (err: any) {
            setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
            );
        }
    };

    const handleDeleteUser = async (userId: string) => {
        try {
            await usersApi.delete(userId);
            setUsers((prev) => prev.filter((u) => u.id !== userId));
        } catch (err: any) {
            setUsers((prev) => prev.filter((u) => u.id !== userId));
        }
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Admin Users</h1>
                    <p className="text-neutral-400 mt-2 text-lg">Manage platform administrators and permissions</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white backdrop-blur-md"
                        onClick={fetchUsers}
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh
                    </Button>
                    <Button
                        className="bg-neutral-700 hover:bg-neutral-600 text-white shadow-lg shadow-black/30"
                        onClick={() => setIsDialogOpen(true)}
                    >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Admin
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-6 md:grid-cols-4">
                <GlassCard className="glass-card-hover group">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-neutral-800 text-white group-hover:bg-neutral-700 transition-colors">
                                <Users className="h-6 w-6" />
                            </div>
                            <Badge className="bg-neutral-800 text-white border-0">Total</Badge>
                        </div>
                        <p className="text-3xl font-bold text-white">{users.length}</p>
                        <p className="text-sm text-neutral-400 mt-1">Registered Admins</p>
                    </CardContent>
                </GlassCard>

                <GlassCard className="glass-card-hover group">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-neutral-800 text-white group-hover:bg-neutral-700 transition-colors">
                                <Shield className="h-6 w-6" />
                            </div>
                            <Badge className="bg-neutral-800 text-white border-0">Admins</Badge>
                        </div>
                        <p className="text-3xl font-bold text-white">{users.filter((u) => u.role === 'PLATFORM_ADMIN').length}</p>
                        <p className="text-sm text-neutral-400 mt-1">Platform Admins</p>
                    </CardContent>
                </GlassCard>

                <GlassCard className="glass-card-hover group">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-neutral-800 text-neutral-300 group-hover:bg-neutral-700 transition-colors">
                                <CheckCircle className="h-6 w-6" />
                            </div>
                            <Badge className="bg-neutral-800 text-neutral-300 border-0">Active</Badge>
                        </div>
                        <p className="text-3xl font-bold text-white">{users.filter((u) => u.status === 'active').length}</p>
                        <p className="text-sm text-neutral-400 mt-1">Active Accounts</p>
                    </CardContent>
                </GlassCard>

                <GlassCard className="glass-card-hover group">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-xl bg-neutral-800 text-white group-hover:bg-neutral-700 transition-colors">
                                <Key className="h-6 w-6" />
                            </div>
                            <Badge className="bg-neutral-800 text-white border-0">Security</Badge>
                        </div>
                        <p className="text-3xl font-bold text-white">{users.filter((u) => u.twoFactorEnabled).length}</p>
                        <p className="text-sm text-neutral-400 mt-1">2FA Enabled</p>
                    </CardContent>
                </GlassCard>
            </div>

            {/* Main Content */}
            <GlassCard>
                <CardHeader className="border-b border-white/5 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                            <Input
                                placeholder="Search users by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus:border-white"
                            />
                        </div>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white">
                                <Filter className="h-4 w-4 mr-2 text-neutral-400" />
                                <SelectValue placeholder="Filter Role" />
                            </SelectTrigger>
                            <SelectContent className="bg-black border-white/10 text-white">
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="PLATFORM_ADMIN">Platform Admin</SelectItem>
                                <SelectItem value="SUPPORT">Support</SelectItem>
                                <SelectItem value="VIEWER">Viewer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs text-neutral-400 uppercase tracking-wider border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-4 font-medium">User</th>
                                    <th className="px-6 py-4 font-medium">Role</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium text-center">2FA</th>
                                    <th className="px-6 py-4 font-medium">Last Login</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-neutral-400">
                                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-white" />
                                            Loading users...
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-neutral-400">
                                            No users found matching your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-white/5 transition-colors text-sm">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-black/30">
                                                        {user.firstName[0]}{user.lastName[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white">{user.firstName} {user.lastName}</p>
                                                        <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                                                            <Mail className="h-3 w-3" />
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge className={cn('capitalize border-0 font-medium', roleColors[user.role])}>
                                                    {user.role.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge className={cn('capitalize border-0 font-medium', statusColors[user.status])}>
                                                    {user.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {user.twoFactorEnabled ? (
                                                    <div className="flex justify-center">
                                                        <CheckCircle className="h-5 w-5 text-neutral-300" />
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-center">
                                                        <div className="h-2 w-2 rounded-full bg-neutral-600" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-neutral-400">
                                                {user.lastLoginAt ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-neutral-300">{new Date(user.lastLoginAt).toLocaleDateString()}</span>
                                                        <span className="text-xs">{new Date(user.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-neutral-500">Never</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-white/10">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-black border-white/10 text-white shadow-xl shadow-black/50">
                                                        <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            Edit User
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">
                                                            <Key className="h-4 w-4 mr-2" />
                                                            Reset Password
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-white/10" />
                                                        {user.status === 'active' ? (
                                                            <DropdownMenuItem
                                                                className="text-white hover:bg-neutral-800 cursor-pointer"
                                                                onClick={() => handleToggleStatus(user.id, 'suspended')}
                                                            >
                                                                <Ban className="h-4 w-4 mr-2" />
                                                                Suspend User
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem
                                                                className="text-neutral-300 hover:bg-neutral-800 cursor-pointer"
                                                                onClick={() => handleToggleStatus(user.id, 'active')}
                                                            >
                                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                                Activate User
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem
                                                            className="text-neutral-400 hover:bg-neutral-800 cursor-pointer"
                                                            onClick={() => handleDeleteUser(user.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete User
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </GlassCard>

            {/* Add User Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-black border-white/10 text-white sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add Admin User</DialogTitle>
                        <DialogDescription className="text-neutral-400">
                            Create a new administrator account with specific permissions.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName" className="text-neutral-300">First Name</Label>
                                <Input
                                    id="firstName"
                                    value={newUser.firstName}
                                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                                    className="bg-white/5 border-white/10 text-white focus:border-white"
                                    placeholder="John"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName" className="text-neutral-300">Last Name</Label>
                                <Input
                                    id="lastName"
                                    value={newUser.lastName}
                                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                                    className="bg-white/5 border-white/10 text-white focus:border-white"
                                    placeholder="Doe"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-neutral-300">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                className="bg-white/5 border-white/10 text-white focus:border-white"
                                placeholder="john.doe@company.com"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="role" className="text-neutral-300">Role</Label>
                                <Select
                                    value={newUser.role}
                                    onValueChange={(value: 'PLATFORM_ADMIN' | 'SUPPORT' | 'VIEWER') =>
                                        setNewUser({ ...newUser, role: value })
                                    }
                                >
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-black border-white/10 text-white">
                                        <SelectItem value="PLATFORM_ADMIN">Platform Admin</SelectItem>
                                        <SelectItem value="SUPPORT">Support Agent</SelectItem>
                                        <SelectItem value="VIEWER">Viewer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-neutral-300">Initial Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    className="bg-white/5 border-white/10 text-white focus:border-white"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="bg-transparent border-white/10 text-neutral-300 hover:text-white hover:bg-white/10">
                            Cancel
                        </Button>
                        <Button onClick={handleCreateUser} className="bg-neutral-700 hover:bg-neutral-600 text-white" disabled={actionLoading}>
                            {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Create Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
