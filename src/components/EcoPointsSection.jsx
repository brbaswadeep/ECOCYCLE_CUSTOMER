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
                    } catch (e) {
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
                        <h1 className="text-2xl font-black text-brand-brown flex items-center gap-2">
                            <Coins className="w-6 h-6 text-amber-600" />
                            EcoPoints Wallet
                        </h1>
                        <p className="text-xs text-brand-brown/60 mt-0.5">
                            Earn points by recycling • Redeem exclusively for discounts in EcoShop
                        </p>
                    </div>

                    <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
                        <Sparkles size={14} className="text-emerald-600" />
                        <span>25 pts = ₹1</span>
                    </div>
                </div>
            )}

            {/* Modern Wallet Hero Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-brown via-[#3d190b] to-[#200b04] text-white p-6 sm:p-8 shadow-xl border border-brand-brown/20">
                <div className="absolute top-0 right-0 w-80 h-80 bg-brand-orange/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-green/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    
                    {/* Left: Balance */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-white/10 rounded-lg text-xs font-bold text-brand-cream border border-white/15">
                                Spendable Balance
                            </span>
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-lg text-[11px] font-bold border border-emerald-400/30">
                                EcoShop Exclusive
                            </span>
                        </div>

                        <div className="flex items-baseline gap-3">
                            <span className="text-4xl sm:text-6xl font-black tracking-tight text-white">
                                {ecoPoints.toLocaleString()}
                            </span>
                            <span className="text-base sm:text-xl font-bold text-brand-orange">
                                EcoPoints
                            </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-brand-cream/90">
                            <span>Instant discount value:</span>
                            <span className="text-xl font-black text-emerald-300">
                                ₹{rupeeDiscount} OFF
                            </span>
                            <span className="text-xs text-brand-cream/60">(25 pts = ₹1)</span>
                        </div>
                    </div>

                    {/* Right: Stats & Direct Action */}
                    <div className="flex flex-col sm:flex-row md:flex-col gap-3 justify-end">
                        <div className="grid grid-cols-2 gap-2 text-xs bg-black/25 p-3.5 rounded-2xl border border-white/10">
                            <div>
                                <div className="text-[10px] text-brand-cream/60 uppercase font-bold tracking-wider">All-Time Earned</div>
                                <div className="text-sm font-extrabold text-white mt-0.5">{totalEarned.toLocaleString()} pts</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-brand-cream/60 uppercase font-bold tracking-wider">EcoShop Spent</div>
                                <div className="text-sm font-extrabold text-amber-300 mt-0.5">{totalRedeemed.toLocaleString()} pts</div>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/shop')}
                            className="px-6 py-3.5 bg-brand-green hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                        >
                            <ShoppingBag size={17} />
                            <span>Redeem in EcoShop</span>
                            <ArrowRight size={15} />
                        </button>
                    </div>

                </div>
            </div>

            {/* Quick Interactive Value Presets */}
            <div className="bg-white rounded-2xl border border-brand-brown/10 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-brand-brown/70">
                        Conversion Rate: 25 EcoPoints = ₹1.00
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200/60">
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
                                className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all border text-center ${
                                    isSelected
                                        ? 'bg-brand-brown text-white border-brand-brown shadow-sm scale-102'
                                        : 'bg-brand-cream/30 text-brand-brown/80 border-brand-brown/10 hover:border-brand-brown/30 hover:bg-white'
                                }`}
                            >
                                <div>{item.pts} pts</div>
                                <div className={`text-[11px] font-black mt-0.5 ${isSelected ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                    ₹{item.rs} off
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* How You Earn (Punchy 4-Card Grid, Clean & Minimal Text) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl border border-brand-brown/10 p-4 shadow-xs space-y-1">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
                        <Recycle size={18} />
                    </div>
                    <div className="text-xs font-extrabold text-brand-brown">Scrap Pickup</div>
                    <div className="text-sm font-black text-brand-green">+50 pts</div>
                    <div className="text-[11px] text-brand-brown/50">per completed order</div>
                </div>

                <div className="bg-white rounded-2xl border border-brand-brown/10 p-4 shadow-xs space-y-1">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-2">
                        <Scan size={18} />
                    </div>
                    <div className="text-xs font-extrabold text-brand-brown">SmartScan AI</div>
                    <div className="text-sm font-black text-brand-orange">+25 pts</div>
                    <div className="text-[11px] text-brand-brown/50">per verified item</div>
                </div>

                <div className="bg-white rounded-2xl border border-brand-brown/10 p-4 shadow-xs space-y-1">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-2">
                        <Award size={18} />
                    </div>
                    <div className="text-xs font-extrabold text-brand-brown">Purity Bonus</div>
                    <div className="text-sm font-black text-blue-600">+10 to +50 pts</div>
                    <div className="text-[11px] text-brand-brown/50">for sorted recyclables</div>
                </div>

                <div className="bg-white rounded-2xl border border-brand-brown/10 p-4 shadow-xs space-y-1">
                    <div className="w-8 h-8 rounded-xl bg-red-50 text-brand-red flex items-center justify-center mb-2">
                        <ShoppingBag size={18} />
                    </div>
                    <div className="text-xs font-extrabold text-brand-brown">EcoShop Savings</div>
                    <div className="text-sm font-black text-brand-red">25 pts = ₹1</div>
                    <div className="text-[11px] text-brand-brown/50">applied at checkout</div>
                </div>
            </div>

            {/* Single Compact Notice */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900">
                <ShieldCheck size={16} className="text-amber-700 flex-shrink-0" />
                <span className="font-medium">
                    <strong className="font-bold">EcoShop Exclusive:</strong> EcoPoints cannot be withdrawn or converted to cash. They can only be used to get instant discounts on EcoShop orders.
                </span>
            </div>

            {/* Points Activity History */}
            {!compact && (
                <div className="bg-white rounded-2xl border border-brand-brown/10 p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-brand-brown/5">
                        <div className="flex items-center gap-2">
                            <History size={16} className="text-brand-brown/60" />
                            <h3 className="text-sm font-bold text-brand-brown">Points Activity</h3>
                        </div>
                        <span className="text-[11px] font-bold text-brand-brown/50">
                            {transactions.length} entries
                        </span>
                    </div>

                    {transactions.length === 0 ? (
                        <div className="text-center py-8 text-brand-brown/50 space-y-1">
                            <Coins size={28} className="mx-auto text-brand-brown/30" />
                            <p className="text-xs font-bold text-brand-brown">No transactions yet</p>
                            <p className="text-[11px] text-brand-brown/50">
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
                                                isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-brand-red'
                                            }`}>
                                                {isPositive ? <TrendingUp size={14} /> : <ShoppingBag size={14} />}
                                            </div>
                                            <div className="min-w-0">
                                                <span className="font-bold text-brand-brown truncate block">
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
                                            <span className="text-[10px] text-brand-brown/50 ml-1.5 font-bold">
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
