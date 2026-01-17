import React, { useState, useEffect, useMemo } from 'react';
import { 
  HelpCircle, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Activity, 
  Clock, BarChart2, Search, ChevronLeft, ChevronRight, Download, PieChart as PieIcon,
  Users, Calendar, Layers, DollarSign, Trash2, Target, Zap, ShieldAlert, Grid
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine, Cell, PieChart, Pie
} from 'recharts';

// --- API CONFIG ---
const API_URL = 'https://quant-dashboard-eta.vercel.app/api/trades'; 
const API_BASE = 'https://quant-dashboard-eta.vercel.app';

// --- HELPER FUNCTIONS ---
const formatDuration = (ms) => {
  if (!ms || ms < 0) return "0h:00m:00s";
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)));
  return `${hours}h:${minutes}m:${seconds}s`;
};

const formatCurrency = (value, currency = 'USD') => {
    let locale = 'en-US';
    let curr = 'USD';
    if (currency === 'IDR') { locale = 'id-ID'; curr = 'IDR'; }
    else if (currency === 'EUR') { locale = 'de-DE'; curr = 'EUR'; }
    else if (currency === 'JPY') { locale = 'ja-JP'; curr = 'JPY'; }

    return new Intl.NumberFormat(locale, { 
        style: 'currency', 
        currency: curr, 
        minimumFractionDigits: 2 
    }).format(value);
};

const formatNumber = (value) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(value);

const downloadCSV = (data) => {
    const headers = ["Ticket", "Account", "Open Date", "Symbol", "Side", "Entry", "Exit", "Qty", "PnL", "Status"];
    const rows = data.map(t => [t.id, t.accountId || 'N/A', t.openDate, t.symbol, t.side, t.entry, t.exit, t.qty, t.pnl, t.status]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "quant_journal_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const playWinSound = () => {
    try {
        const audio = new Audio("https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3"); 
        audio.volume = 0.5;
        audio.play().catch(e => console.log("Audio play blocked:", e));
    } catch (e) { console.error("Audio Error:", e); }
};

const detectCurrency = (accountId) => {
    if (String(accountId).startsWith('ID')) return 'IDR';
    if (String(accountId).startsWith('EU')) return 'EUR';
    return 'USD';
};

// --- KOMPONEN UI ---

const CustomTooltip = ({ text }) => (
  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1A1A1A] border border-[#333] text-gray-300 text-[10px] rounded shadow-xl w-48 text-center z-50 pointer-events-none opacity-0 group-hover/icon:opacity-100 transition-opacity duration-200">
    {text}
    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#333]"></div>
  </div>
);

const StatusBadge = ({ status }) => {
  const label = status || '';
  const isWin = label === 'Win'; const isOpen = label === 'Open';
  if (isOpen) return (
      <div className="flex items-center justify-center gap-2 px-2 py-1 rounded text-[10px] font-bold border w-[80px] uppercase tracking-wider shadow-[0_0_12px_rgba(59,130,246,0.3)] border-blue-500/50 text-blue-400 bg-blue-500/10 animate-pulse">
         <div className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span></div>OPEN
      </div>
  );
  return (
    <div className={`flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-bold border w-[80px] uppercase tracking-wider shadow-sm ${isWin ? 'border-green-500/30 text-green-400 bg-green-500/5' : 'border-red-500/30 text-red-400 bg-red-500/5'}`}>
      {isWin ? <ArrowUpRight size={10} strokeWidth={3} /> : <ArrowDownRight size={10} strokeWidth={3} />} {status}
    </div>
  );
};

const StatCard = ({ label, value, currency, prefix = true, icon: Icon, subValue = null, tooltipText = '' }) => {
    const displayValue = prefix && currency ? formatCurrency(value, currency) : value;
    return (
      <div className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-2xl p-5 flex flex-col justify-between hover:border-gray-700 hover:bg-[#0f0f0f] transition-all duration-300 group h-[115px] relative overflow-visible">
        <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity group-hover:opacity-100 opacity-40 pointer-events-none"></div>
        <div className="flex items-center justify-between text-gray-500 text-[10px] font-bold tracking-wider uppercase z-10">
          <div className="flex items-center gap-2">{Icon && <Icon size={14} className="text-gray-600 group-hover:text-green-500 transition-colors" />}{label}</div>
          <div className="relative group/icon">
            <HelpCircle size={12} className="cursor-help hover:text-gray-300 transition-colors" />
            {tooltipText && <CustomTooltip text={tooltipText} />}
          </div>
        </div>
        <div className="z-10 mt-2">
            <div className={`text-[20px] md:text-[24px] font-bold tracking-tight leading-none tabular-nums font-mono ${String(value).includes('-') ? 'text-red-400' : 'text-gray-100'}`}>
                {displayValue}
            </div>
            {subValue && (<div className="text-[10px] text-gray-500 mt-1 font-mono border-t border-dashed border-gray-800 pt-1 inline-block">{subValue}</div>)}
        </div>
      </div>
    );
};

const OverviewCard = ({ title, value, subValue, isNegative, icon: Icon, isAlert = false }) => (
  <div className={`border rounded-xl p-4 relative overflow-hidden group transition-all duration-500 ${isAlert ? 'bg-red-900/10 border-red-500/50 animate-pulse' : 'bg-[#0A0A0A] border-[#1C1C1C] hover:border-gray-700'}`}>
    <div className="flex justify-between items-start mb-2">
      <span className={`text-[10px] uppercase font-bold tracking-wider ${isAlert ? 'text-red-400' : 'text-gray-500'}`}>{title}</span>
      {Icon && <Icon size={14} className={`${isAlert ? 'text-red-400' : 'text-gray-600'} group-hover:text-blue-500 transition-colors`} />}
    </div>
    <div className={`text-xl font-bold font-mono tracking-tight ${isNegative || isAlert ? 'text-red-400' : 'text-gray-100'}`}>
      {value}
    </div>
    {subValue && <div className={`text-[10px] mt-1 font-mono ${isAlert ? 'text-red-300 font-bold' : 'text-gray-500'}`}>{subValue}</div>}
  </div>
);

// --- NEW COMPONENT: CONSISTENCY HEATMAP (GITHUB STYLE) ---
const ConsistencyHeatmap = ({ trades, currency }) => {
    // 1. Prepare Data Map (YYYY-MM-DD -> PnL)
    const dataMap = useMemo(() => {
        const map = {};
        trades.forEach(t => {
            if (t.status === 'Open') return;
            const dateStr = t.openDate.split(' ')[0].replace(/\./g, '-'); // Format: 2024-01-20
            if (!map[dateStr]) map[dateStr] = 0;
            map[dateStr] += parseFloat(t.pnl);
        });
        return map;
    }, [trades]);

    // 2. Generate Grid (52 weeks x 7 days)
    const calendarGrid = useMemo(() => {
        const today = new Date();
        const days = [];
        // Generate last 364 days (approx 52 weeks)
        for (let i = 364; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const pnl = dataMap[dateStr] || 0;
            const hasTrade = dataMap.hasOwnProperty(dateStr);
            days.push({ date: dateStr, pnl, hasTrade });
        }
        return days;
    }, [dataMap]);

    // Helper: Determine Color based on PnL
    const getColor = (hasTrade, pnl) => {
        if (!hasTrade) return 'bg-[#161616] border-[#222]'; // Empty
        if (pnl > 0) {
            if (pnl > 100) return 'bg-green-500 border-green-400';
            if (pnl > 50) return 'bg-green-600 border-green-500';
            return 'bg-green-800 border-green-700';
        } else if (pnl < 0) {
            if (pnl < -100) return 'bg-red-500 border-red-400';
            if (pnl < -50) return 'bg-red-600 border-red-500';
            return 'bg-red-800 border-red-700';
        }
        return 'bg-gray-700 border-gray-600'; // Breakeven
    };

    return (
        <div className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-5 w-full overflow-hidden">
             <div className="flex justify-between items-end mb-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Grid size={14} className="text-blue-500"/> Consistency Map (Last 365 Days)
                </h3>
                <div className="flex gap-2 text-[9px] text-gray-500 font-bold uppercase items-center">
                    <span>Less</span>
                    <div className="w-2 h-2 rounded bg-red-900/50"></div>
                    <div className="w-2 h-2 rounded bg-[#161616]"></div>
                    <div className="w-2 h-2 rounded bg-green-900/50"></div>
                    <span>More</span>
                </div>
             </div>
             
             {/* Heatmap Container */}
             <div className="overflow-x-auto pb-2">
                <div className="grid grid-rows-7 grid-flow-col gap-[3px] min-w-max">
                    {calendarGrid.map((day, i) => (
                        <div key={i} className="group relative">
                            <div className={`w-3 h-3 rounded-[2px] border ${getColor(day.hasTrade, day.pnl)} transition-all hover:scale-125 hover:z-10`}></div>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                                <div className="bg-[#111] border border-[#333] text-gray-200 text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap font-mono">
                                    <div className="font-bold text-gray-400">{day.date}</div>
                                    <div className={day.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                                        {day.hasTrade ? formatCurrency(day.pnl, currency) : 'No Activity'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
        </div>
    );
};

const AdvancedChart = ({ data, currency }) => {
  const [view, setView] = useState('equity'); 
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-600 text-xs font-mono">WAITING FOR DATA STREAM...</div>;
  
  const closedTrades = data.filter(t => t.status !== 'Open');
  const reversedData = [...closedTrades].reverse();
  
  let currentBalance = 0;
  const equityData = reversedData.map((t, index) => { currentBalance += parseFloat(t.pnl); return { name: index + 1, balance: currentBalance, pnl: parseFloat(t.pnl), date: t.openDate }; });
  
  const dailyDataMap = {}; 
  reversedData.forEach(t => { const dateKey = t.openDate.split(' ')[0]; if (!dailyDataMap[dateKey]) dailyDataMap[dateKey] = 0; dailyDataMap[dateKey] += parseFloat(t.pnl); });
  const dailyData = Object.keys(dailyDataMap).map(date => ({ date, pnl: dailyDataMap[date] }));

  return (
    <div className="w-full h-full flex flex-col">
        <div className="flex justify-between items-center mb-4 px-2">
            <div className="flex items-center gap-2 bg-black/50 p-1 rounded-lg border border-[#222]">
                <button onClick={() => setView('equity')} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${view === 'equity' ? 'bg-[#222] text-green-400 shadow-sm border border-[#333]' : 'text-gray-500 hover:text-gray-300'}`}>Equity Curve</button>
                <button onClick={() => setView('daily')} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${view === 'daily' ? 'bg-[#222] text-blue-400 shadow-sm border border-[#333]' : 'text-gray-500 hover:text-gray-300'}`}>Daily P&L</button>
            </div>
            <div className="flex gap-4 text-[10px] text-gray-500 font-mono"><span>{view === 'equity' ? 'X: Trade Count' : 'X: Date'}</span><span>Y: {currency}</span></div>
        </div>
        <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              {view === 'equity' ? (
                  <AreaChart data={equityData}><defs><linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} /><XAxis dataKey="name" stroke="#4b5563" tick={{fontSize: 10, fontFamily: 'monospace'}} tickLine={false} axisLine={false} /><YAxis stroke="#4b5563" tick={{fontSize: 10, fontFamily: 'monospace'}} tickFormatter={(val) => val >= 1000 ? `${val/1000}k` : val} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ backgroundColor: '#050505', borderColor: '#333', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }} itemStyle={{ color: '#fff' }} formatter={(value) => [formatCurrency(value, currency), 'Equity']} labelFormatter={(label) => `Trade #${label}`} /><Area type="monotone" dataKey="balance" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" animationDuration={1000} /></AreaChart>
              ) : (
                  <BarChart data={dailyData}><CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} /><XAxis dataKey="date" stroke="#4b5563" tick={{fontSize: 10, fontFamily: 'monospace'}} tickLine={false} axisLine={false} /><YAxis stroke="#4b5563" tick={{fontSize: 10, fontFamily: 'monospace'}} tickFormatter={(val) => val >= 1000 ? `${val/1000}k` : val} tickLine={false} axisLine={false} /><Tooltip cursor={{fill: '#ffffff10'}} contentStyle={{ backgroundColor: '#050505', borderColor: '#333', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }} itemStyle={{ color: '#fff' }} formatter={(value) => [formatCurrency(value, currency), 'Profit/Loss']} /><ReferenceLine y={0} stroke="#374151" /><Bar dataKey="pnl" animationDuration={1000}>{dailyData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />))}</Bar></BarChart>
              )}
            </ResponsiveContainer>
        </div>
    </div>
  );
};

const AnalyticsCharts = ({ trades }) => {
    const symbolData = useMemo(() => { const counts = {}; trades.forEach(t => { counts[t.symbol] = (counts[t.symbol] || 0) + 1; }); return Object.keys(counts).map(key => ({ name: key, value: counts[key] })); }, [trades]);
    const sideData = useMemo(() => { const counts = { Buy: 0, Sell: 0 }; trades.forEach(t => { if(t.side === 'Buy' || t.side === 'Sell') counts[t.side]++; }); return Object.keys(counts).map(key => ({ name: key, value: counts[key] })); }, [trades]);
    const COLORS = ['#22c55e', '#3b82f6', '#eab308', '#a855f7'];

    return (
        <div className="w-full h-full flex flex-col gap-4">
             <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2"><PieIcon size={14} className="text-blue-500"/> Distribution</h3></div>
             <div className="flex-1 grid grid-cols-2 gap-2">
                 <div className="bg-[#050505] rounded-xl border border-[#222] p-2 relative flex flex-col items-center justify-center">
                    <div className="absolute top-2 left-2 text-[9px] text-gray-500 font-bold uppercase">Symbol Mix</div>
                    <ResponsiveContainer width="100%" height="80%"><PieChart><Pie data={symbolData} innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value">{symbolData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#050505" />))}</Pie><Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '10px' }} itemStyle={{color:'#fff'}} /></PieChart></ResponsiveContainer>
                 </div>
                 <div className="bg-[#050505] rounded-xl border border-[#222] p-2 relative flex flex-col items-center justify-center">
                    <div className="absolute top-2 left-2 text-[9px] text-gray-500 font-bold uppercase">Side Ratio</div>
                    <ResponsiveContainer width="100%" height="80%"><PieChart><Pie data={sideData} innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value"><Cell fill="#22c55e" stroke="#050505" /><Cell fill="#ef4444" stroke="#050505" /></Pie><Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '10px' }} itemStyle={{color:'#fff'}} /></PieChart></ResponsiveContainer>
                 </div>
             </div>
        </div>
    );
};

const WinRateGauge = ({ percentage }) => {
  const width = 320; const height = 180; const cx = width / 2; const cy = height - 25; const radius = 120; const strokeWidth = 28; const arcLength = Math.PI * radius; const strokeDashoffset = arcLength * (1 - percentage / 100);
  let levelLabel = "Loading"; let levelColor = "text-gray-500"; let borderColor = "border-gray-500/30"; let glowColor = "rgba(107, 114, 128, 0.3)";
  if (percentage < 40) { levelLabel = "Need Improv."; levelColor = "text-red-500"; borderColor = "border-red-500/30"; glowColor = "rgba(239, 68, 68, 0.3)"; } else if (percentage < 55) { levelLabel = "Sustainable"; levelColor = "text-yellow-500"; borderColor = "border-yellow-500/30"; glowColor = "rgba(234, 179, 8, 0.3)"; } else if (percentage < 70) { levelLabel = "Profitable"; levelColor = "text-blue-400"; borderColor = "border-blue-400/30"; glowColor = "rgba(96, 165, 250, 0.3)"; } else { levelLabel = "Alpha Gen."; levelColor = "text-purple-400"; borderColor = "border-purple-400/30"; glowColor = "rgba(192, 132, 252, 0.4)"; }
  const totalDots = 9; const dots = Array.from({ length: totalDots }).map((_, i) => { const angleDeg = 180 - (i * (180 / (totalDots - 1))); const angleRad = (angleDeg * Math.PI) / 180; const x = cx + radius * Math.cos(angleRad); const y = cy - radius * Math.sin(angleRad); const dotPercentage = (i / (totalDots - 1)) * 100; const isActive = percentage >= dotPercentage; return { x, y, isActive }; });
  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full py-4">
      <div className="relative mt-2" style={{ width: width, height: height }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible"><defs><linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#22c55e" /><stop offset="100%" stopColor="#15803d" /></linearGradient><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="rgba(0,0,0,0.5)" /></filter></defs><path d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`} stroke="#1f2937" strokeWidth={strokeWidth} fill="transparent" strokeLinecap="round" /><path d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`} stroke="url(#gaugeGradient)" strokeWidth={strokeWidth} fill="transparent" strokeLinecap="round" strokeDasharray={arcLength} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-out" filter="url(#shadow)" />{dots.map((dot, idx) => ( <circle key={idx} cx={dot.x} cy={dot.y} r={3.5} fill={dot.isActive ? "#ffffff" : "#374151"} className="transition-colors duration-1000" /> ))}</svg>
        <div className="absolute left-0 w-full flex flex-col items-center justify-center" style={{ top: cy - 40 }}>
             <div className={`mb-3 bg-[#0F0F0F] backdrop-blur-md ${levelColor} text-[11px] px-4 py-1 rounded-full border ${borderColor} uppercase tracking-widest font-bold`} style={{ boxShadow: `0 0 15px ${glowColor}` }}>{levelLabel}</div>
             <div className="flex items-center justify-center gap-4 bg-[#121212] px-6 py-2 rounded-full border border-gray-800 shadow-2xl z-10"><span className="text-3xl font-bold text-white leading-none tabular-nums -mb-[2px] font-mono">{percentage}%</span><div className="w-[1px] h-5 bg-gray-600/50"></div><span className="text-[10px] text-gray-500 font-bold tracking-[0.2em] uppercase leading-none mt-[2px]">WIN RATE</span></div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---

export default function TradingDashboard() {
  const [trades, setTrades] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('ALL');
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [currency, setCurrency] = useState('USD');
  
  const [filter, setFilter] = useState('All'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'openDate', direction: 'desc' });

  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isSystemOnline, setIsSystemOnline] = useState(true);
  const [latency, setLatency] = useState(0);

  const [stats, setStats] = useState({
    netProfit: 0, grossProfit: 0, grossLoss: 0, winRate: 0,
    profitFactor: 0, totalTrades: 0, bestProfit: 0, biggestLoss: 0,
    expectancy: 0, avgTradeSize: 0, avgDuration: "0h:00m:00s",
    sqn: 0, sharpeRatio: 0, recoveryFactor: 0
  });

  const [extraMetrics, setExtraMetrics] = useState({
    equity: 0, balance: 0, dailyDD: 0, maxDD: 0, tradingDays: 0, floatingPnL: 0
  });

  const [charts, setCharts] = useState({
    symbolPerf: []
  });

  // --- LOGIKA FETCH DATA ---
  const fetchTrades = async () => {
    const startTime = Date.now();
    try {
      const url = selectedAccount === 'ALL' ? API_URL : `${API_URL}?accountId=${selectedAccount}`;
      const response = await fetch(url);
      const data = await response.json();
      
      const endTime = Date.now();
      setLatency(endTime - startTime);

      const tradeMap = new Map();
      data.forEach(trade => {
          const id = trade.id;
          if (!tradeMap.has(id)) { tradeMap.set(id, trade); } else {
              const existing = tradeMap.get(id);
              const existingHasAccount = existing.accountId && existing.accountId !== 'undefined';
              const newHasAccount = trade.accountId && trade.accountId !== 'undefined';
              if (!existingHasAccount && newHasAccount) { tradeMap.set(id, trade); return; }
              if (existing.status === 'Open' && trade.status !== 'Open') { tradeMap.set(id, trade); }
          }
      });
      let cleanData = Array.from(tradeMap.values());
      
      if(cleanData.length > 0) {
          const incomingAccounts = cleanData.map(d => d.accountId).filter(acc => acc && acc !== 'undefined' && acc !== 'null');
          setAvailableAccounts(prev => Array.from(new Set([...prev, ...incomingAccounts])).sort());
      }
      if (selectedAccount !== 'ALL') {
          cleanData = cleanData.filter(t => String(t.accountId) === String(selectedAccount));
      }

      if (cleanData.length > trades.length && trades.length > 0) {
        const newTrade = cleanData.find(t => !trades.find(old => old.id === t.id));
        if (newTrade && newTrade.status === 'Win') {
            playWinSound();
        }
      }

      setTrades(cleanData);
      setLastUpdated(new Date());
      setIsSystemOnline(true);

    } catch (error) { 
        console.error(error); 
        setIsSystemOnline(false); 
    }
  };

  useEffect(() => {
    setCurrency(detectCurrency(selectedAccount));
    fetchTrades();
    const interval = setInterval(fetchTrades, 5000);
    return () => clearInterval(interval);
  }, [selectedAccount]); 

  useEffect(() => {
    if (trades.length === 0) {
        setStats({ netProfit: 0, grossProfit: 0, grossLoss: 0, winRate: 0, profitFactor: 0, totalTrades: 0, bestProfit: 0, biggestLoss: 0, expectancy: 0, avgTradeSize: 0, avgDuration: "0h:00m:00s", sqn: 0, sharpeRatio: 0, recoveryFactor: 0 });
        setExtraMetrics({ equity: 0, balance: 0, dailyDD: 0, maxDD: 0, tradingDays: 0, floatingPnL: 0 });
        setCharts({ symbolPerf: [] });
        return;
    }
    
    let net = 0, grossP = 0, grossL = 0, wins = 0; let best = 0, worst = 0;
    let totalQty = 0; let totalDurationMs = 0; let closedTradesCount = 0;
    let floating = 0, balance = 0;
    let currentEqCurve = 0, maxEq = 0, maxDD = 0;
    const uniqueDays = new Set();
    const symbolStats = {};

    const sortedForDD = [...trades].sort((a,b) => a.openDate.localeCompare(b.openDate));
    const closedPnLs = [];

    sortedForDD.forEach(t => {
      const pnl = parseFloat(t.pnl); const qty = parseFloat(t.qty || 0);
      
      if (t.status === 'Open') {
          floating += pnl;
      } else {
          balance += pnl;
          net += pnl;
          totalQty += qty;
          closedTradesCount++;
          totalDurationMs += (qty * 1000 * 60 * 30); 
          closedPnLs.push(pnl);
          
          if (pnl >= 0) { grossP += pnl; wins++; if (pnl > best) best = pnl; } 
          else { grossL += Math.abs(pnl); if (pnl < worst) worst = pnl; }

          uniqueDays.add(t.openDate.split(' ')[0]);

          currentEqCurve += pnl;
          if(currentEqCurve > maxEq) maxEq = currentEqCurve;
          const dd = maxEq - currentEqCurve;
          if(dd > maxDD) maxDD = dd;
      }

      if(!symbolStats[t.symbol]) symbolStats[t.symbol] = { vol:0, trades:0, wins:0, losses:0, pnl:0 };
      symbolStats[t.symbol].vol += qty;
      symbolStats[t.symbol].trades += 1;
      symbolStats[t.symbol].pnl += pnl;
      if(t.status !== 'Open') {
         if(pnl >= 0) symbolStats[t.symbol].wins++; else symbolStats[t.symbol].losses++;
      }
    });
    
    const total = trades.length;
    const wr = total > 0 ? Math.round((wins / (closedTradesCount || 1)) * 100) : 0;
    const pf = grossL > 0 ? (grossP / grossL).toFixed(2) : (grossP > 0 ? '∞' : '0.00');
    
    const meanPnL = closedPnLs.reduce((a, b) => a + b, 0) / (closedPnLs.length || 1);
    const variance = closedPnLs.reduce((a, b) => a + Math.pow(b - meanPnL, 2), 0) / (closedPnLs.length || 1);
    const stdDev = Math.sqrt(variance);
    const sqn = closedPnLs.length > 0 && stdDev !== 0 ? (Math.sqrt(closedPnLs.length) * (meanPnL / stdDev)).toFixed(2) : 0;
    const recoveryFactor = maxDD > 0 ? (net / maxDD).toFixed(2) : '∞';
    const sharpeRatio = stdDev !== 0 ? ((meanPnL / stdDev) * Math.sqrt(252)).toFixed(2) : 0;

    setStats({
      netProfit: net.toFixed(2), grossProfit: grossP.toFixed(2), grossLoss: grossL.toFixed(2), winRate: wr, profitFactor: pf, totalTrades: total,
      bestProfit: best.toFixed(2), biggestLoss: Math.abs(worst).toFixed(2), expectancy: closedTradesCount > 0 ? (net / closedTradesCount).toFixed(2) : 0,
      avgTradeSize: closedTradesCount > 0 ? (totalQty / closedTradesCount).toFixed(2) : 0, avgDuration: closedTradesCount > 0 ? formatDuration(totalDurationMs / closedTradesCount) : "0h:00m:00s",
      sqn, sharpeRatio, recoveryFactor
    });

    const dailyDD = floating < 0 ? Math.abs(floating) : 0;
    setExtraMetrics({
        equity: balance + floating, balance, dailyDD, maxDD, tradingDays: uniqueDays.size, floatingPnL: floating
    });

    setCharts({
        symbolPerf: Object.entries(symbolStats).map(([key, val]) => ({ symbol: key, ...val })).sort((a,b) => b.pnl - a.pnl)
    });

  }, [trades]);

  const liveTrades = useMemo(() => trades.filter(t => t.status === 'Open'), [trades]);
  const historyTrades = useMemo(() => {
    let data = trades.filter(t => t.status !== 'Open');
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(t => t.symbol.toLowerCase().includes(lower) || String(t.id).includes(lower) || t.side.toLowerCase().includes(lower));
    }
    if (sortConfig.key) {
      data.sort((a, b) => {
        let aVal = a[sortConfig.key]; let bVal = b[sortConfig.key];
        if (['entry', 'exit', 'qty', 'pnl'].includes(sortConfig.key)) { aVal = parseFloat(aVal); bVal = parseFloat(bVal); }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [trades, searchTerm, sortConfig]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentHistoryItems = historyTrades.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(historyTrades.length / itemsPerPage);
  const requestSort = (key) => { let direction = 'asc'; if (sortConfig.key === key && sortConfig.direction === 'asc') { direction = 'desc'; } setSortConfig({ key, direction }); };

  const handleDeleteAccount = async () => {
    if (selectedAccount === 'ALL') { alert("Pilih akun spesifik!"); return; }
    const isConfirmed = window.confirm(`⚠️ DELETE DATA: ${selectedAccount}?`);
    if (isConfirmed) {
        const userSecret = prompt("ADMIN SECRET:");
        if (!userSecret) return;
        try {
            const res = await fetch(`${API_BASE}/api/delete-account?secret=${userSecret}&targetAccount=${selectedAccount}`);
            if (res.ok) { alert(`✅ Deleted.`); setSelectedAccount('ALL'); window.location.reload(); } 
            else { alert(`❌ Failed.`); }
        } catch (error) { alert("❌ Connection Error."); }
    }
  };

  const isHighRisk = extraMetrics.balance > 0 && (extraMetrics.floatingPnL / extraMetrics.balance) < -0.05;

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 p-6 md:p-8 font-sans selection:bg-green-500/30">
      
      {/* HEADER */}
      <div className="max-w-[1600px] mx-auto mb-8 flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                <Activity className="text-green-500" size={32} /> QUANT DASHBOARD 
                <span className="text-[10px] bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">Live System</span>
            </h1>
            <p className="text-gray-500 text-xs mt-1 tracking-wide font-mono flex items-center gap-1">
                Connected via Node.js Bridge • Latency: 
                <span className={`font-bold ${latency > 500 ? 'text-red-500' : latency > 200 ? 'text-yellow-500' : 'text-green-500'}`}> {latency}ms</span>
            </p>
        </div>
        
        <div className="flex gap-2 items-center">
            <div className="flex items-center gap-2">
                <div className="relative group bg-[#111] rounded-lg border border-[#222] flex items-center px-3 py-2 gap-2">
                    <Users size={14} className="text-gray-500"/>
                    <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="bg-transparent text-xs font-bold text-gray-300 focus:outline-none appearance-none cursor-pointer min-w-[120px]">
                        <option value="ALL">ALL ACCOUNTS</option>
                        {availableAccounts.map(acc => ( <option key={acc} value={acc}>Account {acc} {trades.length > 0 && trades[0].accountId === acc ? ' (Active)' : ''}</option> ))}
                    </select>
                </div>
                {selectedAccount !== 'ALL' && ( <button onClick={handleDeleteAccount} className="p-2.5 rounded-lg bg-red-900/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 size={14} /></button> )}
            </div>
            <button onClick={() => downloadCSV(trades)} className="bg-[#111] hover:bg-[#222] px-4 py-2 rounded-lg border border-[#222] flex items-center gap-2 transition-all text-xs font-bold text-gray-400 hover:text-white"><Download size={14} /> EXPORT</button>
            <div className={`bg-[#111] px-4 py-1.5 rounded-lg border flex flex-col items-end min-w-[120px] transition-all duration-500 ${isSystemOnline ? 'border-[#222]' : 'border-red-900/50 bg-red-900/10'}`}>
                <div className="flex items-center gap-2"><div className="relative flex h-2 w-2">{isSystemOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}<span className={`relative inline-flex rounded-full h-2 w-2 ${isSystemOnline ? 'bg-green-500' : 'bg-red-500'}`}></span></div><span className={`text-[10px] uppercase font-bold tracking-wider ${isSystemOnline ? 'text-gray-300' : 'text-red-400'}`}>{isSystemOnline ? 'Online' : 'Offline'}</span></div>
                <span className="text-[8px] text-gray-600 font-mono mt-0.5">{lastUpdated.toLocaleTimeString()}</span>
            </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* --- FINANCIAL OVERVIEW --- */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <OverviewCard title="Total Equity (NAV)" value={formatCurrency(extraMetrics.equity, currency)} isNegative={false} icon={DollarSign} subValue={`${extraMetrics.floatingPnL >= 0 ? '+' : ''}${formatCurrency(extraMetrics.floatingPnL, currency)} Floating`} isAlert={isHighRisk} />
          <OverviewCard title="Balance" value={formatCurrency(extraMetrics.balance, currency)} icon={Layers} />
          <OverviewCard title="Net Realized PnL" value={formatCurrency(stats.netProfit, currency)} isNegative={stats.netProfit < 0} icon={TrendingUp} />
          <OverviewCard title="Daily Drawdown" value={`-${formatCurrency(extraMetrics.dailyDD, currency)}`} isNegative={true} icon={TrendingDown} />
          <OverviewCard title="Max Drawdown" value={`-${formatCurrency(extraMetrics.maxDD, currency)}`} isNegative={true} icon={Activity} />
          <OverviewCard title="Trading Days" value={extraMetrics.tradingDays} icon={Calendar} />
        </div>

        {/* --- STATS GRID & GAUGE --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
             <StatCard label="SQN Score" value={stats.sqn} currency={currency} prefix={false} icon={Target} tooltipText="System Quality Number. > 2.0 is Good, > 3.0 is Excellent." subValue={stats.sqn > 3 ? "HOLY GRAIL" : stats.sqn > 2 ? "EXCELLENT" : "AVERAGE"} />
             <StatCard label="Profit Factor" value={stats.profitFactor} currency={currency} prefix={false} tooltipText="Gross Profit / Gross Loss" />
             <StatCard label="Sharpe Ratio" value={stats.sharpeRatio} currency={currency} prefix={false} icon={Zap} tooltipText="Risk-Adjusted Return (Annualized)" />
             <StatCard label="Recovery Factor" value={stats.recoveryFactor} currency={currency} prefix={false} icon={ShieldAlert} tooltipText="Net Profit / Max Drawdown" />
             
             <StatCard label="Exp. Value / Trade" value={stats.expectancy} currency={currency} tooltipText="Average return per trade" />
             <StatCard label="Avg. Trade Size" value={stats.avgTradeSize} currency={currency} prefix={false} icon={BarChart2} subValue="Lots / Trade" />
             <StatCard label="Avg. Holding Time" value={stats.avgDuration} currency={currency} prefix={false} icon={Clock} />
             <StatCard label="Max Trade Loss" value={stats.biggestLoss} currency={currency} />
          </div>
          <div className="lg:col-span-4 bg-[#0A0A0A] border border-[#1C1C1C] rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black,transparent)]"></div>
              <div className="absolute top-4 left-4 text-gray-500 text-[10px] font-bold tracking-wider uppercase z-10">Performance Efficiency</div>
              <WinRateGauge percentage={stats.winRate} />
          </div>
        </div>

        {/* --- CHARTS SECTION (MAIN) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-[#0A0A0A] border border-[#1C1C1C] rounded-2xl p-6 h-[300px]">
              <AdvancedChart data={trades} currency={currency} />
          </div>
          <div className="lg:col-span-4 bg-[#0A0A0A] border border-[#1C1C1C] rounded-2xl p-6 h-[300px]">
              <AnalyticsCharts trades={trades} />
          </div>
        </div>

        {/* --- CONSISTENCY MAP (REPLACEMENT FOR WEEKDAY/HOURLY) --- */}
        <ConsistencyHeatmap trades={trades} currency={currency} />

        {/* --- SYMBOL PERFORMANCE --- */}
        <div className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#1C1C1C]"><h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><BarChart2 size={14}/> Symbol Performance</h3></div>
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#111] sticky top-0 z-10">
                <tr className="text-gray-500 text-[10px] uppercase tracking-wider">
                  <th className="p-3">Symbol</th><th className="p-3 text-right">Volume</th><th className="p-3 text-right">Avg Size</th><th className="p-3 text-center">Trades</th><th className="p-3 text-center text-green-500">Wins</th><th className="p-3 text-center text-red-500">Losses</th><th className="p-3 text-right">Net P&L</th>
                </tr>
              </thead>
              <tbody className="text-xs font-mono divide-y divide-[#1C1C1C]">
                {charts.symbolPerf.map((sym, idx) => (
                  <tr key={idx} className="hover:bg-[#111] transition-colors">
                    <td className="p-3 font-bold text-white">{sym.symbol}</td>
                    <td className="p-3 text-right text-gray-400">{formatNumber(sym.vol)}</td>
                    <td className="p-3 text-right text-gray-400">{formatNumber(sym.vol / (sym.trades || 1))}</td>
                    <td className="p-3 text-center text-white">{sym.trades}</td>
                    <td className="p-3 text-center text-green-400">{sym.wins}</td>
                    <td className="p-3 text-center text-red-400">{sym.losses}</td>
                    <td className={`p-3 text-right font-bold ${sym.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(sym.pnl, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- LIVE POSITIONS SECTION --- */}
        {liveTrades.length > 0 && (
          <div className="bg-[#0A0A0A] border border-blue-900/30 rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4">
             <div className="flex items-center gap-3 mb-4">
                <div className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span></div>
                <h2 className="text-lg font-bold text-white tracking-tight">Active Live Positions</h2>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="border-b border-[#1C1C1C] text-gray-500 text-[9px] uppercase tracking-widest"><th className="py-2 px-3">Symbol</th><th className="py-2 px-3">Type</th><th className="py-2 px-3">Entry</th><th className="py-2 px-3">Price</th><th className="py-2 px-3">Lots</th><th className="py-2 px-3">Floating PnL</th><th className="py-2 px-3">Time</th></tr></thead>
                  <tbody className="text-sm font-mono">
                    {liveTrades.map((trade, idx) => (
                      <tr key={idx} className="border-b border-[#1C1C1C]/40 bg-blue-500/5 hover:bg-blue-500/10 transition-colors">
                         <td className="py-3 px-3 font-bold text-white">{trade.symbol}</td>
                         <td className="py-3 px-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${trade.side === 'Buy' ? 'text-green-400 bg-green-900/30' : 'text-red-400 bg-red-900/30'}`}>{trade.side}</span></td>
                         <td className="py-3 px-3 text-gray-300">{parseFloat(trade.entry).toFixed(2)}</td>
                         <td className="py-3 px-3 text-gray-300">{parseFloat(trade.exit).toFixed(2) || 'N/A'}</td>
                         <td className="py-3 px-3 text-gray-300">{parseFloat(trade.qty).toFixed(2)}</td>
                         <td className={`py-3 px-3 font-bold ${parseFloat(trade.pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(trade.pnl, currency)}</td>
                         <td className="py-3 px-3 text-gray-500 text-xs">{trade.openDate.split(' ')[1]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {/* --- TRADE HISTORY (CLOSED ONLY) --- */}
        <div className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex items-center gap-4"><h2 className="text-lg font-bold text-white tracking-tight">Trade History</h2><span className="text-[10px] text-gray-500 bg-[#111] px-2 py-1 rounded border border-[#222]">Closed Trades: {historyTrades.length}</span></div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
               <div className="relative group"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-gray-400 transition-colors" size={14} /><input type="text" placeholder="Search History..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-[#111] border border-[#222] text-xs text-white pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:border-green-500/50 w-full md:w-48 transition-all" /></div>
            </div>
          </div>

          <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead><tr className="border-b border-[#1C1C1C]">{[{ key: 'id', label: 'Ticket' }, { key: 'accountId', label: 'Account' }, { key: 'openDate', label: 'Close Time' }, { key: 'symbol', label: 'Symbol' }, { key: 'side', label: 'Type' }, { key: 'entry', label: 'Entry' }, { key: 'exit', label: 'Exit' }, { key: 'qty', label: 'Size' }, { key: 'pnl', label: 'Realized PnL' }, { key: 'status', label: 'Result' }].map((col) => (<th key={col.key} onClick={() => requestSort(col.key)} className="py-4 px-3 text-[9px] uppercase tracking-widest font-bold text-gray-500 cursor-pointer hover:text-white transition-colors select-none group"><div className="flex items-center gap-1">{col.label} {sortConfig.key === col.key && (<span className="text-green-500">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>)}</div></th>))}</tr></thead>
                <tbody className="text-sm">
                  {currentHistoryItems.length > 0 ? currentHistoryItems.map((trade, idx) => (
                    <tr key={idx} className="border-b border-[#1C1C1C]/40 hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 px-3 text-gray-500 text-[10px] tabular-nums font-mono border-l-2 border-transparent group-hover:border-green-500 transition-all">{trade.id}</td><td className="py-4 px-3 text-blue-400 text-[10px] tabular-nums font-mono opacity-70">{trade.accountId || '-'}</td><td className="py-4 px-3 text-gray-500 text-[10px] tabular-nums font-mono">{trade.openDate}</td><td className="py-4 px-3 font-bold text-white text-[11px] tracking-wide">{trade.symbol}</td><td className="py-4 px-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-opacity-10 ${trade.side === 'Buy' ? 'text-green-500 bg-green-500' : 'text-red-500 bg-red-500'}`}>{trade.side}</span></td><td className="py-4 px-3 text-gray-300 text-[11px] font-mono tabular-nums">{parseFloat(trade.entry).toFixed(2)}</td><td className="py-4 px-3 text-gray-300 text-[11px] font-mono tabular-nums">{parseFloat(trade.exit).toFixed(2)}</td><td className="py-4 px-3 text-gray-300 text-[11px] font-mono tabular-nums">{parseFloat(trade.qty).toFixed(2)}</td><td className={`py-4 px-3 font-bold text-[11px] font-mono tabular-nums ${parseFloat(trade.pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{parseFloat(trade.pnl) >= 0 ? `+${formatCurrency(trade.pnl, currency)}` : formatCurrency(trade.pnl, currency)}</td><td className="py-4 px-3"><StatusBadge status={trade.status} /></td>
                    </tr>
                  )) : (<tr><td colSpan="10" className="py-10 text-center text-gray-600 text-xs uppercase tracking-widest">No history found</td></tr>)}
                </tbody>
              </table>
          </div>

          <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#1C1C1C]">
              <span className="text-[10px] text-gray-500 font-mono">Page {currentPage} of {totalPages}</span>
              <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 rounded bg-[#111] border border-[#222] text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={14} /></button>
                  <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded bg-[#111] border border-[#222] text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={14} /></button>
              </div>
          </div>
        </div>

      </div>
    </div>
  );
}