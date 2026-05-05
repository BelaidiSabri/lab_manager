import type { ReactNode } from 'react';

type Variant = 'admitted' | 'pending' | 'rejected' | 'neutral';

const styles: Record<Variant, string> = {
  admitted: 'bg-green-50 text-green-700',
  pending: 'bg-amber-50 text-amber-700',
  rejected: 'bg-red-50 text-red-700',
  neutral: 'bg-slate-100 text-slate-700',
};

export default function Badge({ variant, children }: { variant: Variant; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}
    >
      {children}
    </span>
  );
}
