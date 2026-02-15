
import React from 'react';
import { XCircle, AlertTriangle, ShieldAlert, ArrowRight } from 'lucide-react';

export default function RestrictionPopup({ isOpen, onClose, refusalCategory, refusalReason }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header with restricted icon */}
                <div className="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                        <ShieldAlert className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Upload Restricted</h2>
                    <p className="text-red-600 font-medium mt-1 uppercase tracking-wide text-xs">
                        {refusalCategory || "Unverified Content"}
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm text-gray-600">
                        <p className="font-semibold text-gray-900 mb-1">Why was this blocked?</p>
                        <p>{refusalReason || "This image does not appear to be a valid waste item for recycling or upcycling."}</p>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Accepted Items Only:</h3>
                        <ul className="text-sm text-gray-600 space-y-2">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                Plastic, Glass, Metal, Paper
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                E-waste, Textiles, Wood
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                Clear, well-lit photos of objects
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl transform active:scale-[0.98] transition-all"
                    >
                        Try Another Image
                    </button>
                </div>
            </div>
        </div>
    );
}
