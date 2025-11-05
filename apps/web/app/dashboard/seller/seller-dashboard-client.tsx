'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Lightbulb, TrendingUp, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Kpi = {
  label: string;
  value: string;
  change: string;
};

type RevenuePoint = {
  date: string;
  revenue: number;
  orders: number;
};

type PayoutSlice = {
  label: string;
  value: number;
  fill: string;
};

type Suggestion = {
  id: string;
  title: string;
  insight: string;
  impact: string;
  actionLabel: string;
};

interface SellerDashboardProps {
  kpis: Kpi[];
  revenueTrend: RevenuePoint[];
  payoutSummary: PayoutSlice[];
  aiSuggestions: Suggestion[];
}

const numberFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function SellerDashboardClient({
  kpis,
  revenueTrend,
  payoutSummary,
  aiSuggestions,
}: SellerDashboardProps) {
  const totalPayouts = useMemo(
    () =>
      payoutSummary.reduce(
        (acc, slice) => ({
          value: acc.value + slice.value,
        }),
        { value: 0 },
      ).value,
    [payoutSummary],
  );

  return (
    <div className="space-y-10 px-6 py-12" data-testid="seller-dashboard">
      <header>
        <h1 className="text-3xl font-semibold text-slate-900">Seller KPIs</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Monitor marketplace performance, upcoming payouts, and AI-powered playbooks designed to
          maximise sell-through.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-col items-start gap-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wide text-slate-500">
                {kpi.label}
              </CardTitle>
              <CardDescription className="text-3xl font-semibold text-slate-900">
                {kpi.value}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-emerald-600">{kpi.change}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="items-start">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <TrendingUp className="h-4 w-4 text-brand-primary" /> Revenue performance
              </CardTitle>
              <CardDescription>Weekly GMV and order volumes</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrend} margin={{ left: -16, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="4 8" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#475569" tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#475569"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value / 1000}k`}
                />
                <Tooltip
                  formatter={(value: number, name) =>
                    name === 'revenue' ? numberFormatter.format(value) : `${value} orders`
                  }
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f60f20"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#1b206e"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="items-start">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Wallet className="h-4 w-4 text-brand-primary" /> Payout summary
              </CardTitle>
              <CardDescription>Upcoming transfers and release cadence</CardDescription>
            </div>
            <span className="text-sm font-medium text-slate-900" data-testid="payout-total">
              {numberFormatter.format(totalPayouts)} total
            </span>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={payoutSummary}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={4}
                >
                  {payoutSummary.map((slice) => (
                    <Cell key={slice.label} fill={slice.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${numberFormatter.format(value)} (${name})`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {payoutSummary.map((slice) => (
                <li key={slice.label} className="flex items-center justify-between">
                  <span>{slice.label}</span>
                  <span className="font-medium text-slate-900">
                    {numberFormatter.format(slice.value)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Lightbulb className="h-4 w-4 text-brand-primary" /> AI-driven suggestions
              </CardTitle>
              <CardDescription>
                Personalised growth ideas generated from listing health and buyer signals
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="rounded-lg border border-slate-200 p-4"
                data-testid={`suggestion-${suggestion.id}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{suggestion.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{suggestion.insight}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {suggestion.impact}
                  </span>
                </div>
                <Button className="mt-4" data-testid={`suggestion-action-${suggestion.id}`}>
                  {suggestion.actionLabel}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
