

# Bundle Optimization Plan

## Problem
The landing page loads ~861KB of JavaScript with a 3.9s First Contentful Paint. Several large libraries load eagerly even when not needed on the initial page.

## Changes

### 1. Lazy-load Login and Signup pages
Move `Login` and `Signup` from eager imports to `React.lazy()` in `App.tsx`. These pages are not needed on the landing page but currently load upfront.

**File:** `src/App.tsx`
- Change lines 12-13 from direct imports to lazy imports

### 2. Optimize lucide-react imports
The entire lucide-react library (156KB) is bundled. While tree-shaking should handle this in production, we can help by ensuring only specific icons are imported (e.g., `import { Loader2 } from "lucide-react"` is fine, but landing page components may import many unused icons).

**Files to audit:** `src/components/landing/Hero.tsx`, `Features.tsx`, `Pricing.tsx`, `Navbar.tsx`

### 3. Switch Google Fonts to preload strategy
Move the Google Fonts import from a blocking `@import` in CSS to a `<link rel="preload">` in `index.html` with `font-display: swap`.

**File:** `src/index.css` - Remove the `@import url(...)` line
**File:** `index.html` - Add preload link tag for Inter font

### 4. Add framer-motion to lazy chunk splitting
Add framer-motion as a separate chunk so it only loads when a page using animations is rendered.

**File:** `vite.config.ts` - Already has `vendor-motion` chunk (good), but ensure landing components don't eagerly import it if not needed above the fold.

### 5. Preload critical landing page chunks
Add `<link rel="modulepreload">` hints for the main landing page bundle in `index.html` to prioritize critical JS.

---

## Technical Details

### File Changes Summary

| File | Change |
|------|--------|
| `src/App.tsx` | Convert Login/Signup to `React.lazy()` |
| `src/index.css` | Remove `@import url('https://fonts.googleapis.com/...')` |
| `index.html` | Add `<link rel="preconnect">` + `<link rel="stylesheet">` for Google Fonts with `display=swap` |

### Expected Impact
- **~35KB less** on initial load (Login + Signup no longer eager)
- **Faster FCP** by unblocking font loading from CSS
- Production build already benefits from chunk splitting, but these changes improve the critical rendering path

### No Breaking Changes
All pages will still work identically -- Login and Signup will just load on-demand when the user navigates to them.

