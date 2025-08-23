import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import { PROFESSIONAL_FORM_CLASSES, getProfessionalInputClasses, getProfessionalSelectClasses, getProfessionalTextareaClasses } from './ui/ProfessionalFormStandards';
import Button from './ui/Button';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreateTaskForm = ({ onBack, onSuccess, customers, users = [], context }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    customer_id: '',
    priority: 'medium',
    budget: '',
    due_date: '',
    assigned_to: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (context?.propertyName) {
      setFormData(prev => ({ ...prev, subject: `${t('tasks.taskForProperty')} ${context.propertyName}` }));
    }
  }, [context]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
      };

      if (context?.propertyId) {
        submitData.property_id = context.propertyId;
      }

      await axios.post(`${API}/v1/tasks/`, submitData);
      onSuccess();
    } catch (error) {
      setError(error.response?.data?.detail || t('tasks.failedToCreateTask'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div>
      <Button
        onClick={onBack}
        variant="secondary"
        className="mb-4 text-sm"
      >
        ← {t('tasks.backToTasks')}
      </Button>
      
      <div className={PROFESSIONAL_FORM_CLASSES.container}>
        <div className={PROFESSIONAL_FORM_CLASSES.header}>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            {t('tasks.createTaskOrder')}
          </div>
        </div>
        
        {error && (
          <div className={PROFESSIONAL_FORM_CLASSES.alertError}>
            <svg className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={PROFESSIONAL_FORM_CLASSES.label}>
              {t('tasks.subject')} *
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className={getProfessionalInputClasses()}
              required
            />
          </div>

          <div>
            <label className={PROFESSIONAL_FORM_CLASSES.label}>
              {t('common.description')} *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={getProfessionalInputClasses()}
              rows="3"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={PROFESSIONAL_FORM_CLASSES.label}>
                {t('common.customer')} *
              </label>
              <select
                name="customer_id"
                value={formData.customer_id}
                onChange={handleChange}
                className={getProfessionalInputClasses()}
                required
              >
                <option value="">{t('common.selectCustomer')}</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.company}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className={PROFESSIONAL_FORM_CLASSES.label}>
                {t('tasks.priority')} *
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className={getProfessionalInputClasses()}
                required
              >
                <option value="low">{t('tasks.low')}</option>
                <option value="medium">{t('tasks.medium')}</option>
                <option value="high">{t('tasks.high')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={PROFESSIONAL_FORM_CLASSES.label}>
                {t('tasks.budget')} ($)
              </label>
              <input
                type="number"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                className={getProfessionalInputClasses()}
                step="0.01"
                min="0"
              />
            </div>
            
            <div>
              <label className={PROFESSIONAL_FORM_CLASSES.label}>
                {t('tasks.dueDate')}
              </label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className={getProfessionalInputClasses()}
              />
            </div>
          </div>

          <div>
            <label className={PROFESSIONAL_FORM_CLASSES.label}>
              {t('tasks.assignedTo')}
            </label>
            <select
              name="assigned_to"
              value={formData.assigned_to}
              onChange={handleChange}
              className={getProfessionalInputClasses()}
            >
              <option value="">{t('tasks.none')}</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              {t('tasks.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? t('common.creating') : t('dashboard.createTask')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskForm;