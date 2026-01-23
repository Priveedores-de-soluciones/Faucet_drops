'use client'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

type RadarData = {
  subject: string;
  count: number;
  amount: number;
  fullMark: number;
};

interface SimpleRadarChartProps {
  data: RadarData[];
}

const SimpleRadarChart = ({ data = [] }: SimpleRadarChartProps) => {
  // Ensure data is an array and has values
  const safeData = Array.isArray(data) ? data : [];
  
  // If no data, show a message
  if (safeData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No radar chart data available</p>
      </div>
    );
  }

  // Find the maximum value for scaling
  const maxValue = Math.max(...safeData.map(item => item.count || 0), 10);

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart 
          cx="50%" 
          cy="50%" 
          outerRadius="80%" 
          data={safeData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <PolarGrid stroke="#f0f0f0" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, maxValue]}
            tick={{ fill: '#6b7280', fontSize: 10 }}
          />
          <Radar
            name="Claims"
            dataKey="count"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                    <p className="font-semibold">{payload[0].payload.subject}</p>
                    <p>Claims: {payload[0].value}</p>
                    <p>Amount: {payload[0].payload.amount.toFixed(2)}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SimpleRadarChart;