import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'OmniChannel SaaS - Unified Communication Platform',
    description: 'Enterprise Omnichannel Communication, Marketing & Automation Platform for WhatsApp, Instagram, and Email',
    keywords: ['whatsapp', 'instagram', 'email', 'crm', 'automation', 'marketing', 'omnichannel'],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>{children}</body>
        </html>
    );
}
