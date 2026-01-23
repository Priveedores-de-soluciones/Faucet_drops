/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

type PieData = {
  networkData: { name: string; value: number }[];
  timeData: { name: string; value: number }[];
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  index,
  name
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN) * 1.3;
  const y = cy + radius * Math.sin(-midAngle * RADIAN) * 1.3;

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
        <p className="font-semibold">{payload[0].name}</p>
        <p className="text-sm">
          Claims: <span className="font-medium">{payload[0].value}</span>
        </p>
        <p className="text-sm">
          {`${((payload[0].value / payload[0].payload.total) * 100).toFixed(1)}% of total`}
        </p>
      </div>
    );
  }
  return null;
};

// In GraphChart2.tsx
const TwoLevelPieChart = ({ 
  data = { networkData: [], timeData: [] } ,
}: { 
  data: PieData 
}) => {
  // Ensure we have valid data
  const { networkData = [], timeData = [] } = data || {};
  


// const TwoLevelPieChart = ({ data }: { data: PieData }) => {
//   const { networkData = [], timeData = [] } = data;

  // Calculate total for percentage calculations
  const networkTotal = networkData.reduce((sum, item) => sum + item.value, 0);
  const timeTotal = timeData.reduce((sum, item) => sum + item.value, 0);

  // Add percentage and total to each data point
  const enhancedNetworkData = networkData.map(item => ({
    ...item,
    percent: (item.value / networkTotal) * 100,
    total: networkTotal
  }));

  const enhancedTimeData = timeData.map(item => ({
    ...item,
    percent: (item.value / timeTotal) * 100,
    total: timeTotal
  }));

  return (
    <div className="w-full h-[500px] flex flex-col md:flex-row gap-8 p-4 justify-center items-center">
      <div className="w-full md:w-1/2 h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={enhancedNetworkData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {enhancedNetworkData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* <div className="w-full md:w-1/2 h-[400px]">
        <h3 className="text-center font-medium mb-2">Distribution by Time of Day</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={enhancedTimeData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {enhancedTimeData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[(index + 3) % COLORS.length]} 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div> */}
    </div>
  );
};

export default TwoLevelPieChart;