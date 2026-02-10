import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Loader2, ArrowLeft, Package, Truck, CheckCircle, MapPin, DollarSign, Calendar, ExternalLink, Copy } from 'lucide-react';

const TRACKING_STEPS = [
    { id: 'pending', label: 'Order Placed', icon: Package },
    { id: 'shipped', label: 'In Transit', icon: Truck },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle }
];

export default function StoreOrderDetails() {
    const { orderId } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

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
                alert("Order not found");
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

    const currentStepIndex = TRACKING_STEPS.findIndex(s => s.id === order.status);
    const isDelivered = order.status === 'delivered';

    return (
        <div className="min-h-screen bg-brand-cream pt-24 pb-12 px-4 animate-in fade-in">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/shop')} className="p-2 bg-white rounded-full shadow-sm hover:scale-110 transition-transform">
                        <ArrowLeft className="w-5 h-5 text-brand-brown" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-brand-brown">Track Order</h1>
                        <p className="text-xs text-brand-brown/60">Order ID: #{order.id.slice(0, 8)}</p>
                    </div>
                </div>

                {/* Tracking Status Card */}
                <div className="bg-white rounded-3xl p-8 shadow-lg border border-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                        <Truck className="w-32 h-32" />
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-xl font-extrabold text-brand-brown mb-8">Order Status</h2>
                        <div className="relative flex justify-between">
                            {/* Connecting Line */}
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-10 -translate-y-1/2 rounded-full" />
                            <div
                                className="absolute top-1/2 left-0 h-1 bg-brand-green transition-all duration-1000 -z-10 -translate-y-1/2 rounded-full"
                                style={{ width: `${(currentStepIndex / (TRACKING_STEPS.length - 1)) * 100}%` }}
                            />

                            {TRACKING_STEPS.map((step, idx) => {
                                const isCompleted = idx <= currentStepIndex;
                                const isCurrent = idx === currentStepIndex;

                                return (
                                    <div key={step.id} className="flex flex-col items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 bg-white
                                            ${isCompleted ? 'border-brand-green text-brand-green shadow-md scale-110' : 'border-gray-100 text-gray-300'}
                                            ${isCurrent ? 'ring-4 ring-brand-green/20' : ''}
                                        `}>
                                            <step.icon className="w-4 h-4" />
                                        </div>
                                        <div className={`text-xs font-bold transition-colors duration-300 ${isCompleted ? 'text-brand-brown' : 'text-gray-300'}`}>{step.label}</div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Courier Details */}
                        {order.status === 'shipped' && order.trackingId && (
                            <div className="mt-8 bg-brand-cream/50 rounded-2xl p-6 border border-brand-brown/5 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div>
                                    <div className="text-xs font-bold text-brand-brown/50 uppercase tracking-widest mb-1">Shipped via {order.deliveryPartner || 'Courier'}</div>
                                    <div className="text-xl font-black text-brand-black tracking-wide flex items-center gap-2">
                                        {order.trackingId}
                                        <button
                                            onClick={() => { navigator.clipboard.writeText(order.trackingId); alert("Copied!") }}
                                            className="p-1 hover:bg-black/5 rounded-md transition" title="Copy Tracking ID"
                                        >
                                            <Copy className="w-4 h-4 text-brand-brown/40" />
                                        </button>
                                    </div>
                                </div>
                                <button className="px-6 py-3 bg-white border border-brand-brown/10 text-brand-brown font-bold rounded-xl shadow-sm hover:shadow-md transition flex items-center gap-2">
                                    Track on {order.deliveryPartner || 'Courier'} <ExternalLink className="w-4 h-4" />
                                </button>
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
                            <p className="text-sm text-brand-brown/60 mb-2">Sold by {order.vendorName}</p>
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
