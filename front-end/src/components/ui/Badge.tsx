import type { ReactNode } from 'react';
import { cn } from '../../utils';

interface Props {
    children: ReactNode;
    variant?: 'default' | 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'orange';
    size?: 'sm' | 'xs';
    className?: string;
}

const variants = {
    default: 'bg-zinc-800 text-zinc-300 border-zinc-700/50',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
};

export function Badge({ children, variant = 'default', size = 'xs', className }: Props) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border font-medium',
                size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
                variants[variant],
                className
            )}
        >
            {children}
        </span>
    );
}
