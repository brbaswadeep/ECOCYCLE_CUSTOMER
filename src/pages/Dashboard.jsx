import { useAuth } from '../context/AuthContext';
import { BarChart3, Leaf, Recycle, MapPin, LogOut, User, Phone, Mail, X, Scan } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getFirestore, doc, updateDoc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { auth } from '../firebase';

export default function Dashboard() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [stats, setStats] = useState({
        itemsRecycled: 0,
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
        const docRef = doc(db, "customers", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            if (!data.phone) {
                setShowPhoneModal(true);
            }
        }
    }

    async function fetchUserStats() {
        try {
            const q = query(
                collection(db, 'requests'),
                where('uid', '==', currentUser.uid),
                // orderBy('createdAt', 'desc') // Requires index, handle client side sort if needed
            );

            const querySnapshot = await getDocs(q);
            const requests = [];
            let totalItems = 0;

            querySnapshot.forEach(doc => {
                const data = doc.data();
                requests.push({ id: doc.id, ...data });
                totalItems += 1; // Assuming 1 request = 1 item or group
            });

            // Sort by date desc
            requests.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            setStats({
                itemsRecycled: totalItems,
                co2Saved: (totalItems * 0.5).toFixed(1), // Mock: 0.5kg per item
                points: totalItems * 50 // Mock: 50 pts per item
            });

            setRecentActivity(requests.slice(0, 5));

        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    }

    async function handleLogout() {
        try {
            await logout();
            navigate('/');
        } catch (error) {
            console.error("Failed to log out", error);
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

    const statCards = [
        { label: 'Items Recycled', value: stats.itemsRecycled, icon: <Recycle className="w-5 h-5 text-brand-red" />, change: 'Total Lifetime' },
        { label: 'CO2 Saved', value: `${stats.co2Saved}kg`, icon: <Leaf className="w-5 h-5 text-brand-green" />, change: 'Estimated Impact' },
        { label: 'Points Earned', value: stats.points, icon: <BarChart3 className="w-5 h-5 text-brand-brown" />, change: 'Redeemable Soon' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Phone Number Modal */}
            {showPhoneModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setShowPhoneModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-brand-red"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-brand-red/10 rounded-full flex items-center justify-center mx-auto mb-3 text-brand-red">
                                <Phone className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-brand-black">Complete Your Profile</h2>
                            <p className="text-sm text-brand-brown/70 mt-1">Please provide your mobile number to continue.</p>
                        </div>

                        <form onSubmit={handleUpdatePhone}>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-brand-black mb-1.5 uppercase tracking-wide">Mobile Number <span className="text-brand-red">*</span></label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        required
                                        value={newPhone}
                                        onChange={(e) => setNewPhone(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red text-brand-black placeholder-gray-400 transition-colors"
                                        placeholder="+1 (555) 000-0000"
                                    />
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-brand-red text-white font-bold rounded-xl hover:bg-brand-brown transition-all disabled:opacity-70"
                            >
                                {loading ? 'Saving...' : 'Save Mobile Number'}
                            </button>
                        </form>
                    </div>
                </div>
            )}


            {/* 3D "Frame" Aesthetics: Soft Shadows & Rounded Elements */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-[8px_8px_16px_rgba(0,0,0,0.05),-8px_-8px_16px_rgba(255,255,255,0.8)] border border-white">
                <div>
                    <h1 className="text-3xl font-extrabold text-brand-black tracking-tight">
                        Hi, <span className="text-brand-red inline-block hover:animate-pulse cursor-default">{userData?.name || currentUser?.displayName || 'EcoWarrior'}</span>! 👋
                    </h1>
                    <p className="text-brand-brown font-medium opacity-60 mt-1">Ready to make the world greener today?</p>
                </div>
                <Link to="/smart-scan" className="px-8 py-4 bg-gradient-to-r from-brand-red to-brand-orange text-white font-bold rounded-2xl shadow-[4px_4px_10px_rgba(234,67,53,0.3)] hover:shadow-[6px_6px_15px_rgba(234,67,53,0.4)] transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-2">
                    <Scan className="w-5 h-5 animate-bounce-slow" />
                    Start Smart Scan
                </Link>
            </div>

            {/* Profile Card & Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Card - Cute 3D Style */}
                <div className="bg-white p-8 rounded-[2rem] shadow-[10px_10px_20px_rgba(0,0,0,0.03),-10px_-10px_20px_rgba(255,255,255,0.8)] border border-white flex flex-col justify-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cream rounded-bl-full -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>

                    <div className="flex items-center gap-6 mb-8 relative z-10">
                        <div className="w-24 h-24 bg-brand-cream rounded-full flex items-center justify-center border-4 border-white shadow-md text-brand-brown font-bold text-3xl transform group-hover:rotate-6 transition-transform duration-300">
                            {userData?.name?.[0] || <User className="w-10 h-10" />}
                        </div>
                        <div>
                            <h3 className="font-extrabold text-xl text-brand-black">{userData?.name || 'User Name'}</h3>
                            <span className="inline-block px-4 py-1.5 bg-brand-green/10 text-brand-green text-xs font-bold rounded-full uppercase tracking-wide mt-2 shadow-sm">
                                {userData?.role || 'EcoWarrior'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-brand-brown/5 relative z-10">
                        <div className="flex items-center gap-4 text-sm text-brand-brown font-bold">
                            <div className="p-2.5 bg-brand-cream rounded-xl shadow-sm text-brand-red"><Mail className="w-4 h-4" /></div>
                            <span className="truncate opacity-80">{userData?.email || currentUser?.email}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-brand-brown font-bold">
                            <div className="p-2.5 bg-brand-cream rounded-xl shadow-sm text-brand-red"><Phone className="w-4 h-4" /></div>
                            <span className="opacity-80">{userData?.phone || 'No phone linked'}</span>
                            {!userData?.phone && (
                                <button onClick={() => setShowPhoneModal(true)} className="text-xs text-brand-red font-extrabold underline decoration-2 ml-auto hover:text-brand-orange">
                                    Link Now
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats - Cute Cards */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {statCards.map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-[2rem] shadow-[8px_8px_16px_rgba(0,0,0,0.03),-8px_-8px_16px_rgba(255,255,255,0.8)] border border-white hover:-translate-y-2 transition-transform duration-300 group cursor-default">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-4 rounded-2xl shadow-inner ${i === 0 ? 'bg-brand-red/10 text-brand-red' : i === 1 ? 'bg-brand-green/10 text-brand-green' : 'bg-brand-brown/10 text-brand-brown'}`}>
                                    {stat.icon}
                                </div>
                                <span className="text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wide bg-gray-50 text-gray-400">
                                    {stat.change}
                                </span>
                            </div>
                            <div className="text-4xl font-black text-brand-black mb-2 tracking-tight group-hover:scale-105 transition-transform origin-left">{stat.value}</div>
                            <div className="text-xs text-brand-brown/50 font-extrabold uppercase tracking-widest">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Activity - Cute List */}
            <div className="bg-white rounded-[2.5rem] shadow-[12px_12px_24px_rgba(0,0,0,0.04),-12px_-12px_24px_rgba(255,255,255,0.9)] border border-white p-8">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-extrabold text-brand-black flex items-center gap-3">
                        <div className="p-2 bg-brand-brown/10 rounded-xl text-brand-brown"><Recycle className="w-6 h-6" /></div>
                        Recent Activity
                    </h2>
                    <Link to="/history" className="px-4 py-2 bg-brand-cream text-brand-brown font-bold rounded-xl text-sm hover:bg-brand-brown hover:text-white transition-colors">View All</Link>
                </div>

                <div className="space-y-4">
                    {recentActivity.length > 0 ? (
                        recentActivity.map((item) => (
                            <div key={item.id} className="flex items-center gap-6 p-5 rounded-3xl border-2 border-transparent hover:border-brand-cream hover:bg-brand-cream/30 transition-all cursor-pointer group" onClick={() => navigate(`/orders/${item.id}`)}>
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-brand-brown shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform border border-brand-brown/5">
                                    {item.itemDetails?.material === 'Plastic' ? <Recycle className="w-7 h-7" /> : <Leaf className="w-7 h-7" />}
                                </div>
                                <div className="flex-1">
                                    <div className="font-extrabold text-brand-black text-lg group-hover:text-brand-red transition-colors">{item.itemName || 'Recycled Item'}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="h-1.5 w-1.5 rounded-full bg-brand-green"></div>
                                        <div className="text-xs text-brand-brown/60 font-bold uppercase tracking-wide">
                                            {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Just now'} • {item.status}
                                        </div>
                                    </div>
                                </div>
                                <div className="font-black text-brand-green bg-white shadow-sm px-4 py-2 rounded-xl border border-brand-green/10 group-hover:bg-brand-green group-hover:text-white transition-colors">+50 pts</div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-16 text-brand-brown/40 font-bold bg-brand-cream/20 rounded-3xl border-3 border-dashed border-brand-brown/5 flex flex-col items-center gap-4">
                            <div className="w-20 h-20 bg-brand-cream rounded-full flex items-center justify-center opacity-50 animate-bounce">
                                <Scan className="w-8 h-8" />
                            </div>
                            No recent activity found. <br /> Start your first scan today!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
