'use client';

import Image from 'next/image';

import { CLASS_IMAGES, DEFAULT_CLASS } from '@/lib/class-images';
import type { ClassKey } from '@/types';

export function ClassModel({ classKey }: { classKey: ClassKey | null }) {
  const resolvedClass = classKey ?? DEFAULT_CLASS;

  return (
    <div className="class-model">
      <div className="status-text">
        Most played: <span data-testid="top-class">{resolvedClass}</span>
      </div>
      <div className="relative">
        <Image
          src={CLASS_IMAGES[resolvedClass]}
          alt={resolvedClass}
          width={260}
          height={420}
          sizes="260px"
          className="h-auto w-full"
        />
      </div>
    </div>
  );
}
