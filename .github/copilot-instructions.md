# AI Coding Agent Instructions - Trade Dashboard

## Architecture Overview

**Trade Dashboard** is a React + Vite quantitative trading journal with real-time data synchronization:

- **Frontend**: React 19 + Recharts (charting) + Lucide icons + Tailwind CSS (dark theme)
- **Backend**: Vercel Serverless Functions (`/api`) + MongoDB (trade data)
- **Data Flow**: MT5 Bot/EA → MongoDB → Vercel API → React Dashboard
- **Deployment**: Vercel (frontend + serverless API at `https://quant-dashboard-eta.vercel.app`)

## Critical Data Patterns

### Multi-Account Architecture
The dashboard supports multiple trading accounts auto-detected from data:
- Each trade must have `accountId` field (required in schema)
- Frontend auto-detects accounts from incoming trades ([src/App.jsx](src/App.jsx#L402-L420))
- Dropdown selector filters view by account or shows `ALL` trades
- **Deduplication logic** ([src/App.jsx](src/App.jsx#L386-L410)): Prioritizes data with `accountId` > old legacy data without it; prioritizes closed trades over `Open` status

### Trade Object Schema
Required fields matching both `report-trade.js` and `trades.js`:
```javascript
{ id, accountId, openDate, symbol, side, entry, exit, qty, pnl, status }
```
- `status`: 'Open' | 'Win' | 'Loss' (determines badge styling and trade lifecycle)
- `pnl`: float value (positive = profit, negative = loss)

## UI Component Patterns

### StatCard Component
Reusable metric display ([src/App.jsx](src/App.jsx#L87-L104)):
```jsx
<StatCard label="Net Profit" value={stats.netProfit} icon={TrendingUp} />
```
- Accepts: `label`, `value`, `prefix` (default '$'), `icon`, `subValue` (optional)
- Auto-formats numbers; icons from lucide-react

### Chart Views
- **AdvancedChart** ([src/App.jsx](src/App.jsx#L151-L247)): Equity curve (trade count) vs Daily P&L (togglable)
  - Builds cumulative equity from reversed trade array
  - Groups daily data by date key
- **AnalyticsCharts** ([src/App.jsx](src/App.jsx#L249-L290)): Symbol distribution & Buy/Sell ratio (donut charts)
- **WinRateGauge** ([src/App.jsx](src/App.jsx#L292-L338)): Semi-circular gauge with performance levels (Poor/Average/Good/Excellent)

## Statistics Calculation
All stats recalculated in `useEffect` when trades array changes ([src/App.jsx](src/App.jsx#L541-L566)):
- Win Rate: `(wins / total) * 100`
- Profit Factor: `grossProfit / grossLoss` (returns '∞' if no losses)
- Expectancy: `netProfit / totalTrades`
- Stores: netProfit, grossProfit, grossLoss, bestProfit, biggestLoss, avgTradeSize, avgDuration

## API Integration Points

### Data Fetching ([src/App.jsx](src/App.jsx#L491-L540))
- **Endpoint**: `https://quant-dashboard-eta.vercel.app/api/trades`
- **Interval**: Polls every 2 seconds via `setInterval`
- **Client-side filtering**: Filters by `selectedAccount` after deduplication
- **Dependency**: Re-fetches when `selectedAccount` changes

### POST Endpoint (`/api/report-trade.js`)
- Receives trade data from MT5 EA/Bot
- **Validation**: Requires `accountId` in payload
- **Schema sync**: Must match Trade model in both `report-trade.js` and `trades.js`

## Developer Workflows

### Build & Run
```bash
npm run dev      # Start Vite dev server (localhost:5173)
npm run build    # Production build to `dist/`
npm run lint     # ESLint check (eslint.config.js)
npm run preview  # Preview production build locally
```

### Database Connection
- Uses MongoDB via mongoose (serverless connection pooling)
- `MONGO_URI` environment variable required (set in Vercel secrets)
- Connection caching: `isConnected` flag prevents reconnects

### Styling Convention
- **Tailwind CSS** with custom dark theme (`bg-[#050505]`, `border-[#1C1C1C]`)
- **Monospace fonts** for numeric values: `font-mono`, `tabular-nums`
- **Text colors**: Gray scale (`text-gray-500` default), green (`text-green-500` profit), red (`text-red-400` loss)
- **Status badges**: Conditional styling per status type (Open = pulse animation, Win = green glow, Loss = red glow)

## Project-Specific Patterns

### Helper Functions
- `formatDuration(ms)`: Converts milliseconds to `Xh:Ym:Zs` format
- `formatCurrency(value)`: Uses `Intl.NumberFormat` for USD formatting
- `downloadCSV(data)`: Browser-native CSV export (creates link, appends to DOM, clicks, removes)

### Component Organization
1. **Config** (API_URL at top)
2. **Helper functions** (formatting, utilities)
3. **UI Components** (StatusBadge, StatCard)
4. **Chart Components** (AdvancedChart, AnalyticsCharts, WinRateGauge)
5. **Main App** (TradingDashboard, all state management)

### State Management
- Local React state only (no Redux/Context needed at current scale)
- Key states: `trades[]`, `filter`, `searchTerm`, `currentPage`, `sortConfig`, `selectedAccount`, `stats`
- Sorting is client-side via `useMemo` callback

## Common Tasks

**Add new stat metric:**
1. Add calculation in `stats` useEffect
2. Add StatCard in grid with matching label/icon
3. Update Trade schema if new data field needed

**Add new chart type:**
1. Create component with `useMemo` for data aggregation
2. Use ResponsiveContainer + Recharts components
3. Match existing tooltip/styling (dark bg, monospace)

**Filter or search enhancement:**
1. Modify `sortedAndFilteredTrades` useMemo logic
2. Update table column filters if needed
3. Test CSV export still works

## Known Quirks & Gotchas

- **Date parsing**: `openDate` is full timestamp string; daily grouping splits by space: `t.openDate.split(' ')[0]`
- **Data cleaning**: Trade deduplication happens **before** account filtering to ensure correct account detection
- **Average duration calculation**: Uses `qty * 1000 * 60 * 30` (assumes 30min trades?) — may need revision
- **Responsive grid**: Tables hide on mobile; use grid layouts for smaller screens
- **2-second polling**: Ensure backend handles rapid requests; consider throttling if performance degrades
