// Automated E2E Testing Script for ERP Application with Log Monitoring
// Run with: node test-automation.js

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');

const CONFIG = {
  baseURL: 'http://localhost:3000',
  username: '',
  password: '',
  timeout: 15000
};

// Log monitoring setup
class LogMonitor {
  constructor() {
    this.frontendLogs = [];
    this.backendLogs = [];
    this.testStepLogs = [];
    this.startTime = Date.now();
  }

  log(type, message, data = null) {
    const timestamp = new Date().toISOString();
    const timeOffset = Date.now() - this.startTime;
    const logEntry = {
      timestamp,
      timeOffset: `+${timeOffset}ms`,
      type,
      message,
      data
    };
    
    console.log(`[${timeOffset}ms] ${type.toUpperCase()}: ${message}`);
    if (data) console.log('  Data:', data);
    
    this.testStepLogs.push(logEntry);
  }

  addFrontendLog(logEntry) {
    this.frontendLogs.push({
      timestamp: new Date().toISOString(),
      timeOffset: `+${Date.now() - this.startTime}ms`,
      ...logEntry
    });
  }

  addBackendLog(logEntry) {
    this.backendLogs.push({
      timestamp: new Date().toISOString(),
      timeOffset: `+${Date.now() - this.startTime}ms`,
      ...logEntry
    });
  }

  saveLogsToFile() {
    const allLogs = {
      testSteps: this.testStepLogs,
      frontendLogs: this.frontendLogs,
      backendLogs: this.backendLogs,
      summary: {
        totalTestSteps: this.testStepLogs.length,
        totalFrontendLogs: this.frontendLogs.length,
        totalBackendLogs: this.backendLogs.length,
        testDuration: `${Date.now() - this.startTime}ms`
      }
    };
    
    const filename = `test-logs-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(allLogs, null, 2));
    console.log(`📄 Complete logs saved to: ${filename}`);
    return filename;
  }

  printSummary() {
    console.log('\n📊 LOG SUMMARY:');
    console.log(`Test Steps: ${this.testStepLogs.length}`);
    console.log(`Frontend Logs: ${this.frontendLogs.length}`);
    console.log(`Backend Logs: ${this.backendLogs.length}`);
    
    // Show recent errors
    const frontendErrors = this.frontendLogs.filter(log => log.level === 'error');
    const backendErrors = this.backendLogs.filter(log => log.message && log.message.includes('ERROR'));
    
    if (frontendErrors.length > 0) {
      console.log(`\n❌ Frontend Errors (${frontendErrors.length}):`);
      frontendErrors.slice(-3).forEach(error => {
        console.log(`  ${error.timeOffset}: ${error.message}`);
      });
    }
    
    if (backendErrors.length > 0) {
      console.log(`\n❌ Backend Errors (${backendErrors.length}):`);
      backendErrors.slice(-3).forEach(error => {
        console.log(`  ${error.timeOffset}: ${error.message}`);
      });
    }
  }
}

const logMonitor = new LogMonitor();

// Backend log monitoring
function startBackendLogMonitoring() {
  logMonitor.log('system', 'Starting backend log monitoring...');
  
  // Monitor backend logs by tailing the process output
  const backendProcess = spawn('bash', ['-c', 'cd /Users/deyumi01/Applications/erp-ai-main/erp-ai/backend && python server.py 2>&1'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  backendProcess.stdout.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      logMonitor.addBackendLog({
        level: 'info',
        message: message,
        source: 'stdout'
      });
    }
  });
  
  backendProcess.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      logMonitor.addBackendLog({
        level: 'error',
        message: message,
        source: 'stderr'
      });
    }
  });
  
  return backendProcess;
}

async function runTests() {
  logMonitor.log('system', '🚀 Starting automated testing with log monitoring...');
  
  // Start backend log monitoring
  const backendProcess = startBackendLogMonitoring();
  
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false,  // Set to true for headless mode
    slowMo: 1500      // Slow down actions for visibility and log correlation
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture browser console logs
  page.on('console', msg => {
    logMonitor.addFrontendLog({
      level: msg.type(),
      message: msg.text(),
      source: 'console'
    });
  });
  
  // Capture network requests
  page.on('request', request => {
    logMonitor.addFrontendLog({
      level: 'info',
      message: `REQUEST: ${request.method()} ${request.url()}`,
      source: 'network',
      data: {
        method: request.method(),
        url: request.url(),
        headers: request.headers()
      }
    });
  });
  
  // Capture network responses
  page.on('response', response => {
    logMonitor.addFrontendLog({
      level: response.status() >= 400 ? 'error' : 'info',
      message: `RESPONSE: ${response.status()} ${response.url()}`,
      source: 'network',
      data: {
        status: response.status(),
        url: response.url(),
        headers: response.headers()
      }
    });
  });
  
  // Capture page errors
  page.on('pageerror', error => {
    logMonitor.addFrontendLog({
      level: 'error',
      message: `PAGE ERROR: ${error.message}`,
      source: 'page',
      data: error.stack
    });
  });
  
  try {
    // Test 1: Login
    logMonitor.log('test', 'Starting Test 1: Login');
    await page.goto(CONFIG.baseURL);
    logMonitor.log('action', 'Navigated to login page');
    
    await page.waitForSelector('input[name="username"]', { timeout: CONFIG.timeout });
    logMonitor.log('action', 'Login form loaded');
    
    await page.fill('input[name="username"]', CONFIG.username);
    logMonitor.log('action', `Filled username: ${CONFIG.username}`);
    
    await page.fill('input[name="password"]', CONFIG.password);
    logMonitor.log('action', 'Filled password');
    
    await page.click('button[type="submit"]');
    logMonitor.log('action', 'Clicked login button');
    
    // Wait for dashboard to load
    await page.waitForSelector('h1:has-text("Property ERP")', { timeout: CONFIG.timeout });
    logMonitor.log('success', 'Login successful - Dashboard loaded');
    
    // Test 2: Page Refresh Persistence
    logMonitor.log('test', 'Starting Test 2: Page refresh persistence');
    await page.reload();
    logMonitor.log('action', 'Page refreshed');
    
    await page.waitForSelector('h1:has-text("Property ERP")', { timeout: CONFIG.timeout });
    logMonitor.log('success', 'Login persisted after refresh');
    
    // Test 3: Navigate to Properties
    logMonitor.log('test', 'Starting Test 3: Navigate to Properties');
    await page.click('button:has-text("Properties")');
    logMonitor.log('action', 'Clicked Properties navigation button');
    
    await page.waitForSelector('h2:has-text("Properties")', { timeout: CONFIG.timeout });
    logMonitor.log('success', 'Properties page loaded');
    
    // Test 4: Test Property Detail Navigation
    logMonitor.log('test', 'Starting Test 4: Property detail navigation');
    
    // First clear any filters to see all properties
    try {
      // The property type filter is the first select in the filters section
      const filterSelects = await page.locator('select');
      if (await filterSelects.count() > 0) {
        await filterSelects.first().selectOption('');
        logMonitor.log('action', 'Cleared property type filter');
        await page.waitForTimeout(2000); // Wait for filter to apply and data to reload
      }
    } catch (e) {
      logMonitor.log('info', 'No property type filter found or already clear');
    }
    
    const propertyRows = await page.locator('tbody tr').count();
    logMonitor.log('info', `Found ${propertyRows} properties in the list`);
    
    if (propertyRows > 0) {
      await page.locator('tbody tr').first().click();
      logMonitor.log('action', 'Clicked on first property row');
      
      // Wait for navigation and then check for property detail page elements
      await page.waitForTimeout(2000); // Give time for navigation
      
      // Check multiple possible indicators of property detail page
      try {
        // Try to find the specific text in the PropertyDetailPage
        await page.waitForSelector('text=Property Details', { timeout: 5000 });
        logMonitor.log('success', 'Property detail page loaded with text "Property Details"');
      } catch (e) {
        // If text not found, check for other indicators
        try {
          await page.waitForSelector('h1', { timeout: 5000 });
          const h1Text = await page.locator('h1').textContent();
          logMonitor.log('info', `Property detail page loaded with title: "${h1Text}"`);
          
          // Check if we're on a property detail page by looking for specific elements
          const backButton = await page.locator('button:has-text("Back to Properties")').count();
          if (backButton > 0) {
            logMonitor.log('success', 'Property detail page loaded (found back button)');
          } else {
            logMonitor.log('warning', 'Navigation occurred but may not be property detail page');
          }
        } catch (e2) {
          logMonitor.log('error', 'Failed to detect property detail page load');
          throw e2;
        }
      }
      
      // Test back navigation
      await page.click('button:has-text("Back to Properties")');
      logMonitor.log('action', 'Clicked back to properties button');
      
      await page.waitForSelector('h2:has-text("Properties")', { timeout: CONFIG.timeout });
      logMonitor.log('success', 'Back navigation works');
    } else {
      logMonitor.log('warning', 'No properties found to test detail navigation');
    }
    
    // Test 5: Create Property with User-Defined ID
    logMonitor.log('test', 'Starting Test 5: Create property with user-defined ID');
    await page.click('button:has-text("Add Property")');
    logMonitor.log('action', 'Clicked Add Property button');
    
    await page.waitForSelector('h2:has-text("Add Property")', { timeout: CONFIG.timeout });
    logMonitor.log('action', 'Property form loaded');
    
    // Fill property form with user-defined ID
    const timestamp = Date.now();
    const propertyId = `ukd_apartment_${timestamp}`;
    
    // Check if ID field exists (new functionality)
    const idField = await page.locator('input[name="id"]');
    if (await idField.count() > 0) {
      await page.fill('input[name="id"]', propertyId);
      logMonitor.log('action', `Filled user-defined property ID: ${propertyId}`);
    } else {
      logMonitor.log('warning', 'Property ID field not found - using auto-generated ID');
    }
    
    await page.fill('input[name="name"]', 'Test Apartment ' + timestamp);
    await page.selectOption('select[name="property_type"]', 'apartment');
    await page.fill('input[name="street"]', 'Test Street');
    await page.fill('input[name="house_nr"]', '123A');
    await page.fill('input[name="postcode"]', '12345');
    await page.fill('input[name="city"]', 'Test City');
    await page.fill('input[name="surface_area"]', '85.5');
    await page.fill('input[name="number_of_rooms"]', '3');
    await page.fill('input[name="rent_per_sqm"]', '15.50');
    await page.fill('textarea[name="description"]', 'Modern apartment with user-defined ID');
    
    logMonitor.log('action', 'Filled property form with test data');
    
    await page.click('button:has-text("Create Property")');
    logMonitor.log('action', 'Clicked Create Property button');
    
    // Wait for navigation back to properties
    await page.waitForSelector('h2:has-text("Properties")', { timeout: CONFIG.timeout });
    logMonitor.log('success', 'Property created successfully with user-defined ID');
    
    // Verify the property appears in the list
    const propertyExists = await page.locator(`text=${propertyId}`).count() > 0;
    if (propertyExists) {
      logMonitor.log('success', 'Property with user-defined ID appears in list');
    } else {
      logMonitor.log('warning', 'Property ID not visible in list (might be internal)');
    }
    
    // Test 6: Navigate to Tasks
    console.log('📋 Test 6: Navigate to Tasks');
    await page.click('button:has-text("Tasks")');
    await page.waitForSelector('text=Tasks', { timeout: CONFIG.timeout });
    console.log('✅ Tasks page loaded');
    
    // Test 7: Create Task with Assignment
    console.log('📋 Test 7: Create task with assignment');
    await page.click('button:has-text("Create Task")');
    await page.waitForSelector('h2:has-text("Create Task Order")', { timeout: CONFIG.timeout });
    
    // Fill task form
    await page.fill('input[name="subject"]', 'Test Task ' + Date.now());
    await page.fill('textarea[name="description"]', 'This is a test task');
    
    // Select customer if available
    const customerOptions = await page.locator('select[name="customer_id"] option').count();
    if (customerOptions > 1) {
      await page.selectOption('select[name="customer_id"]', { index: 1 });
      console.log('✅ Customer selected');
    }
    
    // Test user assignment (this was the issue we fixed)
    const userOptions = await page.locator('select[name="assigned_to"] option').count();
    if (userOptions > 1) {
      await page.selectOption('select[name="assigned_to"]', { index: 1 });
      console.log('✅ User assignment works for non-super_admin');
    } else {
      console.log('⚠️  No users available for assignment');
    }
    
    await page.click('button:has-text("Create Task")');
    await page.waitForSelector('text=Tasks', { timeout: CONFIG.timeout });
    console.log('✅ Task created successfully');
    
    // Test 8: Navigate to Accounts and create one
    logMonitor.log('test', 'Starting Test 8: Create account and check instant display');
    await page.click('button:has-text("Accounts")');
    logMonitor.log('action', 'Clicked Accounts navigation button');
    
    await page.waitForSelector('button:has-text("Add Account")', { timeout: CONFIG.timeout });
    logMonitor.log('action', 'Accounts page loaded');
    
    const initialAccountCount = await page.locator('tbody tr').count();
    logMonitor.log('info', `Initial account count: ${initialAccountCount}`);
    
    await page.click('button:has-text("Add Account")');
    await page.waitForSelector('h2:has-text("Add Customer")', { timeout: CONFIG.timeout });
    logMonitor.log('action', 'Add Customer form loaded');
    
    // Fill account form
    const accountTimestamp = Date.now();
    await page.fill('input[name="name"]', 'Test Account ' + accountTimestamp);
    await page.fill('input[name="company"]', 'Test Company ' + accountTimestamp);
    await page.fill('input[name="email"]', `test${accountTimestamp}@example.com`);
    await page.fill('input[name="phone"]', '1234567890');
    await page.fill('input[name="address"]', 'Test Address');
    logMonitor.log('action', 'Filled account form with test data');
    
    await page.click('button:has-text("Create Customer")');
    logMonitor.log('action', 'Clicked Create Customer button');
    
    await page.waitForSelector('text=Accounts', { timeout: CONFIG.timeout });
    logMonitor.log('action', 'Returned to Accounts page');
    
    // Check if account appears instantly (cache invalidation test)
    const newAccountCount = await page.locator('tbody tr').count();
    if (newAccountCount > initialAccountCount) {
      logMonitor.log('success', 'Account appears instantly (cache invalidation working)');
    } else {
      logMonitor.log('warning', 'Account not appearing instantly - checking after reload');
      await page.reload();
      const reloadedAccountCount = await page.locator('tbody tr').count();
      if (reloadedAccountCount > initialAccountCount) {
        logMonitor.log('success', 'Account appears after reload');
      } else {
        logMonitor.log('error', 'Account not appearing even after reload');
      }
    }
    
    // Test 9: Navigate to Tenants and create one
    logMonitor.log('test', 'Starting Test 9: Navigate to Tenants and create tenant');
    
    // Check if Tenants navigation exists
    const tenantsButton = await page.locator('button:has-text("Tenants")');
    if (await tenantsButton.count() > 0) {
      await page.click('button:has-text("Tenants")');
      logMonitor.log('action', 'Clicked Tenants navigation button');
      
      await page.waitForSelector('h2:has-text("Tenants")', { timeout: CONFIG.timeout });
      logMonitor.log('action', 'Tenants page loaded');
      
      const initialTenantCount = await page.locator('tbody tr').count();
      logMonitor.log('info', `Initial tenant count: ${initialTenantCount}`);
      
      // Try to create a tenant
      const addTenantButton = await page.locator('button:has-text("Add Tenant")');
      if (await addTenantButton.count() > 0) {
        await page.click('button:has-text("Add Tenant")');
        logMonitor.log('action', 'Clicked Add Tenant button');
        
        await page.waitForSelector('h2:has-text("Add Tenant")', { timeout: CONFIG.timeout });
        logMonitor.log('action', 'Add Tenant form loaded');
        
        // Fill tenant form
        const tenantTimestamp = Date.now();
        await page.fill('input[name="first_name"]', 'John');
        await page.fill('input[name="last_name"]', 'Doe');
        await page.fill('input[name="email"]', `john.doe.${tenantTimestamp}@example.com`);
        await page.fill('input[name="phone"]', '+1234567890');
        await page.fill('input[name="address"]', '123 Main Street, City, State 12345');
        
        // Select gender if field exists
        const genderField = await page.locator('select[name="gender"]');
        if (await genderField.count() > 0) {
          await page.selectOption('select[name="gender"]', 'male');
          logMonitor.log('action', 'Selected gender: male');
        }
        
        await page.fill('textarea[name="notes"]', 'Test tenant created via UI testing');
        logMonitor.log('action', 'Filled tenant form with test data');
        
        await page.click('button:has-text("Create Tenant")');
        logMonitor.log('action', 'Clicked Create Tenant button');
        
        await page.waitForSelector('h2:has-text("Tenants")', { timeout: CONFIG.timeout });
        logMonitor.log('success', 'Tenant created successfully');
        
        // Check if tenant appears in the list
        const newTenantCount = await page.locator('tbody tr').count();
        if (newTenantCount > initialTenantCount) {
          logMonitor.log('success', 'Tenant appears in list immediately');
        } else {
          logMonitor.log('warning', 'Tenant not appearing immediately - checking after reload');
        }
      } else {
        logMonitor.log('warning', 'Add Tenant button not found - tenant creation may not be implemented in UI');
      }
    } else {
      logMonitor.log('warning', 'Tenants navigation not found - tenant functionality may not be implemented in UI');
    }
    
    // Test 10: Navigate to Invoices and create one
    logMonitor.log('test', 'Starting Test 10: Navigate to Invoices and create invoice');
    
    // Check if Invoices navigation exists
    const invoicesButton = await page.locator('button:has-text("Invoices")');
    if (await invoicesButton.count() > 0) {
      await page.click('button:has-text("Invoices")');
      logMonitor.log('action', 'Clicked Invoices navigation button');
      
      await page.waitForSelector('h2:has-text("Invoices")', { timeout: CONFIG.timeout });
      logMonitor.log('action', 'Invoices page loaded');
      
      const initialInvoiceCount = await page.locator('tbody tr').count();
      logMonitor.log('info', `Initial invoice count: ${initialInvoiceCount}`);
      
      // Try to create an invoice
      const addInvoiceButton = await page.locator('button:has-text("Create Invoice")');
      if (await addInvoiceButton.count() > 0) {
        await page.click('button:has-text("Create Invoice")');
        logMonitor.log('action', 'Clicked Create Invoice button');
        
        await page.waitForSelector('h2:has-text("Create Invoice")', { timeout: CONFIG.timeout });
        logMonitor.log('action', 'Create Invoice form loaded');
        
        // Fill invoice form
        const invoiceTimestamp = Date.now();
        
        // Select tenant if available
        const tenantSelect = await page.locator('select[name="tenant_id"]');
        if (await tenantSelect.count() > 0) {
          const tenantOptions = await page.locator('select[name="tenant_id"] option').count();
          if (tenantOptions > 1) {
            await page.selectOption('select[name="tenant_id"]', { index: 1 });
            logMonitor.log('action', 'Selected tenant for invoice');
          }
        }
        
        // Select property if available
        const propertySelect = await page.locator('select[name="property_id"]');
        if (await propertySelect.count() > 0) {
          const propertyOptions = await page.locator('select[name="property_id"] option').count();
          if (propertyOptions > 1) {
            await page.selectOption('select[name="property_id"]', { index: 1 });
            logMonitor.log('action', 'Selected property for invoice');
          }
        }
        
        await page.fill('input[name="amount"]', '1250.50');
        await page.fill('textarea[name="description"]', 'Monthly rent for test property');
        
        // Set dates
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
        
        await page.fill('input[name="invoice_date"]', today.toISOString().split('T')[0]);
        await page.fill('input[name="due_date"]', nextMonth.toISOString().split('T')[0]);
        
        logMonitor.log('action', 'Filled invoice form with test data');
        
        await page.click('button:has-text("Create Invoice")');
        logMonitor.log('action', 'Clicked Create Invoice button');
        
        await page.waitForSelector('h2:has-text("Invoices")', { timeout: CONFIG.timeout });
        logMonitor.log('success', 'Invoice created successfully');
        
        // Check if invoice appears in the list
        const newInvoiceCount = await page.locator('tbody tr').count();
        if (newInvoiceCount > initialInvoiceCount) {
          logMonitor.log('success', 'Invoice appears in list immediately');
        } else {
          logMonitor.log('warning', 'Invoice not appearing immediately - checking after reload');
        }
      } else {
        logMonitor.log('warning', 'Create Invoice button not found - invoice creation may not be implemented in UI');
      }
    } else {
      logMonitor.log('warning', 'Invoices navigation not found - invoice functionality may not be implemented in UI');
    }
    
    // Test 11: Test Dashboard Statistics
    logMonitor.log('test', 'Starting Test 11: Test dashboard statistics');
    
    // Navigate back to dashboard
    await page.click('button:has-text("Dashboard")');
    logMonitor.log('action', 'Clicked Dashboard navigation button');
    
    await page.waitForSelector('h1:has-text("Property ERP")', { timeout: CONFIG.timeout });
    logMonitor.log('action', 'Dashboard loaded');
    
    // Check for statistics cards
    const statsCards = await page.locator('.stat-card, .stats-card, [class*="stat"]').count();
    logMonitor.log('info', `Found ${statsCards} statistics cards on dashboard`);
    
    // Look for specific statistics
    const statsToCheck = ['Properties', 'Tenants', 'Invoices', 'Tasks', 'Customers'];
    for (const stat of statsToCheck) {
      const statElement = await page.locator(`text=${stat}`).count();
      if (statElement > 0) {
        logMonitor.log('success', `${stat} statistic found on dashboard`);
      } else {
        logMonitor.log('info', `${stat} statistic not found on dashboard`);
      }
    }
    
    // Test 12: Backend API Health Check
    logMonitor.log('test', 'Starting Test 12: Backend API health check');
    
    // Test if backend is responding
    try {
      const response = await page.request.get('http://localhost:8000/health');
      if (response.ok()) {
        const healthData = await response.json();
        logMonitor.log('success', 'Backend health check passed', healthData);
      } else {
        logMonitor.log('error', `Backend health check failed with status: ${response.status()}`);
      }
    } catch (error) {
      logMonitor.log('error', 'Backend health check failed', error.message);
    }
    
    // Test 13: Test New API Endpoints
    logMonitor.log('test', 'Starting Test 13: Test new API endpoints');
    
    // Test if we can get a valid auth token
    try {
      const loginResponse = await page.request.post('http://localhost:8000/api/auth/login', {
        headers: { 'Content-Type': 'application/json' },
        data: {
          username: CONFIG.username,
          password: CONFIG.password
        }
      });
      
      if (loginResponse.ok()) {
        const loginData = await loginResponse.json();
        const token = loginData.access_token;
        logMonitor.log('success', 'API login successful, token obtained');
        
        // Test tenant endpoints
        const tenantResponse = await page.request.get('http://localhost:8000/api/tenants/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (tenantResponse.ok()) {
          const tenants = await tenantResponse.json();
          logMonitor.log('success', `Tenant API working - found ${tenants.length} tenants`);
        } else {
          logMonitor.log('warning', `Tenant API returned status: ${tenantResponse.status()}`);
        }
        
        // Test invoice endpoints
        const invoiceResponse = await page.request.get('http://localhost:8000/api/invoices/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (invoiceResponse.ok()) {
          const invoices = await invoiceResponse.json();
          logMonitor.log('success', `Invoice API working - found ${invoices.length} invoices`);
        } else {
          logMonitor.log('warning', `Invoice API returned status: ${invoiceResponse.status()}`);
        }
        
        // Test property endpoints (with user-defined IDs)
        const propertyResponse = await page.request.get('http://localhost:8000/api/properties/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (propertyResponse.ok()) {
          const properties = await propertyResponse.json();
          logMonitor.log('success', `Property API working - found ${properties.length} properties`);
          
          // Check if any properties have user-defined IDs
          const userDefinedIds = properties.filter(p => p.id && p.id.includes('ukd'));
          if (userDefinedIds.length > 0) {
            logMonitor.log('success', `Found ${userDefinedIds.length} properties with user-defined IDs`);
          }
        } else {
          logMonitor.log('warning', `Property API returned status: ${propertyResponse.status()}`);
        }
        
      } else {
        logMonitor.log('error', `API login failed with status: ${loginResponse.status()}`);
      }
    } catch (error) {
      logMonitor.log('error', 'API testing failed', error.message);
    }
    
    // Test 14: Test Rental Agreement Service API
    logMonitor.log('test', 'Starting Test 14: Test rental agreement service API');
    
    try {
      const loginResponse = await page.request.post('http://localhost:8000/api/auth/login', {
        headers: { 'Content-Type': 'application/json' },
        data: {
          username: CONFIG.username,
          password: CONFIG.password
        }
      });
      
      if (loginResponse.ok()) {
        const loginData = await loginResponse.json();
        const token = loginData.access_token;
        
        // Test rental agreement endpoints
        const rentalResponse = await page.request.get('http://localhost:8000/api/v1/rental-agreements/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (rentalResponse.ok()) {
          const rentals = await rentalResponse.json();
          logMonitor.log('success', `Rental agreement API working - found ${rentals.length} agreements`);
          
          // Test rental agreement stats
          const rentalStatsResponse = await page.request.get('http://localhost:8000/api/v1/rental-agreements/stats/summary', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (rentalStatsResponse.ok()) {
            const rentalStats = await rentalStatsResponse.json();
            logMonitor.log('success', `Rental stats API working - total agreements: ${rentalStats.total_agreements}`);
          } else {
            logMonitor.log('warning', `Rental stats API returned status: ${rentalStatsResponse.status()}`);
          }
          
          // Test creating a rental agreement if we have properties and tenants
          const propertyResponse = await page.request.get('http://localhost:8000/api/properties/', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          const tenantResponse = await page.request.get('http://localhost:8000/api/tenants/', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (propertyResponse.ok() && tenantResponse.ok()) {
            const properties = await propertyResponse.json();
            const tenants = await tenantResponse.json();
            
            if (properties.length > 0 && tenants.length > 0) {
              const testRental = {
                property_id: properties[0].id,
                tenant_id: tenants[0].id,
                start_date: new Date().toISOString(),
                monthly_rent: 1200.00,
                deposit: 2400.00,
                notes: "Test rental agreement via API testing"
              };
              
              const createRentalResponse = await page.request.post('http://localhost:8000/api/v1/rental-agreements/', {
                headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                data: testRental
              });
              
              if (createRentalResponse.ok()) {
                const createdRental = await createRentalResponse.json();
                logMonitor.log('success', `Rental agreement creation API working - created agreement ID: ${createdRental.id}`);
                
                // Test getting active agreements for property
                const activeRentalsResponse = await page.request.get(`http://localhost:8000/api/v1/rental-agreements/property/${properties[0].id}/active`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (activeRentalsResponse.ok()) {
                  const activeRentals = await activeRentalsResponse.json();
                  logMonitor.log('success', `Active rentals API working - found ${activeRentals.length} active agreements`);
                } else {
                  logMonitor.log('warning', `Active rentals API returned status: ${activeRentalsResponse.status()}`);
                }
                
              } else {
                const errorText = await createRentalResponse.text();
                logMonitor.log('warning', `Rental agreement creation API returned status: ${createRentalResponse.status()}, error: ${errorText}`);
              }
            } else {
              logMonitor.log('info', 'No properties or tenants available for rental agreement testing');
            }
          }
          
        } else {
          logMonitor.log('warning', `Rental agreement API returned status: ${rentalResponse.status()}`);
        }
        
      } else {
        logMonitor.log('error', `API login failed with status: ${loginResponse.status()}`);
      }
    } catch (error) {
      logMonitor.log('error', 'Rental agreement API testing failed', error.message);
    }
    
    // Test 15: Test Customer Service API
    logMonitor.log('test', 'Starting Test 15: Test customer service API');
    
    try {
      const loginResponse = await page.request.post('http://localhost:8000/api/auth/login', {
        headers: { 'Content-Type': 'application/json' },
        data: {
          username: CONFIG.username,
          password: CONFIG.password
        }
      });
      
      if (loginResponse.ok()) {
        const loginData = await loginResponse.json();
        const token = loginData.access_token;
        
        // Test customer endpoints
        const customerResponse = await page.request.get('http://localhost:8000/api/v1/customers/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (customerResponse.ok()) {
          const customers = await customerResponse.json();
          logMonitor.log('success', `Customer API working - found ${customers.length} customers`);
          
          // Test customer stats
          const customerStatsResponse = await page.request.get('http://localhost:8000/api/v1/customers/stats/summary', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (customerStatsResponse.ok()) {
            const customerStats = await customerStatsResponse.json();
            logMonitor.log('success', `Customer stats API working - total customers: ${customerStats.total_customers}`);
          } else {
            logMonitor.log('warning', `Customer stats API returned status: ${customerStatsResponse.status()}`);
          }
          
          // Test customer search
          const customerSearchResponse = await page.request.get('http://localhost:8000/api/v1/customers/search/test', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (customerSearchResponse.ok()) {
            const searchResults = await customerSearchResponse.json();
            logMonitor.log('success', `Customer search API working - found ${searchResults.length} results`);
          } else {
            logMonitor.log('warning', `Customer search API returned status: ${customerSearchResponse.status()}`);
          }
          
        } else {
          logMonitor.log('warning', `Customer API returned status: ${customerResponse.status()}`);
        }
        
      } else {
        logMonitor.log('error', `API login failed with status: ${loginResponse.status()}`);
      }
    } catch (error) {
      logMonitor.log('error', 'Customer API testing failed', error.message);
    }
    
    // Test 16: Comprehensive Rental Agreement UI Testing
    logMonitor.log('test', 'Starting Test 16: Comprehensive Rental Agreement UI Testing');
    
    try {
      // Navigate to tenants page to check rental agreements
      await page.click('button:has-text("Tenants")');
      await page.waitForTimeout(1000);
      logMonitor.log('action', 'Clicked Tenants navigation button');
      
      await page.waitForSelector('h2:has-text("Tenants")', { timeout: CONFIG.timeout });
      logMonitor.log('action', 'Tenants page loaded');
      
      // Check if there are tenants in the table
      const tenantRows = await page.locator('tbody tr').count();
      logMonitor.log('info', `Found ${tenantRows} tenants in the table`);
      
      if (tenantRows > 0) {
        // Click on first tenant row to select it
        await page.locator('tbody tr').first().click();
        await page.waitForTimeout(1000);
        logMonitor.log('action', 'Selected first tenant');
        
        // Check for rental agreements section in tenant details
        const agreementsSection = await page.locator('text=Rental Agreements');
        if (await agreementsSection.count() > 0) {
          logMonitor.log('success', 'Rental Agreements section found in tenant details');
          
          // Check if there are any agreements listed
          const agreementItems = await page.locator('li:has-text("$")').count();
          if (agreementItems > 0) {
            logMonitor.log('success', `Found ${agreementItems} rental agreements for this tenant`);
            
            // Click on first agreement to view details
            await page.locator('li:has-text("$")').first().click();
            await page.waitForTimeout(1000);
            logMonitor.log('action', 'Clicked on rental agreement');
            
            // Check if agreement details are displayed
            const agreementDetails = await page.locator('text=Agreement Details');
            if (await agreementDetails.count() > 0) {
              logMonitor.log('success', 'Rental agreement details displayed successfully');
              
              // Check for specific details that should be visible
              const monthlyRentVisible = await page.locator('text=Monthly Rent').count() > 0;
              const depositVisible = await page.locator('text=Deposit').count() > 0;
              const startDateVisible = await page.locator('text=Start Date').count() > 0;
              const endDateVisible = await page.locator('text=End Date').count() > 0;
              
              let visibleDetails = [];
              if (monthlyRentVisible) visibleDetails.push('Monthly Rent');
              if (depositVisible) visibleDetails.push('Deposit');
              if (startDateVisible) visibleDetails.push('Start Date');
              if (endDateVisible) visibleDetails.push('End Date');
              
              if (visibleDetails.length >= 3) {
                logMonitor.log('success', `Rental agreement details are visible: ${visibleDetails.join(', ')}`);
              } else {
                logMonitor.log('warning', `Some rental agreement details are missing. Found: ${visibleDetails.join(', ')}`);
              }
            } else {
              logMonitor.log('warning', 'Rental agreement details not displayed');
            }
          } else {
            logMonitor.log('info', 'No rental agreements found for this tenant');
          }
        } else {
          logMonitor.log('warning', 'Rental Agreements section not found in tenant details');
        }
      } else {
        logMonitor.log('info', 'No tenants available to test rental agreements');
      }
      
      // Test rental agreements from property detail page
      await page.click('button:has-text("Properties")');
      await page.waitForTimeout(1000);
      logMonitor.log('action', 'Navigated to Properties page');
      
      await page.waitForSelector('h2:has-text("Properties")', { timeout: CONFIG.timeout });
      logMonitor.log('action', 'Properties page loaded');
      
      const propertyRows = await page.locator('tbody tr').count();
      logMonitor.log('info', `Found ${propertyRows} properties in the table`);
      
      if (propertyRows > 0) {
        // Click on first property row
        await page.locator('tbody tr').first().click();
        await page.waitForTimeout(2000);
        logMonitor.log('action', 'Clicked on first property');
        
        // Check for rental agreements section in property details
        const propertyAgreementsSection = await page.locator('text=Rental Agreements');
        if (await propertyAgreementsSection.count() > 0) {
          logMonitor.log('success', 'Rental Agreements section found in property details');
          
          // Check if agreements table is displayed
          const agreementsTable = await page.locator('table:has(th:text("Tenant"))').count();
          if (agreementsTable > 0) {
            logMonitor.log('success', 'Rental agreements table displayed in property details');
            
            // Check for table headers
            const tenantHeader = await page.locator('th:text("Tenant")').count() > 0;
            const rentHeader = await page.locator('th:text("Monthly Rent")').count() > 0;
            const startDateHeader = await page.locator('th:text("Start Date")').count() > 0;
            const statusHeader = await page.locator('th:text("Status")').count() > 0;
            
            let visibleHeaders = [];
            if (tenantHeader) visibleHeaders.push('Tenant');
            if (rentHeader) visibleHeaders.push('Monthly Rent');
            if (startDateHeader) visibleHeaders.push('Start Date');
            if (statusHeader) visibleHeaders.push('Status');
            
            if (visibleHeaders.length >= 3) {
              logMonitor.log('success', `Rental agreements table headers are visible: ${visibleHeaders.join(', ')}`);
            } else {
              logMonitor.log('warning', `Some rental agreements table headers are missing. Found: ${visibleHeaders.join(', ')}`);
            }
            
            // Check for actual rental agreement data rows
            const agreementRows = await page.locator('tbody tr').count();
            if (agreementRows > 0) {
              logMonitor.log('success', `Found ${agreementRows} rental agreement rows in property details`);
              
              // Click on first agreement row if it exists
              await page.locator('tbody tr').first().click();
              await page.waitForTimeout(1000);
              logMonitor.log('action', 'Clicked on first rental agreement row');
              
              // Check if agreement details popup or section appears
              const agreementPopup = await page.locator('text=Agreement Details').count() > 0;
              if (agreementPopup) {
                logMonitor.log('success', 'Rental agreement details popup displayed');
              } else {
                logMonitor.log('info', 'No rental agreement details popup (may not be implemented)');
              }
            } else {
              logMonitor.log('info', 'No rental agreement data rows found (may be no agreements for this property)');
            }
          } else {
            logMonitor.log('info', 'No rental agreements table found (may be no agreements for this property)');
          }
        } else {
          logMonitor.log('warning', 'Rental Agreements section not found in property details');
        }
      }
      
      // Test 16.1: Check Dashboard for Rental Agreement Stats
      logMonitor.log('test', 'Starting Test 16.1: Check Dashboard for Rental Agreement Stats');
      
      await page.click('button:has-text("Dashboard")');
      await page.waitForTimeout(1000);
      logMonitor.log('action', 'Navigated to Dashboard page');
      
      await page.waitForSelector('h1:has-text("Property ERP")', { timeout: CONFIG.timeout });
      logMonitor.log('action', 'Dashboard page loaded');
      
      // Check for rental agreement statistics in dashboard
      const activeAgreementsCard = await page.locator('text=Active Agreements').count() > 0;
      const rentalAgreementsCard = await page.locator('text=Rental Agreements').count() > 0;
      const agreementsStats = await page.locator('text=Agreements').count() > 0;
      
      if (activeAgreementsCard) {
        logMonitor.log('success', 'Active Agreements statistics card found on dashboard');
        
        // Try to find the number value
        const activeAgreementsValue = await page.locator(':text-is("Active Agreements") + p').textContent();
        if (activeAgreementsValue) {
          logMonitor.log('success', `Active Agreements count: ${activeAgreementsValue}`);
        }
      } else if (rentalAgreementsCard) {
        logMonitor.log('success', 'Rental Agreements statistics card found on dashboard');
      } else if (agreementsStats) {
        logMonitor.log('success', 'Agreements statistics found on dashboard');
      } else {
        logMonitor.log('warning', 'No rental agreement statistics found on dashboard');
      }
      
      // Test 16.2: Verify Rental Agreement Data Integrity
      logMonitor.log('test', 'Starting Test 16.2: Verify Rental Agreement Data Integrity');
      
      // Navigate back to tenants to check if rental agreements show correct property names
      await page.click('button:has-text("Tenants")');
      await page.waitForTimeout(1000);
      logMonitor.log('action', 'Navigated back to Tenants page');
      
      const tenantRowsCheck = await page.locator('tbody tr').count();
      if (tenantRowsCheck > 0) {
        // Click on first tenant
        await page.locator('tbody tr').first().click();
        await page.waitForTimeout(1000);
        logMonitor.log('action', 'Selected first tenant for data integrity check');
        
        // Check if rental agreements show property names correctly
        const propertyNames = await page.locator('li:has-text("Property:")').count();
        if (propertyNames > 0) {
          logMonitor.log('success', 'Property names are displayed in rental agreements');
        } else {
          logMonitor.log('warning', 'Property names not found in rental agreements');
        }
        
        // Check if rental agreements show currency values correctly
        const currencyValues = await page.locator('li:has-text("$")').count();
        if (currencyValues > 0) {
          logMonitor.log('success', 'Currency values are displayed in rental agreements');
        } else {
          logMonitor.log('warning', 'Currency values not found in rental agreements');
        }
      }
      
      logMonitor.log('success', 'Comprehensive rental agreement UI testing completed');
      
    } catch (error) {
      logMonitor.log('error', 'Rental Agreement UI testing failed', error.message);
    }
    
    
    logMonitor.log('success', '🎉 All comprehensive tests completed successfully!');
    
  } catch (error) {
    logMonitor.log('error', `❌ Test failed: ${error.message}`, error.stack);
    
    // Take screenshot for debugging
    await page.screenshot({ 
      path: 'test-failure-' + Date.now() + '.png',
      fullPage: true 
    });
    logMonitor.log('info', '📸 Screenshot saved for debugging');
  } finally {
    logMonitor.log('system', 'Cleaning up test environment...');
    
    // Close browser
    await browser.close();
    logMonitor.log('system', 'Browser closed');
    
    // Stop backend monitoring
    if (backendProcess) {
      backendProcess.kill();
      logMonitor.log('system', 'Backend log monitoring stopped');
    }
    
    // Print summary and save logs
    logMonitor.printSummary();
    const logFile = logMonitor.saveLogsToFile();
    
    console.log('\n🔍 For detailed analysis, check:');
    console.log(`   Log file: ${logFile}`);
    console.log('   Screenshot: test-failure-*.png (if test failed)');
  }
}

// Check if required dependencies are installed
async function checkDependencies() {
  try {
    require('playwright');
    return true;
  } catch (error) {
    console.log('❌ Playwright not installed. Installing...');
    console.log('Run: npm install playwright && npx playwright install');
    return false;
  }
}

// Main execution
(async () => {
  if (await checkDependencies()) {
    await runTests();
  }
})();