// ENTERPRISE INVOICE TABLE CONFIGURATION - FINANCIAL INTELLIGENCE
export const INVOICES_TABLE_COLUMNS = [
  {
    key: 'id',
    label: 'Invoice ID',
    width: '120px',
    sortable: true,
    critical: true,
    render: (value) => (
      <code className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
        {value}
      </code>
    )
  },
  {
    key: 'invoice_number',
    label: 'Invoice #',
    width: '140px',
    sortable: true,
    searchable: true,
    critical: true,
    render: (value) => (
      <div className="text-sm font-semibold text-gray-900">
        {value || 'No Number'}
      </div>
    )
  },
  {
    key: 'customer',
    label: 'Customer',
    width: '180px',
    sortable: true,
    searchable: true,
    render: (value, row, { getTenantName }) => (
      <div>
        <div className="text-sm font-medium text-gray-900">
          {getTenantName ? getTenantName(row.tenant_id) : row.customer_name || 'Unknown'}
        </div>
        <div className="text-xs text-gray-500">
          ID: {row.tenant_id || 'N/A'}
        </div>
      </div>
    )
  },
  {
    key: 'property',
    label: 'Property',
    width: '160px',
    sortable: true,
    searchable: true,
    render: (value, row, { getPropertyName }) => (
      <div className="text-sm text-gray-900">
        {getPropertyName ? getPropertyName(row.property_id) : row.property_name || 'N/A'}
      </div>
    )
  },
  {
    key: 'amount',
    label: 'Amount',
    width: '120px',
    sortable: true,
    align: 'right',
    filterable: true,
    filterType: 'number_range',
    render: (value, row, { formatCurrency }) => {
      const amount = row.total_amount || row.amount || 0;
      return (
        <div className="text-right">
          <div className="text-sm font-semibold text-gray-900">
            {formatCurrency ? formatCurrency(amount) : `€${Number(amount).toLocaleString()}`}
          </div>
          {row.currency && row.currency !== 'EUR' && (
            <div className="text-xs text-gray-500">{row.currency}</div>
          )}
        </div>
      );
    }
  },
  {
    key: 'status',
    label: 'Status',
    width: '100px',
    sortable: true,
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { value: '', label: 'All Statuses' },
      { value: 'draft', label: 'Draft' },
      { value: 'sent', label: 'Sent' },
      { value: 'paid', label: 'Paid' },
      { value: 'overdue', label: 'Overdue' },
      { value: 'cancelled', label: 'Cancelled' }
    ],
    render: (value, row, { getStatusColor }) => {
      const status = row.status || 'draft';
      const colors = {
        draft: 'bg-gray-100 text-gray-800',
        sent: 'bg-blue-100 text-blue-800',
        paid: 'bg-green-100 text-green-800',
        overdue: 'bg-red-100 text-red-800',
        cancelled: 'bg-red-100 text-red-800'
      };
      
      return (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${colors[status] || colors.draft}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      );
    }
  },
  {
    key: 'payment_status',
    label: 'Payment',
    width: '100px',
    sortable: true,
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { value: '', label: 'All Payments' },
      { value: 'pending', label: 'Pending' },
      { value: 'partial', label: 'Partial' },
      { value: 'paid', label: 'Paid' },
      { value: 'failed', label: 'Failed' }
    ],
    render: (value, row) => {
      // Derive payment status from invoice status and amounts
      const isPaid = row.status === 'paid';
      const isOverdue = row.status === 'overdue';
      const hasPartialPayment = row.paid_amount && row.paid_amount > 0 && row.paid_amount < (row.total_amount || row.amount);
      
      let paymentStatus = 'pending';
      let colorClass = 'bg-yellow-100 text-yellow-800';
      
      if (isPaid) {
        paymentStatus = 'paid';
        colorClass = 'bg-green-100 text-green-800';
      } else if (isOverdue) {
        paymentStatus = 'overdue';
        colorClass = 'bg-red-100 text-red-800';
      } else if (hasPartialPayment) {
        paymentStatus = 'partial';
        colorClass = 'bg-orange-100 text-orange-800';
      }
      
      return (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${colorClass}`}>
          {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
        </span>
      );
    }
  },
  {
    key: 'due_date',
    label: 'Due Date',
    width: '100px',
    sortable: true,
    filterable: true,
    filterType: 'date_range',
    render: (value, row, { formatDate }) => {
      const dueDate = row.due_date;
      if (!dueDate) return <span className="text-xs text-gray-400">No due date</span>;
      
      const isOverdue = new Date(dueDate) < new Date() && row.status !== 'paid';
      const isDueSoon = new Date(dueDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && row.status !== 'paid';
      
      return (
        <div className="text-xs">
          <div className={`font-medium ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-orange-600' : 'text-gray-900'}`}>
            {formatDate ? formatDate(dueDate) : new Date(dueDate).toLocaleDateString()}
          </div>
          {isOverdue && (
            <div className="text-red-500 font-medium">Overdue</div>
          )}
          {isDueSoon && !isOverdue && (
            <div className="text-orange-500 font-medium">Due Soon</div>
          )}
        </div>
      );
    }
  },
  {
    key: 'created_at',
    label: 'Created',
    width: '100px',
    sortable: true,
    filterable: true,
    filterType: 'date_range',
    render: (value, row, { formatDate }) => (
      <span className="text-xs text-gray-600">
        {value ? (formatDate ? formatDate(value) : new Date(value).toLocaleDateString()) : 'Unknown'}
      </span>
    )
  },
  {
    key: 'actions',
    label: 'Actions',
    width: '120px',
    render: (value, row, { handleNav }) => (
      <div className="flex space-x-1">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleNav(`invoices/${row.id}`);
          }}
          className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50"
        >
          View
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            // Handle invoice download/print
          }}
          className="text-green-600 hover:text-green-800 text-xs font-medium px-2 py-1 rounded hover:bg-green-50"
        >
          Print
        </button>
      </div>
    )
  }
];

// BASIC FILTERS - FINANCIAL OPERATIONS
export const INVOICES_BASIC_FILTERS = [
  {
    key: 'status',
    label: 'Invoice Status',
    type: 'select',
    options: [
      { value: '', label: 'All Statuses' },
      { value: 'draft', label: 'Draft' },
      { value: 'sent', label: 'Sent' },
      { value: 'paid', label: 'Paid' },
      { value: 'overdue', label: 'Overdue' }
    ]
  },
  {
    key: 'payment_status',
    label: 'Payment Status',
    type: 'select',
    options: [
      { value: '', label: 'All Payments' },
      { value: 'pending', label: 'Pending Payment' },
      { value: 'paid', label: 'Paid' },
      { value: 'overdue', label: 'Overdue' },
      { value: 'partial', label: 'Partial Payment' }
    ]
  },
  {
    key: 'due_urgency',
    label: 'Due Urgency',
    type: 'select',
    options: [
      { value: '', label: 'All Due Dates' },
      { value: 'overdue', label: 'Overdue' },
      { value: 'due_soon', label: 'Due This Week' },
      { value: 'due_month', label: 'Due This Month' },
      { value: 'future', label: 'Future Due' }
    ]
  },
  {
    key: 'amount_range',
    label: 'Amount Range',
    type: 'select',
    options: [
      { value: '', label: 'All Amounts' },
      { value: 'small', label: 'Under €500' },
      { value: 'medium', label: '€500 - €2,000' },
      { value: 'large', label: '€2,000 - €10,000' },
      { value: 'enterprise', label: 'Over €10,000' }
    ]
  }
];