import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Loader2, ArrowLeft, Clock, MapPin, Truck, PlayCircle, Hourglass, CheckSquare, Calendar, Star, FileText, CheckCircle, ClipboardCheck, Factory, RefreshCw, Sparkles, PackageCheck, Leaf, Store } from 'lucide-react';
import ChatModal from '../components/ChatModal';

const TRACKING_STAGES = [
    {
        id: 'requested',
        label: 'Request Submitted',
        short: 'Submitted',
        description: 'Pickup request created by customer and waiting for vendor acceptance.',
        icon: ClipboardCheck
    },
    {
        id: 'accepted',
        label: 'Order Accepted',
        short: 'Accepted',
        description: 'Vendor accepted pickup request and scheduled collection.',
        icon: CheckCircle
    },
    {
        id: 'arrived',
        label: 'Arrived at Facility',
        short: 'Arrived',
        description: 'Scrap materials collected and safely received at processing plant.',
        icon: Truck
    },
    {
        id: 'initiated',
        label: 'Processing Started',
        short: 'Started',
        description: 'Material segregation, weighing, and prep work initiated.',
        icon: Factory
    },
    {
        id: 'processing',
        label: 'In Production',
        short: 'Production',
        description: 'Eco-transformation and industrial recycling actively underway.',
        icon: RefreshCw
    },
    {
        id: 'finishing',
        label: 'Finishing Touches',
        short: 'Finishing',
        description: 'Quality inspection, final processing, and packaging.',
        icon: Sparkles
    },
    {
        id: 'completed',
        label: 'Ready / Completed',
        short: 'Completed',
        description: 'Recycling cycle finished. Eco-credits and rewards disbursed.',
        icon: PackageCheck
    }
];

export default function OrderDetails() {
    const { orderId } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [vendor, setVendor] = useState(null);
    const [toast, setToast] = useState(null);

    // Rating (if completed)
    const [ratingScore, setRatingScore] = useState(5);
    const [submittingRating, setSubmittingRating] = useState(false);

    const [showChat, setShowChat] = useState(false);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        if (currentUser && orderId) fetchOrder();
    }, [currentUser, orderId]);

    const fetchOrder = async () => {
        try {
            const docRef = doc(db, 'requests', orderId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setOrder({ id: docSnap.id, ...data });

                // Fetch Vendor Details
                if (data.acceptedBy) {
                    const vendorSnap = await getDoc(doc(db, 'vendors', data.acceptedBy));
                    if (vendorSnap.exists()) {
                        setVendor({ id: vendorSnap.id, ...vendorSnap.data() });
                    }
                }
            } else {
                showToast("Order not found", "error");
                navigate('/history');
            }
        } catch (error) {
            console.error("Error fetching order:", error);
        } finally {
            setLoading(false);
        }
    };

    const submitRating = async () => {
        if (!order) return;
        setSubmittingRating(true);
        try {
            await updateDoc(doc(db, 'requests', order.id), {
                userRating: ratingScore,
                ratedAt: new Date()
            });
            // Update local state
            setOrder(prev => ({ ...prev, userRating: ratingScore }));
            showToast("Rating submitted successfully!");
        } catch (error) {
            console.error(error);
            showToast("Failed to submit review", "error");
        } finally {
            setSubmittingRating(false);
        }
    };

    if (loading) return <div className="min-h-screen pt-24 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-brown" /></div>;
    if (!order) return null;

    // Calculate Days Left
    const getCompletionDate = () => {
        if (!order.projectMeta?.estimatedCompletion) return null;
        const date = order.projectMeta.estimatedCompletion.toDate
            ? order.projectMeta.estimatedCompletion.toDate()
            : new Date(order.projectMeta.estimatedCompletion);
        return date;
    };

    const completionDate = getCompletionDate();
    const daysLeft = completionDate ?
        Math.ceil((completionDate - new Date()) / (1000 * 60 * 60 * 24)) : null;

    const getCurrentStageIndex = () => {
        if (!order) return 0;
        if (order.status === 'completed' || order.projectMeta?.trackingStage === 'completed') {
            return TRACKING_STAGES.length - 1;
        }
        const stage = order.projectMeta?.trackingStage;
        if (stage) {
            const idx = TRACKING_STAGES.findIndex(s => s.id === stage);
            if (idx !== -1) return idx;
        }
        if (order.status === 'accepted') {
            return 1;
        }
        return 0; // 'requested'
    };

    const currentStageIdx = getCurrentStageIndex();
    const isCompleted = order.projectMeta?.trackingStage === 'completed' || order.status === 'completed';
    const progressPercent = Math.round((currentStageIdx / (TRACKING_STAGES.length - 1)) * 100);
    const activeStage = TRACKING_STAGES[currentStageIdx];

    return (
        <div className="min-h-screen bg-brand-cream pt-24 pb-12 px-4 relative">
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

                {/* Header with Back Button */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2.5 bg-white rounded-2xl border border-brand-brown/10 shadow-2xs hover:bg-brand-cream transition-colors text-brand-brown"
                            title="Go back"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-extrabold text-brand-black tracking-tight">Order Tracking</h1>
                            <p className="text-xs text-brand-brown/60 font-mono font-medium">#{order.id.slice(0, 8)}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-extrabold px-3 py-1 rounded-xl border ${
                            isCompleted
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                            {isCompleted ? 'Completed' : 'In Progress'}
                        </span>
                    </div>
                </div>

                {/* Days Left Hero Section */}
                {!isCompleted && daysLeft !== null && (
                    <div className="bg-brand-brown text-white p-6 sm:p-8 rounded-3xl shadow-sm border border-brand-brown/20 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <Clock className="w-40 h-40" />
                        </div>
                        <div className="relative z-10">
                            <div className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">Estimated Completion</div>
                            <div className="text-5xl sm:text-6xl font-black mb-1">{Math.max(0, daysLeft)}</div>
                            <div className="text-sm sm:text-base font-semibold text-white/80">{Math.max(0, daysLeft) === 1 ? 'Day Remaining' : 'Days Remaining'}</div>
                            <div className="mt-4 inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-xl text-xs font-bold backdrop-blur-xs">
                                <Calendar className="w-4 h-4 text-brand-orange" />
                                <span>Target: {completionDate ? completionDate.toLocaleDateString() : 'Date pending'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Live Tracking Card */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-brown/10 shadow-xs relative overflow-hidden">
                    {/* Header & Status Bar */}
                    <div className="space-y-4 pb-6 border-b border-brand-brown/10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold shadow-2xs">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                    Live Status
                                </span>
                                <h2 className="text-lg sm:text-xl font-extrabold text-brand-black tracking-tight">
                                    {activeStage.label}
                                </h2>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold text-brand-brown/60">
                                    Stage {currentStageIdx + 1} of {TRACKING_STAGES.length}
                                </span>
                                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-brand-cream border border-brand-brown/15 text-brand-black font-mono">
                                    {progressPercent}%
                                </span>
                            </div>
                        </div>

                        {/* Animated Gradient Progress Meter */}
                        <div className="space-y-1.5">
                            <div className="h-3 w-full bg-brand-cream/70 rounded-full overflow-hidden p-0.5 border border-brand-brown/10">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-brand-orange via-amber-500 to-emerald-500 transition-all duration-1000 shadow-xs"
                                    style={{ width: `${Math.max(5, progressPercent)}%` }}
                                />
                            </div>
                            <p className="text-xs text-brand-brown/60 font-medium leading-relaxed">
                                {activeStage.description}
                            </p>
                        </div>
                    </div>

                    {/* Horizontal Milestone Tracker (Desktop / Tablet) */}
                    <div className="hidden md:block py-6 border-b border-brand-brown/10">
                        <div className="relative flex items-center justify-between px-2">
                            {/* Background Track Line */}
                            <div className="absolute left-6 right-6 top-5 h-1 bg-brand-brown/10 -translate-y-1/2 rounded-full -z-0" />
                            {/* Active Progress Line */}
                            <div
                                className="absolute left-6 top-5 h-1 bg-gradient-to-r from-brand-orange to-emerald-500 -translate-y-1/2 rounded-full transition-all duration-700 -z-0"
                                style={{
                                    width: `calc(${progressPercent}% - 3rem * ${(100 - progressPercent) / 100})`
                                }}
                            />

                            {TRACKING_STAGES.map((stage, idx) => {
                                const isPassed = currentStageIdx >= idx;
                                const isCurrent = currentStageIdx === idx;
                                const isStepCompleted = currentStageIdx > idx;

                                return (
                                    <div key={stage.id} className="flex flex-col items-center gap-2 relative z-10 w-20">
                                        <div
                                            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                                                isStepCompleted
                                                    ? 'bg-emerald-500 text-white shadow-xs border-2 border-emerald-500'
                                                    : isCurrent
                                                        ? 'bg-white text-emerald-600 border-2 border-emerald-500 shadow-md ring-4 ring-emerald-500/15 scale-110'
                                                        : 'bg-brand-cream/50 text-brand-brown/30 border border-brand-brown/15'
                                            }`}
                                        >
                                            {isStepCompleted ? (
                                                <CheckCircle className="w-5 h-5" />
                                            ) : (
                                                <stage.icon className={`w-4 h-4 ${isCurrent ? 'animate-pulse' : ''}`} />
                                            )}
                                        </div>
                                        <span className={`text-[10px] font-bold text-center leading-tight line-clamp-2 ${
                                            isCurrent
                                                ? 'text-brand-black font-extrabold'
                                                : isPassed
                                                    ? 'text-brand-brown/80'
                                                    : 'text-brand-brown/40'
                                        }`}>
                                            {stage.short}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Detailed Vertical Status Feed */}
                    <div className="pt-6">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-brown/50 mb-6">
                            Milestone Timeline
                        </h3>

                        <div className="relative pl-1">
                            {/* Vertical Line Track */}
                            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-brand-brown/10" />
                            {/* Filled Vertical Line */}
                            <div
                                className="absolute left-[19px] top-4 w-0.5 bg-emerald-500 transition-all duration-700"
                                style={{
                                    height: `${(currentStageIdx / (TRACKING_STAGES.length - 1)) * 100}%`
                                }}
                            />

                            <div className="space-y-6">
                                {TRACKING_STAGES.map((stage, idx) => {
                                    const isPassed = currentStageIdx >= idx;
                                    const isCurrent = currentStageIdx === idx;
                                    const isStepCompleted = currentStageIdx > idx;

                                    // Check if stage timestamp exists in order history
                                    const historyItem = order.projectMeta?.trackingHistory?.find(h => h.stage === stage.id);
                                    let dateDisplay = null;
                                    if (historyItem?.timestamp) {
                                        const d = historyItem.timestamp?.toDate
                                            ? historyItem.timestamp.toDate()
                                            : new Date(historyItem.timestamp);
                                        dateDisplay = d.toLocaleString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        });
                                    } else if (stage.id === 'requested' && order.createdAt) {
                                        const d = order.createdAt?.toDate
                                            ? order.createdAt.toDate()
                                            : new Date(order.createdAt);
                                        dateDisplay = d.toLocaleString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        });
                                    }

                                    return (
                                        <div
                                            key={stage.id}
                                            className={`relative flex items-start gap-4 transition-opacity duration-300 ${
                                                isPassed ? 'opacity-100' : 'opacity-40'
                                            }`}
                                        >
                                            {/* Step Circle Node */}
                                            <div
                                                className={`relative z-10 w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                                                    isStepCompleted
                                                        ? 'bg-emerald-500 text-white shadow-xs border-2 border-emerald-500'
                                                        : isCurrent
                                                            ? 'bg-white text-emerald-600 border-2 border-emerald-500 shadow-md ring-4 ring-emerald-500/15'
                                                            : 'bg-brand-cream/60 text-brand-brown/30 border border-brand-brown/15'
                                                }`}
                                            >
                                                {isStepCompleted ? (
                                                    <CheckCircle className="w-5 h-5" />
                                                ) : (
                                                    <stage.icon className={`w-4 h-4 ${isCurrent ? 'animate-pulse' : ''}`} />
                                                )}
                                            </div>

                                            {/* Step Content */}
                                            <div className="flex-1 min-w-0 bg-[#FAF8F5]/80 hover:bg-[#FAF8F5] p-3.5 rounded-2xl border border-brand-brown/10 transition-colors">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className={`text-sm font-bold ${
                                                            isCurrent ? 'text-brand-black' : isPassed ? 'text-brand-brown' : 'text-brand-brown/50'
                                                        }`}>
                                                            {stage.label}
                                                        </h4>
                                                        {isCurrent && (
                                                            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                                                Active Now
                                                            </span>
                                                        )}
                                                        {isStepCompleted && (
                                                            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                                Completed
                                                            </span>
                                                        )}
                                                    </div>

                                                    {dateDisplay && (
                                                        <span className="text-[11px] font-medium text-brand-brown/60 shrink-0">
                                                            {dateDisplay}
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-xs text-brand-brown/70 font-medium leading-relaxed">
                                                    {stage.description}
                                                </p>

                                                {isCurrent && (
                                                    <div className="mt-2 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                                        <span>Processing on schedule</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Environmental Impact - Show when completed */}
                {isCompleted && order.itemDetails?.analysis?.environmental_impact && (
                    <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-3xl p-8 shadow-xl border-2 border-green-200 relative overflow-hidden">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Leaf className="w-64 h-64" />
                        </div>

                        <div className="relative z-10">
                            {/* Header */}
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-4 shadow-lg">
                                    <Leaf className="w-10 h-10 text-white" />
                                </div>
                                <h2 className="text-3xl font-extrabold text-green-900 mb-2">
                                    🌍 Your Environmental Impact!
                                </h2>
                                <p className="text-green-700 font-medium text-lg">
                                    You've made a positive difference for our planet
                                </p>
                            </div>

                            {/* Impact Metrics Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                {/* CO2 Saved */}
                                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 text-center shadow-md border border-green-100 hover:scale-105 transition-transform">
                                    <div className="text-4xl mb-2">🌱</div>
                                    <div className="text-3xl font-black text-green-600 mb-1">
                                        {order.itemDetails.analysis.environmental_impact.co2_saved_kg || 
                                         order.itemDetails.analysis.environmental_impact.CO2_saved_kg || 0}
                                    </div>
                                    <div className="text-xs font-bold text-green-700 uppercase tracking-wider">
                                        kg CO₂ Saved
                                    </div>
                                </div>

                                {/* Landfill Diverted */}
                                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 text-center shadow-md border border-green-100 hover:scale-105 transition-transform">
                                    <div className="text-4xl mb-2">♻️</div>
                                    <div className="text-3xl font-black text-green-600 mb-1">
                                        {order.itemDetails.analysis.environmental_impact.landfill_diverted_kg || 0}
                                    </div>
                                    <div className="text-xs font-bold text-green-700 uppercase tracking-wider">
                                        kg Waste Diverted
                                    </div>
                                </div>

                                {/* Energy Saved */}
                                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 text-center shadow-md border border-green-100 hover:scale-105 transition-transform">
                                    <div className="text-4xl mb-2">⚡</div>
                                    <div className="text-3xl font-black text-green-600 mb-1">
                                        {order.itemDetails.analysis.environmental_impact.energy_saved_kwh || 0}
                                    </div>
                                    <div className="text-xs font-bold text-green-700 uppercase tracking-wider">
                                        kWh Energy Saved
                                    </div>
                                </div>

                                {/* Sustainability Score */}
                                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 text-center shadow-md border border-green-100 hover:scale-105 transition-transform">
                                    <div className="text-4xl mb-2">🏆</div>
                                    <div className="text-3xl font-black text-green-600 mb-1">
                                        {order.itemDetails.analysis.environmental_impact.sustainability_score || 0}
                                    </div>
                                    <div className="text-xs font-bold text-green-700 uppercase tracking-wider">
                                        Sustainability Score
                                    </div>
                                </div>
                            </div>

                            {/* Celebration Message */}
                            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl p-6 text-center shadow-lg">
                                <p className="text-xl font-bold mb-2">
                                    ✨ Amazing Work! ✨
                                </p>
                                <p className="text-green-50 font-medium">
                                    By choosing to upcycle instead of discarding, you've contributed to a cleaner, 
                                    greener future. Every small action counts towards a sustainable tomorrow!
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Vendor & Payment Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Item Details */}
                    <div className="bg-white rounded-3xl p-6 shadow-[8px_8px_16px_rgba(0,0,0,0.05),-8px_-8px_16px_rgba(255,255,255,0.8)] border border-white">
                        <h2 className="text-lg font-extrabold text-brand-brown mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-brand-orange" />
                            Order Info
                        </h2>
                        <div className="flex items-start gap-4 mb-4">
                            {order.itemImage && <img src={order.itemImage} alt="Item" className="w-20 h-20 rounded-xl object-cover bg-gray-100 shadow-sm" />}
                            <div>
                                <div className="font-extrabold text-brand-black text-lg">{order.itemName}</div>
                                <div className="text-xs text-brand-brown/60 mb-2 font-bold">{order.itemDetails?.material}</div>
                                <div className="text-xs bg-brand-cream px-3 py-1 rounded-full inline-block font-extrabold text-brand-brown border border-brand-brown/10">
                                    {order.itemDetails?.goal}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3 pt-4 border-t border-brand-brown/5">
                            <div className="flex justify-between text-sm">
                                <span className="text-brand-brown/60 font-bold">Base Price</span>
                                <span className="font-bold text-brand-brown">₹{order.finalQuote?.originalBasePrice || order.itemDetails?.conversionDetails?.estimated_conversion_cost_inr}</span>
                            </div>
                            {order.finalQuote?.discountAmount > 0 && (
                                <div className="flex justify-between text-sm text-brand-green font-bold">
                                    <span>Discount ({order.finalQuote?.discountAppliedPercent}%)</span>
                                    <span>-₹{order.finalQuote?.discountAmount}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm">
                                <span className="text-brand-brown/60 font-bold">Logistics</span>
                                <span className="font-bold text-brand-brown">₹{order.finalQuote?.logisticsCost || '0'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-brand-brown/60 font-bold">Fees & Taxes</span>
                                <span className="font-bold text-brand-brown">₹{order.finalQuote?.platformFee || '0'}</span>
                            </div>
                            <div className="flex justify-between text-xl font-black pt-3 border-t-2 border-dashed border-brand-brown/10 mt-3">
                                <span className="text-brand-brown">Total</span>
                                <span className="text-brand-brown">₹{order.finalQuote?.totalCustomerPrice || order.itemDetails?.conversionDetails?.estimated_conversion_cost_inr}</span>
                            </div>
                        </div>
                    </div>

                    {/* Vendor Info */}
                    <div className="bg-white rounded-3xl p-6 shadow-[8px_8px_16px_rgba(0,0,0,0.05),-8px_-8px_16px_rgba(255,255,255,0.8)] border border-white">
                        <h2 className="text-lg font-extrabold text-brand-brown mb-6 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-brand-brown" />
                            Vendor Details
                        </h2>
                        {vendor ? (
                            <div className="text-center relative">
                                <Link
                                    to={`/vendors/${vendor.id}`}
                                    className="block group"
                                    title="View Vendor Profile & Orders"
                                >
                                    <div className="w-20 h-20 bg-brand-cream rounded-full flex items-center justify-center mx-auto mb-4 text-brand-brown font-black text-2xl shadow-inner border-4 border-white group-hover:scale-105 transition-transform">
                                        {vendor.name?.[0] || 'V'}
                                    </div>
                                    <h3 className="font-black text-2xl text-brand-black mb-1 group-hover:text-brand-orange transition-colors flex items-center justify-center gap-1.5">
                                        <span>{vendor.businessName || vendor.name}</span>
                                    </h3>
                                </Link>
                                <div className="flex justify-center gap-2 mb-4">
                                    <div className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-black flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-current" />
                                        {vendor.rating ? vendor.rating.toFixed(2) : 'New'}
                                    </div>
                                    <div className="px-3 py-1 bg-brand-green/10 text-brand-green rounded-full text-xs font-black border border-brand-green/20">
                                        Verified Partner
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-2 mb-6">
                                    <Link
                                        to={`/vendors/${vendor.id}`}
                                        className="w-full py-2.5 bg-brand-cream/80 hover:bg-brand-cream text-brand-brown border border-brand-brown/15 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
                                    >
                                        <Store className="w-4 h-4" />
                                        View Vendor Profile & Orders
                                    </Link>
                                    <button
                                        onClick={() => setShowChat(true)}
                                        className="w-full py-3 bg-brand-brown text-white rounded-xl font-bold shadow-md hover:bg-brand-black transition-all flex items-center justify-center gap-2 text-sm"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                        Chat with Vendor
                                    </button>
                                </div>

                                <div className="space-y-4 text-left bg-brand-cream/30 p-5 rounded-2xl border border-brand-brown/5">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-white rounded-xl shadow-sm text-brand-brown"><MapPin className="w-5 h-5" /></div>
                                        <div>
                                            <div className="text-xs text-brand-brown/50 font-black uppercase tracking-wider mb-1">Address</div>
                                            <div className="text-brand-brown font-bold text-sm leading-relaxed">{vendor.address || vendor.location?.address || "Location Hidden"}</div>
                                        </div>
                                    </div>

                                    {/* Mobile Number - Highlighted */}
                                    <div className="flex items-center gap-4 bg-white p-3 rounded-xl shadow-sm border border-brand-brown/5">
                                        <div className="p-2 bg-brand-green/10 rounded-lg text-brand-green"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg></div>
                                        <div>
                                            <div className="text-[10px] text-brand-brown/40 font-black uppercase tracking-widest">Contact Number</div>
                                            <div className="text-brand-black font-black text-lg tracking-wide">{vendor.phone || vendor.contactNumber || "Not Available"}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-brand-brown/40 py-8">
                                Vendor information loading...
                            </div>
                        )}

                        {isCompleted && !order.userRating && (
                            <div className="mt-8 pt-6 border-t border-brand-brown/5">
                                <h3 className="text-sm font-bold text-center text-brand-brown mb-3">Rate this Service</h3>
                                <div className="flex justify-center gap-2 mb-4">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button key={star} onClick={() => setRatingScore(star)} className={`${star <= ratingScore ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} transition-colors`}>
                                            <Star className="w-8 h-8" />
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={submitRating}
                                    disabled={submittingRating}
                                    className="w-full py-3 bg-brand-brown text-white font-bold rounded-xl hover:bg-brand-black transition-colors disabled:opacity-50"
                                >
                                    {submittingRating ? 'Submitting...' : 'Submit Review'}
                                </button>
                            </div>
                        )}

                        {order.userRating && (
                            <div className="mt-8 text-center">
                                <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-700 px-4 py-2 rounded-xl font-bold">
                                    <CheckCircle className="w-4 h-4" />
                                    You rated {order.userRating}/5
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Chat Modal */}
            {showChat && vendor && (
                <ChatModal
                    orderId={order.id}
                    currentUser={currentUser}
                    recipientName={vendor.businessName || vendor.name}
                    receiverId={vendor.id}
                    onClose={() => setShowChat(false)}
                />
            )}
        </div>
    );
}
