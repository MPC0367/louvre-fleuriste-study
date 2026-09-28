'use client';
import Image from 'next/image';
import { useState } from 'react';
import { photo, type Work } from '@/content/works';
import type { Lang } from '@/content/i18n';

/**
 * A shop photograph. If it fails, the frame stays at its size and says so plainly —
 * never a broken-image icon, and never a different bouquet in its place.
 */
export function Photo({
  work,
  lang,
  sizes,
  className = '',
  priority = false,
  ar,
  fallback,
}: {
  work: Work;
  lang: Lang;
  sizes: string;
  className?: string;
  priority?: boolean;
  ar?: string;
  fallback?: string;
}) {
  const [failed, setFailed] = useState(false);
  const seen = work.seen[lang] ? `: ${work.seen[lang]}` : '';
  const alt =
    lang === 'th'
      ? `${work.name.th}${seen} (ภาพจากโซเชียลของร้าน)`
      : `${work.name.en}${seen} (photograph from the shop’s social pages)`;
  return (
    <div
      className={`photo ${failed ? "photo--fallback" : ""} ${className}`}
      data-work={work.id}
      style={{ aspectRatio: ar ?? `${work.w} / ${work.h}`, background: failed ? undefined : work.note + '55' }}
      data-fallback={fallback ?? (lang === 'th' ? 'โหลดภาพไม่ได้' : 'Photograph unavailable')}
    >
      {!failed && (
        <Image
          src={photo(work.id)}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          quality={82}
          onError={() => setFailed(true)}
          style={{ objectFit: 'cover' }}
        />
      )}
    </div>
  );
}
