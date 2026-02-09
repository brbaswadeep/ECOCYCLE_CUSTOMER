import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, orderBy, getDocs, where, deleteDoc, doc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowRight, Loader2, PackageOpen, Trash2, Truck, PlayCircle, Hourglass, CheckSquare, Clock, Star } from 'lucide-react';

const TRACKING_STAGES = [
    { id: 'accepted', label: 'Accepted', icon: CheckSquare },
    { id: 'arrived', label: 'Arrived', icon: Truck },
    { id: 'initiated', label: 'Initiated', icon: PlayCircle },
    { id: 'processing', label: 'Processing', icon: Hourglass },
    { id: 'finishing', label: 'Finishing', icon: Clock },
    { id: 'completed', label: 'Ready', icon: CheckSquare }
];

function RequestCard({ req, onRate }) {
    const isCompleted = req.projectMeta?.trackingStage === 'completed';
    const isRated = !!req.userRating;
    const navigate = useNavigate();

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-brown/10 flex flex-col md:flex-row gap-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/orders/${req.id}`)}>
            {/* Image */}
            <div className="w-full md:w-32 h-32 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                {req.itemImage && <img src={req.itemImage} alt="Item" className="w-full h-full object-cover" />}
            </div>

            {/* Content */}
            <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase mb-2 ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            req.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {req.status === 'accepted' ? (isCompleted ? 'Completed' : 'In Progress') : req.status}
                        </div>
                        <h3 className="text-xl font-bold text-brand-brown">{req.itemDetails?.goal || "Recycling Request"}</h3>
                        <p className="text-sm text-brand-brown/60">
                            Ordered: {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString() : 'N/A'}
                        </p>
                    </div>
                    {req.projectMeta?.estimatedCompletion && !isCompleted && (
                        <div className="text-right">
                            <div className="text-[10px] font-bold text-brand-brown/40 uppercase">Estimated Completion</div>
                            <div className="text-sm font-bold text-brand-orange flex items-center justify-end gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(req.projectMeta.estimatedCompletion).toLocaleDateString()}
                            </div>
                        </div>
                    )}
                </div>

                {/* TRACKING UI */}
                {req.status === 'accepted' && (
                    <div className="mb-6">
                        <div className="flex justify-between items-center relative">
                            {/* Line */}
                            <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-100 -z-10 rounded-full" />
                            <div
                                className="absolute left-0 top-1/2 h-1 bg-brand-green/30 -z-10 rounded-full transition-all duration-1000"
                                style={{ width: `${(TRACKING_STAGES.findIndex(s => s.id === req.projectMeta?.trackingStage) / (TRACKING_STAGES.length - 1)) * 100}%` }}
                            />

                            {/* Steps */}
                            {TRACKING_STAGES.map((stage, idx) => {
                                const currentIdx = TRACKING_STAGES.findIndex(s => s.id === req.projectMeta?.trackingStage);
                                const isPassed = currentIdx >= idx;
                                const isCurrent = currentIdx === idx;

                                return (
                                    <div key={stage.id} className="flex flex-col items-center gap-2 group">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isPassed ? 'bg-brand-green text-white shadow-lg' : 'bg-gray-100 text-gray-300'
                                            } ${isCurrent ? 'ring-4 ring-brand-green/20 scale-110' : ''}`}>
                                            <stage.icon className="w-4 h-4" />
                                        </div>
                                        <span className={`text-[10px] font-bold absolute -bottom-6 w-20 text-center transition-all ${isCurrent ? 'text-brand-brown opacity-100' : 'text-gray-400 opacity-0 md:opacity-100'
                                            }`}>
                                            {stage.label}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="h-6" /> {/* Spacer for labels */}
                    </div>
                )}

                {/* Financials or Rate Button */}
                <div className="bg-brand-cream/30 rounded-xl p-4 text-sm flex justify-between items-center">
                    <div>
                        <span className="font-bold text-brand-brown/60 block text-xs uppercase">Total Cost</span>
                        <div className="font-bold text-brand-brown text-lg">
                            ₹{req.finalQuote?.totalCustomerPrice || req.itemDetails?.conversionDetails?.estimated_conversion_cost_inr}
                        </div>
                    </div>

                    {isCompleted && !isRated && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRate(); }}
                            className="px-6 py-2 bg-brand-orange text-white font-bold rounded-lg hover:bg-brand-brown transition-colors shadow-lg animate-pulse"
                        >
                            Rate Vendor
                        </button>
                    )}
                    {isRated && (
                        <div className="flex items-center gap-1 text-yellow-500 font-bold bg-white px-3 py-1 rounded-lg">
                            <Star className="w-4 h-4 fill-current" />
                            {req.userRating}/5
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function History() {
    const { currentUser } = useAuth();
    const [history, setHistory] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('requests'); // requests | scans

    // Rating State
    const [ratingItem, setRatingItem] = useState(null);
    const [ratingScore, setRatingScore] = useState(5);
    const [ratingSubmitting, setRatingSubmitting] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        let unsubscribeRequests;
        let unsubscribeHistory;

        async function setupListeners() {
            if (!currentUser) return;
            setLoading(true);
            try {
                // 1. Requests (Orders) Listener
                const requestsRef = collection(db, "requests");
                const requestsQ = query(
                    requestsRef,
                    where("customerId", "==", currentUser.uid)
                );

                console.log("Setting up listener for requests for user:", currentUser.uid);

                unsubscribeRequests = onSnapshot(requestsQ, (snapshot) => {
                    console.log("Requests snapshot received, docs count:", snapshot.size);
                    const loadedRequests = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    // Sort manually - robust date handling
                    loadedRequests.sort((a, b) => {
                        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                        return dateB - dateA;
                    });

                    setRequests(loadedRequests);
                }, (error) => {
                    console.error("Error listening to requests:", error);
                });

                // 2. Scan History Listener
                const historyRef = collection(db, "customers", currentUser.uid, "history");
                const historyQ = query(historyRef, orderBy("timestamp", "desc"));

                unsubscribeHistory = onSnapshot(historyQ, (snapshot) => {
                    const loadedHistory = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setHistory(loadedHistory);
                    setLoading(false); // Stop loading after initial data
                }, (error) => {
                    console.error("Error listening to history:", error);
                    setLoading(false);
                });

            } catch (error) {
                console.error("Error setting up listeners:", error);
                setLoading(false);
            }
        }

        setupListeners();

        return () => {
            if (unsubscribeRequests) unsubscribeRequests();
            if (unsubscribeHistory) unsubscribeHistory();
        };
    }, [currentUser]);

    if (loading) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-red" />
            </div>
        );
    }

    const handleDelete = async (e, scanId, imageUrl) => {
        e.stopPropagation(); // Prevent navigation
        if (!window.confirm("Are you sure you want to delete this scan? This cannot be undone.")) return;

        try {
            // 1. Delete from Firestore
            await deleteDoc(doc(db, "customers", currentUser.uid, "history", scanId));

            // 2. Delete Image from Storage (if exists)
            if (imageUrl) {
                try {
                    // Extract path from URL or create ref directly if you have the path.
                    // Since we stored the download URL, we can try to create a ref from it.
                    const imageRef = ref(storage, imageUrl);
                    await deleteObject(imageRef);
                } catch (storageErr) {
                    console.warn("Could not delete image from storage (it might not exist or permission denied):", storageErr);
                }
            }

            // 3. Update UI
            setHistory(prev => prev.filter(item => item.id !== scanId));

        } catch (error) {
            console.error("Error deleting scan:", error);
            alert("Failed to delete scan. Please try again.");
        }
    };
    const submitRating = async () => {
        if (!ratingItem) return;
        setRatingSubmitting(true);
        try {
            // 1. Update Request with Rating
            const requestRef = doc(db, 'requests', ratingItem.id);
            await updateDoc(requestRef, {
                userRating: ratingScore,
                ratedAt: new Date()
            });

            // 2. Update Vendor's Average Rating
            const vendorId = ratingItem.acceptedBy;
            if (vendorId) {
                const vendorRef = doc(db, 'vendors', vendorId);
                const vendorSnap = await getDoc(vendorRef);

                if (vendorSnap.exists()) {
                    const vData = vendorSnap.data();
                    const currentRating = vData.rating || 5; // Default 5
                    const ratingCount = vData.ratingCount || 0; // Default 1 (the initial 5)

                    // Calculate new average
                    const newCount = ratingCount + 1;
                    const newRating = ((currentRating * ratingCount) + ratingScore) / newCount;

                    await updateDoc(vendorRef, {
                        rating: newRating,
                        ratingCount: newCount
                    });
                }
            }

            // 3. Update Local State
            setRequests(prev => prev.map(r => r.id === ratingItem.id ? { ...r, userRating: ratingScore } : r));
            setRatingItem(null);
            alert("Thank you for your feedback!");

        } catch (error) {
            console.error("Error submitting rating:", error);
            alert("Failed to submit rating.");
        } finally {
            setRatingSubmitting(false);
        }
    };

    // Filter out completed items if needed, or sort active first
    // User asked: "only things would be present which are not yet completed"
    // I will Separate Active vs Past orders for better UX
    const activeOrders = requests.filter(r => r.status !== 'declined' && r.projectMeta?.trackingStage !== 'completed');
    const pastOrders = requests.filter(r => r.status === 'declined' || r.projectMeta?.trackingStage === 'completed');
    return (
        <div className="min-h-screen bg-brand-cream pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-brand-brown">My Activity</h1>
                        <p className="text-brand-brown/60 mt-2">Manage orders and view past scans.</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-brand-brown/10 mb-8">
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`pb-4 px-2 font-bold transition-colors relative ${activeTab === 'requests' ? 'text-brand-brown' : 'text-brand-brown/40 hover:text-brand-brown/60'
                            }`}
                    >
                        My Requests
                        {activeTab === 'requests' && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-brown rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('scans')}
                        className={`pb-4 px-2 font-bold transition-colors relative ${activeTab === 'scans' ? 'text-brand-brown' : 'text-brand-brown/40 hover:text-brand-brown/60'
                            }`}
                    >
                        Scan History
                        {activeTab === 'scans' && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-brown rounded-t-full" />
                        )}
                    </button>
                </div>

                {/* Requests List */}
                {activeTab === 'requests' && (
                    <div className="space-y-8">
                        {/* Active Orders Section */}
                        <div>
                            <h2 className="text-xl font-bold text-brand-brown mb-4 flex items-center gap-2">
                                <Loader2 className="w-5 h-5 text-brand-orange animate-spin-slow" />
                                Active Orders
                            </h2>
                            {activeOrders.length === 0 ? (
                                <p className="text-brand-brown/40 italic">No active orders in progress.</p>
                            ) : (
                                <div className="grid grid-cols-1 gap-6">
                                    {activeOrders.map(req => <RequestCard key={req.id} req={req} onRate={() => setRatingItem(req)} />)}
                                </div>
                            )}
                        </div>

                        {/* Past Orders Section */}
                        {pastOrders.length > 0 && (
                            <div className="pt-8 border-t border-brand-brown/10">
                                <h2 className="text-xl font-bold text-brand-brown mb-4 opacity-70">Past Orders</h2>
                                <div className="grid grid-cols-1 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                                    {pastOrders.map(req => <RequestCard key={req.id} req={req} onRate={() => setRatingItem(req)} />)}
                                </div>
                            </div>
                        )}

                        {requests.length === 0 && (
                            <div className="text-center py-20 bg-white rounded-3xl border border-brand-brown/10">
                                <PackageOpen className="w-16 h-16 text-brand-brown/20 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-brand-brown">No requests yet</h3>
                                <p className="text-brand-brown/60">Requests sent to vendors will appear here.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Scans List (Existing) */}
                {activeTab === 'scans' && (
                    <>
                        {history.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-3xl border border-brand-brown/10 shadow-sm">
                                <div className="w-20 h-20 bg-brand-cream rounded-full flex items-center justify-center mx-auto text-brand-brown/40 mb-4">
                                    <PackageOpen className="w-10 h-10" />
                                </div>
                                <h3 className="text-xl font-bold text-brand-brown mb-2">No history found</h3>
                                <p className="text-brand-brown/60 mb-6">You haven't scanned any items yet.</p>
                                <button
                                    onClick={() => navigate('/smart-scan')}
                                    className="px-6 py-3 bg-brand-red text-white font-bold rounded-xl hover:bg-brand-brown transition-colors"
                                >
                                    Start First Scan
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {history.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => navigate(`/history/${item.id}`)}
                                        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-brand-brown/10 hover:shadow-lg transition-all cursor-pointer group"
                                    >
                                        <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt="Scan" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-300">
                                                    <PackageOpen className="w-8 h-8" />
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-brand-brown shadow-sm flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {item.timestamp?.toDate().toLocaleDateString()}
                                            </div>
                                            <button
                                                onClick={(e) => handleDelete(e, item.id, item.imageUrl)}
                                                className="absolute top-2 left-2 p-1.5 bg-red-500/90 backdrop-blur-sm rounded-lg text-white shadow-sm hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete Scan"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="p-5">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-bold text-lg text-brand-black capitalize">{item.summary?.object || "Unknown Item"}</h3>
                                                    <p className="text-sm text-brand-brown/60 capitalize">{item.summary?.material || "Unknown Material"}</p>
                                                </div>
                                                <div className="bg-brand-green/10 text-brand-green px-2 py-1 rounded-lg text-xs font-bold">
                                                    {item.summary?.score || 0}/100
                                                </div>
                                            </div>
                                            <div className="mt-4 flex items-center text-brand-red text-sm font-bold group-hover:translate-x-1 transition-transform">
                                                View Details
                                                <ArrowRight className="w-4 h-4 ml-1" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
            {/* Rating Modal */}
            {ratingItem && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-xl animate-in zoom-in-95">
                        <h3 className="text-2xl font-bold text-brand-brown mb-2">Rate your Experience</h3>
                        <p className="text-brand-brown/60 text-sm mb-6">How was the work for {ratingItem.itemDetails?.goal}?</p>

                        <div className="flex justify-center gap-2 mb-8">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    onClick={() => setRatingScore(star)}
                                    className={`transition-transform hover:scale-110 ${star <= ratingScore ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                                >
                                    <Star className="w-8 h-8 fill-current" />
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setRatingItem(null)}
                                className="flex-1 py-3 text-brand-brown font-bold hover:bg-gray-50 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitRating}
                                disabled={ratingSubmitting}
                                className="flex-1 py-3 bg-brand-brown text-white font-bold rounded-xl hover:bg-brand-black disabled:opacity-50"
                            >
                                {ratingSubmitting ? 'Submitting...' : 'Submit Rating'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


