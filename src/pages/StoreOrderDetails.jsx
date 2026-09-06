import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Loader2, ArrowLeft, Package, Truck, CheckCircle, MapPin, DollarSign, Calendar, ExternalLink, Copy, PackageCheck } from 'lucide-react';

const TRACKING_STEPS = [
    {
        id: 'pending',
        label: 'Order Placed',
        short: 'Placed',
        description: 'Order confirmed and sent to our verified eco-artisan.',
        icon: Package
    },
    {
        id: 'processing',
        label: 'Preparing & Packed',
        short: 'Packed',
        description: 'Artisan has handcrafted and packed your sustainable item.',
        icon: PackageCheck
    },
    {
        id: 'shipped',
        label: 'In Transit',
        short: 'Shipped',
        description: 'Package dispatched with courier partner and on the way.',
        icon: Truck
    },
    {
        id: 'delivered',
        label: 'Delivered',
        short: 'Delivered',
        description: 'Package safely delivered to your doorstep. Enjoy your eco-goods!',
        icon: CheckCircle
    }
];

export default function StoreOrderDetails() {
    const { orderId } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        if (currentUser && orderId) fetchOrder();
    }, [currentUser, orderId]);

    const fetchOrder = async () => {
        try {
            const docRef = doc(db, 'orders', orderId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setOrder({ id: docSnap.id, ...docSnap.data() });
            } else {
                showToast("Order not found", "error");
                navigate('/shop');
            }
        } catch (error) {
            console.error("Error fetching order:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen pt-24 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-brown" /></div>;
    if (!order) return null;

    const getCurrentStepIndex = () => {
        if (!order) return 0;
        if (order.status === 'delivered') return 3;
        if (order.status === 'shipped') return 2;
        if (order.status === 'processing' || order.status === 'accepted') return 1;
        return 0; // 'pending'
    };

    const currentStepIndex = getCurrentStepIndex();
    const isDelivered = order.status === 'delivered';
    const progressPercent = Math.round((currentStepIndex / (TRACKING_STEPS.length - 1)) * 100);
    const activeStep = TRACKING_STEPS[currentStepIndex];

    const copyTrackingId = (id) => {
        navigator.clipboard.writeText(id);
        showToast("Tracking ID copied to clipboard!");
    };

    return (
        <div className="min-h-screen bg-brand-cream pt-24 pb-12 px-4 animate-in fade-in relative">
            {/* Toast Notification */}
            {toast && (
                <div className="fixed top-24 right-6 z-[100] animate-in slide-in-from-top-3 fade-in duration-300">
                    <div className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-sm font-bold ${
                        toast.type === 'error'
                            ? 'bg-rose-50 border-rose-200 text-rose-800'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                        <CheckCircle className="w-4 h-4" />
                        <span>{toast.message}</span>
                    </div>
                </div>
            )}

            <div className="max-w-3xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/shop')}
                            className="p-2.5 bg-white rounded-2xl border border-brand-brown/10 shadow-2xs hover:bg-brand-cream transition-colors text-brand-brown"
                            title="Back to EcoShop"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-extrabold text-brand-black tracking-tight">Delivery Tracking</h1>
                            <p className="text-xs text-brand-brown/60 font-mono font-medium">#{order.id.slice(0, 8)}</p>
                        </div>
                    </div>

                    <span className={`text-xs font-extrabold px-3 py-1 rounded-xl border ${
                        isDelivered
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                        {isDelivered ? 'Delivered' : 'In Transit'}
                    </span>
                </div>

                {/* Tracking Status Card */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-brown/10 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                        <Truck className="w-32 h-32" />
                    </div>

                    <div className="relative z-10 space-y-6">
                        {/* Status Bar Header */}
                        <div className="space-y-4 pb-6 border-b border-brand-brown/10">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold shadow-2xs">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                        Live Status
                                    </span>
                                    <h2 className="text-lg sm:text-xl font-extrabold text-brand-black tracking-tight">
                                        {activeStep.label}
                                    </h2>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-extrabold text-brand-brown/60">
                                        Step {currentStepIndex + 1} of {TRACKING_STEPS.length}
                                    </span>
                                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-brand-cream border border-brand-brown/15 text-brand-black font-mono">
                                        {progressPercent}%
                                    </span>
                                </div>
                            </div>

                            {/* Animated Gradient Progress Bar */}
                            <div className="space-y-1.5">
                                <div className="h-3 w-full bg-brand-cream/70 rounded-full overflow-hidden p-0.5 border border-brand-brown/10">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-brand-orange via-amber-500 to-emerald-500 transition-all duration-1000 shadow-xs"
                                        style={{ width: `${Math.max(6, progressPercent)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-brand-brown/60 font-medium">
                                    {activeStep.description}
                                </p>
                            </div>
                        </div>

                        {/* Pixel-Perfect Horizontal Step Nodes */}
                        <div className="py-4">
                            <div className="relative flex justify-between px-2">
                                {/* Connecting Background Track (Passes EXACTLY through center of 40px circles at top-5) */}
                                <div className="absolute top-5 left-6 right-6 h-1 bg-brand-brown/10 -translate-y-1/2 rounded-full -z-0" />
                                {/* Active Filled Line */}
                                <div
                                    className="absolute top-5 left-6 h-1 bg-gradient-to-r from-brand-orange to-emerald-500 -translate-y-1/2 rounded-full transition-all duration-700 -z-0"
                                    style={{
                                        width: `calc(${progressPercent}% - 3rem * ${(100 - progressPercent) / 100})`
                                    }}
                                />

                                {TRACKING_STEPS.map((step, idx) => {
                                    const isCompleted = idx <= currentStepIndex;
                                    const isCurrent = idx === currentStepIndex;
                                    const isStrictlyCompleted = idx < currentStepIndex;

                                    return (
                                        <div key={step.id} className="flex flex-col items-center gap-2 relative z-10 w-24">
                                            <div
                                                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                                                    isStrictlyCompleted
                                                        ? 'bg-emerald-500 text-white shadow-xs border-2 border-emerald-500'
                                                        : isCurrent
                                                            ? 'bg-white text-emerald-600 border-2 border-emerald-500 shadow-md ring-4 ring-emerald-500/15 scale-110'
                                                            : 'bg-brand-cream/50 text-brand-brown/30 border border-brand-brown/15'
                                                }`}
                                            >
                                                {isStrictlyCompleted ? (
                                                    <CheckCircle className="w-5 h-5" />
                                                ) : (
                                                    <step.icon className={`w-4 h-4 ${isCurrent ? 'animate-pulse' : ''}`} />
                                                )}
                                            </div>
                                            <div className={`text-[11px] font-bold text-center leading-tight ${
                                                isCurrent ? 'text-brand-black font-extrabold' : isCompleted ? 'text-brand-brown' : 'text-brand-brown/40'
                                            }`}>
                                                {step.label}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Courier Details */}
                        {order.trackingId && (
                            <div className="bg-[#FAF8F5] rounded-2xl p-4 sm:p-5 border border-brand-brown/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <div className="text-[10px] font-extrabold text-brand-brown/50 uppercase tracking-widest mb-1">
                                        Carrier: {order.deliveryPartner || 'Green Logistics Express'}
                                    </div>
                                    <div className="text-base sm:text-lg font-black text-brand-black tracking-wide flex items-center gap-2">
                                        <span className="font-mono">{order.trackingId}</span>
                                        <button
                                            onClick={() => copyTrackingId(order.trackingId)}
                                            className="p-1.5 hover:bg-brand-brown/10 text-brand-brown/60 hover:text-brand-black rounded-lg transition-colors"
                                            title="Copy Tracking ID"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <span>Verified Shipment</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Order Summary */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-brand-brown/5">
                    <h3 className="font-bold text-lg text-brand-brown mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5" /> Product Details
                    </h3>
                    <div className="flex gap-4">
                        <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 border border-gray-200">
                            <img src={order.productImage} alt="Product" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-extrabold text-brand-black text-lg">{order.productName}</h4>
                            {order.vendorId && order.vendorId !== 'verified_vendor' ? (
                                <Link
                                    to={`/vendors/${order.vendorId}`}
                                    className="inline-flex items-center gap-1 text-sm text-brand-brown/70 hover:text-brand-orange font-semibold mb-2 transition-colors"
                                    title="View Vendor Profile & Orders"
                                >
                                    <span>Sold by {order.vendorName}</span>
                                    <ExternalLink className="w-3 h-3" />
                                </Link>
                            ) : (
                                <p className="text-sm text-brand-brown/60 mb-2">Sold by {order.vendorName || "Verified Artisan"}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs font-medium text-brand-brown/80">
                                <span className="bg-gray-50 px-2 py-1 rounded-lg border">Qty: {order.quantity || 1}</span>
                                <span className="bg-gray-50 px-2 py-1 rounded-lg border flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-black text-brand-green">₹{order.price}</div>
                            <div className="text-[10px] text-brand-brown/40 font-bold uppercase">Total Paid</div>
                        </div>
                    </div>

                    {/* Pricing Breakdown (Placeholder until logic implemented) */}
                    <div className="mt-6 pt-6 border-t border-brand-brown/5 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-brand-brown/60">Subtotal</span>
                            <span className="font-bold">₹{order.priceBreakdown?.subtotal || order.price}</span>
                        </div>
                        {order.priceBreakdown?.deliveryFee > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-brand-brown/60">Delivery Fee</span>
                                <span className="font-bold">₹{order.priceBreakdown.deliveryFee}</span>
                            </div>
                        )}
                        {order.priceBreakdown?.gst > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-brand-brown/60">GST (18%)</span>
                                <span className="font-bold">₹{order.priceBreakdown.gst}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-black pt-2 border-t border-dashed border-gray-200 mt-2">
                            <span className="text-brand-brown">Total</span>
                            <span className="text-brand-brown">₹{order.priceBreakdown?.total || order.price}</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
