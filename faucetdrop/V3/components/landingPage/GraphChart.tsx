import StackedAreaChart from './graph/GraphChart2'
import SimpleRadarChart from './graph/GraphChart1';

export default function GraphChart() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          <div
            className="col-span-1 lg:col-span-2"
          >
            <div className="h-full rounded-xl p-6 shadow-lg border border-white/10 bg-linear-to-br from-gray-900/50 to-gray-800/50">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">Transactions across all networks</h3>
              <div className="h-[400px] w-full">
                <StackedAreaChart />
              </div>
            </div>
          </div>

        <div
          className="col-span-1"
        >
          <div className="h-full rounded-xl p-6 shadow-lg border border-white/10 bg-linear-to-br from-gray-900/50 to-gray-800/50">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">Users accross all networks</h3>
            <div className="h-[400px] w-full">
              <SimpleRadarChart />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
