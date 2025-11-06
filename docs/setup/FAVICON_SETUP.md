# RukaPay Merchant Dashboard - Favicon Setup

## Overview
This guide explains how to set up the RukaPay favicon for the merchant dashboard.

## Files Updated
- `app/layout.tsx` - Added favicon metadata and Head component
- `generate-favicon.js` - Script to generate favicon files from logo.jpg

## Favicon Files Required
The following favicon files should be created in the `/public` directory:

1. **favicon.ico** - Main favicon (32x32)
2. **favicon-16x16.png** - Small favicon (16x16)
3. **favicon-32x32.png** - Medium favicon (32x32)
4. **apple-touch-icon.png** - Apple touch icon (180x180)

## How to Generate Favicons

### Option 1: Using the Script (Recommended)
1. Install sharp: `npm install sharp`
2. Run the script: `node generate-favicon.js`
3. The script will automatically generate all required favicon files from `/public/images/logo.jpg`

### Option 2: Manual Generation
1. Use an online favicon generator (e.g., favicon.io, realfavicongenerator.net)
2. Upload your `logo.jpg` file
3. Download the generated favicon files
4. Place them in the `/public` directory

## Favicon Specifications
- **favicon.ico**: 32x32 pixels, ICO format
- **favicon-16x16.png**: 16x16 pixels, PNG format
- **favicon-32x32.png**: 32x32 pixels, PNG format
- **apple-touch-icon.png**: 180x180 pixels, PNG format

## Browser Support
The favicon setup supports:
- ✅ Chrome, Firefox, Safari, Edge
- ✅ iOS Safari (Apple touch icon)
- ✅ Android Chrome
- ✅ Desktop browsers
- ✅ Mobile browsers

## Testing
After generating the favicon files:
1. Clear your browser cache
2. Refresh the merchant dashboard
3. Check the browser tab for the RukaPay logo
4. Test on mobile devices for Apple touch icon

## Troubleshooting
- **Favicon not showing**: Clear browser cache and hard refresh (Ctrl+F5)
- **Script error**: Make sure sharp is installed (`npm install sharp`)
- **Missing logo**: Ensure `/public/images/logo.jpg` exists

## Theme Color
The favicon setup also includes the RukaPay theme color (#08163d) for better mobile browser integration.
