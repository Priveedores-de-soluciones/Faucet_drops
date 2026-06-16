'use client'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from 'recharts';
import { RechartsDevtools } from '@recharts/devtools';

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
  },
];

// #endregion
const SpecifiedDomainRadarChart = () => {
  return (
    <RadarChart
      style={{ width: '100%', maxWidth: '500px', maxHeight: '80vh', aspectRatio: 1 }}
      responsive
      outerRadius="80%"
      data={data}
    >
      <PolarGrid />
      <PolarAngleAxis dataKey="name" />
      <PolarRadiusAxis angle={30} domain={[0, 150]} />
      <Radar name="faucets" dataKey="faucets" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
      <Radar name="quests" dataKey="quests" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
      <Radar name="quizzes" dataKey="quizzes" stroke="#47d9f5" fill="#05baee" fillOpacity={0.6} />
      <Legend />
      <RechartsDevtools />
    </RadarChart>
  );
};

export default SpecifiedDomainRadarChart;




//Real Data Version
// 'use client'
// import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ResponsiveContainer, Tooltip } from 'recharts';
// import { Loader2 } from 'lucide-react';
// import { useDashboard } from '@/hooks/use-dashboard';

// const SimpleRadarChart = () => {
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

//   // Merge network_faucets + network_transactions into one dataset per network
//   const radarData = data.network_faucets.map((nf) => {
//     const txRow = data.network_transactions.find(
//       (nt) => nt.name.toLowerCase() === nf.network.toLowerCase()
//     );
//     return {
//       name:         nf.network,
//       faucets:      nf.faucets,
//       transactions: txRow?.totalTransactions ?? 0,
//     };
//   });

//   // Normalize to 0–100 for radar readability
//   const maxFaucets = Math.max(...radarData.map((d) => d.faucets), 1);
//   const maxTx      = Math.max(...radarData.map((d) => d.transactions), 1);

//   const normalized = radarData.map((d) => ({
//     name:         d.name,
//     faucets:      Math.round((d.faucets / maxFaucets) * 100),
//     transactions: Math.round((d.transactions / maxTx) * 100),
//   }));

//   return (
//     <ResponsiveContainer width="100%" height="100%">
//       <RadarChart outerRadius="75%" data={normalized}>
//         <PolarGrid stroke="rgba(255,255,255,0.1)" />
//         <PolarAngleAxis
//           dataKey="name"
//           tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
//         />
//         <PolarRadiusAxis
//           angle={30}
//           domain={[0, 100]}
//           tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
//           tickCount={4}
//         />
//         <Radar
//           name="Faucets"
//           dataKey="faucets"
//           stroke="#0052FF"
//           fill="#0052FF"
//           fillOpacity={0.4}
//         />
//         <Radar
//           name="Transactions"
//           dataKey="transactions"
//           stroke="#00d4ff"
//           fill="#00d4ff"
//           fillOpacity={0.4}
//         />
//         <Tooltip
//           contentStyle={{
//             background: '#0d1f40',
//             border: '1px solid rgba(0,212,255,0.3)',
//             borderRadius: '8px',
//             color: '#fff',
//             fontSize: '12px',
//           }}
//           formatter={(value: number, name: string) => [`${value}%`, name]}
//         />
//         <Legend
//           wrapperStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}
//         />
//       </RadarChart>
//     </ResponsiveContainer>
//   );
// };

// export default SimpleRadarChart;