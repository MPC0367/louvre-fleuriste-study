'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { enhance } from '@/lib/enhance.js';

/** Wires the non-React behaviours (hero carousel, drawn map) after each navigation. */
export function Enhance() {
  const path = usePathname();
  const q = useSearchParams();
  useEffect(() => {
    enhance(document);
  }, [path, q]);
  return null;
}
