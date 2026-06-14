import type { Metadata } from 'next';
import MarketsClient from './MarketsClient';

export const metadata: Metadata = {
  title: 'Markets · Spredd',
  description: 'Create and trade prediction markets on Spredd.',
};

export default function MarketsPage() {
  return <MarketsClient />;
}
