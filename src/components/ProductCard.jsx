import React, { useState, useEffect } from 'react';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchProductImage } from '../services/googleImageService';

export default function ProductCard({ option, index, onImageLoad, onAction }) {
    const [imageUrl, setImageUrl] = useState(null);
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [includeLogistics, setIncludeLogistics] = useState(false);

    useEffect(() => {
        loadImage();
    }, [option.product_name]);

    const loadImage = async () => {
        setImageLoading(true);
        setImageError(false);
        try {
            const url = await fetchProductImage(option.product_name);
            setImageUrl(url);
            if (onImageLoad) {
                onImageLoad(option.product_name, url);
            }
        } catch (error) {
            console.error('Failed to load image:', error);
            setImageError(true);
        } finally {
            setImageLoading(false);
        }
    };

    const getTotalCost = () => {
        if (!option.cost_breakdown) return option.estimated_conversion_cost_inr || 0;
        let total = option.cost_breakdown.customer_display_mfg_price;
        if (includeLogistics) {
            total += option.cost_breakdown.logistics_cost;
        }
        return total;
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-brand-brown/10 overflow-hidden hover:shadow-lg transition-all duration-300">
            {/* Image Section */}
            <div
                className="relative h-48 bg-brand-cream/30 cursor-pointer group"
                onClick={() => setExpanded(!expanded)}
            >
                {imageLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
                    </div>
                ) : imageError ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-brand-cream">
                        <div className="text-center p-4">
                            <div className="text-4xl mb-2">🎨</div>
                            <p className="text-sm text-brand-brown/60 font-medium">{option.product_name}</p>
                        </div>
                    </div>
                ) : (
                    <img
                        src={imageUrl}
                        alt={option.product_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={() => setImageError(true)}
                    />
                )}

                {/* Overlay with product name */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="flex items-center justify-between text-white">
                            <span className="text-sm font-bold">Click to view details</span>
                            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                    </div>
                </div>

                {/* Number badge */}
                <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-brand-red text-white flex items-center justify-center font-bold text-sm shadow-lg">
                    {index + 1}
                </div>

                {/* Conversion type badge */}
                <div className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-brand-brown uppercase shadow-sm">
                    {option.conversion_type}
                </div>
            </div>

            {/* Product Info - Always Visible */}
            <div className="p-4">
                <h4 className="font-bold text-brand-brown text-lg mb-2">{option.product_name}</h4>

                {/* Quick Stats */}
                <div className="flex items-center gap-4 text-sm mb-3">
                    <span className="text-brand-green font-bold">
                        ₹{getTotalCost()}
                    </span>
                    <span className="text-brand-brown/50">|</span>
                    <span className="text-brand-orange capitalize">{option.difficulty_level}</span>
                </div>

                {/* Action for this specific idea */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onAction) onAction({ ...option, includeLogistics });
                    }}
                    className="w-full py-2 bg-brand-brown/5 text-brand-brown hover:bg-brand-brown hover:text-white rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                    Recycle as this Object
                </button>

                {/* Expanded Details */}
                {expanded && (
                    <div className="mt-4 pt-4 border-t border-brand-brown/10 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Daily Use Case */}
                        <div className="bg-brand-brown/5 p-3 rounded-xl border border-brand-brown/10">
                            <div className="text-xs font-bold text-brand-brown/60 uppercase mb-1">Daily Use Case</div>
                            <p className="text-sm text-brand-brown italic">"{option.daily_use_case}"</p>
                        </div>

                        {/* Analysis Factors & Weight */}
                        {option.analysis_factors && (
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-gray-50 p-2 rounded-lg">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase">Yield</div>
                                    <div className="text-xs font-bold text-gray-600">{option.analysis_factors.yield_factor}</div>
                                </div>
                                <div className="bg-gray-50 p-2 rounded-lg">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase">Grade</div>
                                    <div className="text-xs font-bold text-gray-600">{option.analysis_factors.quality_grade}</div>
                                </div>
                                <div className="bg-gray-50 p-2 rounded-lg">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase">Usable Wt</div>
                                    <div className="text-xs font-bold text-gray-600">{option.analysis_factors.usable_weight_kg}kg</div>
                                </div>
                            </div>
                        )}

                        {/* Materials Split */}
                        {option.materials_needed && (
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <div className="font-bold text-brand-brown/60 uppercase mb-1">You Provide</div>
                                    <ul className="list-disc list-inside text-brand-brown opacity-80">
                                        {option.materials_needed.customer_can_provide?.map((m, i) => <li key={i}>{m}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <div className="font-bold text-brand-brown/60 uppercase mb-1">Vendor Provides</div>
                                    <ul className="list-disc list-inside text-brand-orange opacity-80">
                                        {option.materials_needed.vendor_can_provide?.map((m, i) => <li key={i}>{m}</li>)}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Detailed Cost Breakdown with Toggle */}
                        {option.cost_breakdown && (
                            <div className="bg-brand-cream/30 rounded-xl p-3 space-y-2">
                                <div className="text-xs font-bold text-brand-brown/60 uppercase border-b border-brand-brown/10 pb-1">Cost Estimation</div>

                                <div className="flex justify-between text-xs items-center">
                                    <span className="text-brand-brown/80">Manufacturing (Inc. Tax):</span>
                                    <span className="font-bold text-brand-brown">₹{option.cost_breakdown.customer_display_mfg_price}</span>
                                </div>

                                <div className="flex justify-between text-xs items-center pt-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={includeLogistics}
                                            onChange={(e) => setIncludeLogistics(e.target.checked)}
                                            className="rounded text-brand-green focus:ring-brand-green"
                                        />
                                        <span className="text-brand-brown/80">Include Pickup & Delivery</span>
                                    </label>
                                    <span className={`font-bold ${includeLogistics ? 'text-brand-brown' : 'text-gray-400'}`}>
                                        + ₹{option.cost_breakdown.logistics_cost}
                                    </span>
                                </div>

                                <div className="flex justify-between text-xs pt-2 border-t border-brand-brown/10 mt-1">
                                    <span className="font-bold text-brand-brown">Total Estimated:</span>
                                    <span className="font-bold text-brand-green text-sm">₹{getTotalCost()}</span>
                                </div>
                            </div>
                        )}

                        <div>
                            <div className="text-xs font-bold text-brand-brown/60 uppercase mb-1">Processing</div>
                            <p className="text-sm text-brand-brown">{option.required_processing}</p>
                        </div>

                        {option.feasibility_score && (
                            <div>
                                <div className="text-xs font-bold text-brand-brown/60 uppercase mb-1">Feasibility Score</div>
                                <div className="w-full bg-brand-cream/50 rounded-full h-2">
                                    <div
                                        className="bg-brand-green h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${option.feasibility_score * 100}%` }}
                                    />
                                </div>
                                <div className="text-xs text-brand-brown/60 mt-1">{(option.feasibility_score * 100).toFixed(0)}% feasible</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
