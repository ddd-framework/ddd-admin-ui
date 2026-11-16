import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Joins class values; later Tailwind utilities win over earlier conflicting ones. */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
