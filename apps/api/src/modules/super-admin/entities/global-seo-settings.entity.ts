import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('global_seo_settings')
export class GlobalSeoSettings {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ default: 'OmniChannel SaaS' })
    siteTitle: string;

    @Column({ default: 'Enterprise Omnichannel Platform' })
    siteDescription: string;

    @Column('simple-array', { nullable: true })
    keywords: string[];

    @Column({ nullable: true })
    ogImageUrl: string;

    @Column({ nullable: true })
    twitterHandle: string;

    @Column({ nullable: true })
    googleAnalyticsId: string;

    @Column({ nullable: true })
    faviconUrl: string;

    @Column({ nullable: true, type: 'text' })
    robotsTxt: string;

    @Column({ nullable: true })
    sitemapUrl: string;

    @UpdateDateColumn()
    updatedAt: Date;
}
