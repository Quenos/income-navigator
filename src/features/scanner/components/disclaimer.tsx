import { Card } from '@/components/ui/card';

export function Disclaimer() {
  return (
    <Card className="border-amber-200 bg-amber-50 text-amber-950">
      <h2 className="text-lg font-semibold">Rule-based screening only</h2>
      <p className="mt-2 text-sm leading-6">
        This tool performs read-only, rule-based screening only. It is not financial advice,
        investment advice, or a trade recommendation. Options involve risk and may result in
        substantial loss. Verify all data and suitability independently.
      </p>
    </Card>
  );
}
