import ScheduleClient from './ScheduleClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Schedule | SINGL by Spredd Markets',
  description: 'Every World Cup 2026 match — group stage through final.',
};

export default function SchedulePage() {
  return <ScheduleClient />;
}
