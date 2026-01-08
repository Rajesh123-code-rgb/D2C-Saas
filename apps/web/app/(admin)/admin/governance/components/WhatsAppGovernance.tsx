'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplatePolicyEditor } from '../templates/components/TemplatePolicyEditor';
import { TemplateMonitoring } from '../templates/components/TemplateMonitoring';


export function WhatsAppGovernance() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between pb-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">WhatsApp Governance</h2>
                    <p className="text-neutral-400 mt-1">
                        Manage platform policies and monitor template usage for WhatsApp.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="policy" className="w-full">
                <TabsList className="bg-white/5 border border-white/10 w-full justify-start p-1 h-auto grid grid-cols-2 max-w-md">
                    <TabsTrigger
                        value="policy"
                        className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white text-neutral-400"
                    >
                        Policy Configuration
                    </TabsTrigger>
                    <TabsTrigger
                        value="monitoring"
                        className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white text-neutral-400"
                    >
                        Template Monitoring
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="policy" className="mt-6">
                    <TemplatePolicyEditor />
                </TabsContent>

                <TabsContent value="monitoring" className="mt-6">
                    <TemplateMonitoring />
                </TabsContent>
            </Tabs>
        </div>
    );
}
