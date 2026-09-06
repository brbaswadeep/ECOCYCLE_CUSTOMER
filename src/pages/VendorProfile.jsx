import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    onSnapshot
} from 'firebase/firestore';
import {
    Store,
    MapPin,
    Phone,
    Star,
    MessageCircle,
    ArrowLeft,
    Package,
    Recycle,
    CheckCircle2,
    Clock,
    ShoppingBag,
    ChevronRight,
    Loader2,
    Calendar,
    ExternalLink
} from 'lucide-react';
import ChatModal from '../components/ChatModal';

export default function VendorProfile() {
    const { vendorId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [vendor, setVendor] = useState(null);
    const [loadingVendor, setLoadingVendor] = useState(true);

    const [requests, setRequests] = useState([]);
    const [storeOrders, setStoreOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);

    const [filterTab, setFilterTab] = useState('all'); // 'all' | 'requests' | 'orders'
    const [showChat, setShowChat] = useState(false);

    // 1. Fetch Vendor Details
    useEffect(() => {
        if (!vendorId) return;

        async function fetchVendor() {
            setLoadingVendor(true);
            try {
                const snap = await getDoc(doc(db, 'vendors', vendorId));
                if (snap.exists()) {
                    setVendor({ id: snap.id, ...snap.data() });
                } else {
                    setVendor(null);
                }
            } catch (err) {
                console.error("Error loading vendor profile:", err);
            } finally {
                setLoadingVendor(false);
            }
        }

        fetchVendor();
    }, [vendorId]);

    // 2. Query Orders Created by Current User with This Vendor
    useEffect(() => {
        if (!currentUser || !vendorId) return;

        setLoadingOrders(true);

        // A. Service / Recycle Requests where acceptedBy == vendorId
        const reqQuery = query(
            collection(db, 'requests'),
            where('customerId', '==', currentUser.uid)
        );

        const unsubRequests = onSnapshot(reqQuery, (snapshot) => {
            const list = snapshot.docs
                .map(d => ({ id: d.id, ...d.data(), kind: 'request' }))
                .filter(r => r.acceptedBy === vendorId);
            setRequests(list);
        }, (err) => console.error("Requests listener error:", err));

        // B. EcoShop Orders where vendorId == vendorId
        const orderQuery = query(
            collection(db, 'orders'),
            where('customerId', '==', currentUser.uid)
        );

        const unsubOrders = onSnapshot(orderQuery, (snapshot) => {
            const list = snapshot.docs
                .map(d => ({ id: d.id, ...d.data(), kind: 'storeOrder' }))
                .filter(o => o.vendorId === vendorId);
            setStoreOrders(list);
            setLoadingOrders(false);
        }, (err) => {
            console.error("Orders listener error:", err);
            setLoadingOrders(false);
        });

        return () => {
            unsubRequests();
            unsubOrders();
        };
    }, [currentUser, vendorId]);

    // Combined & Sorted Orders
    const allOrders = [...requests, ...storeOrders].sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt?.seconds * 1000 || 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt?.seconds * 1000 || 0);
        return timeB - timeA;
    });

    const filteredOrders = allOrders.filter(item => {
        if (filterTab === 'requests') return item.kind === 'request';
        if (filterTab === 'orders') return item.kind === 'storeOrder';
        return true;
    });

    // Statistics
    const totalOrdersCount = allOrders.length;
    const completedCount = allOrders.filter(o =>
        o.status === 'completed' || o.status === 'delivered' || o.projectMeta?.trackingStage === 'completed'
    ).length;
    const totalSpentOrEarned = allOrders.reduce((sum, o) => {
        const val = Number(o.total || o.price || o.finalPrice || o.proposedPrice || 0);
        return sum + (isNaN(val) ? 0 : val);
    }, 0);

    const vendorDisplayName = vendor?.businessName || vendor?.name || 'Verified Vendor';
    const vendorAddress = vendor?.address || vendor?.location?.address || 'Location Verified';
    const vendorPhone = vendor?.phone || vendor?.contactPerson;

    if (loadingVendor) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-brand-brown">
                <Loader2 className="w-9 h-9 text-brand-orange animate-spin" />
                <p className="text-sm font-semibold">Loading vendor profile...</p>
            </div>
        );
    }

    if (!vendor) {
        return (
            <div className="max-w-xl mx-auto text-center py-20 bg-white rounded-3xl border border-brand-brown/10 p-8 shadow-sm">
                <Store className="w-16 h-16 text-brand-brown/30 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-brand-black mb-2">Vendor Not Found</h2>
                <p className="text-sm text-brand-brown/60 mb-6">The vendor you are looking for does not exist or has been deactivated.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-6 py-2.5 bg-brand-brown text-white font-semibold rounded-xl hover:bg-brand-black transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl border border-brand-brown/10 text-brand-brown font-semibold text-xs sm:text-sm hover:bg-brand-cream/50 transition-colors shadow-2xs"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>
                <span className="text-xs font-bold text-brand-brown/60 bg-brand-cream/80 px-3 py-1 rounded-lg border border-brand-brown/10">
                    Vendor Partner Profile
                </span>
            </div>

            {/* Vendor Profile Header Card */}
            <div className="bg-white rounded-3xl border border-brand-brown/10 p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-brand-cream border-2 border-brand-brown/15 flex items-center justify-center text-brand-brown font-black text-3xl shadow-sm shrink-0">
                            {vendorDisplayName[0]?.toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-black tracking-tight">
                                    {vendorDisplayName}
                                </h1>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified Partner
                                </span>
                            </div>

                            <p className="text-sm text-brand-brown/70 font-medium mt-1">
                                {vendor.contactPerson ? `Contact: ${vendor.contactPerson}` : 'EcoCycle Registered Collector & Upcycler'}
                            </p>

                            <div className="flex items-center gap-4 mt-3 flex-wrap text-xs text-brand-brown/70 font-medium">
                                <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg font-bold border border-amber-200">
                                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                    <span>{vendor.rating ? Number(vendor.rating).toFixed(1) : 'New'}</span>
                                    {vendor.ratingCount && <span className="text-amber-700/60">({vendor.ratingCount})</span>}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4 text-brand-brown/50" />
                                    <span className="truncate max-w-xs">{vendorAddress}</span>
                                </div>
                                {vendorPhone && (
                                    <div className="flex items-center gap-1.5">
                                        <Phone className="w-4 h-4 text-brand-brown/50" />
                                        <span>{vendorPhone}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Chat CTA Button */}
                    <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 shrink-0">
                        <button
                            onClick={() => setShowChat(true)}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-brown text-white font-bold rounded-2xl hover:bg-brand-black transition-all shadow-sm active:scale-95"
                        >
                            <MessageCircle className="w-5 h-5" />
                            <span>Chat with Vendor</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Orders Section Header & Summary Stats */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-brand-black tracking-tight flex items-center gap-2">
                            <span>Your Orders & Requests</span>
                            <span className="text-xs font-bold px-2 py-0.5 bg-brand-cream border border-brand-brown/15 rounded-md text-brand-brown">
                                {totalOrdersCount}
                            </span>
                        </h2>
                        <p className="text-xs sm:text-sm text-brand-brown/60 font-medium">
                            Complete history of scrap recycling pickups and orders created with this vendor
                        </p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="inline-flex p-1 bg-white rounded-2xl border border-brand-brown/10 shadow-2xs">
                        <button
                            onClick={() => setFilterTab('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                                filterTab === 'all'
                                    ? 'bg-brand-brown text-white shadow-2xs'
                                    : 'text-brand-brown/70 hover:text-brand-black'
                            }`}
                        >
                            All ({totalOrdersCount})
                        </button>
                        <button
                            onClick={() => setFilterTab('requests')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 ${
                                filterTab === 'requests'
                                    ? 'bg-brand-brown text-white shadow-2xs'
                                    : 'text-brand-brown/70 hover:text-brand-black'
                            }`}
                        >
                            <Recycle className="w-3.5 h-3.5" />
                            <span>Recycling ({requests.length})</span>
                        </button>
                        <button
                            onClick={() => setFilterTab('orders')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 ${
                                filterTab === 'orders'
                                    ? 'bg-brand-brown text-white shadow-2xs'
                                    : 'text-brand-brown/70 hover:text-brand-black'
                            }`}
                        >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>EcoShop ({storeOrders.length})</span>
                        </button>
                    </div>
                </div>

                {/* Summary Mini Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-brand-brown/10 shadow-2xs flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-brand-cream flex items-center justify-center text-brand-brown">
                            <Package className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-[11px] font-bold uppercase tracking-wider text-brand-brown/50">Total Orders</div>
                            <div className="text-lg font-black text-brand-black">{totalOrdersCount}</div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-brand-brown/10 shadow-2xs flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-[11px] font-bold uppercase tracking-wider text-brand-brown/50">Completed</div>
                            <div className="text-lg font-black text-brand-black">{completedCount}</div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-brand-brown/10 shadow-2xs flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                            ₹
                        </div>
                        <div>
                            <div className="text-[11px] font-bold uppercase tracking-wider text-brand-brown/50">Total Value</div>
                            <div className="text-lg font-black text-brand-black">₹{totalSpentOrEarned.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                {/* Order Cards List */}
                {loadingOrders ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-brand-brown/10">
                        <Loader2 className="w-8 h-8 text-brand-orange animate-spin mb-2" />
                        <span className="text-xs font-semibold text-brand-brown/60">Loading orders...</span>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-16 px-4 bg-white rounded-3xl border border-brand-brown/10 shadow-sm">
                        <div className="w-14 h-14 rounded-2xl bg-brand-cream border border-brand-brown/10 flex items-center justify-center mx-auto mb-3 text-brand-brown/40">
                            <Package className="w-7 h-7" />
                        </div>
                        <h3 className="text-base font-bold text-brand-black">No orders found</h3>
                        <p className="text-xs text-brand-brown/60 mt-1 max-w-sm mx-auto">
                            {filterTab === 'all'
                                ? `You have not created any scrap recycling requests or EcoShop orders with ${vendorDisplayName} yet.`
                                : `No ${filterTab === 'requests' ? 'recycling requests' : 'EcoShop orders'} match your filter.`}
                        </p>
                        <div className="flex items-center justify-center gap-3 mt-5">
                            <Link
                                to="/smart-scan"
                                className="px-4 py-2 bg-brand-brown text-white font-semibold rounded-xl text-xs hover:bg-brand-black transition-colors"
                            >
                                Schedule Recycle Pickup
                            </Link>
                            <Link
                                to="/shop"
                                className="px-4 py-2 bg-brand-cream text-brand-brown border border-brand-brown/15 font-semibold rounded-xl text-xs hover:bg-brand-cream/70 transition-colors"
                            >
                                Browse EcoShop
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredOrders.map(item => {
                            const isStoreOrder = item.kind === 'storeOrder';
                            const linkTo = isStoreOrder ? `/store-orders/${item.id}` : `/orders/${item.id}`;
                            const dateStr = item.createdAt?.toDate
                                ? item.createdAt.toDate().toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
                                : 'Recent';
                            const title = isStoreOrder
                                ? (item.productName || item.items?.[0]?.name || 'EcoShop Order')
                                : (item.scrapType || item.title || item.materialType || 'Scrap Recycling Pickup');
                            const price = item.total || item.price || item.finalPrice || item.proposedPrice;
                            const status = item.status || 'Pending';

                            const getStatusBadge = (st) => {
                                const lower = (st || '').toLowerCase();
                                if (lower === 'completed' || lower === 'delivered') {
                                    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                }
                                if (lower === 'accepted' || lower === 'in_progress' || lower === 'shipped') {
                                    return 'bg-blue-50 text-blue-700 border-blue-200';
                                }
                                if (lower === 'declined' || lower === 'cancelled') {
                                    return 'bg-red-50 text-red-700 border-red-200';
                                }
                                return 'bg-amber-50 text-amber-700 border-amber-200';
                            };

                            return (
                                <Link
                                    key={item.id}
                                    to={linkTo}
                                    className="block bg-white p-4 sm:p-5 rounded-2xl border border-brand-brown/10 hover:border-brand-brown/30 shadow-2xs hover:shadow-sm transition-all group"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                                                isStoreOrder ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                                            }`}>
                                                {isStoreOrder ? <ShoppingBag className="w-6 h-6" /> : <Recycle className="w-6 h-6" />}
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                                        isStoreOrder ? 'bg-amber-50/70 text-amber-800 border-amber-200' : 'bg-emerald-50/70 text-emerald-800 border-emerald-200'
                                                    }`}>
                                                        {isStoreOrder ? 'EcoShop Product' : 'Recycle Request'}
                                                    </span>
                                                    <span className="text-[11px] font-mono text-brand-brown/50">
                                                        #{item.id.slice(0, 8)}
                                                    </span>
                                                </div>

                                                <h3 className="font-extrabold text-brand-black text-base mt-1 group-hover:text-brand-orange transition-colors">
                                                    {title}
                                                </h3>

                                                <div className="flex items-center gap-3 text-xs text-brand-brown/60 font-medium mt-1 flex-wrap">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {dateStr}
                                                    </span>
                                                    {item.quantity && <span>Qty: {item.quantity}</span>}
                                                    {item.weight && <span>Weight: {item.weight} kg</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-3 sm:pt-0 border-brand-brown/5">
                                            <div className="sm:text-right">
                                                {price != null && (
                                                    <div className="text-base font-black text-brand-black">
                                                        ₹{Number(price).toLocaleString()}
                                                    </div>
                                                )}
                                                <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md border capitalize mt-0.5 ${getStatusBadge(status)}`}>
                                                    {status.replace(/_/g, ' ')}
                                                </span>
                                            </div>

                                            <div className="w-8 h-8 rounded-xl bg-brand-cream/50 flex items-center justify-center text-brand-brown/60 group-hover:bg-brand-brown group-hover:text-white transition-all shrink-0">
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Chat Modal for this vendor */}
            {showChat && vendor && (
                <ChatModal
                    currentUser={currentUser}
                    recipientName={vendorDisplayName}
                    receiverId={vendor.id}
                    onClose={() => setShowChat(false)}
                />
            )}
        </div>
    );
}
