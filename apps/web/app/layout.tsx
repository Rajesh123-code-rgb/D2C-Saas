import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
    try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        console.log('Fetching SEO settings from:', `${apiUrl}/api/v1/public/seo`);

        const res = await fetch(`${apiUrl}/api/v1/public/seo`, { next: { revalidate: 0 }, cache: 'no-store' });

        if (!res.ok) {
            console.error('Failed to fetch SEO settings:', res.status, res.statusText);
            throw new Error('Failed to fetch SEO settings');
        }

        const settings = await res.json();
        console.log('SEO Settings fetched:', settings);

        return {
            title: settings.siteTitle || 'OmniChannel SaaS - Unified Communication Platform',
            description: settings.siteDescription || 'Enterprise Omnichannel Communication, Marketing & Automation Platform for WhatsApp, Instagram, and Email',
            keywords: settings.keywords || ['whatsapp', 'instagram', 'email', 'crm', 'automation', 'marketing', 'omnichannel'],
            openGraph: {
                title: settings.siteTitle,
                description: settings.siteDescription,
                images: settings.ogImageUrl ? [{ url: settings.ogImageUrl }] : [],
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                site: settings.twitterHandle,
                creator: settings.twitterHandle,
                images: settings.ogImageUrl ? [settings.ogImageUrl] : [],
            },
            icons: settings.faviconUrl ? [{ rel: 'icon', url: settings.faviconUrl }] : [],
        };
    } catch (e) {
        // Fallback metadata
        return {
            title: 'OmniChannel SaaS - Unified Communication Platform',
            description: 'Enterprise Omnichannel Communication, Marketing & Automation Platform for WhatsApp, Instagram, and Email',
            keywords: ['whatsapp', 'instagram', 'email', 'crm', 'automation', 'marketing', 'omnichannel'],
        };
    }
}

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
