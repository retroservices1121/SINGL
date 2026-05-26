import H2HClient from './H2HClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Head to Head | SINGL by Spredd Markets',
  description: 'Compare any two World Cup 2026 nations side by side.',
};

export default function H2HPage() {
  return <H2HClient />;
}
