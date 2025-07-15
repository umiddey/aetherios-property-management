import React from 'react';

const Breadcrumb = ({ items, onNavigate }) => {
  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-4">
        {items.map((item, index) => (
          <li key={index}>
            <div className="flex items-center">
              {index > 0 && (
                <svg className="flex-shrink-0 h-5 w-5 text-gray-400 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
              {item.href ? (
                <button
                  onClick={() => onNavigate(item.href)}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  {item.label}
                </button>
              ) : (
                <span className="text-sm font-medium text-gray-900" aria-current="page">
                  {item.label}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;