# Run Society Trieste - Website

## Overview
This is a static website for Run Society Trieste, a running club in Trieste, Italy. The site provides information about the club, events, and contact details. Built with modern web technologies including Webpack and Tailwind CSS.

## Project Architecture
- **Frontend**: Static HTML/CSS/JS website with responsive design
- **Build System**: Webpack 5 with development and production configurations
- **Styling**: Tailwind CSS (CDN for development)
- **Languages**: HTML, CSS, JavaScript, Italian/English content

## Recent Changes (September 2025)
- Configured webpack dev server for Replit environment
- Set up proper host binding (0.0.0.0:5000) and allowedHosts configuration
- Configured deployment settings for production builds
- Added http-server for static file serving in production

## Development Setup
- Development server runs on port 5000 with hot reload
- Uses webpack-dev-server with live reload and hot module replacement
- Static assets served from root directory

## Deployment Configuration
- **Target**: Autoscale (static website)
- **Build**: `npm run build` (webpack production build)
- **Run**: `http-server dist -p 5000 -a 0.0.0.0`

## Key Features
- Responsive design for mobile and desktop
- Multi-language support (Italian/English)
- Mobile-friendly navigation menu
- Social media integration (WhatsApp, Instagram, Strava)
- Event calendar and contact information