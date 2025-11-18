import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useStore } from '../store';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react';

export function MoodAnalytics() {
  const { moodLogs } = useStore();

  const chartData = moodLogs.map((log) => ({
    time: format(log.timestamp, 'HH:mm', { locale: ru }),
    energy: log.energy,
    focus: log.focus,
  }));

  const averageEnergy = moodLogs.length > 0
    ? (moodLogs.reduce((sum, log) => sum + log.energy, 0) / moodLogs.length).toFixed(1)
    : '0';

  const averageFocus = moodLogs.length > 0
    ? (moodLogs.reduce((sum, log) => sum + log.focus, 0) / moodLogs.length).toFixed(1)
    : '0';

  return (
    <div className="mood-analytics">
      <div className="analytics-header">
        <h3>📊 Аналитика настроения</h3>
        <TrendingUp size={20} color="#7E57FF" />
      </div>

      {moodLogs.length === 0 ? (
        <div className="analytics-empty">
          <p>Начните отслеживать свое настроение, чтобы увидеть аналитику</p>
        </div>
      ) : (
        <>
          <div className="analytics-stats">
            <div className="stat-card">
              <div className="stat-label">Средняя энергия</div>
              <div className="stat-value" style={{ color: '#FF6B6B' }}>
                {averageEnergy}/10
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Средний фокус</div>
              <div className="stat-value" style={{ color: '#4ECDC4' }}>
                {averageFocus}/10
              </div>
            </div>
          </div>

          <div className="analytics-chart">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12 }}
                  stroke="#999"
                />
                <YAxis
                  domain={[0, 10]}
                  tick={{ fontSize: 12 }}
                  stroke="#999"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="energy"
                  stroke="#FF6B6B"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Энергия"
                />
                <Line
                  type="monotone"
                  dataKey="focus"
                  stroke="#4ECDC4"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Фокус"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="analytics-insights">
            <h4>💡 Инсайты</h4>
            <ul>
              {parseFloat(averageEnergy) > 7 && (
                <li>Ваш уровень энергии высокий! Отличное время для сложных задач.</li>
              )}
              {parseFloat(averageEnergy) < 5 && (
                <li>Энергия снижается. Рекомендуется отдохнуть или сделать перерыв.</li>
              )}
              {parseFloat(averageFocus) > 7 && (
                <li>Высокая концентрация! Используйте это время максимально продуктивно.</li>
              )}
              {parseFloat(averageFocus) < 5 && (
                <li>Сложно сфокусироваться? Попробуйте технику Pomodoro.</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
