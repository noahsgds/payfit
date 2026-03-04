"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: string;
  suffix?: string;
}

export default function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  color = "#00B379",
  suffix,
}: MetricCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNeutral = change === 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </p>
        {icon && (
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <span style={{ color }}>{icon}</span>
          </div>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-slate-900">
          {value}
          {suffix && (
            <span className="text-sm font-normal text-slate-500 ml-1">
              {suffix}
            </span>
          )}
        </span>
      </div>
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {isNeutral ? (
            <Minus size={12} className="text-slate-400" />
          ) : isPositive ? (
            <TrendingUp size={12} className="text-emerald-500" />
          ) : (
            <TrendingDown size={12} className="text-red-500" />
          )}
          <span
            className={`text-xs font-semibold ${
              isNeutral
                ? "text-slate-400"
                : isPositive
                ? "text-emerald-500"
                : "text-red-500"
            }`}
          >
            {isPositive ? "+" : ""}
            {change}%
          </span>
          {changeLabel && (
            <span className="text-xs text-slate-400">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
