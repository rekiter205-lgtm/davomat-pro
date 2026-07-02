'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

interface ChartDatum {
  date: string; // YYYY-MM-DD
  present: number;
  late: number;
  absent: number;
}

export default function AttendanceChart({ data }: { data: ChartDatum[] }) {
  // Format X labels: 27.04
  const formatted = data.map((d) => ({
    ...d,
    label: d.date.split('-').slice(1).reverse().join('.'),
  }));

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="grad-present" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="grad-absent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.15)" vertical={false} />
          <XAxis dataKey="label" stroke="rgb(100 116 139)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="rgb(100 116 139)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgb(15 23 42)',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 12,
            }}
            labelStyle={{ color: '#cbd5e1' }}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
          />
          <Area
            type="monotone"
            dataKey="present"
            name="Kelganlar"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#grad-present)"
          />
          <Area
            type="monotone"
            dataKey="absent"
            name="Kelmaganlar"
            stroke="#f43f5e"
            strokeWidth={2}
            fill="url(#grad-absent)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
