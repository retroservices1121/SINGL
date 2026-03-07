export function truncateAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return `$${volume.toFixed(0)}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getCategoryStyle(category: string): { bg: string; text: string } {
  const styles: Record<string, { bg: string; text: string }> = {
    military: { bg: '#FFF0F0', text: '#CC3344' },
    economic: { bg: '#FFF8EB', text: '#B87A00' },
    diplomatic: { bg: '#EBF5FF', text: '#2B6CB0' },
    political: { bg: '#F3EDFF', text: '#6B46C1' },
    sports: { bg: '#E8F8F0', text: '#078A57' },
    entertainment: { bg: '#FDE8EA', text: '#C93340' },
  };
  return styles[category?.toLowerCase()] || { bg: '#F5F5F5', text: '#666666' };
}

export function sentimentColor(sentiment: string): string {
  switch (sentiment?.toLowerCase()) {
    case 'positive': return 'text-green-600';
    case 'negative': return 'text-red-600';
    default: return 'text-gray-500';
  }
}
