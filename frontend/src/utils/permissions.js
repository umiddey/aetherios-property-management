/**
 * Permission utility functions for role-based access control
 */

// Role hierarchy levels
const ROLE_LEVELS = {
  user: 1,
  property_manager_admin: 2,
  super_admin: 3
};

/**
 * Check if user has required role level or higher
 * @param {Object} user - User object with role property
 * @param {string} requiredRole - Minimum required role
 * @returns {boolean} - True if user has sufficient permissions
 */
export const hasRole = (user, requiredRole) => {
  if (!user || !user.role) {
    return false;
  }
  
  const userLevel = ROLE_LEVELS[user.role] || 0;
  const requiredLevel = ROLE_LEVELS[requiredRole] || 999;
  
  return userLevel >= requiredLevel;
};

/**
 * Check if user can access license management features
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user can manage licenses
 */
export const canManageLicenses = (user) => {
  return hasRole(user, 'property_manager_admin');
};

/**
 * Check if user can manage users and system settings
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user is super admin
 */
export const canManageUsers = (user) => {
  return hasRole(user, 'super_admin');
};

/**
 * Check if user is a normal property manager (no license access)
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user is normal property manager
 */
export const isNormalUser = (user) => {
  return user && user.role === 'user';
};

/**
 * Check if user is property manager admin or higher
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user is property manager admin or super admin
 */
export const isPropertyManagerAdmin = (user) => {
  return hasRole(user, 'property_manager_admin');
};

/**
 * Check if user is super admin
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user is super admin
 */
export const isSuperAdmin = (user) => {
  return user && user.role === 'super_admin';
};

/**
 * Get user's role display name
 * @param {Object} user - User object with role property
 * @returns {string} - Human readable role name
 */
export const getRoleDisplayName = (user) => {
  if (!user || !user.role) {
    return 'Unknown';
  }
  
  switch (user.role) {
    case 'user':
      return 'Property Manager';
    case 'property_manager_admin':
      return 'Property Manager Admin';
    case 'super_admin':
      return 'System Administrator';
    default:
      return 'Unknown Role';
  }
};

/**
 * Get user's permissions summary
 * @param {Object} user - User object with role property
 * @returns {Object} - Object containing permission flags
 */
export const getUserPermissions = (user) => {
  return {
    canManageLicenses: canManageLicenses(user),
    canManageUsers: canManageUsers(user),
    isNormalUser: isNormalUser(user),
    isPropertyManagerAdmin: isPropertyManagerAdmin(user),
    isSuperAdmin: isSuperAdmin(user),
    roleDisplayName: getRoleDisplayName(user)
  };
};