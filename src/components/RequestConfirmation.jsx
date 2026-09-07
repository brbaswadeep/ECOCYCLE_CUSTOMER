import React, { useState, useEffect } from 'react';
import { findLocalVendors, createVendorRequest } from '../services/requestService';
import { Loader2, MapPin, CheckCircle, AlertCircle, Store, DollarSign, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';

export default function RequestConfirmation({ item, onClose, onSuccess }) {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [vendors, setVendors] = useState([]);
    const [requestStatus, setRequestStatus] = useState('searching'); // searching, found, none, submitting, success, error
    const [errorMsg, setErrorMsg] = useState('');
    const [askingPrice, setAskingPrice] = useState(item.estimatedValue || 0);

    useEffect(() => {
        if (currentUser && currentUser.location && currentUser.location.coordinates) {
            searchVendors();
        } else {
            setRequestStatus('error');
            setErrorMsg("Please set your location in profile first.");
            setLoading(false);
        }
    }, [currentUser]);

    const searchVendors = async () => {
        setLoading(true);
        try {
            // Find vendors within 15km
            const results = await findLocalVendors(currentUser.location.coordinates, 15);
            setVendors(results);
            if (results.length > 0) {
                setRequestStatus('found');
            } else {
                setRequestStatus('none');
            }
        } catch (error) {
            console.error(error);
            setRequestStatus('error');
            setErrorMsg("Failed to search for vendors.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmRequest = async () => {
        setRequestStatus('submitting');
        try {
            await createVendorRequest(
                currentUser.uid,
                currentUser.location,
                {
                    ...item,
                    askingPrice: parseFloat(askingPrice),
                    requestType: item.requestType || 'recycle',
                    imageUrl: item.imageUrl // Explicitly ensure imageUrl is passed if needed (though spread handles it)
                }, // Pass item details
                vendors
            );

            // Award +25 EcoPoints ONLY after proceeding request
            try {
                const custRef = doc(db, "customers", currentUser.uid);
                await updateDoc(custRef, {
                    ecoPoints: increment(25),
                    totalEarnedPoints: increment(25)
                });

                await addDoc(collection(db, "customers", currentUser.uid, "pointsHistory"), {
                    title: "Scrap Request Submitted",
                    source: "Pickup Request",
                    points: 25,
                    type: "earned",
                    description: `Claimed 25 EcoPoints for proceeding request for ${item.name || 'scrap item'}`,
                    createdAt: serverTimestamp()
                });
            } catch (ptsErr) {
                console.warn("Points award error:", ptsErr);
            }

            setRequestStatus('success');
            // Wait a bit before closing or redirecting
        } catch (error) {
            console.error(error);
            setRequestStatus('error');
            setErrorMsg("Failed to send request.");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className={`${item.requestType === 'sell' ? 'bg-brand-red' : 'bg-brand-brown'} p-6 text-white text-center transition-colors`}>
                    <h2 className="text-xl font-bold">{item.requestType === 'sell' ? 'Sell to Local Vendors' : 'Request Pickup / Recycle'}</h2>
                    <p className="opacity-80 text-sm mt-1">{item.requestType === 'sell' ? 'Get paid for your recyclables' : 'Connecting with local recyclers'}</p>
                </div>

                <div className="p-6 overflow-y-auto flex-1">

                    {/* Item Summary */}
                    <div className="flex items-center gap-4 bg-brand-cream/30 p-4 rounded-xl mb-6">
                        {item.image && (
                            <img src={item.image} alt="Item" className="w-16 h-16 rounded-lg object-cover" />
                        )}
                        <div>
                            <div className="font-bold text-brand-brown">{item.name}</div>
                            <div className="text-xs text-brand-brown/60">
                                {item.material || 'Unknown Material'}
                            </div>
                            {item.requestType === 'sell' && (
                                <div className="text-xs font-bold text-brand-green mt-1">
                                    Est. Value: ₹{item.estimatedValue}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status States */}
                    <div className="text-center space-y-4">

                        {loading && (
                            <div className="py-8">
                                <Loader2 className="w-10 h-10 text-brand-orange animate-spin mx-auto mb-4" />
                                <p className="font-bold text-brand-brown">Searching for vendors nearby...</p>
                                <p className="text-sm text-brand-brown/60">Scanning 15km radius</p>
                            </div>
                        )}

                        {!loading && requestStatus === 'found' && (
                            <div className="py-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                                    <Store className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-brand-brown mb-2">
                                    {vendors.length} Vendors Found!
                                </h3>
                                <p className="text-brand-brown/70 mb-6">
                                    We found local vendors near you who accept this material.
                                </p>

                                {item.requestType === 'sell' && (
                                    <div className="bg-brand-green/10 p-4 rounded-xl mb-6">
                                        <label className="block text-sm font-bold text-brand-green mb-2 uppercase tracking-wide">
                                            Your Selling Price (₹)
                                        </label>
                                        <div className="relative max-w-[200px] mx-auto">
                                            <div className="flex items-center justify-center gap-2 mb-2">
                                                <button
                                                    onClick={() => setAskingPrice(Math.max(0, parseFloat(askingPrice) - 1))}
                                                    className="w-8 h-8 rounded-full bg-gray-100 font-bold text-gray-600 hover:bg-gray-200"
                                                >-</button>
                                                <input
                                                    type="number"
                                                    value={askingPrice}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        const limit = (item.estimatedValue || 0) + 15;
                                                        if (val <= limit) setAskingPrice(val);
                                                    }}
                                                    className="w-24 text-center text-2xl font-black text-brand-brown bg-white border border-brand-green/30 rounded-lg p-2 focus:ring-2 focus:ring-brand-green focus:outline-none"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const limit = (item.estimatedValue || 0) + 15;
                                                        setAskingPrice(Math.min(limit, parseFloat(askingPrice) + 1));
                                                    }}
                                                    className="w-8 h-8 rounded-full bg-gray-100 font-bold text-gray-600 hover:bg-gray-200"
                                                >+</button>
                                            </div>
                                            <div className="text-xs text-brand-green/70 mt-1 font-medium">
                                                Max allowed: ₹{(item.estimatedValue || 0) + 15}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-green-50 p-3 rounded-lg text-sm text-green-800 font-medium mb-6">
                                    Click Confirm to send {item.requestType === 'sell' ? 'offer' : 'pickup request'} to {vendors.length} vendors.
                                </div>
                            </div>
                        )}

                        {!loading && requestStatus === 'none' && (
                            <div className="py-8">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                    <AlertCircle className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-brand-brown mb-2">No Vendors Nearby</h3>
                                <p className="text-brand-brown/60">
                                    Use our conversion ideas to repurpose it yourself!
                                </p>
                            </div>
                        )}

                        {!loading && requestStatus === 'success' && (
                            <div className="py-6 animate-in zoom-in duration-300 space-y-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 shadow-sm">
                                    <CheckCircle className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-brand-brown">Request Submitted!</h3>
                                    <p className="text-xs text-brand-brown/70 mt-1">
                                        We've notified {vendors.length} local vendors. You'll be notified when they {item.requestType === 'sell' ? 'buy' : 'accept'}.
                                    </p>
                                </div>

                                {/* Claimed EcoPoints Banner */}
                                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-left shadow-xs">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-sm shadow-xs flex-shrink-0">
                                            +25
                                        </div>
                                        <div>
                                            <div className="font-black text-xs text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                                                <Sparkles size={13} className="text-amber-600" />
                                                <span>25 EcoPoints Claimed!</span>
                                            </div>
                                            <div className="text-[11px] text-emerald-800">
                                                Added to your balance for proceeding request
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-bold bg-white text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-xs flex-shrink-0">
                                        Claimed ✓
                                    </span>
                                </div>
                            </div>
                        )}

                        {!loading && requestStatus === 'error' && (
                            <div className="py-8">
                                <div className="text-red-500 font-bold mb-2">Error</div>
                                <p className="text-sm text-brand-brown/70">{errorMsg}</p>
                            </div>
                        )}

                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-brand-brown hover:bg-gray-200 transition-colors"
                    >
                        {requestStatus === 'success' ? 'Close' : 'Cancel'}
                    </button>

                    {requestStatus === 'found' && (
                        <button
                            onClick={handleConfirmRequest}
                            className={`flex-1 py-3 px-4 rounded-xl font-bold text-white transition-all shadow-lg transform active:scale-95 ${item.requestType === 'sell' ? 'bg-brand-red hover:bg-[#c4442b]' : 'bg-brand-brown hover:bg-brand-black'}`}
                        >
                            Confirm {item.requestType === 'sell' ? 'Sale' : 'Request'}
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
