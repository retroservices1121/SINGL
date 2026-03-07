import type { Metadata } from 'next';
import './globals.css';
import Providers from './components/Providers';

export const metadata: Metadata = {
  title: 'SINGL by Spredd Markets',
  description: 'Single-event prediction markets. Pick an event, trade the outcomes.',
  openGraph: {
    title: 'SINGL by Spredd Markets',
    description: 'Single-event prediction markets. Pick an event, trade the outcomes.',
    images: ['/singls-og.png'],
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
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
