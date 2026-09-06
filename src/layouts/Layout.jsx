import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, User, LayoutDashboard, History, MapPin, Scan, Menu, X, LogOut, Leaf, MessageCircle, ShoppingBag, Coins } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import logo from '../assets/logo.png';
import LocationRequiredPopup from '../components/LocationRequiredPopup';
import EcoBot from '../components/EcoBot';

export default function Layout() {
    const { currentUser } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    // Close mobile menu on route change
    React.useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    // Track unread messages
    const [unreadCount, setUnreadCount] = useState(0);
    // Track live EcoPoints balance
    const [userEcoPoints, setUserEcoPoints] = useState(0);

    React.useEffect(() => {
        if (!currentUser) return;
        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', currentUser.uid)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let count = 0;
            snapshot.forEach(doc => {
                count += (doc.data().unreadCount?.[currentUser.uid] || 0);
            });
            setUnreadCount(count);
        });

        // Live EcoPoints
        const unsubPoints = onSnapshot(doc(db, 'customers', currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
                setUserEcoPoints(docSnap.data().ecoPoints || 0);
            }
        });

        return () => {
            unsubscribe();
            unsubPoints();
        };
    }, [currentUser]);

    return (
        <div className="flex h-screen bg-brand-cream overflow-hidden font-sans">
            <LocationRequiredPopup />
            <EcoBot />

            {/* Sidebar (Desktop) */}
            <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-brand-brown/10 h-full fixed left-0 top-0 z-50">
                {/* Logo Section */}
                <div className="h-24 flex items-center justify-center border-b border-brand-brown/10 px-6 bg-white">
                    <Link to={currentUser ? "/dashboard" : "/"} className="hover:opacity-90 transition-opacity">
                        <img src={logo} alt="EcoCycle" className="h-14 w-auto object-contain" />
                    </Link>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-6">
                    <div className="space-y-1.5">
                        <NavLink to="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" active={location.pathname === '/dashboard'} />
                        <NavLink to="/shop" icon={<ShoppingBag size={20} />} label="Shop" active={location.pathname === '/shop'} />
                        <NavLink 
                            to="/ecopoints" 
                            icon={<Coins size={20} />} 
                            label="EcoPoints" 
                            active={location.pathname === '/ecopoints'} 
                            badge={userEcoPoints > 0 ? `${userEcoPoints} pts` : null}
                            badgeColor="bg-amber-600 text-white"
                        />
                        <NavLink to="/messages" icon={<MessageCircle size={20} />} label="Messages" active={location.pathname === '/messages'} badge={unreadCount} />
                        <NavLink to="/history" icon={<History size={20} />} label="My Activity" active={location.pathname === '/history'} />
                    </div>

                    {/* Smart Scan Card */}
                    <div className="mt-auto">
                        <div className="bg-brand-cream/40 border border-brand-brown/10 rounded-2xl p-4 shadow-sm space-y-2.5">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-brand-red/10 text-brand-red flex items-center justify-center flex-shrink-0">
                                    <Scan className="w-4 h-4" />
                                </div>
                                <div className="font-bold text-sm text-brand-black">Got Waste?</div>
                            </div>
                            <div className="text-xs text-brand-brown/70 leading-relaxed font-medium">
                                Identify recyclables and discover upcycling ideas in seconds.
                            </div>
                            <Link
                                to="/smart-scan"
                                className="block w-full py-2.5 bg-brand-red hover:bg-[#c94328] text-white font-bold rounded-xl text-xs text-center transition-colors shadow-sm"
                            >
                                Start Smart Scan
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Footer/User Section in Sidebar */}
                {currentUser && (
                    <div className="p-4 border-t border-brand-brown/10 bg-white">
                        <Link to="/profile" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-brand-cream/40 transition-colors border border-transparent hover:border-brand-brown/10 group">
                            <div className="w-10 h-10 rounded-full bg-brand-brown text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                                {currentUser?.name?.[0]?.toUpperCase() || <User size={16} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-brand-black text-sm truncate">{currentUser?.name || 'User'}</div>
                                <div className="text-xs text-brand-brown/60 truncate">View Profile</div>
                            </div>
                        </Link>
                    </div>
                )}
            </aside>

            {/* Mobile Header & Content Wrapper */}
            <div className="flex-1 flex flex-col lg:ml-64 h-full relative">

                {/* Mobile Header */}
                <header className="lg:hidden h-16 bg-white/90 backdrop-blur-md border-b border-brand-brown/10 flex items-center justify-between px-4 sticky top-0 z-40">
                    <Link to="/" className="flex items-center gap-2">
                        <img src={logo} alt="EcoCycle" className="h-8 w-auto" />
                        <span className="font-bold text-lg text-brand-brown">EcoCycle</span>
                    </Link>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-brand-brown rounded-lg hover:bg-brand-cream">
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </header>

                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <div className="lg:hidden absolute inset-0 z-30 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
                        <div className="absolute right-0 top-16 bottom-0 w-64 bg-white p-4 shadow-xl border-l border-brand-brown/10 flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="space-y-1.5 flex-1">
                                <NavLink to="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" active={location.pathname === '/dashboard'} />
                                <NavLink to="/shop" icon={<ShoppingBag size={20} />} label="Shop" active={location.pathname === '/shop'} />
                                <NavLink 
                                    to="/ecopoints" 
                                    icon={<Coins size={20} />} 
                                    label="EcoPoints" 
                                    active={location.pathname === '/ecopoints'} 
                                    badge={userEcoPoints > 0 ? `${userEcoPoints} pts` : null}
                                    badgeColor="bg-amber-600 text-white"
                                />
                                <NavLink to="/messages" icon={<MessageCircle size={20} />} label="Messages" active={location.pathname === '/messages'} badge={unreadCount} />
                                <NavLink to="/history" icon={<History size={20} />} label="My Activity" active={location.pathname === '/history'} />
                                <NavLink to="/smart-scan" icon={<Scan size={20} />} label="Smart Scan" active={location.pathname === '/smart-scan'} />
                            </div>
                            <div className="pt-4 border-t border-brand-brown/10">
                                <NavLink to="/profile" icon={<User size={20} />} label="Profile" active={location.pathname === '/profile'} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Scrollable Content */}
                <main className="flex-1 overflow-y-auto bg-brand-cream relative scroll-smooth">
                    <div className="min-h-full flex flex-col">
                        <div className="flex-1 p-4 lg:p-8">
                            <Outlet />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

function NavLink({ to, icon, label, active, badge, badgeColor }) {
    return (
        <Link
            to={to}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-colors ${active
                ? 'bg-brand-brown text-white shadow-sm'
                : 'text-brand-brown/70 hover:bg-brand-cream/60 hover:text-brand-brown'
                }`}
        >
            <div className={active ? 'text-white' : 'text-brand-brown/60'}>{icon}</div>
            <span className="flex-1">{label}</span>
            {badge && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-center ${
                    active 
                        ? 'bg-white text-brand-brown' 
                        : (badgeColor || 'bg-brand-red text-white')
                }`}>
                    {badge}
                </span>
            )}
        </Link>
    );
}
