// User-friendly error messages
export const errorMessages = {
  // Network errors
  'Network Error': 'Unable to connect to the server. Please check your internet connection.',
  'ERR_NETWORK': 'Network connection problem. Please try again.',
  
  // Authentication errors
  401: 'Your session has expired. Please log in again.',
  403: 'You do not have permission to perform this action.',
  
  // Client errors
  400: 'Invalid request. Please check your input and try again.',
  404: 'The requested resource was not found.',
  409: 'This action conflicts with existing data.',
  422: 'The data you entered is invalid. Please check and try again.',
  
  // Server errors
  500: 'Server error. Please try again later.',
  502: 'Service temporarily unavailable. Please try again later.',
  503: 'Service unavailable. Please try again later.',
  
  // Specific application errors
  'Username or email already exists': 'This username or email is already registered.',
  'Incorrect username or password': 'Invalid login credentials. Please check your username and password.',
  'User not found': 'User account not found.',
  'Property not found': 'Property not found.',
  'Tenant not found': 'Tenant not found.',
  'Invoice not found': 'Invoice not found.',
  'Task order not found': 'Task not found.',
  
  // Validation errors
  'validation error': 'Please check your input and try again.',
  'required field': 'Please fill in all required fields.',
  'invalid email': 'Please enter a valid email address.',
  'password too short': 'Password must be at least 6 characters long.',
  
  // Default fallback
  default: 'Something went wrong. Please try again.'
};

// Extract user-friendly message from error
export const getUserFriendlyError = (error) => {
  if (!error) return errorMessages.default;
  
  // Check for specific error message
  const errorMessage = error.response?.data?.detail || 
                      error.response?.data?.message || 
                      error.message || 
                      String(error);
  
  // Check for HTTP status codes
  const statusCode = error.response?.status;
  if (statusCode && errorMessages[statusCode]) {
    return errorMessages[statusCode];
  }
  
  // Check for specific error messages
  for (const [key, message] of Object.entries(errorMessages)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return message;
    }
  }
  
  // Return default message
  return errorMessages.default;
};

// Create notification-ready error object
export const createErrorNotification = (error, title = 'Error') => ({
  type: 'error',
  title,
  message: getUserFriendlyError(error),
  duration: 5000 // 5 seconds
});