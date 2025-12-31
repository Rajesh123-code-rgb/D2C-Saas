'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AutomationGovernance } from './components/AutomationGovernance';
import { WhatsAppGovernance } from './components/WhatsAppGovernance';
import { EmailGovernance } from './components/EmailGovernance';
import {
    Cpu,
    MessageSquare,
    Mail
} from 'lucide-react';

export default function GovernancePage() {
    return (
        <div className="flex-1 space-y-8 pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Platform Governance</h1>
                    <p className="text-slate-400 mt-2 text-lg">
                        Manage policies, limits, and restrictions across all communication channels.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="automation" className="space-y-8">
                <TabsList className="bg-white/5 border border-white/10 w-full justify-start p-1 h-auto grid grid-cols-3 max-w-2xl">
                    <TabsTrigger value="automation" className="flex items-center gap-2 py-3 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">
                        <Cpu className="h-4 w-4" />
                        Automation
                    </TabsTrigger>
                    <TabsTrigger value="whatsapp" className="flex items-center gap-2 py-3 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">
                        <MessageSquare className="h-4 w-4" />
                        WhatsApp
                    </TabsTrigger>
                    <TabsTrigger value="email" className="flex items-center gap-2 py-3 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">
                        <Mail className="h-4 w-4" />
                        Email
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="automation" className="space-y-4 focus-visible:outline-none">
                    <AutomationGovernance />
                </TabsContent>

                <TabsContent value="whatsapp" className="space-y-4 focus-visible:outline-none">
                    <WhatsAppGovernance />
                </TabsContent>

                <TabsContent value="email" className="space-y-4 focus-visible:outline-none">
                    <EmailGovernance />
                </TabsContent>
            </Tabs>
        </div>
    );
}
