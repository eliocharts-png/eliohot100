'use client';

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string, defaultMatch = false) {
  const [matches, setMatches] = useState(defaultMatch);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    const handler = () => setMatches(mediaQueryList.matches);

    handler();
    mediaQueryList.addEventListener('change', handler);

    return () => {
      mediaQueryList.removeEventListener('change', handler);
    };
  }, [query]);

  return matches;
}
