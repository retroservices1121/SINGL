'use client';

import { getCategoryStyle } from '@/app/lib/utils';

interface BadgeProps {
  category: string;
}

export default function Badge({ category }: BadgeProps) {
  const style = getCategoryStyle(category);
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {category}
    </span>
  );
}
