

## Performance Optimization Plan

### Problem
The landing page loads slowly due to:
1. **Blocking auth call**: `supabase.auth.getUser()` makes a network request before rendering — use `getSession()` (cached, instant) instead
2. **503-byte extension-bridge.js** loads on every page via `<script defer>` — unnecessary on landing/public pages
3. **Duplicate auth checks**: Both `Landing.tsx` and `Navbar.tsx` independently call `getUser()` — that's 2 network roundtrips
4. **Google Fonts render-blocking workaround** uses `media="print"` trick but still fetches 4 font weights

### Changes

**1. Landing.tsx — Use cached session instead of network call**
Replace `supabase.auth.getUser()` with `supabase.auth.getSession()` for instant auth check. The `getUser()` call hits the Supabase server every time, adding 200-500ms delay.

**2. Navbar.tsx — Same fix, use getSession()**
Same change — replace `getUser()` with `getSession()` to avoid a second network roundtrip.

**3. DashboardGuard.tsx — Already uses getSession + getUser correctly**
No change needed here (it uses getSession first, then getUser for verification).

**4. index.html — Lazy-load extension-bridge.js only on dashboard**
Move `extension-bridge.js` from `index.html` to be dynamically loaded inside `DashboardGuard.tsx` only when the user is authenticated and on the dashboard. This saves ~500 lines of JS from parsing on landing page.

**5. index.html — Reduce font weights**
Only load weights 400, 600, 700 (drop 500 if not heavily used) to reduce font download size.

**6. vite.config.ts — Add React deduplication**
Add `resolve.dedupe` for `react`, `react-dom`, `react/jsx-runtime` to prevent duplicate React instances.

### Files to modify
- `src/pages/Landing.tsx` — getSession instead of getUser
- `src/components/landing/Navbar.tsx` — getSession instead of getUser  
- `index.html` — remove extension-bridge.js script, trim font weights
- `src/components/dashboard/DashboardGuard.tsx` — dynamically load extension-bridge.js
- `vite.config.ts` — add resolve.dedupe

