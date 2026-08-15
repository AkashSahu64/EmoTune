import { twMerge } from 'tailwind-merge';

export function cn(...values) {
  return twMerge(values.filter(Boolean).join(' '));
}
