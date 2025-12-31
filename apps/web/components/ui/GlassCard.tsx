
import { cn } from "@/lib/utils";
import React from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    backgroundImage?: string;
}

export function GlassCard({ className, children, backgroundImage, ...props }: GlassCardProps) {
    return (
        <div
            className={cn(
                "glass-card rounded-xl overflow-hidden relative",
                className
            )}
            {...props}
        >
            {backgroundImage && (
                <div
                    className="absolute inset-0 opacity-20 pointer-events-none z-0"
                    style={{
                        backgroundImage: `url(${backgroundImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                />
            )}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
}
