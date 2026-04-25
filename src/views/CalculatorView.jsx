import PositionsSummary from '../components/PositionsSummary';
import LeapsCalculator from '../components/LeapsCalculator';

export default function CalculatorView({ prices, portfolio, calc }) {
  return (
    <div className="space-y-4">
      <PositionsSummary prices={prices} portfolio={portfolio} />
      <LeapsCalculator calc={calc} />
    </div>
  );
}
