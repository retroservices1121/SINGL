import OracleClient from './OracleClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "SPREDD Oracle | World Cup Pick'em",
  description:
    'Predict every World Cup match, build your streak, and earn $SPRDD. Hold SPRDD to multiply your points. Free to play.',
};

export default function OraclePage() {
  return <OracleClient />;
}
