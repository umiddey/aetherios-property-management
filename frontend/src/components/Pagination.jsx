// src/components/Pagination.js
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const { t } = useLanguage();
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex justify-center space-x-2 mt-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
      >
        {t('pagination.previous')}
      </button>
      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-1 border border-gray-300 rounded-md ${page === currentPage ? 'bg-blue-500 text-white' : ''}`}
        >
          {page}
        </button>
      ))}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
      >
        {t('pagination.next')}
      </button>
    </div>
  );
};

export default Pagination;