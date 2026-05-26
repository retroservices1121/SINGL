import CountriesClient from './CountriesClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Countries | SINGL by Spredd Markets',
  description: '48 nations competing at the 2026 FIFA World Cup — live championship odds and group standings.',
};

export default function CountriesPage() {
  return <CountriesClient />;
}
