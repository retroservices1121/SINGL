import GroupsClient from './GroupsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Groups | SINGL by Spredd Markets',
  description: 'World Cup 2026 group-stage standings with live advancement odds.',
};

export default function GroupsPage() {
  return <GroupsClient />;
}
