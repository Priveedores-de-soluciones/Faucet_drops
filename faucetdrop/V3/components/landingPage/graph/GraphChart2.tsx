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
