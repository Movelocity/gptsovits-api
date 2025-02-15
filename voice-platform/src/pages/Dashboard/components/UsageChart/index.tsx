import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useAppStore } from '../../../../store';
import { useTheme } from '../../../../contexts/ThemeContext';
import styles from './styles.module.css';

export const UsageChart = () => {
  const { stats } = useAppStore();
  const { theme } = useTheme();
  const [chartData, setChartData] = useState(stats.usageData);

  useEffect(() => {
    setChartData(stats.usageData);
  }, [stats.usageData]);

  return (
    <div className={styles.chartContainer}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            stroke={theme.mode === 'dark' ? '#fff' : '#666'}
          />
          <YAxis
            stroke={theme.mode === 'dark' ? '#fff' : '#666'}
          />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="count"
            stroke={theme.token.colorPrimary}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}; 