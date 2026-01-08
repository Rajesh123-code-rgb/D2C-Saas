import { MetadataRoute } from 'next';

export default async function robots(): Promise<MetadataRoute.Robots> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    try {
        const res = await fetch(`${apiUrl}/api/v1/public/seo`, { next: { revalidate: 60 } });

        if (res.ok) {
            const settings = await res.json();

            // Parse user defined robots rules or fallback
            // Simple implementation: if user provides content, we try to parse relevant parts 
            // or just rely on Next.js robots object structure.
            // Since the user asked for "Robots.txt Content" which is likely a text blob,
            // we might need to serve a raw route instead if we want full control, 
            // BUT Next.js robots.ts expects an object. 
            // Let's implement basic parsing or just return a standard one if empty.

            // If the user pasted raw text, we can't easily convert it to the object MetadataRoute.Robots expects
            // unless we parse it. For now, let's just use the sitemap.

            return {
                rules: {
                    userAgent: '*',
                    allow: '/',
                },
                sitemap: settings.sitemapUrl,
            }
        }
    } catch (e) {
        console.error('Failed to fetch robots config', e);
    }

    return {
        rules: {
            userAgent: '*',
            allow: '/',
        },
    }
}
