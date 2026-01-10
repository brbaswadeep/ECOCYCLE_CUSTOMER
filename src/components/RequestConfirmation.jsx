import React, { useState, useEffect } from 'react';
import { findLocalVendors, createVendorRequest } from '../services/requestService';
import { Loader2, MapPin, CheckCircle, AlertCircle, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RequestConfirmation({ item, onClose, onSuccess }) {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [vendors, setVendors] = useState([]);
    const [requestStatus, setRequestStatus] = useState('searching'); // searching, found, none, submitting, success, error
    const [errorMsg, setErrorMsg] = useState('');

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
                item, // Pass item details
                vendors
            );
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
                <div className="bg-brand-brown p-6 text-white text-center">
                    <h2 className="text-xl font-bold">Sell / Push to Vendors</h2>
                    <p className="opacity-80 text-sm mt-1">Connecting with local recyclers</p>
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
                                <div className="bg-green-50 p-3 rounded-lg text-sm text-green-800 font-medium mb-6">
                                    Click Confirm to send pickup requests to all of them.
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
                            <div className="py-8 animate-in zoom-in duration-300">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                                    <CheckCircle className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-brand-brown mb-2">Request Sent!</h3>
                                <p className="text-brand-brown/70">
                                    We've notified {vendors.length} vendors. You'll be notified when they accept.
                                </p>
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
                            className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-brand-brown hover:bg-brand-black transition-colors shadow-lg"
                        >
                            Confirm Request
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
