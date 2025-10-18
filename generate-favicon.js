#!/usr/bin/env node

/**
 * Favicon Generation Script for RukaPay Merchant Dashboard
 * 
 * This script helps generate favicon files from the existing logo.jpg
 * 
 * Prerequisites:
 * 1. Install sharp: npm install sharp
 * 2. Run this script: node generate-favicon.js
 * 
 * The script will create:
 * - favicon.ico (32x32)
 * - favicon-16x16.png
 * - favicon-32x32.png
 * - apple-touch-icon.png (180x180)
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateFavicons() {
  try {
    console.log('🎨 Generating favicon files from logo.jpg...');
    
    const logoPath = path.join(__dirname, 'public/images/logo.jpg');
    const publicPath = path.join(__dirname, 'public');
    
    // Check if logo exists
    if (!fs.existsSync(logoPath)) {
      console.error('❌ logo.jpg not found at:', logoPath);
      return;
    }
    
    // Generate different favicon sizes
    const sizes = [
      { name: 'favicon-16x16.png', size: 16 },
      { name: 'favicon-32x32.png', size: 32 },
      { name: 'apple-touch-icon.png', size: 180 }
    ];
    
    for (const { name, size } of sizes) {
      await sharp(logoPath)
        .resize(size, size, { 
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(path.join(publicPath, name));
      
      console.log(`✅ Generated ${name} (${size}x${size})`);
    }
    
    // Generate favicon.ico (using 32x32 as base)
    await sharp(logoPath)
      .resize(32, 32, { 
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(publicPath, 'favicon.ico'));
    
    console.log('✅ Generated favicon.ico (32x32)');
    
    console.log('\n🎉 All favicon files generated successfully!');
    console.log('\nFiles created:');
    console.log('- /public/favicon.ico');
    console.log('- /public/favicon-16x16.png');
    console.log('- /public/favicon-32x32.png');
    console.log('- /public/apple-touch-icon.png');
    
  } catch (error) {
    console.error('❌ Error generating favicons:', error.message);
    console.log('\n💡 Make sure to install sharp first:');
    console.log('npm install sharp');
  }
}

generateFavicons();
