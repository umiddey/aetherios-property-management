import React from 'react';

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl shadow-card border border-gray-100 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon = null }) {
  return (
    <div className="p-6 border-b border-gray-100 flex items-center">
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mr-4">
          {icon}
        </div>
      )}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

