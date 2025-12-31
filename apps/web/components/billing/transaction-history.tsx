'use client';

import { useEffect, useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { billingApi, MessageTransaction } from '@/lib/billing';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export function TransactionHistory() {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<MessageTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTransactions = async () => {
        if (!user?.tenantId) return;
        setLoading(true);
        try {
            const result = await billingApi.getTransactions(user.tenantId, { limit: 20 });
            setTransactions(result.data || []);
        } catch (error) {
            console.error('Failed to load transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.tenantId) {
            fetchTransactions();
        }
    }, [user?.tenantId]);

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="text-center p-8 text-muted-foreground">
                No transactions found.
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((tx) => (
                            <TableRow key={tx.id}>
                                <TableCell>
                                    {format(new Date(tx.createdAt), 'MMM d, yyyy HH:mm')}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {tx.type === 'credit' ? (
                                            <ArrowDownRight className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <ArrowUpRight className="h-4 w-4 text-red-500" />
                                        )}
                                        <span className="capitalize">{tx.type}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{tx.description}</TableCell>
                                <TableCell className="text-right font-medium">
                                    <span className={tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                                        {tx.type === 'credit' ? '+' : '-'}{tx.creditsAmount?.toLocaleString() ?? 0}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Badge variant={
                                        tx.status === 'completed' ? 'default' :
                                            tx.status === 'pending' ? 'secondary' : 'destructive'
                                    }>
                                        {tx.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
