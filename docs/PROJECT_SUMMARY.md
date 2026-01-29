# PPTGen Project Summary

## Overview
A React web application for creating presentations with an AI agent interface, featuring a dark theme with dotted matrix backgrounds and smooth animations.

## Tech Stack
- React (standard web, not React Native)
- Vite for build tooling
- Lucide React for icons
- localStorage for data persistence

## Project Structure

### Authentication
- Login/Signup page with credentials stored in .env (abc/123)
- Session persistence using localStorage
- Dark themed login card with dotted background

### Dashboard
- 4-column grid layout for project tiles
- "New" tile with dashed border and + icon
- Project tiles showing name and creation date
- All projects saved to localStorage
- Click to rename projects
- Dark theme with card-based design
- Dotted matrix background pattern

### Project Editor Interface

**Layout:**
- 30/70 split view (agent left, preview right)
- Both sides are rounded cards that extend to bottom of screen
- Black background throughout
- No headers/top bars visible

**Left Panel - Agent Chat:**
- Dotted background pattern rotated -10 degrees
- Gradient overlay on bottom 40% (ocean-meets-land effect)
- Video display in top 40% of panel with three states:
  - hello.mp4 on first load
  - idle.mp4 when waiting
  - Talk.mp4 when processing
- Smooth video transitions (0.5s fade)
- Message bubbles with fade effect based on position:
  - Top 30%: 0-5% opacity (almost invisible)
  - Middle 30-50%: 5-20% opacity
  - Top 40% of gradient: 50-100% opacity
  - Bottom 60% of gradient: 100-90% opacity (fully visible)
- User messages: darker bubble (#1a1a1a)
- Agent messages: lighter bubble (#2a2a2a)
- Hidden scrollbar with auto overflow
- Input box at bottom with dark styling

**Right Panel - Preview:**
- Dotted background pattern (straight, not rotated)
- 1080p preview area (16:9 aspect ratio)
- Centered preview screen with border

**Animations:**
- Idle state: Dots slowly pulse in opacity (4-5s cycle)
- Processing state: Dots rotate and zoom (3s cycle)
- Triggers when agent generates response

## Design System

**Colors:**
- Primary background: #000
- Card backgrounds: #1a1a1a, #2a2a2a
- Borders: #3a3a3a
- Text: #e0e0e0
- Secondary text: #888, #666
- Dots: #333, #444, #222

**Typography:**
- System fonts (SF Pro, Segoe UI, etc.)
- Light text on dark backgrounds
- Consistent spacing and sizing

**Effects:**
- Dotted matrix backgrounds (20-25px spacing)
- Rounded cards (12px border radius)
- Smooth transitions (0.3-0.5s)
- Gradient overlays for depth
- Opacity-based message fading

## Key Features

1. **Project Management:**
   - Create, rename, and save projects
   - Persistent storage across sessions
   - Visual tile-based organization

2. **Agent Interaction:**
   - Chat-based interface
   - Video feedback for different states
   - Animated processing indicators
   - Message visibility optimized for readability

3. **Dark Theme:**
   - Consistent black aesthetic
   - Card-based UI elements
   - Subtle animations and transitions
   - Dotted patterns for visual interest

4. **Responsive Elements:**
   - Hover effects on interactive elements
   - Smooth state transitions
   - Optimized scrolling behavior

## File Organization
- Videos stored in: /public/videos/
- Environment variables in: .env (with VITE_ prefix)
- Utility functions in: /src/utils/
- Pages in: /src/pages/
- Styles co-located with components
