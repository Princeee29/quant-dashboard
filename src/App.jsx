import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, Clock, BarChart2, Search, ChevronLeft, ChevronRight, Download, 
  Users, TrendingUp, TrendingDown, Calendar, Layers, DollarSign, List
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

// --- API CONFIG ---
const API_URL = 'https://quant-dashboard-eta.vercel.app/api/trades';

// --- HELPER FUNCTIONS ---
const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
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

// --- COMPONENTS ---

// 1. KARTU OVERVIEW (Baris Atas)
const OverviewCard = ({ title, value, subValue, isNegative, icon: Icon }) => (
  <div className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-4 relative overflow-hidden group hover:border-gray-700 transition-all">
    <div className="flex justify-between items-start mb-2">
      <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">{title}</span>
      {Icon && <Icon size={14} className="text-gray-600 group-hover:text-blue-500 transition-colors" />}
    </div>
    <div className={`text-xl font-bold font-mono tracking-tight ${isNegative ? 'text-red-400' : 'text-gray-100'}`}>
      {value}
    </div>
    {subValue && <div className="text-[10px] text-gray-500 mt-1 font-mono">{subValue}</div>}
  </div>
);

// 2. KARTU DETAIL STATUS (List)
const DetailRow = ({ label, value, colorClass = "text-white" }) => (
  <div className="flex justify-between items-center py-2.5 border-b border-[#222] last:border-0 hover:bg-[#111] px-2 rounded transition-colors">
    <span className="text-[11px] text-gray-500 font-medium">{label}</span>
    <span className={`text-[11px] font-bold font-mono ${colorClass}`}>{value}</span>
  </div>
);

// 3. CHART COMPONENT (Weekday & Hourly)
const SimpleBarChart = ({ data, xKey, yKey, color }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{top: 5, right: 5, left: -20, bottom: 0}}>
      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
      <XAxis dataKey={xKey} stroke="#4b5563" tick={{fontSize: 9, fontFamily: 'monospace'}} tickLine={false} axisLine={false} />
      <YAxis stroke="#4b5563" tick={{fontSize: 9, fontFamily: 'monospace'}} tickLine={false} axisLine={false} />
      <Tooltip 
        cursor={{fill: '#ffffff05'}} 
        contentStyle={{ backgroundColor: '#050505', borderColor: '#333', fontSize: '11px', borderRadius: '8px' }}
        formatter={(val) => [`$${val.toFixed(2)}`, 'PnL']}
      />
      <Bar dataKey={yKey} fill={color} radius={[2, 2, 0, 0]}>
        {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry[yKey] >= 0 ? color : '#ef4444'} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

// --- MAIN APP ---

export default function TradingDashboard() {
  const [trades, setTrades] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('ALL');
  const [availableAccounts, setAvailableAccounts] = useState([]);
  
  // Table State
  const [filter, setFilter] = useState('Both');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Metrics State
  const [metrics, setMetrics] = useState({
    equity: 0, balance: 0, returnVal: 0,
    dailyDD: 0, maxDD: 0, tradingDays: 0,
    totalTrades: 0, totalLots: 0,
    winRate: 0, loseRate: 0, longPct: 0, shortPct: 0,
    mostTraded: 'N/A', floatingPnL: 0
  });

  const [charts, setCharts] = useState({
    weekday: [], hourly: [], symbolPerf: []
  });

  // --- FETCH & PROCESS DATA ---
  const fetchTrades = async () => {
    try {
      const url = selectedAccount === 'ALL' ? API_URL : `${API_URL}?accountId=${selectedAccount}`;
      const response = await fetch(url);
      const data = await response.json();
      
      // 1. Deduplikasi Data (Logic Anda)
      const tradeMap = new Map();
      data.forEach(trade => {
          const id = trade.id;
          if (!tradeMap.has(id)) {
              tradeMap.set(id, trade);
          } else {
              const existing = tradeMap.get(id);
              const existingHasAccount = existing.accountId && existing.accountId !== 'undefined';
              const newHasAccount = trade.accountId && trade.accountId !== 'undefined';
              
              if (!existingHasAccount && newHasAccount) {
                  tradeMap.set(id, trade); return;
              }
              if (existing.status === 'Open' && trade.status !== 'Open') {
                  tradeMap.set(id, trade);
              }
          }
      });
      let cleanData = Array.from(tradeMap.values());

      // 2. Auto-Detect Account
      if(cleanData.length > 0) {
        const incomingAccounts = cleanData.map(d => d.accountId).filter(acc => acc && acc !== 'undefined' && acc !== 'null');
        setAvailableAccounts(prev => {
            const unique = new Set([...prev, ...incomingAccounts]);
            return Array.from(unique).sort();
        });
      }

      // 3. Filter Client Side
      if (selectedAccount !== 'ALL') {
         cleanData = cleanData.filter(t => String(t.accountId) === String(selectedAccount));
      }
      
      setTrades(cleanData);

    } catch (error) { console.error("Fetch error:", error); }
  };

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 5000); // 5 detik agar tidak spamming kalkulasi berat
    return () => clearInterval(interval);
  }, [selectedAccount]);

  // --- CALCULATION LOGIC (THE BRAIN) ---
  useEffect(() => {
    if (trades.length === 0) {
        setMetrics({ equity: 0, balance: 0, returnVal: 0, dailyDD: 0, maxDD: 0, tradingDays: 0, totalTrades: 0, totalLots: 0, winRate: 0, loseRate: 0, longPct: 0, shortPct: 0, mostTraded: 'N/A', floatingPnL: 0 });
        setCharts({ weekday: [], hourly: [], symbolPerf: [] });
        return;
    }

    let balance = 0, floating = 0;
    let wins = 0, losses = 0, longs = 0, shorts = 0, lots = 0;
    let maxEq = 0;
    let maxDD = 0;
    let currentEqCurve = 0;
    
    const uniqueDays = new Set();
    const symbolCounts = {};
    const symbolStats = {}; // { XAUUSD: { vol, trades, wins, pnl... } }
    
    // Arrays for Charts
    const weekdayPnl = [0,0,0,0,0,0,0]; // Sun-Sat
    const hourlyPnl = Array(24).fill(0);

    // Sort by date asc for Drawdown Calc
    const sortedForCalc = [...trades].sort((a,b) => a.openDate.localeCompare(b.openDate));

    sortedForCalc.forEach(t => {
      const pnl = parseFloat(t.pnl);
      const qty = parseFloat(t.qty || 0);
      const isWin = pnl >= 0;
      
      // Basic Metrics
      if (t.status === 'Open') {
        floating += pnl;
      } else {
        balance += pnl;
        uniqueDays.add(t.openDate.split(' ')[0]);
        if(isWin) wins++; else losses++;
        
        // Time Charts
        const d = new Date(t.openDate.replace(/\./g, '-')); // Format MT5 2024.01.01
        if(!isNaN(d)) {
            weekdayPnl[d.getDay()] += pnl;
            hourlyPnl[d.getHours()] += pnl;
        }

        // Drawdown Logic (Simulasi Equity Curve sederhana dari closed trade)
        currentEqCurve += pnl;
        if(currentEqCurve > maxEq) maxEq = currentEqCurve;
        const dd = maxEq - currentEqCurve;
        if(dd > maxDD) maxDD = dd;
      }

      if (t.side === 'Buy') longs++; else shorts++;
      lots += qty;

      // Symbol Logic
      symbolCounts[t.symbol] = (symbolCounts[t.symbol] || 0) + 1;
      
      if(!symbolStats[t.symbol]) symbolStats[t.symbol] = { vol:0, trades:0, wins:0, losses:0, pnl:0 };
      symbolStats[t.symbol].vol += qty;
      symbolStats[t.symbol].trades += 1;
      symbolStats[t.symbol].pnl += pnl;
      if(t.status !== 'Open') {
          if(isWin) symbolStats[t.symbol].wins++; else symbolStats[t.symbol].losses++;
      }
    });

    const totalTrades = trades.length;
    
    // Daily Drawdown Estimasi (Floating loss saat ini jika negatif)
    const dailyDD = floating < 0 ? Math.abs(floating) : 0;

    // Most Traded
    const sortedSyms = Object.entries(symbolCounts).sort((a,b) => b[1] - a[1]);
    const mostTraded = sortedSyms.length > 0 ? sortedSyms[0][0] : '-';

    setMetrics({
      equity: balance + floating,
      balance,
      returnVal: balance, // Net Return absolute
      floatingPnL: floating,
      dailyDD,
      maxDD,
      tradingDays: uniqueDays.size,
      totalTrades,
      totalLots: lots,
      winRate: totalTrades ? (wins/totalTrades)*100 : 0,
      loseRate: totalTrades ? (losses/totalTrades)*100 : 0,
      longPct: totalTrades ? (longs/totalTrades)*100 : 0,
      shortPct: totalTrades ? (shorts/totalTrades)*100 : 0,
      mostTraded
    });

    // Chart Data Prep
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    setCharts({
        weekday: weekdayPnl.map((v, i) => ({ day: days[i], val: v })).filter(d => d.day !== 'Sun' && d.day !== 'Sat'), // Filter weekend biasa
        hourly: hourlyPnl.map((v, i) => ({ hour: i.toString().padStart(2,'0'), val: v })),
        symbolPerf: Object.entries(symbolStats).map(([key, val]) => ({ symbol: key, ...val })).sort((a,b) => b.pnl - a.pnl)
    });

  }, [trades]);

  // --- TABLE FILTER & PAGINATION ---
  const filteredTableData = useMemo(() => {
    let data = [...trades];
    if (filter !== 'Both') data = data.filter(t => filter === 'Open' ? t.status === 'Open' : t.status !== 'Open');
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(t => t.symbol.toLowerCase().includes(lower) || String(t.id).includes(lower));
    }
    return data.sort((a,b) => new Date(b.openDate.replace(/\./g,'-')) - new Date(a.openDate.replace(/\./g,'-')));
  }, [trades, filter, searchTerm]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTableData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTableData.length / itemsPerPage);


  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 p-4 md:p-6 font-sans selection:bg-blue-500/30">
      
      {/* HEADER */}
      <div className="max-w-[1600px] mx-auto mb-6 flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
           <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="text-blue-500" size={24} /> QUANT DASHBOARD
           </h1>
           <p className="text-gray-500 text-[11px] font-mono mt-1">REAL-TIME PERFORMANCE ANALYTICS</p>
        </div>
        
        <div className="flex gap-2 items-center">
            {/* Account Selector */}
            <div className="relative group bg-[#111] rounded-lg border border-[#222] flex items-center px-3 py-2 gap-2">
                 <Users size={14} className="text-gray-500"/>
                 <select 
                    value={selectedAccount} 
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="bg-transparent text-xs font-bold text-gray-300 focus:outline-none appearance-none cursor-pointer min-w-[120px]"
                 >
                    <option value="ALL">ALL ACCOUNTS</option>
                    {availableAccounts.map(acc => (
                         <option key={acc} value={acc}>
                            Account {acc} {trades.length > 0 && trades[0].accountId === acc ? '(Active)' : ''}
                         </option>
                    ))}
                </select>
            </div>
            <button onClick={() => downloadCSV(trades)} className="bg-[#111] hover:bg-[#222] px-3 py-2 rounded-lg border border-[#222] transition-colors text-gray-400 hover:text-white">
                <Download size={14} />
            </button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* --- 1. TRADING OVERVIEW --- */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <OverviewCard title="Current Equity" value={formatCurrency(metrics.equity)} isNegative={false} icon={DollarSign} subValue={`${metrics.floatingPnL >= 0 ? '+' : ''}${formatCurrency(metrics.floatingPnL)} Floating`} />
          <OverviewCard title="Current Balance" value={formatCurrency(metrics.balance)} icon={Layers} />
          <OverviewCard title="Net Return" value={formatCurrency(metrics.returnVal)} isNegative={metrics.returnVal < 0} icon={TrendingUp} />
          <OverviewCard title="Daily Drawdown" value={`-${formatCurrency(metrics.dailyDD)}`} isNegative={true} icon={TrendingDown} />
          <OverviewCard title="Max Drawdown" value={`-${formatCurrency(metrics.maxDD)}`} isNegative={true} icon={Activity} />
          <OverviewCard title="Trading Days" value={metrics.tradingDays} icon={Calendar} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* --- 2. DETAIL STATUS (KIRI) --- */}
          <div className="lg:col-span-3 space-y-6">
             <div className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-5 h-full">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><List size={14}/> Detail Status</h3>
                <div className="flex flex-col gap-1">
                  <DetailRow label="Total Trades" value={metrics.totalTrades} />
                  <DetailRow label="Total Lots" value={formatNumber(metrics.totalLots)} />
                  <DetailRow label="Win Rate" value={`${metrics.winRate.toFixed(1)}%`} colorClass="text-green-400" />
                  <DetailRow label="Lose Rate" value={`${metrics.loseRate.toFixed(1)}%`} colorClass="text-red-400" />
                  <DetailRow label="Long Positions" value={`${metrics.longPct.toFixed(1)}%`} colorClass="text-blue-400" />
                  <DetailRow label="Short Positions" value={`${metrics.shortPct.toFixed(1)}%`} colorClass="text-orange-400" />
                  <DetailRow label="Most Traded" value={metrics.mostTraded} colorClass="text-yellow-400" />
                </div>
             </div>
          </div>

          {/* --- 3. PERFORMANCE CHARTS (KANAN) --- */}
          <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Weekday Chart */}
             <div className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-5 h-[280px]">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">P & L by Weekday</h3>
                <SimpleBarChart data={charts.weekday} xKey="day" yKey="val" color="#3b82f6" />
             </div>
             {/* Hourly Chart */}
             <div className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-5 h-[280px]">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">P & L by Hours</h3>
                <SimpleBarChart data={charts.hourly} xKey="hour" yKey="val" color="#8b5cf6" />
             </div>
          </div>
        </div>

        {/* --- 4. SYMBOL PERFORMANCE TABLE --- */}
        <div className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#1C1C1C]">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><BarChart2 size={14}/> Symbol Performance</h3>
          </div>
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#111] sticky top-0 z-10">
                <tr className="text-gray-500 text-[10px] uppercase tracking-wider">
                  <th className="p-3">Symbol</th>
                  <th className="p-3 text-right">Volume</th>
                  <th className="p-3 text-right">Avg Trade Size</th>
                  <th className="p-3 text-center">Trades</th>
                  <th className="p-3 text-center text-green-500">Winning</th>
                  <th className="p-3 text-center text-red-500">Losing</th>
                  <th className="p-3 text-right">Net P&L</th>
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
                    <td className={`p-3 text-right font-bold ${sym.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(sym.pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- 5. TRADE HISTORY LOG (ORIGINAL TABLE) --- */}
        <div className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-5">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><Clock size={14}/> Recent History</h3>
              <div className="flex gap-2">
                 <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600" size={12} />
                    <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-[#111] border border-[#222] text-[10px] pl-7 pr-3 py-1.5 rounded text-white focus:outline-none w-32" />
                 </div>
                 <div className="flex bg-[#111] rounded border border-[#222]">
                    {['Open', 'Closed', 'Both'].map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-[10px] ${filter === f ? 'bg-[#222] text-white' : 'text-gray-500'}`}>{f}</button>
                    ))}
                 </div>
              </div>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="text-gray-500 text-[10px] uppercase border-b border-[#1C1C1C]">
                    <th className="p-2">Ticket</th><th className="p-2">Date</th><th className="p-2">Symbol</th><th className="p-2">Side</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">PnL</th>
                 </tr>
               </thead>
               <tbody className="text-[11px] font-mono">
                  {currentItems.map((t, idx) => (
                      <tr key={idx} className="border-b border-[#1C1C1C]/50 hover:bg-[#111]">
                          <td className="p-2 text-gray-500">{t.id}</td>
                          <td className="p-2 text-gray-400">{t.openDate}</td>
                          <td className="p-2 font-bold text-white">{t.symbol}</td>
                          <td className={`p-2 ${t.side === 'Buy' ? 'text-green-500' : 'text-red-500'}`}>{t.side}</td>
                          <td className="p-2 text-right text-gray-300">{formatNumber(t.entry)}</td>
                          <td className={`p-2 text-right font-bold ${parseFloat(t.pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(t.pnl)}</td>
                      </tr>
                  ))}
               </tbody>
             </table>
             
             {/* Pagination */}
             <div className="flex justify-between items-center mt-4">
                <span className="text-[10px] text-gray-500">Page {currentPage} of {totalPages}</span>
                <div className="flex gap-1">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1} className="p-1 rounded bg-[#111] text-gray-400 disabled:opacity-30"><ChevronLeft size={14}/></button>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages} className="p-1 rounded bg-[#111] text-gray-400 disabled:opacity-30"><ChevronRight size={14}/></button>
                </div>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}