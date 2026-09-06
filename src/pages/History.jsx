import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    collection,
    query,
    orderBy,
    where,
    deleteDoc,
    doc,
    updateDoc,
    getDoc,
    onSnapshot
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import {
    Calendar,
    ArrowRight,
    Loader2,
    PackageOpen,
    Trash2,
    Truck,
    PlayCircle,
    Hourglass,
    CheckSquare,
    Clock,
    Star,
    CheckCircle,
    ShoppingBag,
    Recycle,
    Search,
    X,
    ChevronRight,
    Store,
    MessageCircle,
    FileText,
    Sparkles,
    AlertCircle,
    CheckCircle2,
    Info
} from 'lucide-react';
import InvoiceModal from '../components/InvoiceModal';
import ChatModal from '../components/ChatModal';

const TRACKING_STAGES = [
    { id: 'accepted', label: 'Accepted', icon: CheckSquare },
    { id: 'arrived', label: 'Arrived', icon: Truck },
    { id: 'initiated', label: 'Initiated', icon: PlayCircle },
    { id: 'processing', label: 'Processing', icon: Hourglass },
    { id: 'finishing', label: 'Finishing', icon: Clock },
    { id: 'completed', label: 'Delivered', icon: CheckCircle }
];

export default function History() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Data States
    const [rawRequests, setRawRequests] = useState([]);
    const [rawOrdersCustomer, setRawOrdersCustomer] = useState([]);
    const [rawOrdersUser, setRawOrdersUser] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter & Search States
    const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'scans'
    const [filterCategory, setFilterCategory] = useState('all'); // 'all' | 'active' | 'requests' | 'orders' | 'completed'
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);
    const [ratingItem, setRatingItem] = useState(null);
    const [ratingScore, setRatingScore] = useState(5);
    const [ratingSubmitting, setRatingSubmitting] = useState(false);
    const [chatVendor, setChatVendor] = useState(null);
    const [scanToDelete, setScanToDelete] = useState(null);

    // In-App Toast
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
    };

    // 1. Data Fetching Listeners
    useEffect(() => {
        if (!currentUser) return;
        setLoading(true);

        // A. Service Requests (CustomerId)
        const requestsRef = collection(db, "requests");
        const requestsQ = query(requestsRef, where("customerId", "==", currentUser.uid));
        const unsubRequests = onSnapshot(requestsQ, (snapshot) => {
            const reqs = snapshot.docs.map(d => ({ id: d.id, type: 'request', ...d.data() }));
            setRawRequests(reqs);
        }, (err) => console.error("Requests listener error:", err));

        // B. Store Orders where customerId == currentUser.uid
        const ordersRef = collection(db, "orders");
        const ordersQC = query(ordersRef, where("customerId", "==", currentUser.uid));
        const unsubOrdersC = onSnapshot(ordersQC, (snapshot) => {
            const ords = snapshot.docs.map(d => ({ id: d.id, type: 'order', ...d.data() }));
            setRawOrdersCustomer(ords);
        }, (err) => console.error("Orders (customerId) listener error:", err));

        // C. Store Orders where userId == currentUser.uid
        const ordersQU = query(ordersRef, where("userId", "==", currentUser.uid));
        const unsubOrdersU = onSnapshot(ordersQU, (snapshot) => {
            const ords = snapshot.docs.map(d => ({ id: d.id, type: 'order', ...d.data() }));
            setRawOrdersUser(ords);
        }, (err) => console.error("Orders (userId) listener error:", err));

        // D. Scan History
        const historyRef = collection(db, "customers", currentUser.uid, "history");
        const historyQ = query(historyRef, orderBy("timestamp", "desc"));
        const unsubHistory = onSnapshot(historyQ, (snapshot) => {
            const hist = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setHistory(hist);
            setLoading(false);
        }, (err) => {
            console.error("History listener error:", err);
            setLoading(false);
        });

        return () => {
            unsubRequests();
            unsubOrdersC();
            unsubOrdersU();
            unsubHistory();
        };
    }, [currentUser]);

    // Merge & Deduplicate Store Orders from both queries
    const mergedStoreOrders = useMemo(() => {
        const map = new Map();
        for (const ord of [...rawOrdersCustomer, ...rawOrdersUser]) {
            if (!map.has(ord.id)) {
                map.set(ord.id, ord);
            }
        }
        return Array.from(map.values());
    }, [rawOrdersCustomer, rawOrdersUser]);

    // Combined Activity (Requests + Store Orders)
    const allActivityItems = useMemo(() => {
        const combined = [...rawRequests, ...mergedStoreOrders];
        return combined.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt?.seconds * 1000 || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt?.seconds * 1000 || 0);
            return dateB - dateA;
        });
    }, [rawRequests, mergedStoreOrders]);

    // Active vs Completed
    const activeOrdersList = useMemo(() => {
        return allActivityItems.filter(r => {
            if (r.type === 'order') {
                return r.status !== 'delivered' && r.status !== 'cancelled';
            } else {
                return r.status !== 'declined' && r.projectMeta?.trackingStage !== 'completed';
            }
        });
    }, [allActivityItems]);

    const completedOrdersList = useMemo(() => {
        return allActivityItems.filter(r => {
            if (r.type === 'order') {
                return r.status === 'delivered';
            } else {
                return r.projectMeta?.trackingStage === 'completed';
            }
        });
    }, [allActivityItems]);

    // Filtered Activity based on user selection & search
    const filteredActivity = useMemo(() => {
        let list = allActivityItems;

        if (filterCategory === 'active') {
            list = activeOrdersList;
        } else if (filterCategory === 'completed') {
            list = completedOrdersList;
        } else if (filterCategory === 'requests') {
            list = allActivityItems.filter(i => i.type === 'request');
        } else if (filterCategory === 'orders') {
            list = allActivityItems.filter(i => i.type === 'order');
        }

        if (!searchQuery.trim()) return list;

        const q = searchQuery.toLowerCase();
        return list.filter(item => {
            const title = (item.itemDetails?.goal || item.productName || item.scrapType || item.title || '').toLowerCase();
            const id = (item.id || '').toLowerCase();
            const vendor = (item.vendorName || '').toLowerCase();
            const status = (item.status || '').toLowerCase();
            return title.includes(q) || id.includes(q) || vendor.includes(q) || status.includes(q);
        });
    }, [allActivityItems, filterCategory, searchQuery, activeOrdersList, completedOrdersList]);

    // Filtered Scans based on search
    const filteredScans = useMemo(() => {
        if (!searchQuery.trim()) return history;
        const q = searchQuery.toLowerCase();
        return history.filter(item => {
            const objectName = (item.summary?.object || '').toLowerCase();
            const material = (item.summary?.material || '').toLowerCase();
            return objectName.includes(q) || material.includes(q);
        });
    }, [history, searchQuery]);

    // Calculate Summary Stats
    const totalSpentOrEarned = useMemo(() => {
        return allActivityItems.reduce((sum, item) => {
            const priceVal = item.finalQuote?.totalCustomerPrice || item.itemDetails?.conversionDetails?.estimated_conversion_cost_inr || item.price || item.total || 0;
            const parsed = Number(priceVal);
            return sum + (isNaN(parsed) ? 0 : parsed);
        }, 0);
    }, [allActivityItems]);

    // Handlers
    const confirmDeleteScan = async () => {
        if (!scanToDelete) return;
        const { id, imageUrl } = scanToDelete;
        setScanToDelete(null);

        try {
            await deleteDoc(doc(db, "customers", currentUser.uid, "history", id));
            if (imageUrl) {
                try {
                    const imageRef = ref(storage, imageUrl);
                    await deleteObject(imageRef);
                } catch (err) {
                    console.warn("Storage delete failed:", err);
                }
            }
            showToast("Scan removed from history.", "success");
        } catch (error) {
            console.error("Error deleting scan:", error);
            showToast("Failed to delete scan.", "error");
        }
    };

    const submitRating = async () => {
        if (!ratingItem) return;
        setRatingSubmitting(true);
        try {
            const requestRef = doc(db, 'requests', ratingItem.id);
            await updateDoc(requestRef, {
                userRating: ratingScore,
                ratedAt: new Date()
            });

            if (ratingItem.acceptedBy) {
                const vendorRef = doc(db, 'vendors', ratingItem.acceptedBy);
                const vendorSnap = await getDoc(vendorRef);
                if (vendorSnap.exists()) {
                    const vData = vendorSnap.data();
                    const currentRating = vData.rating || 5;
                    const ratingCount = vData.ratingCount || 0;
                    const newCount = ratingCount + 1;
                    const newRating = ((currentRating * ratingCount) + ratingScore) / newCount;
                    await updateDoc(vendorRef, { rating: newRating, ratingCount: newCount });
                }
            }

            setRatingItem(null);
            showToast("Rating submitted successfully! Thank you for your feedback.", "success");
        } catch (error) {
            console.error("Rating Error:", error);
            showToast("Failed to submit rating. Please try again.", "error");
        } finally {
            setRatingSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-cream/40 pt-4 pb-20 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Page Hero Header */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-brown/10 shadow-sm relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2.5 mb-1">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand-cream border border-brand-brown/15 text-brand-brown text-xs font-bold">
                                    <Recycle className="w-3.5 h-3.5 text-brand-brown" />
                                    Eco Dashboard
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-black tracking-tight">
                                My Activity
                            </h1>
                            <p className="text-sm text-brand-brown/70 font-medium mt-1">
                                Track recycling pickups, EcoShop deliveries, and waste scan history in real time.
                            </p>
                        </div>

                        {/* Top Action CTAs */}
                        <div className="flex items-center gap-2.5">
                            <Link
                                to="/smart-scan"
                                className="px-4 py-2.5 bg-brand-brown hover:bg-brand-black text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xs flex items-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span>New Scan</span>
                            </Link>
                            <Link
                                to="/shop"
                                className="px-4 py-2.5 bg-brand-cream hover:bg-brand-cream/80 text-brand-brown border border-brand-brown/15 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xs flex items-center gap-2"
                            >
                                <ShoppingBag className="w-4 h-4" />
                                <span>Shop</span>
                            </Link>
                        </div>
                    </div>

                    {/* Quick Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-brand-brown/10">
                        <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-brand-brown/10">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-brown/50">Total Orders</span>
                            <div className="text-xl font-black text-brand-black mt-0.5">{allActivityItems.length}</div>
                        </div>
                        <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-brand-brown/10">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-brown/50">Active</span>
                                {activeOrdersList.length > 0 && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                )}
                            </div>
                            <div className="text-xl font-black text-brand-orange mt-0.5">{activeOrdersList.length}</div>
                        </div>
                        <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-brand-brown/10">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-brown/50">Completed</span>
                            <div className="text-xl font-black text-emerald-700 mt-0.5">{completedOrdersList.length}</div>
                        </div>
                        <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-brand-brown/10">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-brown/50">Total Scans</span>
                            <div className="text-xl font-black text-brand-black mt-0.5">{history.length}</div>
                        </div>
                    </div>
                </div>

                {/* Primary Segmented Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="inline-flex p-1 bg-white rounded-2xl border border-brand-brown/10 shadow-2xs">
                        <button
                            onClick={() => { setActiveTab('requests'); setSearchQuery(''); }}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                                activeTab === 'requests'
                                    ? 'bg-brand-brown text-white shadow-2xs'
                                    : 'text-brand-brown/70 hover:text-brand-black'
                            }`}
                        >
                            <PackageOpen className="w-4 h-4" />
                            <span>Orders & Requests</span>
                            <span className={`text-[11px] font-extrabold px-2 py-0.2 rounded-md ${
                                activeTab === 'requests' ? 'bg-white/20 text-white' : 'bg-brand-cream text-brand-brown'
                            }`}>
                                {allActivityItems.length}
                            </span>
                        </button>
                        <button
                            onClick={() => { setActiveTab('scans'); setSearchQuery(''); }}
                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                                activeTab === 'scans'
                                    ? 'bg-brand-brown text-white shadow-2xs'
                                    : 'text-brand-brown/70 hover:text-brand-black'
                            }`}
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Scan History</span>
                            <span className={`text-[11px] font-extrabold px-2 py-0.2 rounded-md ${
                                activeTab === 'scans' ? 'bg-white/20 text-white' : 'bg-brand-cream text-brand-brown'
                            }`}>
                                {history.length}
                            </span>
                        </button>
                    </div>

                    {/* Instant Search Bar */}
                    <div className="group relative flex items-center w-full sm:w-80 bg-white hover:border-brand-brown/30 focus-within:ring-3 focus-within:ring-brand-brown/10 focus-within:border-brand-brown/40 rounded-2xl border border-brand-brown/15 shadow-2xs transition-all duration-200">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-brown/45 group-focus-within:text-brand-brown transition-colors">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    e.stopPropagation();
                                    setSearchQuery('');
                                }
                            }}
                            placeholder={activeTab === 'requests' ? "Search orders, items, vendors..." : "Search scanned materials..."}
                            className="w-full pl-10 pr-9 py-2.5 bg-transparent text-xs sm:text-sm text-brand-black placeholder:text-brand-brown/40 focus:outline-none font-medium"
                        />
                        {searchQuery ? (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 p-1 text-brand-brown/40 hover:text-brand-black hover:bg-brand-cream/80 rounded-lg transition-colors flex items-center justify-center"
                                title="Clear search (Esc)"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        ) : (
                            <span className="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-brand-brown/30 bg-brand-cream/60 border border-brand-brown/10 rounded px-1.5 py-0.5 pointer-events-none">
                                Esc
                            </span>
                        )}
                    </div>
                </div>

                {/* Sub-Filter Chips for Orders & Requests */}
                {activeTab === 'requests' && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        <button
                            onClick={() => setFilterCategory('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                                filterCategory === 'all'
                                    ? 'bg-brand-brown text-white shadow-2xs'
                                    : 'bg-white text-brand-brown/70 hover:text-brand-black border border-brand-brown/10'
                            }`}
                        >
                            All ({allActivityItems.length})
                        </button>
                        <button
                            onClick={() => setFilterCategory('active')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                                filterCategory === 'active'
                                    ? 'bg-brand-brown text-white shadow-2xs'
                                    : 'bg-white text-brand-brown/70 hover:text-brand-black border border-brand-brown/10'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>Active ({activeOrdersList.length})</span>
                        </button>
                        <button
                            onClick={() => setFilterCategory('requests')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                                filterCategory === 'requests'
                                    ? 'bg-brand-brown text-white shadow-2xs'
                                    : 'bg-white text-brand-brown/70 hover:text-brand-black border border-brand-brown/10'
                            }`}
                        >
                            <Recycle className="w-3.5 h-3.5" />
                            <span>Recycling Pickups ({rawRequests.length})</span>
                        </button>
                        <button
                            onClick={() => setFilterCategory('orders')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                                filterCategory === 'orders'
                                    ? 'bg-brand-brown text-white shadow-2xs'
                                    : 'bg-white text-brand-brown/70 hover:text-brand-black border border-brand-brown/10'
                            }`}
                        >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>EcoShop Orders ({mergedStoreOrders.length})</span>
                        </button>
                        <button
                            onClick={() => setFilterCategory('completed')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                                filterCategory === 'completed'
                                    ? 'bg-brand-brown text-white shadow-2xs'
                                    : 'bg-white text-brand-brown/70 hover:text-brand-black border border-brand-brown/10'
                            }`}
                        >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Completed ({completedOrdersList.length})</span>
                        </button>
                    </div>
                )}

                {/* TAB 1: ORDERS & REQUESTS LIST */}
                {activeTab === 'requests' && (
                    <div className="space-y-4">
                        {loading && allActivityItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-brand-brown/10">
                                <Loader2 className="w-9 h-9 text-brand-orange animate-spin mb-3" />
                                <span className="text-sm font-semibold text-brand-brown">Loading your activity...</span>
                            </div>
                        ) : filteredActivity.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-3xl border border-brand-brown/10 p-8 shadow-sm">
                                <div className="w-16 h-16 rounded-2xl bg-brand-cream border border-brand-brown/10 flex items-center justify-center mx-auto mb-4 text-brand-brown/30">
                                    <PackageOpen className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold text-brand-black">No activity found</h3>
                                <p className="text-xs sm:text-sm text-brand-brown/60 mt-1 max-w-sm mx-auto">
                                    {searchQuery
                                        ? "No orders match your search keyword. Try clearing the search."
                                        : "You have not created any pickup requests or store orders yet."}
                                </p>
                                <div className="flex items-center justify-center gap-3 mt-6">
                                    <Link
                                        to="/smart-scan"
                                        className="px-5 py-2.5 bg-brand-brown text-white font-bold rounded-xl text-xs hover:bg-brand-black transition-colors shadow-2xs"
                                    >
                                        Schedule Recycle Pickup
                                    </Link>
                                    <Link
                                        to="/shop"
                                        className="px-5 py-2.5 bg-brand-cream text-brand-brown border border-brand-brown/15 font-bold rounded-xl text-xs hover:bg-brand-cream/80 transition-colors shadow-2xs"
                                    >
                                        Browse EcoShop
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            filteredActivity.map((req) => {
                                const isStoreOrder = req.type === 'order' || !!req.productId;
                                const isCompleted = isStoreOrder
                                    ? (req.status === 'delivered')
                                    : (req.projectMeta?.trackingStage === 'completed');
                                const isRated = !!req.userRating;
                                const dateObj = req.createdAt?.toDate ? req.createdAt.toDate() : new Date(req.createdAt?.seconds * 1000 || 0);
                                const dateStr = dateObj.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
                                const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                const detailLink = isStoreOrder ? `/store-orders/${req.id}` : `/orders/${req.id}`;
                                const totalCost = req.finalQuote?.totalCustomerPrice || req.itemDetails?.conversionDetails?.estimated_conversion_cost_inr || req.price || req.total || 0;
                                const title = isStoreOrder
                                    ? (req.productName || req.items?.[0]?.name || "EcoShop Product")
                                    : (req.itemDetails?.goal || req.scrapType || req.title || "Scrap Recycling Pickup");

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
                                    <div
                                        key={req.id}
                                        className="bg-white rounded-3xl p-5 sm:p-6 border border-brand-brown/10 shadow-2xs hover:shadow-md transition-all space-y-4"
                                    >
                                        {/* Card Top Metadata Header */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-brand-brown/10">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                                                    isStoreOrder ? 'bg-amber-50/70 text-amber-800 border-amber-200' : 'bg-emerald-50/70 text-emerald-800 border-emerald-200'
                                                }`}>
                                                    {isStoreOrder ? 'EcoShop Order' : 'Recycle Pickup'}
                                                </span>
                                                <span className="text-xs font-mono text-brand-brown/50">
                                                    #{req.id.slice(0, 8)}
                                                </span>
                                                <span className="text-xs text-brand-brown/40 font-medium">
                                                    • {dateStr} at {timeStr}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold px-3 py-1 rounded-xl border capitalize ${getStatusBadge(req.status)}`}>
                                                    {req.status === 'accepted' && !isStoreOrder ? (isCompleted ? 'Completed' : 'In Progress') : req.status?.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Card Body */}
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                                            <div className="flex items-start gap-4">
                                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-brand-cream/60 rounded-2xl overflow-hidden border border-brand-brown/10 flex-shrink-0 flex items-center justify-center shadow-2xs">
                                                    {(req.itemImage || req.productImage) ? (
                                                        <img src={req.itemImage || req.productImage} alt="Item" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="text-brand-brown/30">
                                                            {isStoreOrder ? <ShoppingBag size={28} /> : <Recycle size={28} />}
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <h3 className="text-lg font-black text-brand-black leading-tight">
                                                        {title}
                                                    </h3>

                                                    {/* Vendor Attribution & Link */}
                                                    {(req.acceptedBy || req.vendorId) && (
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <Link
                                                                to={`/vendors/${req.acceptedBy || req.vendorId}`}
                                                                className="inline-flex items-center gap-1 text-xs text-brand-brown/70 hover:text-brand-orange font-semibold transition-colors"
                                                                title="View Vendor Profile & Orders"
                                                            >
                                                                <Store className="w-3.5 h-3.5 text-brand-brown/50" />
                                                                <span>{req.vendorName || "Partner Vendor"}</span>
                                                                <span className="text-[10px] text-brand-orange underline ml-0.5">View Profile</span>
                                                            </Link>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-3 text-xs text-brand-brown/60 font-medium mt-2 flex-wrap">
                                                        {req.quantity && <span className="bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-brand-brown/10">Qty: {req.quantity}</span>}
                                                        {req.weight && <span className="bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-brand-brown/10">Weight: {req.weight} kg</span>}
                                                        {req.material && <span className="bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-brand-brown/10">{req.material}</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Price Column */}
                                            <div className="text-left sm:text-right w-full sm:w-auto">
                                                <div className="text-[10px] font-extrabold uppercase tracking-wider text-brand-brown/50">
                                                    {isStoreOrder ? 'Total Amount' : 'Estimated Value'}
                                                </div>
                                                <div className="text-xl font-black text-brand-black mt-0.5">
                                                    ₹{Number(totalCost).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Recycling Tracking Stepper (If Active Recycle Request) */}
                                        {!isStoreOrder && req.status === 'accepted' && (() => {
                                            const rawIdx = TRACKING_STAGES.findIndex(s => s.id === req.projectMeta?.trackingStage);
                                            const currentIdx = rawIdx !== -1 ? rawIdx : 0;
                                            const progressPct = Math.round((currentIdx / (TRACKING_STAGES.length - 1)) * 100);
                                            const currentStageName = TRACKING_STAGES[currentIdx]?.label || 'Accepted';

                                            return (
                                                <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-brand-brown/10 mt-2 space-y-3">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                                            <span>Status: {currentStageName}</span>
                                                        </div>
                                                        <span className="text-[11px] font-mono font-bold text-brand-brown/60">
                                                            {progressPct}% Complete
                                                        </span>
                                                    </div>

                                                    <div className="relative flex justify-between items-start pt-1">
                                                        {/* Centered Track Line (passes through center of 32px icons at top-4) */}
                                                        <div className="absolute left-4 right-4 top-4 h-1 bg-brand-brown/10 -translate-y-1/2 rounded-full -z-0" />
                                                        <div
                                                            className="absolute left-4 top-4 h-1 bg-gradient-to-r from-brand-orange to-emerald-500 -translate-y-1/2 rounded-full transition-all duration-700 -z-0"
                                                            style={{ width: `${progressPct}%` }}
                                                        />

                                                        {TRACKING_STAGES.map((stage, idx) => {
                                                            const isPassed = currentIdx >= idx;
                                                            const isCurrent = currentIdx === idx;
                                                            const isStrictlyPassed = currentIdx > idx;

                                                            return (
                                                                <div key={stage.id} className="flex flex-col items-center gap-1.5 relative z-10 w-14">
                                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                                                        isStrictlyPassed
                                                                            ? 'bg-emerald-500 text-white shadow-xs border border-emerald-500'
                                                                            : isCurrent
                                                                                ? 'bg-white text-emerald-600 border-2 border-emerald-500 ring-3 ring-emerald-500/20 scale-105 shadow-sm font-bold'
                                                                                : 'bg-white border border-brand-brown/15 text-brand-brown/30'
                                                                    }`}>
                                                                        {isStrictlyPassed ? (
                                                                            <CheckCircle className="w-4 h-4" />
                                                                        ) : (
                                                                            <stage.icon className={`w-3.5 h-3.5 ${isCurrent ? 'animate-pulse' : ''}`} />
                                                                        )}
                                                                    </div>
                                                                    <span className={`text-[9px] font-bold text-center leading-tight line-clamp-1 ${
                                                                        isCurrent ? 'text-brand-black font-extrabold' : isPassed ? 'text-brand-brown' : 'text-brand-brown/40'
                                                                    }`}>
                                                                        {stage.label}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Pending Status Callout */}
                                        {!isStoreOrder && req.status === 'pending' && (
                                            <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-center justify-between text-xs font-bold text-amber-800 mt-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                                                    <span>Pickup Request Placed • Awaiting Vendor Confirmation</span>
                                                </div>
                                                <span className="text-[10px] uppercase font-extrabold bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                                                    Pending
                                                </span>
                                            </div>
                                        )}

                                        {/* Card Action Controls Footer */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-brand-brown/10">
                                            {/* Left Actions (Chat / Rating) */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {(req.acceptedBy || req.vendorId) && (
                                                    <button
                                                        onClick={() => setChatVendor({
                                                            vendorId: req.acceptedBy || req.vendorId,
                                                            vendorName: req.vendorName || "Partner Vendor"
                                                        })}
                                                        className="px-3.5 py-1.5 bg-brand-cream/80 hover:bg-brand-cream text-brand-brown border border-brand-brown/15 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5"
                                                    >
                                                        <MessageCircle className="w-3.5 h-3.5" />
                                                        <span>Chat with Vendor</span>
                                                    </button>
                                                )}

                                                {isStoreOrder && (
                                                    <button
                                                        onClick={() => setSelectedInvoiceOrder(req)}
                                                        className="px-3.5 py-1.5 bg-white hover:bg-brand-cream/40 text-brand-brown border border-brand-brown/15 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                        <span>View Invoice</span>
                                                    </button>
                                                )}

                                                {!isStoreOrder && isCompleted && !isRated && (
                                                    <button
                                                        onClick={() => setRatingItem(req)}
                                                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
                                                    >
                                                        <Star className="w-3.5 h-3.5 fill-current" />
                                                        <span>Rate Vendor</span>
                                                    </button>
                                                )}

                                                {isRated && (
                                                    <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-xl text-xs font-bold">
                                                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                                        <span>Rated {req.userRating}/5</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Primary Link Button */}
                                            <Link
                                                to={detailLink}
                                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-brown hover:bg-brand-black text-white rounded-xl text-xs font-bold transition-colors shadow-2xs shrink-0"
                                            >
                                                <span>View Order Details</span>
                                                <ChevronRight className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* TAB 2: SMART SCAN HISTORY */}
                {activeTab === 'scans' && (
                    <div className="space-y-4">
                        {loading && history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-brand-brown/10">
                                <Loader2 className="w-9 h-9 text-brand-orange animate-spin mb-3" />
                                <span className="text-sm font-semibold text-brand-brown">Loading scan history...</span>
                            </div>
                        ) : filteredScans.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-3xl border border-brand-brown/10 p-8 shadow-sm">
                                <div className="w-16 h-16 rounded-2xl bg-brand-cream border border-brand-brown/10 flex items-center justify-center mx-auto mb-4 text-brand-brown/30">
                                    <Sparkles className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold text-brand-black">No scans found</h3>
                                <p className="text-xs sm:text-sm text-brand-brown/60 mt-1 max-w-sm mx-auto">
                                    {searchQuery
                                        ? "No scans match your search. Try another keyword."
                                        : "You haven't scanned any scrap or recyclable items with AI yet."}
                                </p>
                                <button
                                    onClick={() => navigate('/smart-scan')}
                                    className="mt-6 px-6 py-2.5 bg-brand-brown text-white font-bold rounded-xl text-xs sm:text-sm hover:bg-brand-black transition-colors shadow-2xs inline-flex items-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    <span>Start Your First Scan</span>
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                {filteredScans.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => navigate(`/history/${item.id}`)}
                                        className="bg-white rounded-3xl overflow-hidden border border-brand-brown/10 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col"
                                    >
                                        {/* Image Box */}
                                        <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                            {item.imageUrl ? (
                                                <img
                                                    src={item.imageUrl}
                                                    alt="Scan"
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-brand-brown/30 bg-brand-cream/60">
                                                    <Sparkles className="w-8 h-8" />
                                                </div>
                                            )}

                                            {/* Date Badge */}
                                            <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-xl text-[11px] font-bold text-brand-brown shadow-2xs flex items-center gap-1 border border-brand-brown/10">
                                                <Calendar className="w-3 h-3" />
                                                {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleDateString([], { day: 'numeric', month: 'short' }) : 'Recent'}
                                            </div>

                                            {/* Delete Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setScanToDelete(item);
                                                }}
                                                className="absolute top-2.5 left-2.5 p-2 bg-white/90 hover:bg-red-50 text-brand-brown/60 hover:text-red-600 rounded-xl transition-colors shadow-2xs border border-brand-brown/10"
                                                title="Delete scan"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* Card Info */}
                                        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand-cream border border-brand-brown/15 text-brand-brown">
                                                        {item.summary?.material || "Recyclable"}
                                                    </span>
                                                </div>
                                                <h3 className="font-extrabold text-base text-brand-black capitalize group-hover:text-brand-orange transition-colors line-clamp-1">
                                                    {item.summary?.object || "Identified Waste"}
                                                </h3>
                                                <p className="text-xs text-brand-brown/60 line-clamp-2 mt-1">
                                                    {item.summary?.recyclableReason || item.summary?.description || "Analyzed by EcoCycle Vision AI"}
                                                </p>
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-brand-brown/10 flex items-center justify-between text-xs font-bold text-brand-brown group-hover:text-brand-black">
                                                <span>View Analysis</span>
                                                <ChevronRight className="w-4 h-4 text-brand-brown/40 group-hover:translate-x-0.5 transition-transform" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div>

            {/* In-App Toast Notification */}
            {toast.show && (
                <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-white/95 backdrop-blur-md border border-brand-brown/15 text-brand-brown px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3">
                        {toast.type === 'success' ? (
                            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                        ) : (
                            <div className="w-6 h-6 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-4 h-4" />
                            </div>
                        )}
                        <span className="text-xs sm:text-sm font-semibold text-brand-black">
                            {toast.message}
                        </span>
                    </div>
                </div>
            )}

            {/* Invoice Modal */}
            {selectedInvoiceOrder && (
                <InvoiceModal
                    order={selectedInvoiceOrder}
                    onClose={() => setSelectedInvoiceOrder(null)}
                />
            )}

            {/* Rating Modal */}
            {ratingItem && (
                <div className="fixed inset-0 bg-brand-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm text-center shadow-2xl border border-brand-brown/10 animate-in zoom-in-95">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                            <Star className="w-6 h-6 fill-current" />
                        </div>
                        <h3 className="text-xl font-bold text-brand-black mb-1">Rate your Experience</h3>
                        <p className="text-brand-brown/60 text-xs mb-6">
                            How was the work for {ratingItem.itemDetails?.goal || "this recycling service"}?
                        </p>

                        <div className="flex justify-center gap-2 mb-6">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    onClick={() => setRatingScore(star)}
                                    className={`transition-transform hover:scale-110 p-1 ${
                                        star <= ratingScore ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
                                    }`}
                                >
                                    <Star className="w-7 h-7 fill-current" />
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-2.5">
                            <button
                                onClick={() => setRatingItem(null)}
                                className="flex-1 py-2.5 text-brand-brown font-bold hover:bg-brand-cream/60 rounded-xl text-xs transition-colors border border-brand-brown/15"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitRating}
                                disabled={ratingSubmitting}
                                className="flex-1 py-2.5 bg-brand-brown text-white font-bold rounded-xl hover:bg-brand-black transition-colors disabled:opacity-50 text-xs shadow-2xs flex items-center justify-center"
                            >
                                {ratingSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Rating'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Scan Confirm Dialog */}
            {scanToDelete && (
                <div className="fixed inset-0 bg-brand-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl border border-brand-brown/10 animate-in zoom-in-95">
                        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-brand-black mb-1">Delete this scan?</h3>
                        <p className="text-brand-brown/60 text-xs mb-6">
                            This will permanently remove this item from your scan history.
                        </p>
                        <div className="flex gap-2.5">
                            <button
                                onClick={() => setScanToDelete(null)}
                                className="flex-1 py-2.5 text-brand-brown font-bold hover:bg-brand-cream/60 rounded-xl text-xs transition-colors border border-brand-brown/15"
                            >
                                Keep Scan
                            </button>
                            <button
                                onClick={confirmDeleteScan}
                                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors text-xs shadow-2xs"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Direct Person-to-Person Chat Modal */}
            {chatVendor && (
                <ChatModal
                    currentUser={currentUser}
                    recipientName={chatVendor.vendorName}
                    receiverId={chatVendor.vendorId}
                    onClose={() => setChatVendor(null)}
                />
            )}
        </div>
    );
}
