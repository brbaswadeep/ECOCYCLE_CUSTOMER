
import React from 'react';
import { ShieldAlert, AlertTriangle, Syringe, Bomb, Skull, ShieldBan, X, Info } from 'lucide-react';

export default function RestrictionPopup({ isOpen, onClose, refusalCategory, refusalReason, guidance }) {
    if (!isOpen) return null;

    const isHazardous = refusalCategory && (
        refusalCategory.toLowerCase().includes('hazard') ||
        refusalCategory.toLowerCase().includes('explosive') ||
        refusalCategory.toLowerCase().includes('medical') ||
        refusalCategory.toLowerCase().includes('bomb') ||
        refusalCategory.toLowerCase().includes('weapon') ||
        refusalCategory.toLowerCase().includes('toxic')
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 my-8">

                {/* Header with restricted icon */}
                <div className={`p-6 flex flex-col items-center text-center border-b ${isHazardous ? 'bg-red-500 text-white' : 'bg-red-50 text-gray-900 border-red-100'}`}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-md ${isHazardous ? 'bg-white text-red-600' : 'bg-red-100 text-red-600'}`}>
                        {isHazardous ? <ShieldBan className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-1.5 ${isHazardous ? 'bg-red-600 text-red-100' : 'bg-red-100 text-red-700'}`}>
                        {isHazardous ? 'Strict Safety Restriction' : 'Upload Restricted'}
                    </span>
                    <h2 className={`text-2xl font-bold ${isHazardous ? 'text-white' : 'text-gray-900'}`}>
                        {refusalCategory || "Unverified Content"}
                    </h2>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                    {/* Why was this blocked */}
                    <div className="bg-red-50/80 p-4 rounded-2xl border border-red-100 text-sm text-gray-700 space-y-1">
                        <div className="flex items-center gap-2 font-bold text-red-800">
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            <span>Why was this blocked?</span>
                        </div>
                        <p className="text-gray-700 pl-6 leading-relaxed">
                            {refusalReason || "This item violates safety and recycling policies and cannot be processed."}
                        </p>
                    </div>

                    {/* Guidance / Action if hazardous */}
                    {guidance && (
                        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-sm text-amber-900 space-y-1">
                            <div className="flex items-center gap-2 font-bold text-amber-800">
                                <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                <span>Required Action:</span>
                            </div>
                            <p className="text-amber-800 pl-6 text-xs leading-relaxed font-medium">
                                {guidance}
                            </p>
                        </div>
                    )}

                    {/* Prohibited items callout */}
                    <div className="space-y-2.5 pt-1">
                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4 text-red-500" />
                            Never Accepted for Scanning or Scrap:
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-start gap-2.5">
                                <Syringe className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-gray-900">Medical Waste</p>
                                    <p className="text-gray-500 text-[11px]">Syringes, needles, medicines, clinical tools</p>
                                </div>
                            </div>
                            <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-start gap-2.5">
                                <Bomb className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-gray-900">Explosives & Munitions</p>
                                    <p className="text-gray-500 text-[11px]">Bombs, fireworks, crackers, ammunition, gunpowder</p>
                                </div>
                            </div>
                            <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-start gap-2.5">
                                <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-gray-900">Weapons & Firearms</p>
                                    <p className="text-gray-500 text-[11px]">Guns, pistols, cartridges, weapon parts</p>
                                </div>
                            </div>
                            <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-start gap-2.5">
                                <Skull className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-gray-900">Toxic Chemicals</p>
                                    <p className="text-gray-500 text-[11px]">Acids, poisons, pesticides, radioactive scrap</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Accepted Items */}
                    <div className="space-y-1.5 pt-2 border-t border-gray-100">
                        <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Accepted Recyclables Only:</h3>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            Clean household plastics, cardboard, papers, non-hazardous metals (iron, steel, aluminium, brass, copper), glass containers, and common electronics (cables, old appliances).
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors shadow-md hover:shadow-lg transform active:scale-[0.99]"
                    >
                        I Understand & Close
                    </button>
                </div>
            </div>
        </div>
    );
}

