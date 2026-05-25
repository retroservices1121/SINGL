import type { Metadata } from 'next';
import './globals.css';
// @agg-build/ui/styles.css ships a full Tailwind v4 build at root scope —
// importing it stomps on our globals (card widths, video sizes, country
// flag image rules). We only use AGG hooks, never their UI components,
// so the missing-styles warning at runtime is informational and safe to
// ignore.
import Providers from './components/Providers';

export const metadata: Metadata = {
  title: 'SINGL by Spredd Markets | Prediction Markets',
  description: 'Trade prediction markets on Polymarket. Deep-dive into single events with real-time markets, news, and social coverage.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'SINGL by Spredd Markets | Prediction Markets',
    description: 'Trade prediction markets on Polymarket. Deep-dive into single events with real-time markets, news, and social coverage.',
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
      </head>
      {/* `agg-root partner-theme` activates AGG's CSS variable block in
          globals.css. Required for any drop-in AGG component (Connect
          Button, Place Order, etc.) to pick up our brand colors. Our
          own components also read the bound --primary / --secondary
          / --outline tokens, so the whole app stays in sync. */}
      <body className="antialiased agg-root partner-theme">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
