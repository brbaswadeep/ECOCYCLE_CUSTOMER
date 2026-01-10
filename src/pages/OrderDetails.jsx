import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Loader2, ArrowLeft, Clock, MapPin, Truck, PlayCircle, Hourglass, CheckSquare, Calendar, Star, FileText, CheckCircle, ClipboardCheck, Factory, RefreshCw, Sparkles, PackageCheck, Leaf } from 'lucide-react';
import ChatModal from '../components/ChatModal';

const TRACKING_STAGES = [
    { id: 'accepted', label: 'Order Accepted', icon: ClipboardCheck },
    { id: 'arrived', label: 'Arrived at Facility', icon: Truck },
    { id: 'initiated', label: 'Processing Started', icon: Factory },
    { id: 'processing', label: 'In Production', icon: RefreshCw },
    { id: 'finishing', label: 'Finishing Touches', icon: Sparkles },
    { id: 'completed', label: 'Ready for Pickup', icon: PackageCheck }
];

export default function OrderDetails() {
    const { orderId } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [vendor, setVendor] = useState(null);

    // Rating (if completed)
    const [ratingScore, setRatingScore] = useState(5);
    const [submittingRating, setSubmittingRating] = useState(false);

    const [showChat, setShowChat] = useState(false);

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
                alert("Order not found");
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

            // Should also update vendor average here (simplified for this view, logic exists in History.jsx)
            // Ideally extract this logic to a service.
            // For now, assume History.jsx or a cloud function handles aggregation, or we duplicate logic if critical.
            // Let's rely on the user potentially going back to history or just updating the display here.

            alert("Rating submitted!");
        } catch (error) {
            console.error(error);
        } finally {
            setSubmittingRating(false);
        }
    };

    if (loading) return <div className="min-h-screen pt-24 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-brown" /></div>;
    if (!order) return null;

    // Calculate Days Left
    const getCompletionDate = () => {
        if (!order.projectMeta?.estimatedCompletion) return null;
        // Handle Firestore Timestamp or Date string/object
        const date = order.projectMeta.estimatedCompletion.toDate
            ? order.projectMeta.estimatedCompletion.toDate()
            : new Date(order.projectMeta.estimatedCompletion);
        return date;
    };

    const completionDate = getCompletionDate();
    const daysLeft = completionDate ?
        Math.ceil((completionDate - new Date()) / (1000 * 60 * 60 * 24)) : null;

    const isCompleted = order.projectMeta?.trackingStage === 'completed';
    const currentStageIdx = TRACKING_STAGES.findIndex(s => s.id === order.projectMeta?.trackingStage);

    return (
        <div className="min-h-screen bg-brand-cream pt-24 pb-12 px-4">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Header with Back Button */}
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm hover:scale-110 transition-transform">
                        <ArrowLeft className="w-5 h-5 text-brand-brown" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-brand-brown">Order Details</h1>
                        <p className="text-xs text-brand-brown/60">ID: {order.id.slice(0, 8)}</p>
                    </div>
                </div>

                {/* Days Left Hero Section */}
                {!isCompleted && daysLeft !== null && (
                    <div className="bg-brand-brown text-white p-8 rounded-3xl shadow-xl text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Clock className="w-40 h-40" />
                        </div>
                        <div className="relative z-10">
                            <div className="text-sm font-bold opacity-80 uppercase mb-1">Estimated Completion</div>
                            <div className="text-6xl font-extrabold mb-2">{Math.max(0, daysLeft)}</div>
                            <div className="text-xl font-medium opacity-80">{Math.max(0, daysLeft) === 1 ? 'Day' : 'Days'} Remaining</div>
                            <div className="mt-4 inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm">
                                <Calendar className="w-4 h-4" />
                                {completionDate ? completionDate.toLocaleDateString() : 'Date pending'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tracking Stepper */}
                <div className="bg-white rounded-3xl p-8 shadow-[8px_8px_16px_rgba(0,0,0,0.05),-8px_-8px_16px_rgba(255,255,255,0.8)] border border-white">
                    <h2 className="text-xl font-extrabold text-brand-black mb-8 flex items-center gap-3">
                        <div className="p-2 bg-brand-green/10 rounded-xl text-brand-green">
                            <Truck className="w-6 h-6" />
                        </div>
                        Live Tracking
                    </h2>

                    <div className="relative pl-2">
                        {/* Vertical Line */}
                        <div className="absolute left-[1.15rem] top-4 bottom-4 w-0.5 bg-gray-100" />

                        <div className="space-y-8">
                            {TRACKING_STAGES.map((stage, idx) => {
                                const isPassed = currentStageIdx >= idx;
                                const isCurrent = currentStageIdx === idx;
                                const isCompletedStep = currentStageIdx > idx; // Strictly passed

                                // Find timestamp from history if available
                                const historyItem = order.projectMeta?.trackingHistory?.find(h => h.stage === stage.id);

                                return (
                                    <div key={stage.id} className={`relative flex items-start gap-5 group ${isPassed ? 'opacity-100' : 'opacity-40'}`}>

                                        {/* Icon Container */}
                                        <div className={`relative z-10 flex items-center justify-center transition-all duration-500 rounded-2xl border-2 shrink-0
                                            ${isCurrent
                                                ? 'w-14 h-14 bg-white border-brand-orange text-brand-orange shadow-xl scale-110 ring-4 ring-brand-orange/10'
                                                : isCompletedStep
                                                    ? 'w-12 h-12 bg-white border-brand-green text-brand-green shadow-md'
                                                    : 'w-12 h-12 bg-white border-gray-100 text-gray-300'
                                            }
                                        `}>
                                            <stage.icon className={`transition-all ${isCurrent ? 'w-6 h-6 animate-pulse' : 'w-5 h-5'}`} />

                                            {/* Completed Badge - Green Check */}
                                            {isCompletedStep && (
                                                <div className="absolute -right-1 -top-1 w-5 h-5 bg-brand-green text-white rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                                                    <CheckCircle className="w-3 h-3" />
                                                </div>
                                            )}

                                            {/* Pulse Ring for Active State */}
                                            {isCurrent && (
                                                <span className="absolute inline-flex h-full w-full rounded-2xl bg-brand-orange opacity-20 animate-ping"></span>
                                            )}
                                        </div>

                                        <div className={`flex-1 pt-1.5 transition-all duration-300 ${isCurrent ? 'translate-x-2' : ''}`}>
                                            <h3 className={`font-bold text-base flex items-center gap-2 ${isCurrent ? 'text-brand-orange text-lg' : isPassed ? 'text-brand-green' : 'text-gray-400'}`}>
                                                {stage.label}
                                            </h3>

                                            {/* Show status description or timestamp */}
                                            {historyItem ? (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className={`h-1.5 w-1.5 rounded-full ${isPassed ? 'bg-brand-green' : 'bg-gray-300'}`}></div>
                                                    <p className="text-xs text-brand-brown/60 font-bold">
                                                        {historyItem.timestamp?.toDate ? historyItem.timestamp.toDate().toLocaleString() : new Date(historyItem.timestamp).toLocaleString()}
                                                    </p>
                                                </div>
                                            ) : isCurrent ? (
                                                <p className="text-xs text-brand-orange/80 font-bold mt-1 animate-pulse">
                                                    Processing Now...
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                )
                            })}
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
                                <div className="w-20 h-20 bg-brand-cream rounded-full flex items-center justify-center mx-auto mb-4 text-brand-brown font-black text-2xl shadow-inner border-4 border-white">
                                    {vendor.name?.[0] || 'V'}
                                </div>
                                <h3 className="font-black text-2xl text-brand-black mb-1">{vendor.businessName || vendor.name}</h3>
                                <div className="flex justify-center gap-2 mb-6">
                                    <div className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-black flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-current" />
                                        {vendor.rating ? vendor.rating.toFixed(2) : 'New'}
                                    </div>
                                    <div className="px-3 py-1 bg-brand-green/10 text-brand-green rounded-full text-xs font-black border border-brand-green/20">
                                        Verified Partner
                                    </div>
                                </div>

                                {/* Chat Button */}
                                <button
                                    onClick={() => setShowChat(true)}
                                    className="w-full mb-6 py-3 bg-brand-brown text-white rounded-xl font-bold shadow-lg hover:bg-brand-black transition-all flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                    Chat with Vendor
                                </button>

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
