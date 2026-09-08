import { useAuth } from '../context/AuthContext';
import { 
    BarChart3, Leaf, Recycle, User, Phone, Mail, X, Scan, 
    DollarSign, ArrowRight, Sparkles, ShoppingBag, Award, 
    ExternalLink, ChevronRight, AlertCircle, Coins
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getFirestore, doc, updateDoc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { auth } from '../firebase';

export default function Dashboard() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [wetWasteSub, setWetWasteSub] = useState(null);
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
        if (!currentUser) return;

        // 1. Live customer profile & EcoPoints listener
        const unsubUser = onSnapshot(doc(db, "customers", currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);
                if (!data.phone) {
                    setShowPhoneModal(true);
                }
            }
        });

        // 2. Live wet waste subscription listener
        const subQuery = query(
            collection(db, 'wet_waste_subscriptions'),
            where('customerId', '==', currentUser.uid)
        );
        const unsubSub = onSnapshot(subQuery, (snapshot) => {
            if (!snapshot.empty) {
                const subs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                subs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setWetWasteSub(subs[0]);
            } else {
                setWetWasteSub(null);
            }
        });

        fetchUserStats();

        return () => {
            unsubUser();
            unsubSub();
        };
    }, [currentUser, db]);

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
                        className="flex-1 md:flex-none px-5 py-3 bg-brand-red hover:bg-[#c94328] text-white font-bold rounded-xl text-sm transition-all shadow-sm hover:shadow flex items-center justify-center gap-2"
                    >
                        <Scan className="w-4 h-4" />
                        Smart Scan
                    </Link>
                    <Link
                        to="/ecowaste"
                        className="flex-1 md:flex-none px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm transition-all shadow-sm hover:shadow flex items-center justify-center gap-2"
                    >
                        <Leaf className="w-4 h-4" />
                        EcoWaste
                    </Link>
                    <Link
                        to="/shop"
                        className="flex-1 md:flex-none px-5 py-3 bg-brand-cream hover:bg-brand-brown hover:text-white text-brand-brown font-bold rounded-xl text-sm transition-all border border-brand-brown/10 flex items-center justify-center gap-2"
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
                <Link to="/ecopoints" className="bg-white rounded-2xl p-5 sm:p-6 border border-brand-brown/10 shadow-sm hover:shadow-md transition-all block group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Coins className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-amber-600">
                            EcoShop Only
                        </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-brand-black tracking-tight mb-1">
                        {userData?.ecoPoints ?? stats.points}
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-brand-brown/70 flex items-center justify-between">
                        <span>Eco-Points</span>
                        <span className="text-[11px] text-brand-orange font-bold group-hover:translate-x-0.5 transition-transform">₹{(((userData?.ecoPoints ?? stats.points) || 0) / 25).toFixed(0)} off →</span>
                    </div>
                </Link>
            </div>

            {/* 3. Main Dashboard Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                      {/* Left (2 Columns): Recent Activity & EcoWaste */}
                <div className="lg:col-span-2 space-y-6">

                    {/* EcoWaste Daily Wet Waste Status / Banner */}
                    {wetWasteSub ? (
                        <div className="bg-white rounded-2xl border border-brand-brown/10 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                                    <Leaf className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-extrabold text-base text-brand-black">EcoWaste Daily Route</h3>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                            wetWasteSub.status === 'paused' 
                                                ? 'bg-amber-100 text-amber-800' 
                                                : 'bg-emerald-100 text-emerald-800'
                                        }`}>
                                            {wetWasteSub.status === 'paused' ? 'Paused' : 'Active Pickup'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-brand-brown/70 mt-0.5">
                                        Slot: <strong className="text-brand-brown">{wetWasteSub.preferredSlot || 'Morning (7-9 AM)'}</strong> • Min: {wetWasteSub.thresholdKg || 2} kg @ ₹0.50/kg
                                    </p>
                                </div>
                            </div>

                            <Link
                                to="/ecowaste"
                                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 flex-shrink-0"
                            >
                                <span>Manage Route</span>
                                <ArrowRight size={13} />
                            </Link>
                        </div>
                    ) : (
                        <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200/70 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                                    <Leaf className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-sm text-emerald-950">Daily Wet Waste Pickups (₹0.50 / kg)</h3>
                                    <p className="text-xs text-emerald-800/90 mt-0.5">
                                        Sell fruit peels & kitchen waste daily. Threshold pickups by certified local vendors.
                                    </p>
                                </div>
                            </div>

                            <Link
                                to="/ecowaste"
                                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1 flex-shrink-0"
                            >
                                <span>Start EcoWaste</span>
                                <ArrowRight size={13} />
                            </Link>
                        </div>
                    )}

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

                        <div className="divide-y divide-brand-brown/5">
                            {recentActivity.length > 0 ? (
                                recentActivity.map((activity) => {
                                    const statusColors = {
                                        pending: 'bg-amber-100 text-amber-800 border-amber-200',
                                        accepted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                                        rejected: 'bg-rose-100 text-rose-800 border-rose-200',
                                        completed: 'bg-blue-100 text-blue-800 border-blue-200'
                                    };

                                    return (
                                        <div 
                                            key={activity.id} 
                                            onClick={() => navigate(`/history/${activity.id}`)}
                                            className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4 group cursor-pointer hover:bg-brand-cream/20 p-2 rounded-xl transition-all"
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="w-12 h-12 rounded-xl bg-brand-cream/50 border border-brand-brown/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                    {activity.itemDetails?.imageUrl ? (
                                                        <img 
                                                            src={activity.itemDetails.imageUrl} 
                                                            alt={activity.itemDetails.name} 
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <Recycle className="w-6 h-6 text-brand-brown/40" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-sm text-brand-black truncate group-hover:text-brand-brown transition-colors">
                                                        {activity.itemDetails?.name || 'Recycling Request'}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-brand-brown/60 font-medium">
                                                        <span className="capitalize">{activity.itemDetails?.material || 'Mixed'}</span>
                                                        <span>•</span>
                                                        <span>{activity.createdAt?.toDate ? activity.createdAt.toDate().toLocaleDateString() : 'Recent'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right flex-shrink-0">
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${statusColors[activity.status] || 'bg-gray-100 text-gray-700'}`}>
                                                    {activity.status || 'Pending'}
                                                </span>
                                                {activity.finalQuote?.customerEarnings ? (
                                                    <div className="text-xs font-bold text-brand-green mt-1">
                                                        +₹{activity.finalQuote.customerEarnings}
                                                    </div>
                                                ) : activity.itemDetails?.askingPrice ? (
                                                    <div className="text-xs font-bold text-brand-brown mt-1">
                                                        Est. ₹{activity.itemDetails.askingPrice}
                                                    </div>
                                                ) : null}
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
                    <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200/60 p-5 text-emerald-950 shadow-sm">
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
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

            {/* 4. Quick Actions / Features Row (Full Width 3 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link 
                    to="/smart-scan" 
                    className="bg-white p-5 rounded-2xl border border-brand-brown/10 shadow-sm hover:shadow-md hover:border-brand-brown/20 transition-all group flex items-start gap-4"
                >
                    <div className="w-11 h-11 rounded-xl bg-brand-red/10 text-brand-red flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                        <Scan className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-brand-black text-sm group-hover:text-brand-red transition-colors flex items-center gap-1.5">
                            SmartScan AI 
                            <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </h4>
                        <p className="text-xs text-brand-brown/60 mt-1 leading-relaxed">
                            AI photo scanner with 5-step cross-verification questionnaires.
                        </p>
                    </div>
                </Link>

                <Link 
                    to="/ecowaste" 
                    className="bg-white p-5 rounded-2xl border border-brand-brown/10 shadow-sm hover:shadow-md hover:border-brand-brown/20 transition-all group flex items-start gap-4"
                >
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                        <Leaf className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-brand-black text-sm group-hover:text-emerald-800 transition-colors flex items-center gap-1.5">
                            EcoWaste Pickup 
                            <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </h4>
                        <p className="text-xs text-brand-brown/60 mt-1 leading-relaxed">
                            Daily wet waste doorstep collection @ ₹0.50/kg subscription.
                        </p>
                    </div>
                </Link>

                <Link 
                    to="/shop" 
                    className="bg-white p-5 rounded-2xl border border-brand-brown/10 shadow-sm hover:shadow-md hover:border-brand-brown/20 transition-all group flex items-start gap-4"
                >
                    <div className="w-11 h-11 rounded-xl bg-brand-orange/15 text-brand-brown flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                        <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-brand-black text-sm group-hover:text-brand-brown transition-colors flex items-center gap-1.5">
                            EcoShop Store 
                            <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </h4>
                        <p className="text-xs text-brand-brown/60 mt-1 leading-relaxed">
                            Handcrafted goods from makers with EcoPoints discounts.
                        </p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
