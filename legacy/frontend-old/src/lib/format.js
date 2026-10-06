export const VERDICTS = {
  likely_match: { label: 'Likely copy', tone: 'bad' },
  possible_match: { label: 'Possible copy', tone: 'warn' },
  no_match: { label: 'No match', tone: 'ok' },
};

export const verdictMeta = (v) => VERDICTS[v] || VERDICTS.no_match;

export const pct = (x, digits = 1) => `${(x * 100).toFixed(digits)}%`;

export const formatDate = (iso, opts = { dateStyle: 'medium', timeStyle: 'short' }) =>
  new Date(iso).toLocaleString(undefined, opts);

export const relativeTime = (iso) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  const [unit, secs] = units.find(([, s]) => diff >= s);
  return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-Math.floor(diff / secs), unit);
};
