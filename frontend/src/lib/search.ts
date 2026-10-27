import { SIGNAL_LABELS, SOURCE_LABELS, type B2BSignal, type Filters, type ParsedQuery } from "./types";

/** The three dropdown filters on the feed. */
export function matchesFilters(s: B2BSignal, f: Filters): boolean {
  return (
    (f.signalType === "ALL" || s.signalType === f.signalType) &&
    (f.industry === "ALL" || s.industry === f.industry) &&
    (f.urgency === "ALL" || s.signalUrgency === f.urgency)
  );
}

const FALLBACK_STOPWORDS = new Set(["a", "an", "the", "in", "near", "for", "of", "and", "company", "companies", "business", "firm", "firms", "services", "leads", "signals"]);

function haystack(s: B2BSignal): string {
  return [
    s.companyName,
    s.industry,
    s.decisionMaker.name,
    s.decisionMaker.title,
    s.city ?? "",
    s.state ?? "",
    SOURCE_LABELS[s.sourceChannel],
    SIGNAL_LABELS[s.signalType],
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * Does a lead match the search? Uses the server's structured reading of the query (industry / state / city /
 * signal type + leftover keywords) so the feed filter and the simulator always agree. While that reading is
 * loading, or if the backend is unreachable, falls back to matching every word against the lead's text.
 */
export function matchesSearch(s: B2BSignal, query: string, parsed: ParsedQuery | null): boolean {
  const q = query.trim();
  if (!q) return true;

  if (parsed) {
    if (parsed.industry && s.industry !== parsed.industry) return false;
    if (parsed.state && s.state !== parsed.state) return false;
    if (parsed.city && s.city !== parsed.city) return false;
    if (parsed.signalType && s.signalType !== parsed.signalType) return false;
    if (parsed.keywords.length) {
      const h = haystack(s);
      if (!parsed.keywords.every((k) => h.includes(k))) return false;
    }
    return true;
  }

  const h = haystack(s);
  return q
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((w) => w && !FALLBACK_STOPWORDS.has(w))
    .every((w) => h.includes(w.replace(/s$/, "")));
}

/** Short human description of what a parsed search is looking for, e.g. "Roofing & Exteriors · Florida". */
export function describeParsed(p: ParsedQuery | null): string[] {
  if (!p) return [];
  const parts: string[] = [];
  if (p.industry) parts.push(p.industry);
  if (p.city && p.state) parts.push(`${p.city}, ${p.state}`);
  else if (p.stateName) parts.push(p.stateName);
  if (p.signalType) parts.push(SIGNAL_LABELS[p.signalType]);
  for (const k of p.keywords) parts.push(`"${k}"`);
  return parts;
}
