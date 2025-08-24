// Enterprise Technical Objects Table Column Configuration
import React from 'react';

const TYPOGRAPHY_HIERARCHY = {
  critical: 'text-sm font-semibold text-gray-900',
  important: 'text-sm font-medium text-gray-700',
  secondary: 'text-xs text-gray-600',
  metadata: 'text-xs text-gray-500',
  alerts: 'text-xs font-medium text-red-700',
  success: 'text-xs font-medium text-green-700'
};

export const TECHNICAL_OBJECTS_TABLE_COLUMNS = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    searchable: true,
    render: (value, row) => (
      value ? (
        <button
          className={TYPOGRAPHY_HIERARCHY.critical + ' text-blue-700 hover:underline'}
          title={value}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          onClick={() => window.location.href = `/technical-objects/${row._id || row.id}`}
        >
          {value}
        </button>
      ) : (
        <span className={TYPOGRAPHY_HIERARCHY.critical + ' text-gray-400'}>Unnamed Object</span>
      )
    )
  },
  {
    key: 'object_type',
    label: 'Type',
    sortable: true,
    render: (value) => (
      <span className={TYPOGRAPHY_HIERARCHY.secondary}>{value}</span>
    )
  },
  {
    key: 'manufacturer',
    label: 'Manufacturer',
    sortable: true,
    render: (value) => (
      <span className={TYPOGRAPHY_HIERARCHY.secondary}>{value || '—'}</span>
    )
  },
  {
    key: 'location',
    label: 'Location',
    sortable: true,
    render: (value) => (
      <span className={TYPOGRAPHY_HIERARCHY.secondary}>{value || '—'}</span>
    )
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    render: (value) => (
      <span className={TYPOGRAPHY_HIERARCHY.important}>{value}</span>
    )
  },
  {
    key: 'compliance_status',
    label: 'Compliance',
    sortable: true,
    render: (value, row) => {
      // Color-coded compliance status
      if (row.days_until_due < -365) {
        return <span className="text-red-600">🚨 Critical ({Math.abs(row.days_until_due)} days overdue)</span>;
      } else if (row.days_until_due < 0) {
        return <span className="text-orange-600">⚠️ Overdue ({Math.abs(row.days_until_due)} days)</span>;
      } else if (row.days_until_due <= 15) {
        return <span className="text-yellow-600">📅 Due Soon ({row.days_until_due} days)</span>;
      } else {
        return <span className="text-green-600">✅ Compliant ({row.days_until_due} days)</span>;
      }
    }
  },
  {
    key: 'last_inspection_date',
    label: 'Last Inspection',
    sortable: true,
    render: (value) => (
      <span className={TYPOGRAPHY_HIERARCHY.secondary}>{value ? new Date(value).toLocaleDateString() : '—'}</span>
    )
  },
  {
    key: 'next_inspection_due',
    label: 'Next Due',
    sortable: true,
    render: (value) => (
      <span className={TYPOGRAPHY_HIERARCHY.secondary}>{value ? new Date(value).toLocaleDateString() : '—'}</span>
    )
  },
  {
    key: 'actions',
    label: 'Actions',
    render: (value, row) => (
      <div className="flex space-x-2">
        <a
          href={`/technical-objects/${row._id || row.id}`}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          👁️ View
        </a>
        <button
          className="text-orange-600 hover:text-orange-800 text-sm"
          onClick={() => alert('Schedule Inspection (to be implemented)')}
        >
          📅 Schedule
        </button>
        <button
          className="text-gray-600 hover:text-gray-800 text-sm"
          onClick={() => alert('Edit (to be implemented)')}
        >
          ✏️ Edit
        </button>
      </div>
    )
  }
];
