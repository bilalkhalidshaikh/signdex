"use client";

import { useEffect, useState } from "react";
import { parseQuery } from "@/lib/api";
import type { ParsedQuery } from "@/lib/types";

interface Result {
  q: string;
  parsed: ParsedQuery | null;
}

/** Debounced server-side parse of the search box. `parsed` is null while loading or if the backend is unreachable. */
export function useParsedQuery(query: string, delay = 250): { parsed: ParsedQuery | null; pending: boolean } {
  const [result, setResult] = useState<Result>({ q: "", parsed: null });
  const q = query.trim();

  useEffect(() => {
    if (!q) return;
    const t = setTimeout(async () => {
      try {
        setResult({ q, parsed: await parseQuery(q) });
      } catch {
        setResult({ q, parsed: null }); // callers fall back to plain text matching
      }
    }, delay);
    return () => clearTimeout(t);
  }, [q, delay]);

  if (!q) return { parsed: null, pending: false };
  const current = result.q === q ? result : null;
  return { parsed: current?.parsed ?? null, pending: current === null };
}
