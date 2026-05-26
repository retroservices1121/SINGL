import BracketClient from './BracketClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Bracket | SINGL by Spredd Markets',
  description: 'World Cup 2026 knockout bracket — round of 32 to final.',
};

export default function BracketPage() {
  return <BracketClient />;
}
