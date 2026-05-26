import PickEmClient from './PickEmClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Pick'em | SINGL by Spredd Markets",
  description: 'Make your World Cup 2026 group winners + champion picks. Bracket challenge.',
};

export default function PickEmPage() {
  return <PickEmClient />;
}
