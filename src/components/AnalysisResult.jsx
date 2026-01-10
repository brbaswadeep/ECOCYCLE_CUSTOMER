import React, { useState } from 'react';
import { Leaf, DollarSign, Recycle, Store } from 'lucide-react';
import ProductCard from './ProductCard';
import RequestConfirmation from './RequestConfirmation';

export default function AnalysisResult({ result, image, onReset, onDone, isHistoryView = false }) {
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    if (!result) return null;

    const AnalysisCard = ({ title, children, className = "" }) => (
        <div className={`bg-white rounded-2xl shadow-sm border border-brand-brown/10 p-6 ${className}`}>
            <h3 className="text-lg font-bold text-brand-brown mb-4 border-b border-brand-brown/10 pb-2">{title}</h3>
            {children}
        </div>
    );

    const handleVendorRequest = (product = null) => {
        setSelectedProduct(product);
        setShowRequestModal(true);
    };



    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {showRequestModal && (
                <RequestConfirmation
                    item={{
                        name: selectedProduct?.product_name || result.waste_analysis?.detected_items?.[0]?.specific_object || "Item",
                        material: result.waste_analysis?.detected_items?.[0]?.material_type,
                        image: image,
                        goal: selectedProduct ? `Recycle as: ${selectedProduct.product_name}` : 'General Recycling',
                        conversionDetails: selectedProduct, // Pass full object
                        analysis: result // CRITICAL: Pass full analysis including environmental_impact
                    }}
                    onClose={() => {
                        setShowRequestModal(false);
                        setSelectedProduct(null);
                    }}
                    onSuccess={() => {
                        // Optional: Navigate to dashboard or show success message globally
                        // For now modal handles its own success state view
                    }}
                />
            )}


            {image && (
                <div className="w-full h-64 md:h-80 rounded-2xl overflow-hidden bg-gray-100 shadow-inner mb-6 relative group">
                    <img src={image} alt="Analyzed item" className="w-full h-full object-contain" />
                    {isHistoryView && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                    )}
                </div>
            )}

            {/* Top Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-brand-red to-orange-500 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-2 opacity-90 mb-1">
                        <Recycle className="w-5 h-5" />
                        <span className="text-sm font-bold uppercase tracking-wider">Material</span>
                    </div>
                    <div className="text-3xl font-extrabold capitalize">{result.waste_analysis?.detected_items?.[0]?.material_type || "Unknown"}</div>
                    <div className="text-white/80 mt-1 capitalize">{result.waste_analysis?.detected_items?.[0]?.specific_object}</div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-brown/10">
                    <div className="flex items-center gap-2 text-brand-brown/60 mb-1">
                        <Leaf className="w-5 h-5" />
                        <span className="text-sm font-bold uppercase tracking-wider">Sustainability Score</span>
                    </div>
                    <div className="text-3xl font-extrabold text-brand-green">
                        {result.environmental_impact?.sustainability_score || 0}/100
                    </div>
                    <div className="text-xs text-brand-brown/60 mt-1">Based on potential impact</div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-brown/10">
                    <div className="flex items-center gap-2 text-brand-brown/60 mb-1">
                        <DollarSign className="w-5 h-5" />
                        <span className="text-sm font-bold uppercase tracking-wider">Est. Value</span>
                    </div>
                    <div className="text-3xl font-extrabold text-brand-brown">
                        ₹{result.quantity_estimation?.approximate_market_value || "0"}
                    </div>
                    <div className="text-xs text-brand-brown/60 mt-1">Market estimate</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Analysis Details */}
                <div className="space-y-6">
                    <AnalysisCard title="Quality Assessment">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-brand-cream/30 rounded-xl">
                                <div className="text-xs text-brand-brown/60 font-bold uppercase">Condition</div>
                                <div className="font-medium text-brand-brown capitalize">{result.quality_assessment?.cleanliness_level?.replace('_', ' ')}</div>
                            </div>
                            <div className="p-3 bg-brand-cream/30 rounded-xl">
                                <div className="text-xs text-brand-brown/60 font-bold uppercase">Damage</div>
                                <div className="font-medium text-brand-brown capitalize">{result.quality_assessment?.damage_level?.replace('_', ' ')}</div>
                            </div>
                            <div className="p-3 bg-brand-cream/30 rounded-xl">
                                <div className="text-xs text-brand-brown/60 font-bold uppercase">Reusability</div>
                                <div className="font-medium text-brand-brown">{(result.quality_assessment?.reusability_score * 100).toFixed(0)}%</div>
                            </div>
                            <div className="p-3 bg-brand-cream/30 rounded-xl">
                                <div className="text-xs text-brand-brown/60 font-bold uppercase">Weight/Vol</div>
                                <div className="font-medium text-brand-brown">
                                    {result.quantity_estimation?.approximate_weight_kg}kg / {result.quantity_estimation?.volume_estimate_liters}L
                                </div>
                            </div>
                        </div>
                    </AnalysisCard>

                    <AnalysisCard title="Best Recommendation">
                        <div className="bg-brand-red/5 border border-brand-red/10 rounded-xl p-4 mb-4">
                            <h4 className="font-bold text-brand-red mb-2">{result.best_recommendation?.recommended_option}</h4>
                            <p className="text-sm text-brand-brown/80 leading-relaxed">
                                {result.best_recommendation?.reasoning}
                            </p>
                        </div>

                        {/* Action Button for Vendor Request */}
                        <button
                            onClick={() => handleVendorRequest(null)}
                            className="w-full py-3 mb-4 bg-brand-brown text-white font-bold rounded-xl hover:bg-brand-black transition-colors shadow-lg flex items-center justify-center gap-2"
                        >
                            <Store className="w-5 h-5" />
                            Sell / Request Pickup
                        </button>                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="bg-white p-2 rounded-lg border border-brand-brown/10">
                                <div className="font-bold text-brand-brown">Feasibility</div>
                                <div className="text-brand-orange">High</div>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-brand-brown/10">
                                <div className="font-bold text-brand-brown">Economic</div>
                                <div className="text-brand-green">Good</div>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-brand-brown/10">
                                <div className="font-bold text-brand-brown">Eco Impact</div>
                                <div className="text-brand-blue">Positive</div>
                            </div>
                        </div>
                    </AnalysisCard>
                </div>

                {/* Right Column: Conversion Options */}
                <div className="space-y-6">
                    <AnalysisCard title="Household & DIY Ideas">
                        <p className="text-sm text-brand-brown/60 mb-4">Select an idea to request specific recycling:</p>
                        <div className="grid grid-cols-1 gap-4">
                            {result.conversion_options?.map((option, idx) => (
                                <ProductCard
                                    key={idx}
                                    option={option}
                                    index={idx}
                                    onAction={handleVendorRequest}
                                />
                            ))}
                        </div>
                    </AnalysisCard>
                </div>
            </div>

            {!isHistoryView && (
                <div className="flex justify-center gap-4 pt-8">
                    {onReset && (
                        <button
                            onClick={onReset}
                            className="px-8 py-3 bg-white border border-brand-brown/20 rounded-xl font-bold text-brand-brown hover:bg-brand-cream transition-colors shadow-sm"
                        >
                            Analyze Another Item
                        </button>
                    )}
                    {onDone && (
                        <button
                            onClick={onDone}
                            className="px-8 py-3 bg-brand-red text-white border border-brand-red rounded-xl font-bold hover:bg-brand-brown hover:border-brand-brown transition-colors shadow-lg"
                        >
                            Done
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
