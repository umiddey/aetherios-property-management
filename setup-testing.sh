#!/bin/bash

echo "🔧 Setting up automated testing for ERP application..."

# Install Playwright
echo "📦 Installing Playwright..."
npm install playwright

# Install browser binaries
echo "🌐 Installing browser binaries..."
npx playwright install

echo "✅ Setup complete!"
echo ""
echo "📋 Usage:"
echo "  npm run test              # Run tests with visible browser"
echo "  npm run test:headless     # Run tests in headless mode"
echo "  node test-automation.js   # Run directly"
echo ""
echo "🚀 Make sure your servers are running:"
echo "  Backend: http://localhost:8000"
echo "  Frontend: http://localhost:3000"