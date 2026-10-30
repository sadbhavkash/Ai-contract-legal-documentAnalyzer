
import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export function parseAnalysisString(value) {
  if (value == null || value === '') {
    return { isArray: false, data: null };
  }

  // The backend may return an array directly or a string containing JSON.
  if (Array.isArray(value)) {
    return { isArray: true, data: value };
  }

  if (typeof value !== 'string') {
    return { isArray: false, data: value };
  }

  const trimmed = value.trim();

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        return { isArray: true, data: parsed };
      }
    } catch {
      // Keep ordinary text if it is not valid JSON.
    }
  }

  return { isArray: false, data: value };
}

// Safely render strings and structured clause/risk objects.
function AnalysisItem({ item }) {
  if (typeof item === 'string' || typeof item === 'number') {
    return <p>{String(item)}</p>;
  }

  if (item && typeof item === 'object' && !Array.isArray(item)) {
    const clause = item.clause;
    const details = item.details;

    return (
      <div className="space-y-1">
        {clause != null && (
          <p className="font-semibold text-slate-800">
            {typeof clause === 'object'
              ? JSON.stringify(clause)
              : String(clause)}
          </p>
        )}

        {details != null && (
          <p className="text-slate-700">
            {typeof details === 'object'
              ? JSON.stringify(details)
              : String(details)}
          </p>
        )}

        {clause == null && details == null && (
          <p className="text-slate-600">
            {JSON.stringify(item)}
          </p>
        )}
      </div>
    );
  }

  if (item == null) return null;

  return <p>{String(item)}</p>;
}

export function FormattedAnalysis({ content, type }) {
  const { isArray, data } = parseAnalysisString(content);

  if (data == null || data === '') {
    return (
      <p className="text-sm text-slate-500 italic">
        Not available.
      </p>
    );
  }

  if (isArray) {
    const items = data.filter(item => item != null && item !== '');

    if (items.length === 0) {
      return (
        <p className="text-sm text-slate-500 italic">
          Not available.
        </p>
      );
    }

    if (type === 'risks') {
      return (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex gap-3 items-start bg-rose-50/50 p-4 rounded-xl border border-rose-100"
            >
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-sm text-slate-700 leading-relaxed min-w-0">
                <AnalysisItem item={item} />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (type === 'clauses') {
      return (
        <ul className="space-y-3">
          {items.map((item, idx) => (
            <li
              key={idx}
              className="flex gap-3 items-start p-3 bg-slate-50 rounded-lg border border-slate-100"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-sm text-slate-700 leading-relaxed min-w-0">
                <AnalysisItem item={item} />
              </div>
            </li>
          ))}
        </ul>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100"
          >
            <AnalysisItem item={item} />
          </div>
        ))}
      </div>
    );
  }

  // Preserve ordinary text instead of treating it as a collection.
  if (typeof data !== 'string' && typeof data !== 'number') {
    return (
      <div className="text-sm text-slate-700 leading-relaxed">
        <AnalysisItem item={data} />
      </div>
    );
  }

  if (type === 'risks') {
    return (
      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-rose-50/50 p-4 rounded-xl border border-rose-100">
        {String(data)}
      </div>
    );
  }

  if (type === 'clauses') {
    return (
      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
        {String(data)}
      </div>
    );
  }

  return (
    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">
      {String(data)}
    </div>
  );
}
