/**
 * Professional Form Standards for Enterprise ERP System
 * Consistent styling patterns across all forms and modals
 * Eliminates consumer-grade gradients and rainbow colors
 */

// Professional Form Container Classes
export const PROFESSIONAL_FORM_CLASSES = {
  // Main form container
  container: 'bg-white border border-gray-200 rounded-lg shadow-sm p-6 max-w-4xl mx-auto',
  
  // Form header styling
  header: 'text-lg font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-200',
  
  // Section headers within forms
  sectionHeader: 'text-base font-medium text-gray-900 mb-4 flex items-center',
  sectionIcon: 'w-5 h-5 text-gray-600 mr-2',
  
  // Field group layouts
  fieldGroup: 'grid grid-cols-1 md:grid-cols-2 gap-6',
  fieldGroupSingle: 'mb-6',
  fieldGroupTriple: 'grid grid-cols-1 md:grid-cols-3 gap-4',
  
  // Label styling
  label: 'block text-sm font-medium text-gray-700 mb-2',
  labelRequired: 'block text-sm font-medium text-gray-700 mb-2 after:content-["*"] after:ml-1 after:text-red-500',
  
  // Input field styling
  input: 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200',
  inputError: 'w-full px-3 py-2 border border-red-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-red-50',
  inputDisabled: 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-500 cursor-not-allowed',
  
  // Select dropdown styling
  select: 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors duration-200',
  selectError: 'w-full px-3 py-2 border border-red-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-red-50',
  
  // Textarea styling
  textarea: 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical transition-colors duration-200',
  textareaError: 'w-full px-3 py-2 border border-red-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-red-50 resize-vertical',
  
  // Checkbox and radio styling
  checkbox: 'w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2',
  checkboxLabel: 'ml-2 text-sm font-medium text-gray-700',
  
  // Error message styling
  errorMessage: 'text-sm text-red-600 mt-1',
  
  // Help text styling
  helpText: 'text-sm text-gray-500 mt-1',
  
  // Form actions (button container)
  actions: 'flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200',
  actionsSpaceBetween: 'flex justify-between items-center mt-8 pt-6 border-t border-gray-200',
  
  // Alert/notice boxes
  alertInfo: 'bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-6 flex items-start',
  alertWarning: 'bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 flex items-start',
  alertError: 'bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 flex items-start',
  alertSuccess: 'bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6 flex items-start',
};

// Professional Button Classes (integrates with existing Button.jsx component)
export const PROFESSIONAL_BUTTON_CLASSES = {
  primary: 'px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-colors duration-200',
  secondary: 'px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-colors duration-200',
  danger: 'px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium transition-colors duration-200',
  subtle: 'px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium transition-colors duration-200',
};

// Professional Modal Classes
export const PROFESSIONAL_MODAL_CLASSES = {
  overlay: 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4',
  container: 'bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto',
  header: 'px-6 py-4 border-b border-gray-200 flex items-center justify-between',
  title: 'text-lg font-semibold text-gray-900',
  closeButton: 'text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1',
  body: 'px-6 py-4',
  footer: 'px-6 py-4 border-t border-gray-200 flex justify-end space-x-3',
};

// Professional Color Palette (eliminates consumer rainbow colors)
export const PROFESSIONAL_COLORS = {
  // Primary Colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',  // Main brand color
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Neutral Colors
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // Semantic Colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    600: '#16a34a',
    700: '#15803d',
  },
  
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    600: '#d97706',
    700: '#b45309',
  },
  
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    600: '#dc2626',
    700: '#b91c1c',
  },
};

// Professional Form Section Configuration
export const FORM_SECTIONS = {
  // Standard form sections with professional styling
  basicInfo: {
    title: 'Basic Information',
    icon: 'InfoIcon',
    className: PROFESSIONAL_FORM_CLASSES.sectionHeader,
  },
  
  addressInfo: {
    title: 'Address Information',
    icon: 'LocationIcon',
    className: PROFESSIONAL_FORM_CLASSES.sectionHeader,
  },
  
  financialInfo: {
    title: 'Financial Information', 
    icon: 'CurrencyIcon',
    className: PROFESSIONAL_FORM_CLASSES.sectionHeader,
  },
  
  contactInfo: {
    title: 'Contact Information',
    icon: 'ContactIcon',
    className: PROFESSIONAL_FORM_CLASSES.sectionHeader,
  },
  
  additionalInfo: {
    title: 'Additional Information',
    icon: 'DocumentIcon',
    className: PROFESSIONAL_FORM_CLASSES.sectionHeader,
  },
};

// Form Validation Styles
export const VALIDATION_CLASSES = {
  valid: 'border-green-300 focus:ring-green-500 focus:border-green-500',
  invalid: 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50',
  validIcon: 'text-green-500',
  invalidIcon: 'text-red-500',
};

// Professional Loading States
export const LOADING_CLASSES = {
  spinner: 'animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600',
  buttonLoading: 'opacity-75 cursor-not-allowed',
  formLoading: 'opacity-50 pointer-events-none',
};

// Export helper function to get professional styling
export const getProfessionalInputClasses = (hasError = false, isDisabled = false) => {
  if (isDisabled) return PROFESSIONAL_FORM_CLASSES.inputDisabled;
  if (hasError) return PROFESSIONAL_FORM_CLASSES.inputError;
  return PROFESSIONAL_FORM_CLASSES.input;
};

export const getProfessionalSelectClasses = (hasError = false) => {
  if (hasError) return PROFESSIONAL_FORM_CLASSES.selectError;
  return PROFESSIONAL_FORM_CLASSES.select;
};

export const getProfessionalTextareaClasses = (hasError = false) => {
  if (hasError) return PROFESSIONAL_FORM_CLASSES.textareaError;
  return PROFESSIONAL_FORM_CLASSES.textarea;
};