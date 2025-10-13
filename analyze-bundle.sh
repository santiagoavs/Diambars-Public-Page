#!/bin/bash

echo "📦 Installing bundle analyzer..."
npm install

echo ""
echo "🔍 Building and analyzing bundle..."
npm run build:analyze

echo ""
echo "✅ Bundle analysis complete!"
echo "📊 Check dist/stats.html for detailed visualization"
