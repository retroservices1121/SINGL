import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/app/lib/db';
import EventPageClient from './EventPageClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://singl.spredd.markets';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  let title = 'SINGL by Spredd Markets';
  let description = 'Single-event prediction market. Trade the outcomes.';
  let imageUrl = '';
  let emoji = '';
  let subtitle = '';

  try {
    const event = await prisma.event.findUnique({
      where: { slug },
      select: { title: true, subtitle: true, emoji: true, imageUrl: true },
    });

    if (event) {
      title = `${event.title} — SINGL`;
      description = event.subtitle || `Trade prediction markets for ${event.title}`;
      imageUrl = event.imageUrl || '';
      emoji = event.emoji || '';
      subtitle = event.subtitle || '';
    }
  } catch {
    // Fall back to defaults
  }

  // Use event image directly if available, otherwise generate one
  const fallbackOgParams = new URLSearchParams({
    title: title.replace(' — SINGL', ''),
    ...(subtitle && { subtitle }),
  });
  const generatedOgUrl = `${SITE_URL}/api/og?${fallbackOgParams}`;
  const ogImageUrl = imageUrl || generatedOgUrl;
  const eventUrl = `${SITE_URL}/event/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: eventUrl,
      siteName: 'SINGL by Spredd Markets',
      images: [{ url: ogImageUrl }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
      site: '@spreddterminal',
    },
  };
}

export default async function EventSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <div className="min-h-screen bg-[var(--cream)]">
      {/* Nav */}
      <nav className="bg-[var(--paper)] border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[var(--text-dim)] hover:text-[var(--text)] transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <Link href="/" className="font-heading text-xl font-bold text-[var(--orange)]">
              SINGL
            </Link>
            <span className="text-xs font-bold text-[var(--yes)] bg-[var(--yes-bg)] px-2 py-0.5 rounded-full animate-pulse">
              LIVE
            </span>
          </div>
          <div id="wallet-mount" />
        </div>
      </nav>

      <EventPageClient slug={slug} />

      {/* Footer */}
      <footer className="bg-[var(--paper)] border-t border-[var(--border)] px-4 py-6 text-center">
        <p className="text-xs text-[var(--text-dim)]">
          <span className="font-heading font-bold text-[var(--orange)]">SINGL</span> by Spredd Markets
        </p>
        <a href="https://x.com/singlmarket" target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--text-dim)] hover:text-[var(--orange)] transition-colors mt-1 inline-block">Follow us on X @singlmarket</a>
      </footer>
    </div>
  );
}
