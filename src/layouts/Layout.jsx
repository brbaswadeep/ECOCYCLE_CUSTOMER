import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, User, LayoutDashboard, History, MapPin, Scan, Menu, X, LogOut, Leaf, MessageCircle, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';
import LocationRequiredPopup from '../components/LocationRequiredPopup';

export default function Layout() {
    const { currentUser } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    // Close mobile menu on route change
    React.useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    return (
        <div className="flex h-screen bg-brand-cream overflow-hidden font-sans">
            <LocationRequiredPopup />

            {/* Sidebar (Desktop) */}
            <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-brand-brown/10 h-full fixed left-0 top-0 z-50">
                {/* Logo Section - Icon Only, Big */}
                <div className="h-28 flex items-center justify-center border-b border-brand-brown/5">
                    <Link to={currentUser ? "/dashboard" : "/"} className="hover:scale-110 hover:rotate-3 transition-all duration-300 drop-shadow-lg">
                        <img src={logo} alt="EcoCycle" className="h-20 w-auto object-contain" />
                    </Link>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-8 px-5 flex flex-col gap-6">
                    <div className="space-y-4">
                        <NavLink to="/dashboard" icon={<LayoutDashboard size={24} />} label="Dashboard" active={location.pathname === '/dashboard'} />
                        <NavLink to="/shop" icon={<ShoppingBag size={24} />} label="Shop" active={location.pathname === '/shop'} />
                        <NavLink to="/messages" icon={<MessageCircle size={24} />} label="Messages" active={location.pathname === '/messages'} />
                        <NavLink to="/history" icon={<History size={24} />} label="My Activity" active={location.pathname === '/history'} />
                    </div>

                    {/* Smart Scan Card */}
                    <div className="mt-auto">
                        <div className="bg-gradient-to-br from-brand-red to-brand-orange rounded-2xl p-5 text-white shadow-xl transform transition-transform hover:scale-[1.02]">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                    <Scan className="w-5 h-5 text-white" />
                                </div>
                                <div className="font-bold">New Waste?</div>
                            </div>
                            <div className="text-sm opacity-90 mb-4 font-medium leading-relaxed">
                                Identify and recycle items in seconds with AI.
                            </div>
                            <Link
                                to="/smart-scan"
                                className="block w-full py-3 bg-white text-brand-red font-extrabold rounded-xl text-sm hover:bg-brand-cream transition-colors text-center shadow-md active:scale-95"
                            >
                                Start Smart Scan
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Footer/User Section in Sidebar */}
                {currentUser && (
                    <div className="p-4 border-t border-brand-brown/5 bg-brand-cream/30">
                        <Link to="/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white transition-all shadow-sm hover:shadow-md border border-transparent hover:border-brand-brown/10 group">
                            <div className="w-10 h-10 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold text-sm shadow-md">
                                {currentUser?.name?.[0]?.toUpperCase() || <User size={18} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-brand-brown text-sm truncate">{currentUser?.name || 'User'}</div>
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
                    <div className="lg:hidden absolute inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
                        <div className="absolute right-0 top-16 bottom-0 w-64 bg-white p-4 shadow-xl" onClick={e => e.stopPropagation()}>
                            <div className="space-y-2">
                                <NavLink to="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" active={location.pathname === '/dashboard'} />
                                <NavLink to="/shop" icon={<ShoppingBag size={20} />} label="Shop" active={location.pathname === '/shop'} />
                                <NavLink to="/messages" icon={<MessageCircle size={20} />} label="Messages" active={location.pathname === '/messages'} />
                                <NavLink to="/history" icon={<History size={20} />} label="My Activity" active={location.pathname === '/history'} />
                                <NavLink to="/smart-scan" icon={<Scan size={20} />} label="Smart Scan" active={location.pathname === '/smart-scan'} />
                                <div className="h-px bg-brand-brown/10 my-4" />
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

function NavLink({ to, icon, label, active }) {
    return (
        <Link
            to={to}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 ${active
                ? 'bg-brand-brown text-white shadow-lg shadow-brand-brown/20'
                : 'text-brand-brown/70 hover:bg-brand-brown/5 hover:text-brand-brown'
                }`}
        >
            <div className={`${active ? 'text-white' : 'text-current'}`}>{icon}</div>
            <span>{label}</span>
        </Link>
    );
}
