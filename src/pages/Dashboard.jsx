import { useAuth } from '../context/AuthContext';
import { 
    BarChart3, Leaf, Recycle, User, Phone, Mail, X, Scan, 
    DollarSign, ArrowRight, Sparkles, ShoppingBag, Award, 
    ExternalLink, ChevronRight, AlertCircle
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getFirestore, doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth } from '../firebase';

export default function Dashboard() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [stats, setStats] = useState({
        itemsRecycled: 0,
        itemsSold: 0,
        earnings: 0,
        co2Saved: 0,
        points: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [showPhoneModal, setShowPhoneModal] = useState(false);
    const [newPhone, setNewPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const db = getFirestore(auth.app);

    useEffect(() => {
        if (currentUser) {
            fetchUserData();
            fetchUserStats();
        }
    }, [currentUser, db]);

    async function fetchUserData() {
        try {
            const docRef = doc(db, "customers", currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);
                if (!data.phone) {
                    setShowPhoneModal(true);
                }
            }
        } catch (err) {
            console.error("Error fetching user data:", err);
        }
    }

    async function fetchUserStats() {
        try {
            const q = query(
                collection(db, 'requests'),
                where('uid', '==', currentUser.uid),
            );

            const querySnapshot = await getDocs(q);
            const requests = [];
            let totalItems = 0;
            let soldItems = 0;
            let totalEarnings = 0;
            let totalCO2 = 0;

            querySnapshot.forEach(doc => {
                const data = doc.data();
                requests.push({ id: doc.id, ...data });
                totalItems += 1;

                if (data.itemDetails?.requestType === 'sell' && data.status === 'accepted') {
                    soldItems += 1;
                    if (data.finalQuote?.customerEarnings) {
                        totalEarnings += data.finalQuote.customerEarnings;
                    } else {
                        totalEarnings += data.itemDetails?.askingPrice || 0;
                    }
                }

                if (data.itemDetails?.analysis?.environmental_impact) {
                    const impact = data.itemDetails.analysis.environmental_impact;
                    totalCO2 += impact.co2_saved_kg || impact.CO2_saved_kg || 0;
                }
            });

            requests.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            setStats({
                itemsRecycled: totalItems,
                itemsSold: soldItems,
                earnings: totalEarnings,
                co2Saved: totalCO2.toFixed(1),
                points: totalItems * 50
            });

            setRecentActivity(requests.slice(0, 5));

        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    }

    async function handleUpdatePhone(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const docRef = doc(db, "customers", currentUser.uid);
            await updateDoc(docRef, {
                phone: newPhone
            });
            setUserData(prev => ({ ...prev, phone: newPhone }));
            setShowPhoneModal(false);
        } catch (error) {
            console.error("Error updating phone:", error);
            alert("Failed to update phone number. Please try again.");
        }
        setLoading(false);
    }

    // Tier calculation based on eco-points
    const userPoints = stats.points || 0;
    const currentTier = userPoints >= 500 ? "Green Guardian" : userPoints >= 200 ? "Eco Advocate" : "Green Starter";
    const nextTierTarget = userPoints >= 500 ? 1000 : userPoints >= 200 ? 500 : 200;
    const tierProgress = Math.min(100, Math.round((userPoints / nextTierTarget) * 100));

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
            {/* Phone Number Modal */}
            {showPhoneModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-brand-brown/10 relative">
                        <button
                            onClick={() => setShowPhoneModal(false)}
                            className="absolute top-4 right-4 text-brand-brown/40 hover:text-brand-red transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-brand-red/10 rounded-2xl flex items-center justify-center mx-auto mb-3 text-brand-red">
                                <Phone className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-brand-black">Link Mobile Number</h2>
                            <p className="text-sm text-brand-brown/60 mt-1">Needed for coordinating waste pickups and quotes.</p>
                        </div>

                        <form onSubmit={handleUpdatePhone} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-brand-brown mb-1.5 uppercase tracking-wide">
                                    Mobile Number <span className="text-brand-red">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        required
                                        value={newPhone}
                                        onChange={(e) => setNewPhone(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-brand-brown/15 rounded-xl focus:outline-none focus:border-brand-brown focus:ring-1 focus:ring-brand-brown text-brand-black placeholder-gray-400 text-sm font-medium transition-colors"
                                        placeholder="+91 98765 43210"
                                    />
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-brand-brown text-white font-bold rounded-xl hover:bg-brand-black transition-all disabled:opacity-50 text-sm shadow-sm"
                            >
                                {loading ? 'Saving...' : 'Save Mobile Number'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 1. Header Banner */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-brand-brown/10 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-black tracking-tight">
                        Hi, <span className="text-brand-brown">{userData?.name || currentUser?.displayName || 'EcoWarrior'}</span>! 👋
                    </h1>
                    <p className="text-sm sm:text-base text-brand-brown/70 font-medium">
                        Track your recycling progress, earnings, and positive carbon impact.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <Link
                        to="/smart-scan"
                        className="flex-1 md:flex-none px-6 py-3.5 bg-brand-red hover:bg-[#c94328] text-white font-bold rounded-xl text-sm transition-all shadow-sm hover:shadow flex items-center justify-center gap-2"
                    >
                        <Scan className="w-4 h-4" />
                        Smart Scan
                    </Link>
                    <Link
                        to="/shop"
                        className="flex-1 md:flex-none px-6 py-3.5 bg-brand-cream hover:bg-brand-brown hover:text-white text-brand-brown font-bold rounded-xl text-sm transition-all border border-brand-brown/10 flex items-center justify-center gap-2"
                    >
                        <ShoppingBag className="w-4 h-4" />
                        EcoShop
                    </Link>
                </div>
            </div>

            {/* 2. Key Metrics Grid (4 Balanced Cards) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Items Recycled */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-brand-brown/10 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl bg-brand-red/10 text-brand-red flex items-center justify-center">
                            <Recycle className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-brand-brown/40">
                            Lifetime
                        </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-brand-black tracking-tight mb-1">
                        {stats.itemsRecycled}
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-brand-brown/70">
                        Items Recycled
                    </div>
                </div>

                {/* Earnings */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-brand-brown/10 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-brand-green">
                            {stats.itemsSold} Sold
                        </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-brand-black tracking-tight mb-1">
                        ₹{stats.earnings}
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-brand-brown/70">
                        Waste Earnings
                    </div>
                </div>

                {/* CO2 Saved */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-brand-brown/10 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Leaf className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-emerald-600">
                            Impact
                        </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-brand-black tracking-tight mb-1">
                        {stats.co2Saved} <span className="text-base font-semibold text-brand-brown/60">kg</span>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-brand-brown/70">
                        CO₂ Prevented
                    </div>
                </div>

                {/* Points */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-brand-brown/10 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Award className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-amber-600">
                            Rewards
                        </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-brand-black tracking-tight mb-1">
                        {stats.points}
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-brand-brown/70">
                        Eco-Points
                    </div>
                </div>
            </div>

            {/* 3. Main Dashboard Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left (2 Columns): Recent Activity */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-brand-brown/10 p-6 sm:p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-brand-brown/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-brand-cream rounded-xl text-brand-brown">
                                    <Recycle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-bold text-brand-black">Recent Activity</h2>
                                    <p className="text-xs text-brand-brown/60">Your latest recycling & sell requests</p>
                                </div>
                            </div>
                            <Link 
                                to="/history" 
                                className="text-xs sm:text-sm font-bold text-brand-brown hover:text-brand-red flex items-center gap-1 transition-colors group"
                            >
                                View All 
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>

                        <div className="space-y-3">
                            {recentActivity.length > 0 ? (
                                recentActivity.map((item) => {
                                    const status = item.status || 'pending';
                                    const isAccepted = status === 'accepted';
                                    const isRejected = status === 'rejected';

                                    return (
                                        <div 
                                            key={item.id} 
                                            onClick={() => navigate(`/orders/${item.id}`)}
                                            className="flex items-center justify-between p-4 rounded-xl border border-brand-brown/5 hover:border-brand-brown/20 bg-brand-cream/15 hover:bg-white transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="w-11 h-11 rounded-xl bg-white border border-brand-brown/10 flex items-center justify-center text-brand-brown group-hover:scale-105 transition-transform flex-shrink-0">
                                                    {item.itemDetails?.material === 'Plastic' ? <Recycle className="w-5 h-5 text-brand-red" /> : <Leaf className="w-5 h-5 text-brand-green" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-brand-black text-sm sm:text-base truncate group-hover:text-brand-red transition-colors">
                                                        {item.itemName || item.itemDetails?.goal || 'Recycled Item'}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-brand-brown/50">
                                                        <span>
                                                            {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Recent'}
                                                        </span>
                                                        <span>•</span>
                                                        <span className="capitalize">{item.itemDetails?.requestType || 'Recycle'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${
                                                    isAccepted ? 'text-green-700 bg-green-50' :
                                                    isRejected ? 'text-red-700 bg-red-50' :
                                                    'text-amber-700 bg-amber-50'
                                                }`}>
                                                    {status}
                                                </span>
                                                <span className="text-xs font-bold text-brand-green hidden sm:inline-block">
                                                    +50 pts
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-brand-brown/10 bg-brand-cream/20">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 text-brand-brown/40 border border-brand-brown/10">
                                        <Scan className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-brand-black text-sm mb-1">No Activity Found</h3>
                                    <p className="text-xs text-brand-brown/60 max-w-sm mx-auto mb-4">
                                        Start your green journey today! Scan waste items to calculate their value and recycle them.
                                    </p>
                                    <Link 
                                        to="/smart-scan"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-brown text-white font-bold rounded-lg text-xs hover:bg-brand-black transition-colors"
                                    >
                                        <Scan className="w-3.5 h-3.5" /> Start Your First Scan
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Features Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Link 
                            to="/smart-scan" 
                            className="bg-white p-5 rounded-2xl border border-brand-brown/10 shadow-sm hover:shadow-md transition-all group flex items-start gap-4"
                        >
                            <div className="w-10 h-10 rounded-xl bg-brand-red/10 text-brand-red flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Scan className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-brand-black text-sm group-hover:text-brand-red transition-colors flex items-center gap-1">
                                    AI Waste Identifier <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </h4>
                                <p className="text-xs text-brand-brown/60 mt-1 leading-relaxed">
                                    Upload photos of recyclables to identify materials and estimate market value.
                                </p>
                            </div>
                        </Link>

                        <Link 
                            to="/shop" 
                            className="bg-white p-5 rounded-2xl border border-brand-brown/10 shadow-sm hover:shadow-md transition-all group flex items-start gap-4"
                        >
                            <div className="w-10 h-10 rounded-xl bg-brand-orange/15 text-brand-brown flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ShoppingBag className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-brand-black text-sm group-hover:text-brand-brown transition-colors flex items-center gap-1">
                                    EcoShop Marketplace <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </h4>
                                <p className="text-xs text-brand-brown/60 mt-1 leading-relaxed">
                                    Browse handcrafted goods and planters made from 100% reclaimed waste.
                                </p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Right (1 Column): Profile Card & Eco Impact Summary */}
                <div className="space-y-6">
                    {/* Profile Card */}
                    <div className="bg-white rounded-2xl border border-brand-brown/10 p-6 shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-full bg-brand-brown text-white flex items-center justify-center font-extrabold text-2xl shadow-sm flex-shrink-0">
                                {userData?.name?.[0]?.toUpperCase() || currentUser?.displayName?.[0]?.toUpperCase() || <User className="w-8 h-8" />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-extrabold text-lg text-brand-black truncate">
                                    {userData?.name || currentUser?.displayName || 'EcoWarrior'}
                                </h3>
                                <p className="text-xs font-bold text-brand-green mt-0.5 tracking-wide">
                                    {userData?.role || 'EcoWarrior'}
                                </p>
                            </div>
                        </div>

                        {/* Contact Details */}
                        <div className="space-y-3 pt-4 border-t border-brand-brown/10 text-xs font-medium text-brand-brown">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-cream rounded-lg text-brand-brown">
                                    <Mail className="w-3.5 h-3.5" />
                                </div>
                                <span className="truncate">{userData?.email || currentUser?.email}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 bg-brand-cream rounded-lg text-brand-brown">
                                        <Phone className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="truncate">{userData?.phone || 'No phone linked'}</span>
                                </div>
                                {!userData?.phone && (
                                    <button 
                                        onClick={() => setShowPhoneModal(true)}
                                        className="text-xs font-bold text-brand-red hover:underline flex-shrink-0"
                                    >
                                        Link
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Impact Level Progress */}
                        <div className="mt-6 pt-5 border-t border-brand-brown/10">
                            <div className="flex justify-between items-center text-xs mb-2 font-bold">
                                <span className="text-brand-black">{currentTier}</span>
                                <span className="text-brand-green font-extrabold">{userPoints} pts</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-brand-green rounded-full transition-all duration-700" 
                                    style={{ width: `${tierProgress}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[11px] text-brand-brown/50 mt-1.5 font-medium">
                                <span>Level Progress</span>
                                <span>{nextTierTarget - userPoints > 0 ? `${nextTierTarget - userPoints} pts to next tier` : 'Top Tier!'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Green Tip Card */}
                    <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200/60 p-5 text-emerald-950">
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                                <Leaf className="w-4 h-4" />
                            </div>
                            <h4 className="font-bold text-sm text-emerald-900">Eco Fact of the Day</h4>
                        </div>
                        <p className="text-xs text-emerald-800/90 leading-relaxed">
                            Recycling 1 ton of plastic saves approximately 5,774 kWh of electricity and prevents 1.5 tons of carbon emissions.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
