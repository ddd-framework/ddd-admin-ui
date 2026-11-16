import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** The class merger of the primitives and blocks (the one definition; the app's `cn` re-exports it). */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
