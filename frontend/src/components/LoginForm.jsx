/*
 * ==================================================================================
 * LOGINFORM.JSX - USER AUTHENTICATION INTERFACE COMPONENT
 * ==================================================================================
 * 
 * This component provides the user interface for logging into the application.
 * It demonstrates key React concepts including:
 * - Controlled components (React managing form inputs)
 * - Event handling (form submission, input changes)
 * - State management (form data, errors, loading states)
 * - Context integration (using AuthContext and LanguageContext)
 * - Conditional rendering (showing/hiding error messages)
 * - CSS styling with TailwindCSS
 * 
 * COMPONENT RESPONSIBILITIES:
 * - Render login form with username and password fields
 * - Handle user input and form submission
 * - Display error messages from authentication failures
 * - Show loading indicators during login attempts
 * - Integrate with authentication system (AuthContext)
 * - Support internationalization (translations)
 * 
 * USER FLOW:
 * 1. User sees login form
 * 2. User enters username and password
 * 3. User clicks submit button
 * 4. Component calls AuthContext.login()
 * 5. On success: AuthContext redirects to dashboard
 * 6. On failure: Component shows error message
 */

// ==================================================================================
// IMPORTS - External libraries and internal components/hooks
// ==================================================================================

// Import React and the useState hook for managing component state
import React, { useState } from 'react';

// Import custom hooks for accessing global application state
import { useAuth } from '../AuthContext';                    // Authentication functions
import { useLanguage } from '../contexts/LanguageContext';   // Translation functions

// ==================================================================================
// LOGINFORM COMPONENT - Main component function
// ==================================================================================

/*
 * FUNCTION COMPONENT DEFINITION:
 * React function components are JavaScript functions that return JSX
 * They can use hooks to manage state and side effects
 * Component names MUST start with capital letter (LoginForm, not loginForm)
 */
const LoginForm = () => {
  
  // ==================================================================================
  // HOOKS - State management and context access
  // ==================================================================================
  
  /*
   * LANGUAGE HOOK:
   * Extracts the translation function from LanguageContext
   * 't' function converts translation keys to translated text
   * Example: t('common.login') → "Login" (English) or "Anmelden" (German)
   */
  const { t } = useLanguage();
  
  /*
   * FORM DATA STATE:
   * useState hook manages the form input values
   * INITIAL STATE: Object with empty username and password strings
   * STATE STRUCTURE: { username: "", password: "" }
   * 
   * REACT STATE PATTERN:
   * - formData: Current state value
   * - setFormData: Function to update state
   * - useState(initialValue): Hook that returns [state, setter]
   */
  const [formData, setFormData] = useState({
    username: '',  // Username input field value
    password: ''   // Password input field value
  });
  
  /*
   * ERROR STATE:
   * Stores error messages to display to the user
   * INITIAL STATE: Empty string (no error)
   * UPDATED: When login fails, contains error message from backend
   * CLEARED: Before each new login attempt
   */
  const [error, setError] = useState('');
  
  /*
   * LOADING STATE:
   * Boolean indicating whether login request is in progress
   * true: Show loading spinner, disable submit button
   * false: Normal state, user can interact with form
   * 
   * PREVENTS: Multiple simultaneous login attempts
   * IMPROVES: User experience with visual feedback
   */
  const [loading, setLoading] = useState(false);
  
  /*
   * AUTHENTICATION HOOK:
   * Extracts the login function from AuthContext
   * This is the function that actually performs authentication
   * Returns: { success: boolean, error?: string }
   */
  const { login } = useAuth();

  // ==================================================================================
  // EVENT HANDLERS - Functions that respond to user interactions
  // ==================================================================================
  
  /*
   * FORM SUBMISSION HANDLER:
   * Called when user submits the form (clicks submit or presses Enter)
   * Async function because it makes API calls to backend
   * 
   * PARAMETER: e (event object) - contains information about the form submission
   * 
   * PROCESS:
   * 1. Prevent default browser form submission
   * 2. Set loading state to show progress indicator
   * 3. Clear any previous error messages
   * 4. Call login function from AuthContext
   * 5. Handle success/failure results
   * 6. Clear loading state
   */
  const handleSubmit = async (e) => {
    /*
     * PREVENT DEFAULT FORM SUBMISSION:
     * By default, HTML forms reload the page when submitted
     * preventDefault() stops this behavior so we can handle submission with JavaScript
     * This is essential for single-page applications (SPAs)
     */
    e.preventDefault();
    
    /*
     * SET LOADING STATE:
     * Show loading indicator and disable submit button
     * Prevents user from submitting form multiple times
     */
    setLoading(true);
    
    /*
     * CLEAR PREVIOUS ERRORS:
     * Remove any error messages from previous login attempts
     * Provides clean slate for new login attempt
     */
    setError('');

    /*
     * CALL LOGIN FUNCTION:
     * Use AuthContext's login function to authenticate user
     * Pass username and password from form state
     * Function returns object with success status and optional error message
     * 
     * ASYNC/AWAIT EXPLANATION:
     * - login() returns a Promise (asynchronous operation)
     * - await waits for the Promise to resolve before continuing
     * - result contains the resolved value
     */
    const result = await login(formData.username, formData.password);
    
    /*
     * HANDLE LOGIN RESULT:
     * Check if login was successful or failed
     */
    if (!result.success) {
      // Login failed - show error message to user
      // Login error - not logged for security
      setError(result.error);     // Display error in UI
    }
    // NOTE: Success case is handled automatically by AuthContext
    // AuthContext redirects to dashboard when login succeeds
    
    /*
     * CLEAR LOADING STATE:
     * Hide loading indicator and re-enable submit button
     * Always runs regardless of success/failure
     */
    setLoading(false);
  };

  /*
   * INPUT CHANGE HANDLER:
   * Called whenever user types in username or password field
   * Updates formData state with new input values
   * 
   * PARAMETER: e (event object) - contains information about the input change
   * 
   * KEY PROPERTIES:
   * - e.target: The input element that changed
   * - e.target.name: The 'name' attribute of the input ("username" or "password")
   * - e.target.value: The current value of the input
   */
  const handleChange = (e) => {
    /*
     * UPDATE FORM DATA STATE:
     * Uses spread operator and computed property names to update state
     * 
     * BREAKDOWN:
     * 1. ...formData: Create copy of current formData object (React immutability)
     * 2. [e.target.name]: Computed property name - uses value of e.target.name as key
     * 3. e.target.value: New value for the field
     * 
     * EXAMPLE:
     * If user types in username field:
     * - e.target.name = "username"
     * - e.target.value = "john"
     * - Result: { ...formData, username: "john" }
     * 
     * REACT IMMUTABILITY:
     * Never modify state directly (formData.username = "john")
     * Always create new object/array when updating state
     * This allows React to detect changes and re-render component
     */
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ==================================================================================
  // COMPONENT RENDER - JSX that describes the user interface
  // ==================================================================================
  
  /*
   * RETURN STATEMENT:
   * Returns JSX (JavaScript XML) that describes what to render
   * JSX looks like HTML but is actually JavaScript
   * Gets compiled to React.createElement() calls
   */
  return (
    /*
     * OUTER CONTAINER:
     * Full-screen container with gradient background and centering
     * 
     * TAILWIND CSS CLASSES EXPLAINED:
     * - min-h-screen: Minimum height = full viewport height (100vh)
     * - bg-gradient-to-br: Background gradient from top-left to bottom-right
     * - from-blue-900: Gradient start color (dark blue)
     * - to-purple-900: Gradient end color (dark purple)
     * - flex: Display as flexbox container
     * - items-center: Center items vertically (align-items: center)
     * - justify-center: Center items horizontally (justify-content: center)
     * - p-4: Padding of 1rem (16px) on all sides
     * 
     * FLEXBOX CENTERING:
     * Combination of flex, items-center, and justify-center
     * Creates perfect centering both horizontally and vertically
     */
    /*
       * LOGIN CARD CONTAINER:
       * White card that contains the actual login form
       * 
       * TAILWIND CSS CLASSES:
       * - bg-white: White background color
       * - rounded-lg: Large border radius (8px) for rounded corners
       * - shadow-2xl: Extra large drop shadow for depth
       * - p-8: Padding of 2rem (32px) on all sides
       * - w-full: Full width of parent container
       * - max-w-md: Maximum width of 28rem (448px)
       * 
       * RESPONSIVE DESIGN:
       * w-full makes card full width on small screens
       * max-w-md limits width on larger screens
       */

        /*
         * HEADER SECTION:
         * Application title and description
         * 
         * TAILWIND CSS CLASSES:
         * - text-center: Center-align text
         * - mb-8: Margin bottom of 2rem (32px)
         */
        /*
           * MAIN TITLE:
           * Application name with large, bold styling
           * 
           * TAILWIND CSS CLASSES:
           * - text-3xl: Font size of 1.875rem (30px)
           * - font-bold: Font weight 700 (bold)
           * - text-gray-800: Dark gray text color
           * - mb-2: Margin bottom of 0.5rem (8px)
           */

              /*
              * SUBTITLE:
              * Brief description of the application
              * 
              * TAILWIND CSS CLASSES:
              * - text-gray-600: Medium gray text color (lighter than title)
              */
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Property ERP</h1>
          <p className="text-gray-600">Property Management System</p>
        </div>

        {/*
         * CONDITIONAL ERROR DISPLAY:
         * Shows error message only if error state has a value
         * 
         * CONDITIONAL RENDERING PATTERN:
         * {condition && <element>} - renders element only if condition is truthy
         * If error is empty string (""), condition is falsy and nothing renders
         * If error has a message, condition is truthy and error div renders
         * 
         * LOGICAL AND (&&) OPERATOR:
         * JavaScript short-circuit evaluation
         * If left side is false, right side never executes
         * If left side is true, right side executes and its value is returned
         */}
        {error && (
          /*
           * ERROR MESSAGE CONTAINER:
           * Red-themed container for displaying error messages
           * 
           * TAILWIND CSS CLASSES:
           * - bg-red-100: Light red background
           * - border: Add border
           * - border-red-400: Medium red border color
           * - text-red-700: Dark red text color
           * - px-4: Horizontal padding of 1rem (16px)
           * - py-3: Vertical padding of 0.75rem (12px)
           * - rounded: Border radius of 0.25rem (4px)
           * - mb-4: Margin bottom of 1rem (16px)
           * 
           * ACCESSIBILITY:
           * Red color scheme clearly indicates error state
           * Good contrast between text and background
           */
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {/*
             * ERROR MESSAGE TEXT:
             * Displays the actual error message from authentication failure
             * Content comes from error state variable
             * Examples: "Incorrect username or password", "Network error"
             */}
            {error}
          </div>
        )}

        {/*
         * LOGIN FORM:
         * HTML form element that contains input fields and submit button
         * 
         * FORM ATTRIBUTES:
         * - onSubmit: Event handler for form submission
         * - className: Tailwind CSS classes for styling
         * 
         * TAILWIND CSS CLASSES:
         * - space-y-4: Vertical spacing of 1rem (16px) between child elements
         * 
         * EVENT HANDLING:
         * onSubmit={handleSubmit} - calls handleSubmit function when form is submitted
         * Form submission can be triggered by:
         * 1. Clicking submit button
         * 2. Pressing Enter while focused on form input
         */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/*
           * USERNAME INPUT CONTAINER:
           * Container div for username input field
           */}
          <div>
            {/*
             * USERNAME INPUT FIELD:
             * Text input for username entry
             * 
             * INPUT ATTRIBUTES EXPLAINED:
             * - type="text": Standard text input (no special formatting)
             * - name="username": Identifies this field (used by handleChange)
             * - placeholder="Username": Gray text shown when field is empty
             * - value={formData.username}: Current value from React state
             * - onChange={handleChange}: Function called when user types
             * - required: HTML5 validation - prevents empty submission
             * 
             * CONTROLLED COMPONENT PATTERN:
             * React controls the input value through:
             * 1. value prop: React tells input what to display
             * 2. onChange prop: Input tells React when value changes
             * This ensures React state is always in sync with UI
             * 
             * TAILWIND CSS CLASSES:
             * - w-full: Full width of container
             * - px-4: Horizontal padding of 1rem (16px)
             * - py-2: Vertical padding of 0.5rem (8px)
             * - border: Add border
             * - border-gray-300: Light gray border color
             * - rounded-lg: Large border radius (8px)
             * - focus:ring-2: Add 2px ring on focus
             * - focus:ring-blue-500: Blue ring color on focus
             * - focus:border-transparent: Remove border on focus (ring replaces it)
             * 
             * FOCUS STATES:
             * When user clicks/tabs to input:
             * - Border becomes transparent
             * - Blue ring appears around input
             * - Provides clear visual feedback
             */}
            <input
              type="text"
              name="username"
              placeholder={t('common.username')}
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          {/*
           * PASSWORD INPUT CONTAINER:
           * Container div for password input field
           */}
          <div>
            {/*
             * PASSWORD INPUT FIELD:
             * Password input that hides characters as user types
             * 
             * KEY DIFFERENCE FROM USERNAME:
             * - type="password": Hides input characters (shows dots/asterisks)
             * - name="password": Identifies this field for handleChange
             * - value={formData.password}: Linked to password state
             * 
             * SECURITY CONSIDERATION:
             * type="password" prevents password from being visible
             * Also prevents browser from storing password in autocomplete
             * 
             * All other attributes and classes same as username field
             */}
            <input
              type="password"
              name="password"
              placeholder={t('common.password')}
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          {/*
           * SUBMIT BUTTON:
           * Button that submits the form and triggers login
           * 
           * BUTTON ATTRIBUTES:
           * - type="submit": Makes this button submit the form when clicked
           * - disabled={loading}: Disables button when loading is true
           * 
           * DISABLED STATE:
           * When loading=true:
           * - Button cannot be clicked
           * - Prevents multiple login attempts
           * - Visual feedback through opacity and cursor changes
           * 
           * TAILWIND CSS CLASSES:
           * - w-full: Full width of container
           * - bg-blue-500: Blue background color
           * - text-white: White text color
           * - py-2: Vertical padding of 0.5rem (8px)
           * - px-4: Horizontal padding of 1rem (16px)
           * - rounded-lg: Large border radius (8px)
           * - hover:bg-blue-600: Darker blue on hover (when not disabled)
           * - disabled:opacity-50: 50% opacity when disabled
           * - disabled:cursor-not-allowed: Not-allowed cursor when disabled
           * - font-medium: Medium font weight (500)
           * 
           * HOVER EFFECTS:
           * On mouse hover (when enabled):
           * - Background changes from blue-500 to blue-600
           * - Provides interactive feedback
           * 
           * DISABLED STYLES:
           * When button is disabled (loading=true):
           * - Opacity reduced to 50%
           * - Cursor changes to not-allowed icon
           * - Hover effects don't apply
           */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          > 
            {/*
             * DYNAMIC BUTTON TEXT:
             * Text changes based on loading state and uses translations
             * 
             * CONDITIONAL (TERNARY) OPERATOR:
             * condition ? valueIfTrue : valueIfFalse
             * 
             * LOADING STATE:
             * - loading=true: Shows "Logging In..." message
             * - loading=false: Shows "Login" message
             * 
             * INTERNATIONALIZATION:
             * - t('common.loggingIn'): Gets translated "Logging In..." text
             * - t('common.login'): Gets translated "Login" text
             * - German: "Anmelden" vs "Anmeldung läuft..."
             * - English: "Login" vs "Logging In..."
             * 
             * USER EXPERIENCE:
             * Loading text provides feedback that login is in progress
             * Prevents user confusion about whether form was submitted
             */}
            {loading ? t('common.loggingIn') : t('common.login')}
          </button>
        </form>
        
        {/*
         * FOOTER MESSAGE:
         * Static text providing information about account creation
         * 
         * TAILWIND CSS CLASSES:
         * - text-center: Center-align text
         * - text-sm: Small font size (0.875rem / 14px)
         * - text-gray-600: Medium gray text color
         * - mt-4: Margin top of 1rem (16px)
         * 
         * CONTENT PURPOSE:
         * Informs users that they cannot self-register
         * Directs them to contact administrator for account creation
         * Common pattern in enterprise applications
         */}
        <p className="text-center text-sm text-gray-600 mt-4">
          Don't have an account? Contact administrator.
        </p>
      </div>
    </div>
  );
};

/*
 * EXPORT DEFAULT:
 * Makes this component available for import in other files
 * Other files can import with: import LoginForm from './LoginForm'
 */
export default LoginForm;

/*
 * ==================================================================================
 * REACT CONCEPTS DEMONSTRATED
 * ==================================================================================
 * 
 * 1. FUNCTIONAL COMPONENTS:
 *    Modern React components using function syntax instead of class syntax
 *    Simpler, more readable, and support hooks
 * 
 * 2. HOOKS USAGE:
 *    - useState: Managing component-local state
 *    - useAuth: Custom hook for accessing authentication context
 *    - useLanguage: Custom hook for accessing translation context
 * 
 * 3. CONTROLLED COMPONENTS:
 *    React controls form input values through state
 *    All input changes flow through React state
 *    Enables validation, formatting, and synchronization
 * 
 * 4. EVENT HANDLING:
 *    - onSubmit: Form submission handling
 *    - onChange: Input change handling
 *    - preventDefault: Preventing default browser behavior
 * 
 * 5. CONDITIONAL RENDERING:
 *    - {condition && <element>}: Render element only if condition is true
 *    - {condition ? <a> : <b>}: Render different elements based on condition
 * 
 * 6. CONTEXT INTEGRATION:
 *    Using multiple contexts (Auth, Language) in single component
 *    Demonstrates separation of concerns
 * 
 * 7. ASYNC OPERATIONS:
 *    - async/await: Modern JavaScript asynchronous programming
 *    - Loading states: UI feedback during async operations
 *    - Error handling: Graceful failure management
 * 
 * 8. ACCESSIBILITY:
 *    - Semantic HTML: form, input, button elements
 *    - Focus states: Visual feedback for keyboard navigation
 *    - Error messages: Clear feedback for failed operations
 * 
 * 9. RESPONSIVE DESIGN:
 *    - Mobile-first approach with Tailwind CSS
 *    - Flexible layouts using flexbox
 *    - Appropriate spacing and sizing
 * 
 * 10. INTERNATIONALIZATION:
 *     Support for multiple languages through translation functions
 *     Text content separated from component logic
 * 
 * ==================================================================================
 * PERFORMANCE CONSIDERATIONS
 * ==================================================================================
 * 
 * 1. STATE UPDATES:
 *    State updates trigger re-renders
 *    Using object spread to maintain immutability
 *    Minimal state structure for efficiency
 * 
 * 2. EVENT HANDLERS:
 *    Functions defined inside component re-create on each render
 *    For this simple component, performance impact is negligible
 *    More complex components might use useCallback for optimization
 * 
 * 3. FORM VALIDATION:
 *    Using HTML5 'required' attribute for basic validation
 *    More complex validation could be added with custom logic
 * 
 * 4. ERROR HANDLING:
 *    Graceful error display without breaking component
 *    Error messages provide actionable feedback to users
 * 
 * ==================================================================================
 * SECURITY CONSIDERATIONS
 * ==================================================================================
 * 
 * 1. PASSWORD HANDLING:
 *    type="password" hides password characters
 *    No password stored in component state longer than necessary
 *    Password passed directly to authentication function
 * 
 * 2. XSS PREVENTION:
 *    React automatically escapes JSX content
 *    Error messages from backend are safely displayed
 * 
 * 3. FORM SUBMISSION:
 *    preventDefault() prevents unintended form submissions
 *    All authentication handled through secure context
 * 
 * 4. INPUT VALIDATION:
 *    HTML5 validation prevents empty submissions
 *    Backend performs additional validation and sanitization
 */