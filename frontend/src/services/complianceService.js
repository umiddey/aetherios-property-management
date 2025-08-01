/**
 * Compliance Service - Contractor License Management API
 * Provides React components with access to backend compliance endpoints
 */

import cachedAxios from '../utils/cachedAxios';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api/v1/compliance`;

class ComplianceService {
  /**
   * Get licenses expiring within specified days
   */
  async getExpiringLicenses(daysAhead = 30) {
    try {
      const response = await cachedAxios.get(`${API}/licenses/expiring?days_ahead=${daysAhead}`);
      return response.data;
    } catch (error) {
      // Only log in development, avoid console spam in production
      if (process.env.NODE_ENV === 'development') {
        console.warn('Expiring licenses fetch failed:', error.message);
      }
      throw error;
    }
  }

  /**
   * Get system-wide license statistics for dashboard
   */
  async getLicenseOverviewStats() {
    try {
      const response = await cachedAxios.get(`${API}/licenses/stats/overview`);
      return response.data;
    } catch (error) {
      // Only log in development, avoid console spam in production
      if (process.env.NODE_ENV === 'development') {
        console.warn('License overview stats fetch failed:', error.message);
      }
      throw error;
    }
  }

  /**
   * Get comprehensive license summary for a contractor
   */
  async getContractorLicenseSummary(contractorId) {
    try {
      const response = await cachedAxios.get(`${API}/licenses/summary/${contractorId}`);
      return response.data;
    } catch (error) {
      // Only log in development, avoid console spam in production
      if (process.env.NODE_ENV === 'development') {
        console.warn(`License summary fetch failed for contractor ${contractorId}:`, error.message);
      }
      throw error;
    }
  }

  /**
   * Get all licenses for a specific contractor
   */
  async getContractorLicenses(contractorId) {
    try {
      const response = await cachedAxios.get(`${API}/licenses/${contractorId}`);
      return response.data;
    } catch (error) {
      // Only log in development, avoid console spam in production
      if (process.env.NODE_ENV === 'development') {
        console.warn(`License fetch failed for contractor ${contractorId}:`, error.message);
      }
      throw error;
    }
  }

  /**
   * Create a new contractor license
   */
  async createLicense(licenseData) {
    try {
      const response = await axios.post(`${API}/licenses`, licenseData);
      return response.data;
    } catch (error) {
      // Only log in development, avoid console spam in production
      if (process.env.NODE_ENV === 'development') {
        console.warn('License creation failed:', error.message);
      }
      throw error;
    }
  }

  /**
   * Update an existing contractor license
   */
  async updateLicense(licenseId, updateData) {
    try {
      const response = await axios.put(`${API}/licenses/${licenseId}`, updateData);
      return response.data;
    } catch (error) {
      // Only log in development, avoid console spam in production
      if (process.env.NODE_ENV === 'development') {
        console.warn(`License update failed for ${licenseId}:`, error.message);
      }
      throw error;
    }
  }

  /**
   * Remove/archive a contractor license
   */
  async removeLicense(licenseId) {
    try {
      const response = await axios.delete(`${API}/licenses/${licenseId}`);
      return response.data;
    } catch (error) {
      // Only log in development, avoid console spam in production
      if (process.env.NODE_ENV === 'development') {
        console.warn(`License removal failed for ${licenseId}:`, error.message);
      }
      throw error;
    }
  }

  /**
   * Update license verification status
   */
  async updateLicenseVerification(licenseId, verificationData) {
    try {
      const response = await axios.post(`${API}/licenses/${licenseId}/verify`, verificationData);
      return response.data;
    } catch (error) {
      // Only log in development, avoid console spam in production
      if (process.env.NODE_ENV === 'development') {
        console.warn(`License verification update failed for ${licenseId}:`, error.message);
      }
      throw error;
    }
  }

  /**
   * Helper function to determine license status color for UI
   */
  getLicenseStatusColor(license) {
    if (license.is_expired) {
      return 'bg-red-100 text-red-800';
    } else if (license.days_until_expiration <= 30) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (license.verification_status === 'verified') {
      return 'bg-green-100 text-green-800';
    } else if (license.verification_status === 'pending') {
      return 'bg-blue-100 text-blue-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Helper function to get license status text for UI
   */
  getLicenseStatusText(license) {
    if (license.is_expired) {
      return 'Expired';
    } else if (license.days_until_expiration <= 7) {
      return 'Expires Soon';
    } else if (license.days_until_expiration <= 30) {
      return 'Expiring';
    } else if (license.verification_status === 'verified') {
      return 'Valid';
    } else if (license.verification_status === 'pending') {
      return 'Pending';
    } else {
      return 'Unknown';
    }
  }

  /**
   * Get contractor eligibility status for assignments
   */
  getContractorEligibilityBadge(licenseSummary) {
    if (licenseSummary.is_eligible_for_assignment) {
      return {
        color: 'bg-green-100 text-green-800',
        text: 'Eligible',
        icon: '✓'
      };
    } else {
      return {
        color: 'bg-red-100 text-red-800',
        text: 'Not Eligible',
        icon: '✗'
      };
    }
  }
}

// Export singleton instance
export default new ComplianceService();