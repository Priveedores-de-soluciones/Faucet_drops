'use client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { RechartsDevtools } from '@recharts/devtools';

// #region Sample data
const data = [
  {
    name: 'Base',
    faucets: 2400,
    quests: 1900,
    quizzes: 1300,
  },
  {
    name: 'Celo',
    faucets: 3200,
    quests: 2800,
    quizzes: 2100,
  },
  {
    name: 'Lisk',
    faucets: 1600,
    quests: 1300,
    quizzes: 900,
  },
  {
    name: 'Arbitrum',
    faucets: 1800,
    quests: 1500,
    quizzes: 1200,
  }
];

// #endregion
const StackedAreaChart = () => {
  return (
    <AreaChart
      style={{ width: '100%', maxWidth: '700px', maxHeight: '70vh', aspectRatio: 1.618 }}
      responsive
      data={data}
      margin={{
        top: 20,
        right: 0,
        left: 0,
        bottom: 0,
      }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis width="auto" />
      <Tooltip />
      <Area type="monotone" dataKey="faucets" stackId="2" stroke="#0298d8" fill="#017dc5" />
      <Area type="monotone" dataKey="quests" stackId="2" stroke="#0052ff" fill="#2563eb" />
      <Area type="monotone" dataKey="quizzes" stackId="2" stroke="#47d9f5" fill="#05baee" />
      <RechartsDevtools />
    </AreaChart>
  );
};

export default StackedAreaChart;

//Real Data Version
// 'use client'
// import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
// import { Loader2 } from 'lucide-react';
// import { useDashboard } from '@/hooks/use-dashboard';

// const CustomTooltip = ({ active, payload, label }: any) => {
//   if (!active || !payload?.length) return null;
//   return (
//     <div className="rounded-xl border border-blue-500/30 shadow-xl px-4 py-3 min-w-[160px]"
//       style={{ background: '#0d1f40' }}
//     >
//       <p className="text-xs text-blue-300 font-semibold mb-2">{label}</p>
//       {payload.map((entry: any) => (
//         <div key={entry.dataKey} className="flex items-center justify-between gap-4">
//           <span className="text-xs text-white/60 capitalize">{entry.name}</span>
//           <span className="text-sm font-bold" style={{ color: entry.color }}>
//             {entry.value.toLocaleString()}
//           </span>
//         </div>
//       ))}
//     </div>
//   );
// };

// const StackedAreaChart = () => {
//   const { data, loading, error } = useDashboard();

//   if (loading) return (
//     <div className="flex items-center justify-center h-full">
//       <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
//     </div>
//   );

//   if (error || !data) return (
//     <div className="flex items-center justify-center h-full text-red-400 text-sm">
//       Failed to load data
//     </div>
//   );

//   // Merge network_faucets + network_transactions by network name
//   const chartData = data.network_faucets.map((nf) => {
//     const txRow = data.network_transactions.find(
//       (nt) => nt.name.toLowerCase() === nf.network.toLowerCase()
//     );
//     // Count faucet rankings for this network as "active faucets"
//     const activeFaucets = data.faucet_rankings.filter(
//       (fr) => fr.network.toLowerCase() === nf.network.toLowerCase()
//     ).length;

//     return {
//       name:            nf.network,
//       faucets:         nf.faucets,
//       transactions:    txRow?.totalTransactions ?? 0,
//       activeFaucets,
//     };
//   });

//   return (
//     <ResponsiveContainer width="100%" height="100%">
//       <AreaChart
//         data={chartData}
//         margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
//       >
//         <defs>
//           <linearGradient id="gradFaucets" x1="0" y1="0" x2="0" y2="1">
//             <stop offset="5%"  stopColor="#0052FF" stopOpacity={0.6} />
//             <stop offset="95%" stopColor="#0052FF" stopOpacity={0.05} />
//           </linearGradient>
//           <linearGradient id="gradTransactions" x1="0" y1="0" x2="0" y2="1">
//             <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.6} />
//             <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.05} />
//           </linearGradient>
//           <linearGradient id="gradActive" x1="0" y1="0" x2="0" y2="1">
//             <stop offset="5%"  stopColor="#35D07F" stopOpacity={0.6} />
//             <stop offset="95%" stopColor="#35D07F" stopOpacity={0.05} />
//           </linearGradient>
//         </defs>

//         <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
//         <XAxis
//           dataKey="name"
//           tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
//           axisLine={false}
//           tickLine={false}
//         />
//         <YAxis
//           tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
//           axisLine={false}
//           tickLine={false}
//           width={45}
//         />
//         <Tooltip content={<CustomTooltip />} />
//         <Legend
//           wrapperStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', paddingTop: '12px' }}
//         />

//         <Area
//           type="monotone"
//           dataKey="faucets"
//           name="Faucets"
//           stackId="1"
//           stroke="#0052FF"
//           fill="url(#gradFaucets)"
//           strokeWidth={2}
//         />
//         <Area
//           type="monotone"
//           dataKey="transactions"
//           name="Transactions"
//           stackId="1"
//           stroke="#00d4ff"
//           fill="url(#gradTransactions)"
//           strokeWidth={2}
//         />
//         <Area
//           type="monotone"
//           dataKey="activeFaucets"
//           name="Active Faucets"
//           stackId="1"
//           stroke="#35D07F"
//           fill="url(#gradActive)"
//           strokeWidth={2}
//         />
//       </AreaChart>
//     </ResponsiveContainer>
//   );
// };

// export default StackedAreaChart;