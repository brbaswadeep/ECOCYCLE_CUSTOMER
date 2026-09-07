import React, { useState, useEffect } from 'react';
import { 
    Coins, ShoppingBag, ArrowRight, TrendingUp, History, 
    Sparkles, ShieldCheck, Recycle, Scan, Award, ChevronRight 
} from 'lucide-react';
import { db } from '../firebase';
import { 
    doc, collection, query, orderBy, onSnapshot, 
    setDoc, getDocs, where 
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const POINTS_PER_RUPEE = 25; // 25 EcoPoints = ₹1

const QUICK_PRESETS = [
    { pts: 25, rs: 1 },
    { pts: 50, rs: 2 },
    { pts: 100, rs: 4 },
    { pts: 250, rs: 10 },
    { pts: 500, rs: 20 },
    { pts: 1000, rs: 40 }
];

export default function EcoPointsSection({ showHeader = true, compact = false }) {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [ecoPoints, setEcoPoints] = useState(0);
    const [totalEarned, setTotalEarned] = useState(0);
    const [totalRedeemed, setTotalRedeemed] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [selectedPreset, setSelectedPreset] = useState(100);

    useEffect(() => {
        if (!currentUser) return;

        const userDocRef = doc(db, 'customers', currentUser.uid);

        // 1. Live customer points listener
        const unsubCustomer = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.ecoPoints === undefined) {
                    try {
                        const reqQuery = query(collection(db, 'requests'), where('uid', '==', currentUser.uid));
                        const reqSnap = await getDocs(reqQuery);
                        const initialPoints = Math.max(reqSnap.size * 50, 100);
                        
                        await setDoc(userDocRef, {
                            ecoPoints: initialPoints,
                            totalEarnedPoints: initialPoints,
                            totalRedeemedPoints: 0
                        }, { merge: true });

                        setEcoPoints(initialPoints);
                        setTotalEarned(initialPoints);
                        setTotalRedeemed(0);
                    } catch {
                        setEcoPoints(data.points || 0);
                        setTotalEarned(data.points || 0);
                    }
                } else {
                    setEcoPoints(data.ecoPoints || 0);
                    setTotalEarned(data.totalEarnedPoints ?? (data.ecoPoints || 0));
                    setTotalRedeemed(data.totalRedeemedPoints || 0);
                }
            }
        });

        // 2. Live points history listener
        const historyRef = collection(db, 'customers', currentUser.uid, 'pointsHistory');
        const q = query(historyRef, orderBy('createdAt', 'desc'));
        
        const unsubHistory = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTransactions(list);
        }, (err) => {
            console.warn("Points history:", err.message);
        });

        return () => {
            unsubCustomer();
            unsubHistory();
        };
    }, [currentUser]);

    const rupeeDiscount = (ecoPoints / POINTS_PER_RUPEE).toFixed(0);

    return (
        <div className="space-y-6 max-w-5xl mx-auto font-sans">
            
            {/* Header */}
            {showHeader && (
                <div className="flex items-center justify-between gap-4 pb-2 border-b border-brand-brown/10">
                    <div>
                        <h1 className="text-2xl font-black text-brand-black flex items-center gap-2">
                            <Coins className="w-6 h-6 text-brand-orange" />
                            EcoPoints Wallet
                        </h1>
                        <p className="text-xs text-brand-brown/70 mt-0.5">
                            Earn points by recycling • Redeem exclusively for instant discounts in EcoShop
                        </p>
                    </div>

                    <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <Sparkles size={14} className="text-emerald-700" />
                        <span>25 pts = ₹1</span>
                    </div>
                </div>
            )}

            {/* Flat Color Wallet Hero Card (Gradient-less, Crisp Plain Colors) */}
            <div className="rounded-2xl bg-white text-brand-black p-6 sm:p-8 border border-brand-brown/15 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    
                    {/* Left: Balance */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-brand-cream rounded-lg text-xs font-bold text-brand-brown border border-brand-brown/15">
                                Spendable Balance
                            </span>
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200">
                                EcoShop Exclusive
                            </span>
                        </div>

                        <div className="flex items-baseline gap-3">
                            <span className="text-4xl sm:text-6xl font-black tracking-tight text-brand-black">
                                {ecoPoints.toLocaleString()}
                            </span>
                            <span className="text-base sm:text-xl font-extrabold text-brand-brown">
                                EcoPoints
                            </span>
                        </div>

                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-cream/60 border border-brand-brown/10 text-sm">
                            <span className="text-brand-brown/80 font-medium">Instant discount value:</span>
                            <span className="text-lg font-black text-brand-green">
                                ₹{rupeeDiscount} OFF
                            </span>
                            <span className="text-xs text-brand-brown/60 font-semibold">(25 pts = ₹1)</span>
                        </div>
                    </div>

                    {/* Right: Flat Stats & Action */}
                    <div className="flex flex-col sm:flex-row md:flex-col gap-3 justify-end min-w-[240px]">
                        <div className="grid grid-cols-2 gap-2 text-xs bg-brand-cream/40 p-3.5 rounded-xl border border-brand-brown/10">
                            <div>
                                <div className="text-[10px] text-brand-brown/60 uppercase font-bold tracking-wider">All-Time Earned</div>
                                <div className="text-sm font-black text-brand-black mt-0.5">{totalEarned.toLocaleString()} pts</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-brand-brown/60 uppercase font-bold tracking-wider">EcoShop Spent</div>
                                <div className="text-sm font-black text-brand-brown mt-0.5">{totalRedeemed.toLocaleString()} pts</div>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/shop')}
                            className="px-6 py-3.5 bg-brand-red hover:bg-brand-brown text-white font-extrabold text-sm rounded-xl transition-colors shadow-sm active:scale-95 flex items-center justify-center gap-2"
                        >
                            <ShoppingBag size={17} />
                            <span>Redeem in EcoShop</span>
                            <ArrowRight size={15} />
                        </button>
                    </div>

                </div>
            </div>

            {/* Flat Quick Conversion Presets */}
            <div className="bg-white rounded-2xl border border-brand-brown/10 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-brown/70">
                        Conversion Calculator: 25 EcoPoints = ₹1.00
                    </span>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                        {selectedPreset} pts = ₹{(selectedPreset / POINTS_PER_RUPEE).toFixed(0)} discount
                    </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {QUICK_PRESETS.map(item => {
                        const isSelected = selectedPreset === item.pts;
                        return (
                            <button
                                key={item.pts}
                                onClick={() => setSelectedPreset(item.pts)}
                                className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-colors border text-center ${
                                    isSelected
                                        ? 'bg-brand-brown text-white border-brand-brown'
                                        : 'bg-brand-cream/30 text-brand-brown border-brand-brown/10 hover:bg-brand-cream'
                                }`}
                            >
                                <div>{item.pts} pts</div>
                                <div className={`text-[11px] font-black mt-0.5 ${isSelected ? 'text-amber-200' : 'text-brand-green'}`}>
                                    ₹{item.rs} off
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* How You Earn (4 Flat Cards with Clean Solid Colors) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl border border-brand-brown/10 p-4 shadow-sm space-y-1">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center mb-2">
                        <Recycle size={18} />
                    </div>
                    <div className="text-xs font-bold text-brand-black">Scrap Pickup</div>
                    <div className="text-sm font-black text-brand-green">+50 pts</div>
                    <div className="text-[11px] text-brand-brown/60">per completed order</div>
                </div>

                <div className="bg-white rounded-2xl border border-brand-brown/10 p-4 shadow-sm space-y-1">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center mb-2">
                        <Scan size={18} />
                    </div>
                    <div className="text-xs font-bold text-brand-black">SmartScan AI</div>
                    <div className="text-sm font-black text-brand-orange">+25 pts</div>
                    <div className="text-[11px] text-brand-brown/60">per verified item</div>
                </div>

                <div className="bg-white rounded-2xl border border-brand-brown/10 p-4 shadow-sm space-y-1">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 flex items-center justify-center mb-2">
                        <Award size={18} />
                    </div>
                    <div className="text-xs font-bold text-brand-black">Purity Bonus</div>
                    <div className="text-sm font-black text-blue-700">+10 to +50 pts</div>
                    <div className="text-[11px] text-brand-brown/60">for sorted recyclables</div>
                </div>

                <div className="bg-white rounded-2xl border border-brand-brown/10 p-4 shadow-sm space-y-1">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-brand-red border border-red-200 flex items-center justify-center mb-2">
                        <ShoppingBag size={18} />
                    </div>
                    <div className="text-xs font-bold text-brand-black">EcoShop Savings</div>
                    <div className="text-sm font-black text-brand-red">25 pts = ₹1</div>
                    <div className="text-[11px] text-brand-brown/60">applied at checkout</div>
                </div>
            </div>

            {/* Single Compact Notice */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-brand-cream/60 border border-brand-brown/15 text-xs text-brand-brown">
                <ShieldCheck size={16} className="text-brand-brown flex-shrink-0" />
                <span className="font-medium">
                    <strong className="font-bold">EcoShop Exclusive:</strong> EcoPoints cannot be withdrawn or converted to cash. They are applied directly for discounts on EcoShop purchases.
                </span>
            </div>

            {/* Points Activity History */}
            {!compact && (
                <div className="bg-white rounded-2xl border border-brand-brown/10 p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-brand-brown/10">
                        <div className="flex items-center gap-2">
                            <History size={16} className="text-brand-brown/60" />
                            <h3 className="text-sm font-bold text-brand-black">Points Activity</h3>
                        </div>
                        <span className="text-[11px] font-bold text-brand-brown/60">
                            {transactions.length} entries
                        </span>
                    </div>

                    {transactions.length === 0 ? (
                        <div className="text-center py-8 text-brand-brown/50 space-y-1">
                            <Coins size={28} className="mx-auto text-brand-brown/30" />
                            <p className="text-xs font-bold text-brand-black">No transactions yet</p>
                            <p className="text-[11px] text-brand-brown/60">
                                Recycle scrap or scan items to earn your first EcoPoints!
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-brand-brown/5 max-h-72 overflow-y-auto">
                            {transactions.map((tx) => {
                                const isPositive = (tx.points || 0) > 0;
                                const dateStr = tx.createdAt?.toDate 
                                    ? tx.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                    : 'Recent';

                                return (
                                    <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                isPositive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-brand-red border border-red-200'
                                            }`}>
                                                {isPositive ? <TrendingUp size={14} /> : <ShoppingBag size={14} />}
                                            </div>
                                            <div className="min-w-0">
                                                <span className="font-bold text-brand-black truncate block">
                                                    {tx.title || (isPositive ? 'EcoPoints Earned' : 'EcoShop Discount')}
                                                </span>
                                                <span className="text-[10px] text-brand-brown/50">
                                                    {dateStr}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-right flex-shrink-0">
                                            <span className={`font-black ${isPositive ? 'text-brand-green' : 'text-brand-red'}`}>
                                                {isPositive ? `+${tx.points}` : tx.points} pts
                                            </span>
                                            <span className="text-[10px] text-brand-brown/60 ml-1.5 font-bold">
                                                (₹{(Math.abs(tx.points || 0) / POINTS_PER_RUPEE).toFixed(0)})
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
