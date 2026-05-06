import React, { useState } from 'react';
import { Property, StrategicInsight } from '../types';
import { generateStrategicInsights, calculateRentIncreasePotential, formatEUR, calculateFlipScenario, calculateMonthlyCashflow } from '../utils';
import { Sparkles, TrendingUp, AlertTriangle, Coins, Zap, ArrowRight, Calendar, Lock, Hammer, RefreshCw, DollarSign, Timer } from 'lucide-react';
import { FancyInput, FancyButton } from './ui/Shared';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const AIStrategy = ({ property }: { property: Property }) => {
  const insights = generateStrategicInsights(property);
  const buyAndHoldStats = calculateMonthlyCashflow(property);

  // Simulation State for Fix & Flip
  const [targetPrice, setTargetPrice] = useState<number>(property.purchasePrice * 1.3);
  const [durationMonths, setDurationMonths] = useState<number>(6);
  const [extraRenovation, setExtraRenovation] = useState<number>(20000);

  const flipStats = calculateFlipScenario(property, targetPrice, durationMonths, extraRenovation);

  // Comparison Data for Chart
  const comparisonData = [
    {
      name: 'Buy & Hold (10J)',
      value: (buyAndHoldStats.postTaxCashflow * 12 * 10) + (buyAndHoldStats.monthlyAmortization * 12 * 10), // Cashflow + Equity Buildup over 10 years
      color: '#3b82f6'
    },
    {
      name: 'Fix & Flip (Heute)',
      value: flipStats.netProfit,
      color: flipStats.netProfit > 0 ? '#10b981' : '#ef4444'
    }
  ];

  const getIcon = (type: string) => {
    switch(type) {
        case 'RENT': return <TrendingUp size={20} className="text-blue-600"/>;
        case 'TAX': return <Coins size={20} className="text-amber-600"/>;
        case 'FINANCE': return <Sparkles size={20} className="text-purple-600"/>;
        case 'ENERGY': return <Zap size={20} className="text-emerald-600"/>;
        default: return <Sparkles size={20} />;
    }
  };

  const getBgColor = (type: string) => {
      switch(type) {
        case 'RENT': return 'bg-blue-50 border-blue-100';
        case 'TAX': return 'bg-amber-50 border-amber-100';
        case 'FINANCE': return 'bg-purple-50 border-purple-100';
        case 'ENERGY': return 'bg-emerald-50 border-emerald-100';
        default: return 'bg-slate-50 border-slate-100';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* --- Strategy Simulator Section --- */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <RefreshCw size={24} className="text-emerald-600"/> Strategie-Simulator
        </h2>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            
            {/* Left: Input & Flip Calculation */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-slate-900 text-white p-4 font-bold flex justify-between items-center">
                    <span className="flex items-center gap-2"><Hammer size={18}/> Szenario: Fix & Flip</span>
                    <span className={`px-2 py-1 rounded text-xs text-slate-900 font-bold ${flipStats.netProfit > 0 ? 'bg-emerald-400' : 'bg-red-400'}`}>
                        ROI: {flipStats.roi.toFixed(1)}%
                    </span>
                </div>
                
                <div className="p-6 space-y-6 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <FancyInput 
                                label="Ziel-Verkaufspreis (€)" 
                                type="number" 
                                value={targetPrice} 
                                onChange={(e) => setTargetPrice(Number(e.target.value))}
                                icon={<DollarSign size={16}/>}
                            />
                        </div>
                        <FancyInput 
                            label="Zusatz-Sanierung (€)" 
                            type="number" 
                            value={extraRenovation} 
                            onChange={(e) => setExtraRenovation(Number(e.target.value))}
                            icon={<Hammer size={16}/>}
                        />
                        <FancyInput 
                            label="Dauer (Monate)" 
                            type="number" 
                            value={durationMonths} 
                            onChange={(e) => setDurationMonths(Number(e.target.value))}
                            icon={<Timer size={16}/>}
                        />
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Gesamt-Invest (Ankauf + Reno)</span>
                            <span className="font-medium">{formatEUR(flipStats.totalInvested - flipStats.sellingCosts)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Haltekosten (Zinsen/NK)</span>
                            <span className="font-medium text-amber-600">-{formatEUR(flipStats.totalHoldingCosts)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Verkaufskosten (ca. 2%)</span>
                            <span className="font-medium text-amber-600">-{formatEUR(flipStats.sellingCosts)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                            <span className="text-slate-700">Gewinn (vor Steuer)</span>
                            <span className={flipStats.profitPreTax > 0 ? 'text-emerald-600' : 'text-red-600'}>{formatEUR(flipStats.profitPreTax)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Spekulationssteuer (geschätzt)</span>
                            <span className="text-slate-400">-{formatEUR(flipStats.tax)}</span>
                        </div>
                    </div>

                    <div className="mt-auto bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-4 rounded-xl text-center">
                         <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Netto Gewinn (Flip)</p>
                         <p className={`text-3xl font-bold ${flipStats.netProfit > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatEUR(flipStats.netProfit)}
                         </p>
                    </div>
                </div>
            </div>

            {/* Right: Buy & Hold Comparison & Chart */}
            <div className="flex flex-col gap-6">
                 {/* Buy & Hold Card */}
                 <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 p-4 font-bold text-slate-700 flex justify-between items-center border-b border-slate-200">
                        <span className="flex items-center gap-2"><RefreshCw size={18} className="text-blue-500"/> Szenario: Buy & Hold</span>
                         <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700 font-bold">
                            EK-Rendite: {buyAndHoldStats.equityYield.toFixed(1)}% p.a.
                        </span>
                    </div>
                    <div className="p-6 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase">Cashflow (Jahr)</p>
                            <p className={`text-xl font-bold ${buyAndHoldStats.postTaxCashflow > 0 ? 'text-slate-900' : 'text-red-500'}`}>
                                {formatEUR(buyAndHoldStats.postTaxCashflow * 12)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase">Vermögensaufbau (10J)</p>
                            <p className="text-xl font-bold text-blue-600">
                                {formatEUR(buyAndHoldStats.monthlyAmortization * 12 * 10)}
                            </p>
                        </div>
                    </div>
                 </div>

                 {/* Comparison Chart */}
                 <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex-1 min-h-[250px] flex flex-col">
                    <h3 className="text-sm font-bold text-slate-700 mb-4">Ergebnis Vergleich (Nettovermögen)</h3>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comparisonData} layout="vertical" margin={{top: 0, left: 40, right: 40, bottom: 0}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fontWeight: 'bold'}} />
                                <Tooltip formatter={(val:number) => formatEUR(val)} cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none'}} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                                    {comparisonData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                     <p className="text-xs text-center text-slate-400 mt-2">
                        Vergleich: Netto-Gewinn aus Flip heute vs. kumulierter Cashflow & Tilgung über 10 Jahre.
                    </p>
                 </div>
            </div>
        </div>
      </div>

      <div className="h-px bg-slate-200 my-8"></div>

      {/* --- Existing AI Insights Section --- */}
      <div>
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg flex items-center justify-between mb-6">
            <div>
                <h3 className="text-xl font-bold flex items-center gap-2"><Sparkles className="text-yellow-400"/> AI Optimierung</h3>
                <p className="text-slate-300 text-sm mt-1">Automatische Analyse von Optimierungspotentialen.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, idx) => (
                <div key={idx} className={`p-6 rounded-xl border shadow-sm relative overflow-hidden group hover:shadow-md transition-all ${getBgColor(insight.type)}`}>
                    <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                            <div className="p-3 bg-white rounded-xl shadow-sm h-fit">
                                {getIcon(insight.type)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-slate-900">{insight.title}</h4>
                                    {insight.impact === 'HIGH' && (
                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded-full border border-red-200">High Impact</span>
                                    )}
                                </div>
                                <p className="text-slate-600 text-sm leading-relaxed max-w-xl">{insight.description}</p>
                                
                                {insight.value && (
                                    <div className="mt-3 inline-block px-3 py-1 bg-white/60 rounded-lg text-xs font-bold text-slate-800 border border-slate-200/50">
                                        Potential: {insight.value}
                                    </div>
                                )}
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
