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