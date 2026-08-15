export function formatRunTime(iso?: string, fallback?: string): string {
  const source = iso || '';
  const date = new Date(source);
  if (!source || Number.isNaN(date.getTime())) {
    if (fallback && fallback !== 'Just now' && fallback !== 'Recent') return fallback;
    return '—';
  }

  const diff = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  let relative = 'Just now';
  if (days >= 1) relative = `${days}d ago`;
  else if (hours >= 1) relative = `${hours}h ago`;
  else if (minutes >= 1) relative = `${minutes}m ago`;

  const clock = date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  return `${relative} · ${clock}`;
}
