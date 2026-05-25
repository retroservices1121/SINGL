import SinglNav from '@/app/components/SinglNav';
import EventClient from './EventClient';

export const dynamic = 'force-dynamic';

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <SinglNav />
      <main className="max-w-screen-2xl mx-auto px-4 md:px-6 py-6">
        <EventClient eventId={id} />
      </main>
    </div>
  );
}
