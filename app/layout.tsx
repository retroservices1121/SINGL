import type { Metadata } from 'next';
// AGG's stylesheet must come FIRST so our globals.css can override the
// rules that previously stomped our layout (card widths, video sizes,
// country flag image rules). With both loaded, later wins in cascade.
import '@agg-build/ui/styles.css';
import './globals.css';
import Providers from './components/Providers';

export const metadata: Metadata = {
  title: 'SINGL by Spredd Markets | Prediction Markets',
  description: 'Trade prediction markets at the best price. Deep-dive into single events with real-time markets and news.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'SINGL by Spredd Markets | Prediction Markets',
    description: 'Trade prediction markets at the best price. Deep-dive into single events with real-time markets and news.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        {/* Deploy probe — unique per push so we can confirm singl.market
            actually picks up new builds. Safe to remove once deploys flow. */}
        <meta name="deploy-probe" content="DPLY-PROBE-A1B2C3" />
      </head>
      {/* `agg-root partner-theme` activates AGG's CSS variable block in
          globals.css. Required for any drop-in AGG component (Connect
          Button, Place Order, etc.) to pick up our brand colors. Our
          own components also read the bound --primary / --secondary
          / --outline tokens, so the whole app stays in sync. */}
      <body className="antialiased agg-root partner-theme dark">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
