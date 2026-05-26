import SquadsClient from './SquadsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Squads | SINGL by Spredd Markets',
  description: 'Key players from the top World Cup 2026 contenders.',
};

export default function SquadsPage() {
  return <SquadsClient />;
}
