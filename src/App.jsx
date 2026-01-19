import React, { useState, useEffect, useMemo } from 'react';
import { 
  HelpCircle, TrendingUp, TrendingDown, Activity, 
  Clock, BarChart2, Search, ChevronLeft, ChevronRight, Download, PieChart as PieIcon,
  Users, Calendar, Layers, DollarSign, Trash2, Zap, Radio, AlertTriangle, Hash
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine, Cell, PieChart, Pie
} from 'recharts';
import CountUp from 'react-countup'; 

// --- API CONFIG ---
const API_URL = 'https://quant-dashboard-eta.vercel.app/api/trades'; 
const API_BASE = 'https://quant-dashboard-eta.vercel.app'; 

// --- HELPER COMPONENTS & FUNCTIONS ---

const PercentageBadge = ({ value, baseValue, inverse = false }) => {
    if (!baseValue || baseValue === 0) return null;
    const percent = ((value / baseValue) * 100);
    
    const isPositive = percent >= 0;
    
    // Khusus DD: Kita ingin warnanya Merah jika ada DD (negatif), Hijau jika 0
    const colorClass = value < 0 ? 'text-[#ff1744] bg-[#ff1744]/10 border-[#ff1744]/20' : 'text-[#00e676] bg-[#00e676]/10 border-[#00e676]/20';
    const icon = value >= 0 ? '▲' : '▼';

    return (
        <div className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-tighter flex items-center gap-1 border ${colorClass} shadow-sm backdrop-blur-sm transition-all duration-500`}>
            <span>{icon}</span>
            <span>{Math.abs(percent).toFixed(2)}%</span>
        </div>
    );
};

const formatCurrency = (value, currencyCode = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, minimumFractionDigits: 2 }).format(value);
  } catch (e) {
    return `${currencyCode} ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(value)}`;
  }
};

const formatNumber = (value) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(value);

const formatPrice = (value) => {
    if (value === undefined || value === null || value === '') return "0.00";
    const num = parseFloat(value);
    if (isNaN(num)) return "0.00";
    if (num === 0) return "-"; // Untuk Depo/WD
    return num > 500 
        ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) 
        : new Intl.NumberFormat('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 }).format(num);
};

const downloadCSV = (data) => {
    const headers = ["Ticket", "Account", "Currency", "Open Date", "Symbol", "Side", "Entry", "Exit", "Qty", "PnL", "Swap", "Fee", "Status"];
    const rows = data.map(t => [t.id, t.accountId || 'N/A', t.currency || 'USD', t.openDate, t.symbol, t.side, t.entry, t.exit, t.qty, t.pnl, t.swap || 0, t.fee || 0, t.status]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "quant_journal_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const MarketTicker = ({ marketWatch }) => {
  const tickerItems = useMemo(() => {
      if (!marketWatch || marketWatch.length === 0) return [];
      const multiplier = marketWatch.length < 5 ? 20 : 5;
      return Array(multiplier).fill(marketWatch).flat(); 
  }, [marketWatch]);

  if (tickerItems.length === 0) return (
      <div className="w-full bg-[#050505] border-b border-white/5 py-2.5 text-center text-[10px] text-gray-600 font-mono animate-pulse">
          INITIALIZING MARKET STREAM...
      </div>
  );

  return (
    <div className="w-full bg-[#050505] border-b border-white/5 overflow-hidden py-2.5 relative z-40 shadow-lg">
       <div className="animate-ticker flex items-center">
          {tickerItems.map((item, idx) => (
             <div key={`${item.symbol}-${idx}`} className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider whitespace-nowrap px-6">
                <span className="font-bold text-white text-xs">{item.symbol}</span>
                <span className={`flex items-center font-bold ${item.change >= 0 ? 'text-[#00e676]' : 'text-[#ff1744]'}`}>
                   {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change).toFixed(2)}%
                </span>
                <span className="text-gray-800 opacity-30">/</span>
             </div>
          ))}
       </div>
       <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-[#030508] to-transparent pointer-events-none"></div>
       <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-[#030508] to-transparent pointer-events-none"></div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const normalizedStatus = status ? status.toLowerCase() : '';
  const isWin = normalizedStatus === 'win';
  const isOpen = normalizedStatus === 'open';
  const isDepo = normalizedStatus === 'depo';
  const isWD = normalizedStatus === 'wd';
  
  if (isOpen) return (
      <div className="relative flex items-center justify-center px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
         <div className="absolute inset-0 rounded-full animate-pulse bg-blue-500/5"></div>
         <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-2 animate-ping"></span>
         <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider font-mono">OPEN</span>
      </div>
  );

  if (isDepo) return <div className="px-3 py-1 rounded-full bg-[#00e676]/10 border border-[#00e676]/30 text-[#00e676] text-[10px] font-bold uppercase tracking-wider font-mono shadow-[0_0_10px_rgba(0,230,118,0.2)]">DEPOSIT</div>;
  if (isWD) return <div className="px-3 py-1 rounded-full bg-[#ff1744]/10 border border-[#ff1744]/30 text-[#ff1744] text-[10px] font-bold uppercase tracking-wider font-mono shadow-[0_0_10px_rgba(255,23,68,0.2)]">WITHDRAW</div>;
  
  return (
    <div className={`
      flex items-center justify-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all duration-300 font-mono
      ${isWin 
        ? 'bg-[#00e676]/5 border-[#00e676]/20 text-[#00e676] shadow-[0_0_10px_rgba(0,230,118,0.1)]' 
        : 'bg-[#ff1744]/5 border-[#ff1744]/20 text-[#ff1744] shadow-[0_0_10px_rgba(255,23,68,0.1)]'}
    `}>
      {status}
    </div>
  );
};

const StatCard = ({ label, value, prefix = null, icon: Icon, subValue = null, className = "" }) => (
  <div className={`group relative bg-[#090c10]/60 backdrop-blur-md border border-white/5 rounded-2xl p-5 overflow-hidden hover:border-white/10 transition-all duration-300 ${className}`}>
    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
    <div className="relative z-10 flex flex-col justify-between h-full min-h-[90px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 font-mono truncate">
            {Icon && <Icon size={14} className="text-gray-600 group-hover:text-blue-400 transition-colors" />}
            {label}
          </span>
          <div className="w-1 h-1 rounded-full bg-gray-700 group-hover:bg-blue-400 transition-colors"></div>
        </div>
        <div className="flex flex-col">
            <div className="text-2xl lg:text-3xl font-bold text-gray-100 tracking-tight font-mono tabular-nums truncate">
                <span className="text-gray-500 text-lg mr-1">{prefix}</span>
                {typeof value === 'number' ? <CountUp end={value} separator="," decimals={value % 1 !== 0 ? 2 : 0} duration={1} /> : value}
            </div>
            {subValue && (<div className="text-[10px] text-gray-600 mt-1 font-mono flex items-center gap-1 border-t border-dashed border-white/5 pt-2 truncate">{subValue}</div>)}
        </div>
    </div>
  </div>
);

const OverviewCard = ({ title, value, subValue, isNegative, icon: Icon, isAlert = false, badge = null, prefix = '' }) => (
  <div className={`
    relative overflow-hidden rounded-xl p-4 border transition-all duration-300 group
    ${isAlert 
      ? 'bg-red-900/10 border-red-500/30' 
      : 'bg-gradient-to-br from-[#090c10] to-[#050505] border-white/5 hover:border-white/10'}
  `}>
    <div className="flex justify-between items-start mb-3">
      <span className={`text-[10px] uppercase font-bold tracking-widest font-mono ${isAlert ? 'text-red-400' : 'text-gray-500'}`}>{title}</span>
      <div className={`p-1.5 rounded-lg ${isAlert ? 'bg-red-500/10' : 'bg-white/5'}`}>
        {Icon && <Icon size={14} className={`${isAlert ? 'text-red-400' : 'text-gray-400'}`} />}
      </div>
    </div>
    <div className={`text-lg md:text-xl font-bold font-mono tracking-tight flex items-center flex-wrap gap-1 ${isNegative || isAlert ? 'text-[#ff1744] drop-shadow-[0_0_8px_rgba(255,23,68,0.3)]' : 'text-gray-100'}`}>
        <span>{prefix}</span>
        <CountUp end={value} separator="," decimals={2} duration={1.5} preserveValue={true} />
        {badge}
    </div>
    {subValue && <div className={`text-[10px] mt-1 font-mono ${isAlert ? 'text-red-300' : 'text-gray-600'}`}>{subValue}</div>}
  </div>
);

const SimpleBarChart = ({ data, xKey, yKey, color, currency }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{top:5, right:5, left:-20, bottom:0}}>
      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
      <XAxis dataKey={xKey} stroke="#525252" tick={{fontSize: 9, fontFamily: 'monospace'}} tickLine={false} axisLine={false} />
      <YAxis stroke="#525252" tick={{fontSize: 9, fontFamily: 'monospace'}} tickLine={false} axisLine={false} />
      <Tooltip cursor={{fill: '#ffffff05'}} contentStyle={{ backgroundColor: '#090c10', borderColor: '#333', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }} formatter={(val) => [formatCurrency(val, currency), 'PnL']} />
      <Bar dataKey={yKey} fill={color} radius={[2, 2, 0, 0]}>
         {data.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry[yKey] >= 0 ? color : '#ff1744'} />))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

// --- UPDATE: AdvancedChart dengan Marker Depo/WD ---
// --- FIX: AdvancedChart dengan Urutan Hook yang Benar ---
const AdvancedChart = ({ data, currency, initialBalance }) => {
  const [view, setView] = useState('equity'); 
  
  // Hook useMemo HARUS dipanggil di paling atas, sebelum kondisi "if (!data)"
  const sortedData = useMemo(() => {
      if (!data || data.length === 0) return [];
      return [...data].sort((a,b) => new Date(a.openDate) - new Date(b.openDate));
  }, [data]);

  const chartData = useMemo(() => {
      if (sortedData.length === 0) return [];
      let currentBal = initialBalance;
      
      return sortedData.map((t, index) => {
          const val = parseFloat(t.pnl || 0) + parseFloat(t.swap || 0) + parseFloat(t.fee || 0);
          const isBalanceOp = t.status === 'Depo' || t.status === 'WD';
          currentBal += val;

          return { 
              name: index + 1, 
              balance: currentBal, 
              pnl: isBalanceOp ? 0 : val,
              date: t.openDate,
              eventType: isBalanceOp ? t.status : null,
              eventVal: val
          };
      });
  }, [sortedData, initialBalance]);

  const dailyData = useMemo(() => {
      if (sortedData.length === 0) return [];
      const map = {};
      sortedData.forEach(t => {
          if(t.status === 'Depo' || t.status === 'WD') return;
          const dateKey = t.openDate.split(' ')[0]; 
          if (!map[dateKey]) map[dateKey] = 0; 
          map[dateKey] += (parseFloat(t.pnl || 0) + parseFloat(t.swap || 0) + parseFloat(t.fee || 0)); 
      });
      return Object.keys(map).map(date => ({ date, pnl: map[date] }));
  }, [sortedData]);

  // SETELAH semua Hook dipanggil, baru boleh melakukan conditional return
  if (!data || data.length === 0) {
      return (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-700">
              <Activity className="animate-pulse" size={40}/>
              <span className="text-xs font-mono uppercase tracking-widest">Waiting for Data Stream...</span>
          </div>
      );
  }

  return (
    <div className="w-full h-full flex flex-col min-h-[300px]"> 
        <div className="flex justify-between items-center mb-6 px-1">
            <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 backdrop-blur-md">
                <button onClick={() => setView('equity')} className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${view === 'equity' ? 'bg-white/10 text-[#00e676] shadow-lg border border-white/10' : 'text-gray-500 hover:text-gray-300'}`}>Equity</button>
                <button onClick={() => setView('daily')} className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${view === 'daily' ? 'bg-white/10 text-blue-400 shadow-lg border border-white/10' : 'text-gray-500 hover:text-gray-300'}`}>Daily PnL</button>
            </div>
            <div className="flex gap-4 text-[9px] text-gray-600 font-mono uppercase tracking-widest">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#00e676]"></div> Growth</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Vol</span>
            </div>
        </div>
        <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
              {view === 'equity' ? (
                  <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00e676" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#00e676" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis domain={['auto', 'auto']} stroke="#525252" tick={{fontSize:10, fontFamily:'monospace'}} />
                    <Tooltip 
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-[#090c10] border border-white/10 p-3 rounded-lg shadow-xl font-mono text-xs">
                                        <div className="text-gray-400 mb-1">{d.date}</div>
                                        <div className="text-white font-bold text-sm mb-1">{formatCurrency(d.balance, currency)}</div>
                                        {d.eventType && (
                                            <div className={`font-bold mt-1 ${d.eventType === 'Depo' ? 'text-[#00e676]' : 'text-[#ff1744]'}`}>
                                                {d.eventType.toUpperCase()}: {formatCurrency(d.eventVal, currency)}
                                            </div>
                                        )}
                                        {!d.eventType && (
                                            <div className={`${d.pnl >= 0 ? 'text-[#00e676]' : 'text-[#ff1744]'}`}>
                                                PnL: {formatCurrency(d.pnl, currency)}
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Area type="monotone" dataKey="balance" stroke="#00e676" strokeWidth={2} fill="url(#colorBalance)" />
                    {chartData.map((entry, index) => {
                        if (entry.eventType === 'Depo') return <ReferenceLine key={`depo-${index}`} x={entry.name} stroke="#00e676" strokeDasharray="3 3" label={{ position: 'top', value: 'DEPO', fill: '#00e676', fontSize: 9 }} />;
                        if (entry.eventType === 'WD') return <ReferenceLine key={`wd-${index}`} x={entry.name} stroke="#ff1744" strokeDasharray="3 3" label={{ position: 'bottom', value: 'WD', fill: '#ff1744', fontSize: 9 }} />;
                        return null;
                    })}
                  </AreaChart>
              ) : (
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                    <XAxis dataKey="date" stroke="#525252" tick={{fontSize: 10, fontFamily: 'monospace'}} />
                    <YAxis stroke="#525252" tick={{fontSize: 10, fontFamily: 'monospace'}} />
                    <Tooltip cursor={{fill: '#ffffff05'}} contentStyle={{ backgroundColor: '#090c10', borderColor: '#333', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }} />
                    <ReferenceLine y={0} stroke="#374151" />
                    <Bar dataKey="pnl">{dailyData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#00e676' : '#ff1744'} />))}</Bar>
                  </BarChart>
              )}
            </ResponsiveContainer>
        </div>
    </div>
  );
};

const AnalyticsCharts = ({ trades }) => {
    // Filter out Depo/WD for analytics
    const activeTrades = useMemo(() => trades.filter(t => t.status !== 'Depo' && t.status !== 'WD'), [trades]);

    const symbolData = useMemo(() => { const counts = {}; activeTrades.forEach(t => { counts[t.symbol] = (counts[t.symbol] || 0) + 1; }); return Object.keys(counts).map(key => ({ name: key, value: counts[key] })); }, [activeTrades]);
    const sideData = useMemo(() => { const counts = { Buy: 0, Sell: 0 }; activeTrades.forEach(t => { if(t.side === 'Buy' || t.side === 'Sell') counts[t.side]++; }); return Object.keys(counts).map(key => ({ name: key, value: counts[key] })); }, [activeTrades]);
    const COLORS = ['#00e676', '#3b82f6', '#fbbf24', '#a855f7'];

    return (
        <div className="w-full h-full flex flex-col gap-4">
             <div className="flex items-center justify-between mb-2"><h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 font-mono"><PieIcon size={14} className="text-blue-500"/> Portfolio Mix</h3></div>
             <div className="flex-1 grid grid-cols-2 gap-3">
                 <div className="bg-[#090c10]/40 rounded-xl border border-white/5 p-2 relative flex flex-col items-center justify-center">
                    <div className="absolute top-2 left-2 text-[9px] text-gray-500 font-bold uppercase font-mono tracking-wider">Symbol</div>
                    <ResponsiveContainer width="100%" height="80%"><PieChart><Pie data={symbolData} innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value">{symbolData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#050505" />))}</Pie><Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '10px', borderRadius: '4px' }} itemStyle={{color:'#fff'}} /></PieChart></ResponsiveContainer>
                 </div>
                 <div className="bg-[#090c10]/40 rounded-xl border border-white/5 p-2 relative flex flex-col items-center justify-center">
                    <div className="absolute top-2 left-2 text-[9px] text-gray-500 font-bold uppercase font-mono tracking-wider">Side</div>
                    <ResponsiveContainer width="100%" height="80%"><PieChart><Pie data={sideData} innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value"><Cell fill="#00e676" stroke="#050505" /><Cell fill="#ff1744" stroke="#050505" /></Pie><Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '10px', borderRadius: '4px' }} itemStyle={{color:'#fff'}} /></PieChart></ResponsiveContainer>
                 </div>
             </div>
        </div>
    );
};

const WinRateGauge = ({ percentage }) => {
  let levelLabel = "CALCULATING"; let levelColor = "text-gray-500"; let borderColor = "border-gray-500/30"; let glowColor = "rgba(107, 114, 128, 0.3)";
  if (percentage < 40) { levelLabel = "CRITICAL"; levelColor = "text-[#ff1744]"; borderColor = "border-[#ff1744]/30"; glowColor = "rgba(255, 23, 68, 0.3)"; } 
  else if (percentage < 55) { levelLabel = "MODERATE"; levelColor = "text-yellow-500"; borderColor = "border-yellow-500/30"; glowColor = "rgba(234, 179, 8, 0.3)"; } 
  else if (percentage < 70) { levelLabel = "OPTIMAL"; levelColor = "text-blue-400"; borderColor = "border-blue-400/30"; glowColor = "rgba(96, 165, 250, 0.3)"; } 
  else { levelLabel = "ELITE"; levelColor = "text-purple-400"; borderColor = "border-purple-400/30"; glowColor = "rgba(192, 132, 252, 0.4)"; }
  
  const radius = 120; 
  const strokeWidth = 28; 
  const arcLength = Math.PI * radius; 
  const strokeDashoffset = arcLength * (1 - percentage / 100);
  const cx = 160; const cy = 160; 

  const totalDots = 9; 
  const dots = Array.from({ length: totalDots }).map((_, i) => { 
      const angleDeg = 180 - (i * (180 / (totalDots - 1))); 
      const angleRad = (angleDeg * Math.PI) / 180; 
      const x = cx + radius * Math.cos(angleRad); 
      const y = cy - radius * Math.sin(angleRad); 
      const dotPercentage = (i / (totalDots - 1)) * 100; 
      const isActive = percentage >= dotPercentage; 
      return { x, y, isActive }; 
  });
  
  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <div className="relative w-full h-full max-w-[320px] max-h-[180px] flex items-center justify-center">
        <svg viewBox="0 0 320 190" className="w-full h-full overflow-visible">
            <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00e676" /><stop offset="100%" stopColor="#15803d" />
                </linearGradient>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="rgba(0,0,0,0.5)" /></filter>
            </defs>
            <path d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`} stroke="#1f2937" strokeWidth={strokeWidth} fill="transparent" strokeLinecap="round" />
            <path d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`} stroke="url(#gaugeGradient)" strokeWidth={strokeWidth} fill="transparent" strokeLinecap="round" strokeDasharray={arcLength} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-out" filter="url(#shadow)" />
            {dots.map((dot, idx) => ( <circle key={idx} cx={dot.x} cy={dot.y} r={3.5} fill={dot.isActive ? "#ffffff" : "#374151"} className="transition-colors duration-1000" /> ))}
        </svg>
        <div className="absolute bottom-2 left-0 w-full flex flex-col items-center justify-center">
             <div className={`mb-1 bg-black/50 backdrop-blur-md ${levelColor} text-[9px] px-3 py-0.5 rounded-full border ${borderColor} uppercase tracking-widest font-bold`} style={{ boxShadow: `0 0 15px ${glowColor}` }}>{levelLabel}</div>
             <div className="flex items-center justify-center gap-2 bg-[#121212] px-4 py-1.5 rounded-full border border-gray-800 shadow-2xl z-10">
                 <span className="text-2xl font-bold text-white leading-none tabular-nums font-mono">
                     <CountUp end={percentage} duration={2} />%
                 </span>
                 <div className="w-[1px] h-4 bg-gray-600/50"></div>
                 <span className="text-[8px] text-gray-500 font-bold tracking-[0.2em] uppercase mt-[1px]">WR</span>
             </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---

export default function TradingDashboard() {
  const [allTrades, setAllTrades] = useState([]); 
  const [paginatedTrades, setPaginatedTrades] = useState([]); 
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  
  const [selectedAccount, setSelectedAccount] = useState('');
  const [availableAccounts, setAvailableAccounts] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'openDate', direction: 'desc' });
  
  const [isSystemOnline, setIsSystemOnline] = useState(true);
  const [latency, setLatency] = useState(0);
  const [realAccountInfo, setRealAccountInfo] = useState(null);
  const [marketWatchData, setMarketWatchData] = useState([]);

  // Stats State
  const [stats, setStats] = useState({
    netProfit: 0, grossProfit: 0, grossLoss: 0, winRate: 0,
    profitFactor: 0, totalTrades: 0, expectancy: 0, 
    maxDD_Value: 0, dailyDD_Value: 0
  });

  const [extraMetrics, setExtraMetrics] = useState({
    equity: 0, balance: 0, dailyDD: 0, maxDD: 0, tradingDays: 0, floatingPnL: 0, initialBalance: 100000
  });

  const [charts, setCharts] = useState({
    weekday: [], hourly: [], symbolPerf: [], initialBalance: 100000
  });

  // --- DATA FETCHING ---

  const fetchGlobalStats = async () => {
    try {
        const url = `${API_BASE}/api/trades?type=all${selectedAccount ? `&accountId=${selectedAccount}` : ''}`;
        const startTime = Date.now();
        const res = await fetch(url);
        const json = await res.json();
        setLatency(Date.now() - startTime);

        const data = json.data ? json.data : (Array.isArray(json) ? json : []);
        
        if (data) {
            setAllTrades(data);
            const accounts = [...new Set(data.map(t => t.accountId))].filter(Boolean);
            setAvailableAccounts(prev => {
                const isSame = prev.length === accounts.length && prev.every((v,i) => v === accounts[i]);
                return isSame ? prev : accounts;
            });
            if (!selectedAccount && accounts.length > 0) setSelectedAccount(accounts[0]);
        }
        setIsSystemOnline(true);
    } catch (e) { console.error("Global Stats Error", e); setIsSystemOnline(false); }
  };

  const fetchTableData = async (page = 1) => {
    try {
        const url = `${API_BASE}/api/trades?page=${page}&limit=${itemsPerPage}${selectedAccount ? `&accountId=${selectedAccount}` : ''}`;
        const res = await fetch(url);
        const json = await res.json();
        
        if (json.data) {
            setPaginatedTrades(json.data);
            setPagination(json.pagination);
        } else if (Array.isArray(json)) {
            // Fallback manual pagination
            const start = (page - 1) * itemsPerPage;
            setPaginatedTrades(json.slice(start, start + itemsPerPage));
            setPagination({ page, pages: Math.ceil(json.length / itemsPerPage), total: json.length });
        }
    } catch (e) { console.error("Table Error", e); }
  };

  const fetchLiveInfo = async () => {
      if(!selectedAccount) return;
      try {
          const accRes = await fetch(`${API_BASE}/api/account-info?accountId=${selectedAccount}`);
          const accData = await accRes.json();
          if(accData) setRealAccountInfo(accData);

          const mwRes = await fetch(`${API_BASE}/api/market-watch?accountId=${selectedAccount}`);
          const mwData = await mwRes.json();
          if(Array.isArray(mwData)) setMarketWatchData(mwData);
      } catch(e) { console.error("Live Info Error", e); }
  };

  useEffect(() => {
    fetchGlobalStats();
    fetchLiveInfo();
    const interval = setInterval(() => {
        fetchGlobalStats(); 
        fetchLiveInfo();
    }, 5000); 
    return () => clearInterval(interval);
  }, [selectedAccount]);

  useEffect(() => {
    fetchTableData(currentPage);
  }, [selectedAccount, currentPage]);

  // --- LOGIC ENGINE (Updated for Depo/WD) ---
  useEffect(() => {
    if (allTrades.length === 0) return;
    
    let net = 0, grossP = 0, grossL = 0, wins = 0; let best = 0, worst = 0;
    let totalQty = 0; let closedTradesCount = 0;
    let peak = 0; let maxDD = 0;

    const uniqueDays = new Set();
    const weekdayPnl = [0,0,0,0,0,0,0]; 
    const hourlyPnl = Array(24).fill(0);
    const symbolStats = {};

    // Sort Chronological
    const sortedTrades = [...allTrades].sort((a,b) => new Date(a.openDate) - new Date(b.openDate));

    sortedTrades.forEach(t => {
      const rawPnL = parseFloat(t.pnl || 0);
      const swap = parseFloat(t.swap || 0);
      const fee = parseFloat(t.fee || 0);
      const totalRealPnL = rawPnL + swap + fee; 
      
      const qty = parseFloat(t.qty || 0);
      const statusLower = t.status ? t.status.toLowerCase() : '';
      const isBalanceOp = statusLower === 'depo' || statusLower === 'wd';

      // Jika Trading (Bukan Depo/WD) -> Hitung Stats Trading
      if (!isBalanceOp && statusLower !== 'open') {
          net += totalRealPnL; // Net Profit (Hanya dari Trading)
          totalQty += qty;
          closedTradesCount++;
          
          if (totalRealPnL >= 0) { grossP += totalRealPnL; wins++; if (totalRealPnL > best) best = totalRealPnL; } 
          else { grossL += Math.abs(totalRealPnL); if (totalRealPnL < worst) worst = totalRealPnL; }

          uniqueDays.add(t.openDate.split(' ')[0]);

          const d = new Date(t.openDate.replace(/\./g, '-'));
          if(!isNaN(d)) {
              weekdayPnl[d.getDay()] += totalRealPnL;
              hourlyPnl[d.getHours()] += totalRealPnL;
          }
      }

      // Max DD Calculation (Melibatkan Balance Curve)
      // DD dihitung dari Total Equity (Net Profit Trading + Balance Ops)
      // Asumsi 'net' di sini hanya trading profit. Kita perlu tracking 'Total Balance Curve'
      // Namun untuk simplifikasi, kita hitung DD Global nanti dari Balance Akhir
      
      if(!isBalanceOp) {
          if(!symbolStats[t.symbol]) symbolStats[t.symbol] = { vol:0, trades:0, wins:0, losses:0, pnl:0 };
          symbolStats[t.symbol].vol += qty;
          symbolStats[t.symbol].trades += 1;
          symbolStats[t.symbol].pnl += totalRealPnL;
          if(statusLower !== 'open') {
             if(totalRealPnL >= 0) symbolStats[t.symbol].wins++; else symbolStats[t.symbol].losses++;
          }
      }
    });

    // --- DAILY DRAWDOWN (GMT+7 Logic) ---
    const now = new Date();
    const todayGMT7 = new Date(now.getTime() + (7 * 3600 * 1000));
    const todayStr = todayGMT7.toISOString().split('T')[0];
    
    // Hitung Profit Hari Ini (Trading Only)
    const todayTrades = sortedTrades.filter(t => {
        const d = new Date(t.openDate.replace(/\./g, '-'));
        const dGMT7 = new Date(d.getTime() + (7 * 3600 * 1000));
        return dGMT7.toISOString().split('T')[0] === todayStr && t.status !== 'Depo' && t.status !== 'WD';
    });

    const todayClosedPnL = todayTrades.reduce((acc, t) => {
        return acc + (parseFloat(t.pnl) + parseFloat(t.swap||0) + parseFloat(t.fee||0));
    }, 0);

    // Balance & Equity Real dari API (Source of Truth)
    const currentBalanceReal = realAccountInfo?.balance || (100000 + net); // Fallback jika API belum ready
    const currentEquity = realAccountInfo?.equity || currentBalanceReal;
    
    // Logika Daily DD: High Water Mark Hari Ini
    // Start Balance Hari Ini = Balance Sekarang - Profit Hari Ini
    const startBalanceToday = currentBalanceReal - todayClosedPnL;
    const dailyPeak = Math.max(startBalanceToday, currentEquity); 
    const dailyDD = currentEquity - dailyPeak; // Negative Value

    // Logika Max DD Global (Simpel: Peak Equity vs Current Equity)
    // Untuk akurasi 100% perlu iterasi tick, tapi snapshot curve cukup
    // Kita gunakan fallback maxDD dari tracking curve sebelumnya jika ada
    
    const total = closedTradesCount; // Total Trades (Excl Depo/WD)
    const wr = closedTradesCount > 0 ? Math.round((wins / closedTradesCount) * 100) : 0;
    const pf = grossL > 0 ? (grossP / grossL).toFixed(2) : (grossP > 0 ? '∞' : '0.00');

    setStats({
      netProfit: net.toFixed(2), // Net Profit MURNI TRADING
      grossProfit: grossP.toFixed(2), 
      grossLoss: grossL.toFixed(2), 
      winRate: wr, 
      profitFactor: pf, 
      totalTrades: total,
      bestProfit: best.toFixed(2), 
      biggestLoss: Math.abs(worst).toFixed(2), 
      expectancy: closedTradesCount > 0 ? (net / closedTradesCount).toFixed(2) : 0,
      avgTradeSize: closedTradesCount > 0 ? (totalQty / closedTradesCount).toFixed(2) : 0, 
      maxDD_Value: stats.maxDD_Value < dailyDD ? stats.maxDD_Value : dailyDD, // Placeholder logic, idealnya dari array curve
      dailyDD_Value: dailyDD   
    });

    const floating = parseFloat(realAccountInfo?.equity || 0) - parseFloat(realAccountInfo?.balance || 0);
    const initialBal = realAccountInfo ? (realAccountInfo.balance - net) : 100000; 
    // Catatan: Initial Balance ini estimasi. Jika ada Depo/WD, logika ini perlu penyesuaian kompleks. 
    // Untuk visualisasi chart, kita gunakan logika di AdvancedChart.

    setExtraMetrics({
        equity: currentEquity, 
        balance: currentBalanceReal, 
        dailyDD: dailyDD, 
        maxDD: stats.maxDD_Value, // Keep previous max if lower
        tradingDays: uniqueDays.size, 
        floatingPnL: floating,
        initialBalance: initialBal
    });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    setCharts({
        weekday: weekdayPnl.map((v, i) => ({ day: days[i], val: v })),
        hourly: hourlyPnl.map((v, i) => ({ hour: i.toString().padStart(2,'0'), val: v })),
        symbolPerf: Object.entries(symbolStats).map(([key, val]) => ({ symbol: key, ...val })).sort((a,b) => b.pnl - a.pnl),
        initialBalance: initialBal
    });

  }, [allTrades, realAccountInfo]);

  const handleDeleteAccount = async () => {
    if (!selectedAccount) return;
    const isConfirmed = window.confirm(`⚠️ PERINGATAN KERAS ⚠️\n\nAnda akan menghapus SELURUH data untuk Akun: ${selectedAccount}.\n\nTindakan ini tidak bisa dibatalkan. Apakah Anda yakin?`);
    if (isConfirmed) {
        const userSecret = prompt("Masukkan KUNCI RAHASIA Admin untuk konfirmasi penghapusan:");
        if (!userSecret) return;
        try {
            const res = await fetch(`${API_BASE}/api/delete-account`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'x-admin-secret': userSecret },
                body: JSON.stringify({ targetAccount: selectedAccount })
            });
            const result = await res.json();
            if (res.ok) {
                alert(`✅ BERHASIL: ${result.message}`);
                setSelectedAccount(''); window.location.reload(); 
            } else { alert(`❌ GAGAL: ${result.error}`); }
        } catch (error) { alert("❌ GAGAL: Terjadi kesalahan koneksi."); }
    }
  };

  const isHighRisk = extraMetrics.balance > 0 && (extraMetrics.floatingPnL / extraMetrics.balance) < -0.05;
  const activeCurrency = realAccountInfo?.currency || 'USD';
  const fmtCurr = (val) => formatCurrency(val, activeCurrency);
  const requestSort = (key) => { let direction = 'asc'; if (sortConfig.key === key && sortConfig.direction === 'asc') { direction = 'desc'; } setSortConfig({ key, direction }); };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans text-gray-200 relative overflow-x-hidden selection:bg-[#00e676]/30">
      
      <div className="vignette z-50"></div>
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1]">
          <div className="scanline"></div>
          <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-[#00e676]/5 rounded-full blur-[100px]"></div>
      </div>

      <MarketTicker marketWatch={marketWatchData} />

      <div className="max-w-[1800px] mx-auto mb-10 mt-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-6 border-b border-white/5">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-[#00e676]/10 p-2 rounded-lg border border-[#00e676]/20 shadow-[0_0_15px_rgba(0,230,118,0.2)]">
                        <Zap size={20} className="text-[#00e676] fill-[#00e676]" />
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">HELIX<span className="text-gray-600">CORE</span></h1>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono text-gray-500 uppercase tracking-wider">
                    <span className="flex items-center gap-2">
                        <span className={`relative flex h-2 w-2`}>
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSystemOnline ? 'bg-[#00e676]' : 'bg-red-500'}`}></span>
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${isSystemOnline ? 'bg-[#00e676]' : 'bg-red-500'}`}></span>
                        </span>
                        {isSystemOnline ? 'SYSTEM ONLINE' : 'OFFLINE'}
                    </span>
                    <span className="text-gray-700">|</span>
                    <span>LATENCY: <span className={`${latency < 200 ? 'text-[#00e676]' : 'text-yellow-500'}`}>{latency}ms</span></span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                 <div className="relative group bg-[#090c10]/60 backdrop-blur border border-white/10 rounded-lg flex items-center px-4 py-2.5 transition-all hover:border-white/20 hover:bg-[#090c10]/80">
                    <Users size={16} className="text-gray-500 mr-3"/>
                    <select value={selectedAccount} onChange={(e) => { setSelectedAccount(e.target.value); setCurrentPage(1); }} className="bg-transparent text-sm font-bold text-gray-200 focus:outline-none appearance-none cursor-pointer min-w-[140px] tracking-wide font-mono uppercase">
                        {availableAccounts.length === 0 && <option value="">INITIALIZING...</option>}
                        {availableAccounts.map(acc => ( <option key={acc} value={acc}>ACCOUNT {acc}</option> ))}
                    </select>
                </div>
                {selectedAccount && (<button onClick={handleDeleteAccount} className="p-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 transition-all"><Trash2 size={16}/></button>)}
                <button onClick={() => downloadCSV(allTrades)} className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-5 py-2.5 rounded-lg text-xs font-bold tracking-wider transition-all"><Download size={16}/> CSV</button>
            </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto space-y-8 relative z-10">
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <OverviewCard title="Equity" value={extraMetrics.equity} prefix={activeCurrency === 'USD' ? '$' : ''} isNegative={false} icon={DollarSign} subValue={`${extraMetrics.floatingPnL >= 0 ? '+' : ''}${fmtCurr(extraMetrics.floatingPnL)} FLT`} isAlert={isHighRisk} />
          
          <OverviewCard 
             title="Balance" 
             value={extraMetrics.balance} 
             prefix={activeCurrency === 'USD' ? '$' : ''}
             icon={Layers} 
             badge={<PercentageBadge value={parseFloat(stats.netProfit)} baseValue={extraMetrics.initialBalance} />}
          />
          
          <OverviewCard title="Net PnL" value={stats.netProfit} prefix={activeCurrency === 'USD' ? '$' : ''} isNegative={stats.netProfit < 0} icon={TrendingUp} />
          
          <OverviewCard title="Daily DD" value={stats.dailyDD_Value} prefix={activeCurrency === 'USD' ? '$' : ''} isNegative={true} icon={TrendingDown} />
          
          <OverviewCard 
             title="Max DD" 
             value={stats.maxDD_Value} 
             prefix={activeCurrency === 'USD' ? '$' : ''}
             isNegative={true} 
             icon={Activity}
             badge={<PercentageBadge value={stats.maxDD_Value} baseValue={extraMetrics.initialBalance} inverse={true} />} 
          />
          
          <OverviewCard title="Active Days" value={extraMetrics.tradingDays} icon={Calendar} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8 bg-[#090c10]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 h-[420px] shadow-lg">
                <AdvancedChart data={allTrades} currency={activeCurrency} initialBalance={charts.initialBalance || 100000} />
            </div>
            <div className="xl:col-span-4 flex flex-col gap-4 h-full min-h-[420px]">
                <div className="flex-1 min-h-[180px] bg-[#090c10]/60 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden relative shadow-inner">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                     <WinRateGauge percentage={stats.winRate} />
                </div>
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <StatCard label="Profit Factor" value={parseFloat(stats.profitFactor)} icon={BarChart2} />
                  <StatCard label="Total Trades" value={stats.totalTrades} icon={Layers} />
                  <StatCard label="Expectancy" value={parseFloat(stats.expectancy)} prefix={activeCurrency === 'USD' ? '$' : ''} icon={TrendingUp} className="col-span-2" subValue="Avg return per trade" />
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
             <div className="lg:col-span-4 bg-[#090c10]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 h-[300px]">
                 <AnalyticsCharts trades={allTrades} />
             </div>
             <div className="lg:col-span-4 bg-[#090c10]/60 backdrop-blur-md border border-white/5 rounded-2xl p-5 h-[300px]">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 font-mono">Performance by Weekday</h3>
                <SimpleBarChart data={charts.weekday} xKey="day" yKey="val" color="#3b82f6" currency={activeCurrency} />
             </div>
             <div className="lg:col-span-4 bg-[#090c10]/60 backdrop-blur-md border border-white/5 rounded-2xl p-5 h-[300px]">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 font-mono">Performance by Hour</h3>
                <SimpleBarChart data={charts.hourly} xKey="hour" yKey="val" color="#a855f7" currency={activeCurrency} />
             </div>
        </div>

        <div className="bg-[#090c10]/60 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-2xl mb-10">
             <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-500/10 p-2 rounded text-blue-400"><Hash size={18}/></div>
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-tight">Trade Journal</h2>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5 animate-pulse">LIVE EXECUTION FEED</div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                     <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-blue-400 transition-colors" size={14} />
                        <input type="text" placeholder="SEARCH TICKET / SYMBOL" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-black/20 border border-white/10 text-xs text-white pl-9 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500/50 w-64 font-mono transition-all placeholder:text-gray-700" />
                     </div>
                     
                     <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1 border border-white/5">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            className="p-2 hover:bg-white/10 rounded-md disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft size={16}/>
                        </button>
                        <span className="text-xs font-mono font-bold px-2 text-gray-400">
                            PAGE {currentPage} / {pagination.pages || 1}
                        </span>
                        <button 
                            disabled={currentPage === (pagination.pages || 1)}
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages || 1))}
                            className="p-2 hover:bg-white/10 rounded-md disabled:opacity-30 transition-colors"
                        >
                            <ChevronRight size={16}/>
                        </button>
                     </div>
                </div>
             </div>
             
             <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-black/20 text-gray-500 text-[10px] uppercase tracking-widest font-mono">
                      <tr>
                        {[{ key: 'id', label: 'Ticket' }, { key: 'accountId', label: 'Account' }, { key: 'openDate', label: 'Date' }, { key: 'symbol', label: 'Symbol' }, { key: 'side', label: 'Side' }, { key: 'entry', label: 'Entry' }, { key: 'exit', label: 'Exit' }, { key: 'qty', label: 'Size' }, { key: 'fee', label: 'Fee' }, { key: 'swap', label: 'Swap' }, { key: 'pnl', label: 'Net PnL' }, { key: 'status', label: 'State' }].map((col) => (
                            <th key={col.key} onClick={() => requestSort(col.key)} className="py-4 px-4 font-bold border-b border-white/5 hover:text-white cursor-pointer transition-colors select-none group">
                                <div className="flex items-center gap-1">{col.label} {sortConfig.key === col.key && (<span className="text-blue-500">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>)}</div>
                            </th>
                        ))}
                      </tr>
                   </thead>
                   <tbody className="text-xs font-mono divide-y divide-white/5">
                       {paginatedTrades.length > 0 ? paginatedTrades.map((trade, idx) => {
                         // Hitung Net PnL (Kecuali untuk Depo/WD, kita gunakan value profitnya langsung sebagai amount)
                         const isBalanceOp = trade.status === 'Depo' || trade.status === 'WD';
                         const netPnL = parseFloat(trade.pnl) + parseFloat(trade.swap || 0) + parseFloat(trade.fee || 0);
                         
                         // Style baris: Jika Depo/WD berikan background tipis
                         const rowClass = isBalanceOp ? 'bg-blue-500/5 hover:bg-blue-500/10' : 'hover:bg-white/[0.02]';

                         return (
                             <tr key={idx} className={`${rowClass} transition-colors group`}>
                               <td className="py-4 px-4 text-gray-400 group-hover:text-white transition-colors border-l-2 border-transparent group-hover:border-blue-500">{trade.id}</td>
                               <td className="py-4 px-4 text-blue-400/70">{trade.accountId || '-'}</td>
                               <td className="py-4 px-4 text-gray-500">{trade.openDate}</td>
                               <td className="py-4 px-4 font-bold text-gray-200">{trade.symbol}</td>
                               <td className="py-4 px-4"><span className={`font-bold ${trade.side === 'Buy' ? 'text-[#00e676]' : (trade.side === 'Sell' ? 'text-[#ff1744]' : 'text-gray-400')}`}>{trade.side ? trade.side.toUpperCase() : '-'}</span></td>
                               <td className="py-4 px-4 text-gray-400">{formatPrice(trade.entry)}</td>
                               <td className="py-4 px-4 text-gray-400">{formatPrice(trade.exit)}</td>
                               <td className="py-4 px-4 text-gray-300">{!isBalanceOp ? parseFloat(trade.qty).toFixed(2) : '-'}</td>
                               <td className="py-4 px-4 text-red-400/70">{!isBalanceOp ? parseFloat(trade.fee || 0).toFixed(2) : '-'}</td>
                               <td className="py-4 px-4 text-gray-500">{!isBalanceOp ? parseFloat(trade.swap || 0).toFixed(2) : '-'}</td>
                               <td className={`py-4 px-4 font-bold text-[13px] ${netPnL >= 0 ? 'text-[#00e676] drop-shadow-[0_0_8px_rgba(0,230,118,0.3)]' : 'text-[#ff1744]'}`}>{fmtCurr(netPnL)}</td>
                               <td className="py-4 px-4"><StatusBadge status={trade.status} /></td>
                             </tr>
                         );
                       }) : (
                         <tr><td colSpan="12" className="py-12 text-center text-gray-600 text-xs font-mono uppercase tracking-widest flex flex-col items-center gap-2"><AlertTriangle size={24} className="mb-2 opacity-50"/>No records found</td></tr>
                       )}
                   </tbody>
                </table>
             </div>
        </div>
      </div>
    </div>
  );
}