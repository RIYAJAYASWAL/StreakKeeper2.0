import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'pills' | 'underline';
}

export function Tabs({ tabs, activeId, onChange, className = '', variant = 'pills' }: TabsProps) {
  if (variant === 'underline') {
    return (
      <div className={`flex items-center space-x-6 border-b border-border-soft ${className}`}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
                isActive
                  ? 'text-navy-900 border-b-2 border-navy-900 -mb-[1px]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-pill transition-all duration-150 shadow-subtle ${
              isActive
                ? 'bg-navy-900 text-white border border-navy-900 shadow-sm'
                : 'bg-white text-slate-700 border border-border-soft hover:bg-cream-50 hover:border-slate-300'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
