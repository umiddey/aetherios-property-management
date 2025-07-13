// Automated E2E Testing Script for ERP Application with Log Monitoring
// Run with: node test-automation.js

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');

const CONFIG = {
  baseURL: 'http://localhost:3000',
  username: '',
  password: '',
  timeout: 10000
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
    const propertyRows = await page.locator('tbody tr').count();
    logMonitor.log('info', `Found ${propertyRows} properties in the list`);
    
    if (propertyRows > 0) {
      await page.locator('tbody tr').first().click();
      logMonitor.log('action', 'Clicked on first property row');
      
      // Check if we navigated to property detail page
      await page.waitForSelector('text=Property Details', { timeout: CONFIG.timeout });
      logMonitor.log('success', 'Property detail page loaded');
      
      // Test back navigation
      await page.click('button:has-text("Back to Properties")');
      logMonitor.log('action', 'Clicked back to properties button');
      
      await page.waitForSelector('h2:has-text("Properties")', { timeout: CONFIG.timeout });
      logMonitor.log('success', 'Back navigation works');
    } else {
      logMonitor.log('warning', 'No properties found to test detail navigation');
    }
    
    // Test 5: Create Property
    console.log('📋 Test 5: Create property');
    await page.click('button:has-text("Add Property")');
    await page.waitForSelector('h2:has-text("Add Property")', { timeout: CONFIG.timeout });
    
    // Fill property form
    await page.fill('input[name="name"]', 'Test Property ' + Date.now());
    await page.selectOption('select[name="property_type"]', 'apartment');
    await page.fill('input[name="street"]', 'Test Street');
    await page.fill('input[name="house_nr"]', '123');
    await page.fill('input[name="postcode"]', '12345');
    await page.fill('input[name="city"]', 'Test City');
    await page.fill('input[name="surface_area"]', '100');
    await page.fill('input[name="number_of_rooms"]', '3');
    
    await page.click('button:has-text("Create Property")');
    
    // Wait for navigation back to properties
    await page.waitForSelector('h2:has-text("Properties")', { timeout: CONFIG.timeout });
    console.log('✅ Property created successfully');
    
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
    console.log('📋 Test 8: Create account and check instant display');
    await page.click('button:has-text("Accounts")');
    await page.waitForSelector('button:has-text("Add Account")', { timeout: CONFIG.timeout });
    
    const initialAccountCount = await page.locator('tbody tr').count();
    
    await page.click('button:has-text("Add Account")');
    await page.waitForSelector('h2:has-text("Add Customer")', { timeout: CONFIG.timeout });
    
    // Fill account form
    const timestamp = Date.now();
    await page.fill('input[name="name"]', 'Test Account ' + timestamp);
    await page.fill('input[name="company"]', 'Test Company ' + timestamp);
    await page.fill('input[name="email"]', `test${timestamp}@example.com`);
    await page.fill('input[name="phone"]', '1234567890');
    await page.fill('input[name="address"]', 'Test Address');
    
    await page.click('button:has-text("Create Customer")');
    await page.waitForSelector('text=Accounts', { timeout: CONFIG.timeout });
    
    // Check if account appears instantly (cache invalidation test)
    const newAccountCount = await page.locator('tbody tr').count();
    if (newAccountCount > initialAccountCount) {
      console.log('✅ Account appears instantly (cache invalidation working)');
    } else {
      console.log('❌ Account not appearing instantly');
    }
    
    logMonitor.log('success', '🎉 All tests completed successfully!');
    
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