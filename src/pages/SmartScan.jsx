import React, { useState } from 'react';
import { generateIdeasFromTextOpenAI } from '../services/openai';
import { generateIdeasFromText } from '../services/gemini';
import { analyzeImageWithNvidia } from '../services/nvidia';
import { 
    Upload, Camera, Loader2, ArrowRight, AlertCircle, X, 
    Sparkles, CheckCircle2, RefreshCw, FileText, 
    Layers, ShieldCheck, Check, ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnalysisResult from '../components/AnalysisResult';
import RestrictionPopup from '../components/RestrictionPopup';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp, collection, updateDoc, increment, addDoc } from 'firebase/firestore';
import { checkHazardousWaste } from '../utils/hazardousCheck';

const MATERIAL_OPTIONS = [
    "Auto-Detect", "Plastic", "Cardboard / Paper", "Metal & Cans", 
    "E-Waste", "Glass", "Fabric", "Mixed"
];

const CONDITION_OPTIONS = [
    "Clean & Dry", "Moderate Dirt", "Scrap / Broken", "Has Electronics"
];

const WEIGHT_OPTIONS = [
    "< 0.5 kg", "0.5 - 2 kg", "2 - 5 kg", "> 5 kg"
];

const QUICK_TAGS = [
    "Bottles", "Cardboard", "Cans", "Cables", "Glass", "Paper", "Fabric"
];

export const VERIFIED_MATERIALS = [
    { label: "Plastic", value: "Plastic" },
    { label: "Iron / Steel", value: "Iron / Steel" },
    { label: "Aluminium / Can", value: "Aluminium" },
    { label: "Copper / Brass", value: "Copper" },
    { label: "Cardboard / Paper", value: "Cardboard" },
    { label: "Glass", value: "Glass" },
    { label: "E-Waste", value: "E-Waste" },
    { label: "Wood / Other", value: "Wood" }
];

export const SCRAP_RATE_CARD = {
    'iron': 26, 'steel': 35, 'stainless': 85, 'copper': 425, 'brass': 305,
    'aluminium': 105, 'aluminum': 105, 'lead': 150, 'zinc': 100, 'tin': 20,
    'plastic': 10, 'newspaper': 13, 'book': 10, 'paper': 12, 'cardboard': 5,
    'electronic': 50, 'ewaste': 50, 'e-waste': 50, 'battery': 72, 'rubber': 10,
    'wire': 150, 'cable': 100, 'bottle': 8, 'can': 100,
    'motor': 35, 'fan': 35, 'wood': 17
};

export default function SmartScan() {
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
    
    // Step: 'upload' | 'scanning' | 'questionnaire' | 'generating' | 'result'
    const [currentStep, setCurrentStep] = useState('upload');
    const [statusText, setStatusText] = useState('Analyzing...');
    const [error, setError] = useState('');

    // Pre-upload user details
    const [userDescription, setUserDescription] = useState('');
    const [userMaterial, setUserMaterial] = useState('Auto-Detect');
    const [userCondition, setUserCondition] = useState('Clean & Dry');
    const [userWeight, setUserWeight] = useState('0.5 - 2 kg');

    // NVIDIA Detection Result
    const [nvidiaData, setNvidiaData] = useState(null);

    // Cross-verification Questionnaire state
    const [verifiedObjectName, setVerifiedObjectName] = useState('');
    const [verifiedMaterial, setVerifiedMaterial] = useState('Plastic');
    const [verifiedCleanliness, setVerifiedCleanliness] = useState('Clean & Dry');
    const [verifiedSafety, setVerifiedSafety] = useState('Safe Scrap');
    const [verifiedWeight, setVerifiedWeight] = useState('1.0');
    const [verifiedGoal, setVerifiedGoal] = useState('Home Organizers');

    // Final result
    const [result, setResult] = useState(null);

    // Restriction popup
    const [showRestriction, setShowRestriction] = useState(false);
    const [restrictionCategory, setRestrictionCategory] = useState(null);
    const [restrictionReason, setRestrictionReason] = useState(null);
    const [restrictionGuidance, setRestrictionGuidance] = useState(null);

    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const handleFile = (file) => {
        if (file.size > 5 * 1024 * 1024) {
            setError('Image size should be less than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                
                setPreview(reader.result);
                setImage(compressedDataUrl);
                setResult(null);
                setError('');
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    };

    const handleTagClick = (tag) => {
        if (!userDescription) {
            setUserDescription(tag);
        } else if (!userDescription.includes(tag)) {
            setUserDescription(prev => `${prev}, ${tag}`);
        }
    };

    // Phase 1: Run NVIDIA Scan
    const handleStartNvidiaScan = async () => {
        if (!image) {
            setError('Please select an image first.');
            return;
        }

        // Instant Pre-Check for Hazardous content in user notes/description
        const preCheck = checkHazardousWaste(userDescription);
        if (preCheck) {
            setRestrictionCategory(preCheck.category);
            setRestrictionReason(preCheck.reason);
            setRestrictionGuidance(preCheck.guidance);
            setShowRestriction(true);
            return;
        }

        setCurrentStep('scanning');
        setStatusText('Scanning with NVIDIA AI...');
        setError('');

        try {
            // Upload to Cloudinary in background
            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'drrjsmqsh';
            const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ecocycle';
            
            const formData = new FormData();
            formData.append('file', image);
            formData.append('upload_preset', uploadPreset);
            
            let uploadedUrl = null;
            try {
                const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                    method: 'POST',
                    body: formData
                });
                if (response.ok) {
                    const data = await response.json();
                    uploadedUrl = data.secure_url;
                    setUploadedImageUrl(uploadedUrl);
                }
            } catch (cloudErr) {
                console.warn("Cloudinary upload:", cloudErr);
            }

            const parsedNvidia = await analyzeImageWithNvidia(image, {
                description: userDescription,
                materialCategory: userMaterial,
                condition: userCondition,
                approxWeight: userWeight
            });

            // Check if restricted
            if (parsedNvidia.valid === false) {
                const hazInfo = checkHazardousWaste(parsedNvidia.detected_item || parsedNvidia.refusal_reason || parsedNvidia.analysis || parsedNvidia.refusal_category);
                setRestrictionCategory(hazInfo ? hazInfo.category : (parsedNvidia.refusal_category || "Upload Restricted"));
                setRestrictionReason(hazInfo ? hazInfo.reason : (parsedNvidia.refusal_reason || "This image cannot be accepted for recycling."));
                setRestrictionGuidance(hazInfo ? hazInfo.guidance : null);
                setShowRestriction(true);
                setCurrentStep('upload');
                return;
            }

            // Check detected item against hazardous keywords
            const itemHazCheck = checkHazardousWaste(parsedNvidia.detected_item);
            if (itemHazCheck) {
                setRestrictionCategory(itemHazCheck.category);
                setRestrictionReason(itemHazCheck.reason);
                setRestrictionGuidance(itemHazCheck.guidance);
                setShowRestriction(true);
                setCurrentStep('upload');
                return;
            }

            const rawDetectedMat = parsedNvidia.primary_material || (userMaterial !== 'Auto-Detect' ? userMaterial : "Plastic");
            
            // Map detected material to closest standard option
            const foundMat = VERIFIED_MATERIALS.find(m => 
                rawDetectedMat.toLowerCase().includes(m.value.toLowerCase()) || 
                m.label.toLowerCase().includes(rawDetectedMat.toLowerCase())
            );
            const initialMaterial = foundMat ? foundMat.value : (userMaterial !== 'Auto-Detect' ? userMaterial : "Plastic");

            setNvidiaData(parsedNvidia);
            setVerifiedObjectName(parsedNvidia.detected_item || userDescription || "Scrap Item");
            setVerifiedMaterial(initialMaterial);
            setVerifiedCleanliness(parsedNvidia.cleanliness?.toLowerCase().includes("dirty") ? "Dirty / Wash Needed" : "Clean & Dry");
            setVerifiedSafety(userCondition.includes("Electronics") ? "Has Electronics / Batteries" : "Safe Scrap");
            setVerifiedWeight(parsedNvidia.estimated_weight_kg ? String(parsedNvidia.estimated_weight_kg) : "1.0");
            setVerifiedGoal("Home Organizers");

            // Move to Questionnaire
            setCurrentStep('questionnaire');

        } catch (err) {
            console.warn("NVIDIA Scan Error, falling back to questionnaire:", err);
            const initialMaterial = userMaterial !== 'Auto-Detect' ? userMaterial : "Plastic";
            const initialClean = userCondition.includes("Dirt") ? "Dirty / Wash Needed" : "Clean & Dry";
            const initialWeight = userWeight.includes("0.5 - 2") ? "1.0" : userWeight.includes("< 0.5") ? "0.5" : "2.0";

            setNvidiaData({
                detected_item: userDescription || "Scrap Item",
                primary_material: initialMaterial,
                estimated_weight_kg: parseFloat(initialWeight),
                cleanliness: initialClean
            });
            setVerifiedObjectName(userDescription || "Scrap Item");
            setVerifiedMaterial(initialMaterial);
            setVerifiedCleanliness(initialClean);
            setVerifiedSafety(userCondition.includes("Electronics") ? "Has Electronics / Batteries" : "Safe Scrap");
            setVerifiedWeight(initialWeight);
            setVerifiedGoal("Home Organizers");
            setCurrentStep('questionnaire');
        }
    };

    // Direct Questionnaire Entry (without waiting for AI scan)
    const handleDirectQuestionnaire = () => {
        const hazCheck = checkHazardousWaste(userDescription);
        if (hazCheck) {
            setRestrictionCategory(hazCheck.category);
            setRestrictionReason(hazCheck.reason);
            setRestrictionGuidance(hazCheck.guidance);
            setShowRestriction(true);
            return;
        }

        const initialMaterial = userMaterial !== 'Auto-Detect' ? userMaterial : "Plastic";
        const initialClean = userCondition.includes("Dirt") ? "Dirty / Wash Needed" : "Clean & Dry";
        const initialWeight = userWeight.includes("0.5 - 2") ? "1.0" : userWeight.includes("< 0.5") ? "0.5" : "2.0";

        setNvidiaData({
            detected_item: userDescription || "Scrap Item",
            primary_material: initialMaterial,
            estimated_weight_kg: parseFloat(initialWeight),
            cleanliness: initialClean
        });
        setVerifiedObjectName(userDescription || "Scrap Item");
        setVerifiedMaterial(initialMaterial);
        setVerifiedCleanliness(initialClean);
        setVerifiedSafety(userCondition.includes("Electronics") ? "Has Electronics / Batteries" : "Safe Scrap");
        setVerifiedWeight(initialWeight);
        setVerifiedGoal("Home Organizers");
        setCurrentStep('questionnaire');
    };

    // Save completed analysis
    const saveAnalysis = async (analysisData, imageUrl) => {
        if (!currentUser) return null;

        try {
            const historyRef = doc(collection(db, "customers", currentUser.uid, "history"));
            const analysisToSave = {
                ...analysisData,
                imageUrl: imageUrl || uploadedImageUrl || null,
                timestamp: serverTimestamp(),
                userId: currentUser.uid,
                summary: {
                    material: analysisData.waste_analysis?.detected_items?.[0]?.material_type || nvidiaData?.primary_material || "Recyclable",
                    object: analysisData.waste_analysis?.detected_items?.[0]?.specific_object || nvidiaData?.detected_item || "Item",
                    score: analysisData.environmental_impact?.sustainability_score || 85
                },
                userProvidedDetails: {
                    description: userDescription,
                    material: userMaterial,
                    condition: userCondition,
                    weight: userWeight
                },
                verificationAnswers: {
                    object: verifiedObjectName,
                    material: verifiedMaterial,
                    cleanliness: verifiedCleanliness,
                    safety: verifiedSafety,
                    weight: verifiedWeight,
                    goal: verifiedGoal
                }
            };

            await setDoc(historyRef, analysisToSave);
            return imageUrl;
        } catch (err) {
            console.error("Save error:", err);
            return null;
        }
    };

    // Phase 3: Submit Questionnaire & Generate Ideations
    const handleGenerateIdeations = async () => {
        const finalObject = verifiedObjectName.trim() || nvidiaData?.detected_item || 'Scrap Item';
        const finalMaterial = verifiedMaterial || nvidiaData?.primary_material || 'Plastic';
        const finalWeight = parseFloat(verifiedWeight) || parseFloat(nvidiaData?.estimated_weight_kg) || 1.0;

        // Check if verified object or user notes mention hazardous materials
        const hazCheck = checkHazardousWaste(finalObject) || checkHazardousWaste(verifiedObjectName) || checkHazardousWaste(userDescription);
        if (hazCheck) {
            setRestrictionCategory(hazCheck.category);
            setRestrictionReason(hazCheck.reason);
            setRestrictionGuidance(hazCheck.guidance);
            setShowRestriction(true);
            setCurrentStep('upload');
            return;
        }

        setCurrentStep('generating');
        setStatusText('Generating upcycling ideas...');
        setError('');

        try {
            const verifiedContext = `
VERIFIED ITEM: ${finalObject}
VERIFIED MATERIAL: ${finalMaterial}
WEIGHT: ${finalWeight} kg
CONDITION: ${verifiedCleanliness}
SAFETY: ${verifiedSafety}
PREFERRED GOAL: ${verifiedGoal}
USER NOTES: ${userDescription || 'None'}

INSTRUCTION:
Generate EXACTLY 3 practical and creative upcycling product ideas specifically for "${finalObject}" made of "${finalMaterial}".
Goal: "${verifiedGoal}".
Include instructions, realistic pricing in ₹ (INR), and environmental score.
`;

            let data;
            try {
                data = await generateIdeasFromText(verifiedContext);
            } catch (geminiError) {
                if (geminiError.isHazardous) throw geminiError;
                console.warn("Gemini error, trying OpenAI:", geminiError);
                setStatusText('Using backup AI engine...');
                data = await generateIdeasFromTextOpenAI(verifiedContext);
            }

            // CRITICAL: Force synchronization with verified facts so detection is 100% accurate
            data = data || {};
            data.waste_analysis = data.waste_analysis || {};
            data.waste_analysis.detected_items = [
                {
                    material_type: finalMaterial,
                    specific_object: finalObject,
                    confidence_score: 0.98
                }
            ];

            data.quantity_estimation = data.quantity_estimation || {};
            data.quantity_estimation.approximate_weight_kg = finalWeight;

            // Recalculate market scrap value based on Rate Card
            const matKey = (finalMaterial + " " + finalObject).toLowerCase();
            let rate = 0;
            for (const [k, p] of Object.entries(SCRAP_RATE_CARD)) {
                if (matKey.includes(k)) {
                    rate = p;
                    break;
                }
            }
            if (rate > 0) {
                data.quantity_estimation.approximate_market_value = Math.round(finalWeight * rate);
            } else if (!data.quantity_estimation.approximate_market_value) {
                data.quantity_estimation.approximate_market_value = Math.round(finalWeight * 15);
            }

            data.quality_assessment = data.quality_assessment || {};
            data.quality_assessment.cleanliness_level = verifiedCleanliness;

            data.environmental_impact = data.environmental_impact || {
                sustainability_score: 85
            };

            setResult(data);
            setCurrentStep('result');
            await saveAnalysis(data, uploadedImageUrl);

        } catch (err) {
            console.error("Ideation error:", err);
            if (err.isHazardous) {
                setRestrictionCategory(err.category || "Hazardous Material Prohibited");
                setRestrictionReason(err.message || "Hazardous items cannot be accepted or upcycled.");
                setRestrictionGuidance(err.guidance || null);
                setShowRestriction(true);
                setCurrentStep('upload');
                return;
            }
            setError(err.message || 'Failed to generate ideas. Please try again.');
            setCurrentStep('questionnaire');
        }
    };

    const handleResetAll = () => {
        setImage(null);
        setPreview(null);
        setUploadedImageUrl(null);
        setCurrentStep('upload');
        setNvidiaData(null);
        setResult(null);
        setUserDescription('');
        setUserMaterial('Auto-Detect');
        setUserCondition('Clean & Dry');
        setUserWeight('0.5 - 2 kg');
        setVerifiedObjectName('');
        setVerifiedMaterial('Plastic');
        setVerifiedCleanliness('Clean & Dry');
        setVerifiedSafety('Safe Scrap');
        setVerifiedWeight('1.0');
        setVerifiedGoal('Home Organizers');
        setRestrictionCategory(null);
        setRestrictionReason(null);
        setRestrictionGuidance(null);
        setError('');
    };

    return (
        <div className="min-h-screen bg-brand-cream pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
                
                {/* Header */}
                <div className="text-center space-y-1">
                    <h1 className="text-3xl font-black text-brand-brown">
                        SmartScan AI
                    </h1>
                    <p className="text-xs text-brand-brown/60">
                        Upload scrap, confirm details, and get instant upcycling ideas & value.
                    </p>
                </div>

                {/* STEP 1: Upload & Initial Details Form */}
                {currentStep === 'upload' && !result && (
                    <div className="bg-white rounded-2xl shadow-sm border border-brand-brown/15 p-6 space-y-5">
                        
                        {/* Safety Notice Banner */}
                        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-950">
                            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="space-y-0.5 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-amber-900">Hazardous Materials Prohibited</span>
                                    <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded-md font-semibold">Safety Rule</span>
                                </div>
                                <p className="text-amber-800 text-[11px] leading-relaxed">
                                    Medical waste (syringes, needles, medicines), explosives, bombs, fireworks, ammunition, firearms, and toxic chemicals cannot be scanned or accepted under waste safety regulations.
                                </p>
                            </div>
                        </div>

                        {/* 1. Image Upload Box */}
                        <div className="border border-brand-brown/20 rounded-xl p-5 text-center bg-brand-cream/10">
                            {preview ? (
                                <div className="relative w-full max-w-xs mx-auto aspect-video rounded-lg overflow-hidden bg-gray-100 border border-brand-brown/10">
                                    <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                                    <button
                                        onClick={() => { setPreview(null); setImage(null); }}
                                        className="absolute top-1.5 right-1.5 p-1 bg-white/95 rounded-md shadow hover:text-brand-red transition"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2 py-4">
                                    <div className="w-11 h-11 bg-brand-brown/10 rounded-xl flex items-center justify-center mx-auto text-brand-brown">
                                        <Camera className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-brand-brown">Upload or snap photo</p>
                                        <p className="text-[11px] text-brand-brown/40">PNG, JPG (Max 5MB)</p>
                                    </div>

                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        id="smartscan-image-upload"
                                    />
                                    <label
                                        htmlFor="smartscan-image-upload"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-brown text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-brand-black transition"
                                    >
                                        <Upload className="w-3.5 h-3.5" />
                                        <span>Select Photo</span>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* 2. User Details Form */}
                        <div className="space-y-3 pt-1">
                            <div>
                                <label className="block text-xs font-bold text-brand-brown mb-1">
                                    What does this contain? (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={userDescription}
                                    onChange={(e) => setUserDescription(e.target.value)}
                                    placeholder="e.g. 5 water bottles, 1 cardboard box, scrap metal..."
                                    className="w-full px-3 py-2 border border-brand-brown/20 rounded-xl text-xs text-brand-brown focus:outline-none focus:ring-1 focus:ring-brand-brown bg-white font-medium"
                                />

                                {/* Quick Tags */}
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {QUICK_TAGS.map(tag => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => handleTagClick(tag)}
                                            className="text-[10px] font-bold px-2 py-0.5 bg-brand-cream/50 hover:bg-brand-brown hover:text-white text-brand-brown rounded-md border border-brand-brown/10 transition"
                                        >
                                            + {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Selectors */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <div>
                                    <label className="text-[11px] font-bold text-brand-brown/70 block mb-1">
                                        Material
                                    </label>
                                    <select
                                        value={userMaterial}
                                        onChange={(e) => setUserMaterial(e.target.value)}
                                        className="w-full px-2.5 py-1.5 border border-brand-brown/20 rounded-lg text-xs font-bold text-brand-brown bg-white focus:outline-none"
                                    >
                                        {MATERIAL_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-brand-brown/70 block mb-1">
                                        Condition
                                    </label>
                                    <select
                                        value={userCondition}
                                        onChange={(e) => setUserCondition(e.target.value)}
                                        className="w-full px-2.5 py-1.5 border border-brand-brown/20 rounded-lg text-xs font-bold text-brand-brown bg-white focus:outline-none"
                                    >
                                        {CONDITION_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-brand-brown/70 block mb-1">
                                        Approx Weight
                                    </label>
                                    <select
                                        value={userWeight}
                                        onChange={(e) => setUserWeight(e.target.value)}
                                        className="w-full px-2.5 py-1.5 border border-brand-brown/20 rounded-lg text-xs font-bold text-brand-brown bg-white focus:outline-none"
                                    >
                                        {WEIGHT_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-brand-red bg-red-50 p-2.5 rounded-lg text-xs font-medium border border-red-200">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* CTA */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                            <button
                                type="button"
                                onClick={handleDirectQuestionnaire}
                                className="px-4 py-2.5 bg-brand-cream/80 text-brand-brown hover:bg-brand-brown hover:text-white font-bold text-xs rounded-xl transition border border-brand-brown/15 flex items-center justify-center gap-1.5"
                            >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Answer Questionnaire Directly</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleStartNvidiaScan}
                                disabled={!preview}
                                className="px-6 py-2.5 bg-brand-red text-white font-bold text-xs rounded-xl hover:bg-[#c4442b] transition shadow-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span>Scan with AI</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                    </div>
                )}

                {/* STEP 2: Loading State */}
                {(currentStep === 'scanning' || currentStep === 'generating') && (
                    <div className="bg-white rounded-2xl shadow-sm border border-brand-brown/15 p-10 text-center space-y-3">
                        <Loader2 className="w-7 h-7 animate-spin text-brand-brown mx-auto" />
                        <div>
                            <h3 className="text-base font-bold text-brand-brown">
                                {currentStep === 'scanning' ? 'Identifying Item...' : 'Generating Ideas...'}
                            </h3>
                            <p className="text-xs text-brand-brown/50 mt-0.5">{statusText}</p>
                        </div>
                    </div>
                )}

                {/* STEP 3: Cross-Verification Questionnaire */}
                {currentStep === 'questionnaire' && nvidiaData && (
                    <div className="bg-white rounded-2xl shadow-sm border border-brand-brown/15 p-6 space-y-5">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-brand-brown/10 pb-3">
                            <div>
                                <h2 className="text-lg font-bold text-brand-brown">
                                    Cross-Verify Details
                                </h2>
                                <p className="text-xs text-brand-brown/50">
                                    Confirm or correct detected facts for accurate upcycling ideas.
                                </p>
                            </div>

                            <button
                                onClick={() => setCurrentStep('upload')}
                                className="text-xs font-bold text-brand-brown/60 hover:text-brand-brown flex items-center gap-1"
                            >
                                <RefreshCw size={12} />
                                <span>Re-scan</span>
                            </button>
                        </div>

                        {/* Detected summary */}
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-brand-cream/30 border border-brand-brown/10 text-xs">
                            {preview && (
                                <img
                                    src={preview}
                                    alt="Scanned item"
                                    className="w-12 h-12 object-cover rounded-lg border border-brand-brown/10 flex-shrink-0"
                                />
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="font-bold text-brand-brown truncate">
                                    {nvidiaData.detected_item || "Scrap Item"}
                                </div>
                                <div className="text-brand-brown/60 text-[11px] mt-0.5">
                                    AI Detected: <strong className="text-brand-brown">{nvidiaData.primary_material || "Plastic"}</strong>
                                    {nvidiaData.estimated_weight_kg && ` • ~${nvidiaData.estimated_weight_kg} kg`}
                                </div>
                            </div>
                        </div>

                        {/* 5 Questions */}
                        <div className="space-y-3.5 text-xs">
                            
                            {/* Q1: Object Name (editable) */}
                            <div className="p-3 rounded-xl border border-brand-brown/10 bg-gray-50/50 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-brand-brown block">
                                        1. Identified Item:
                                    </span>
                                    <span className="text-[11px] text-brand-brown/50">Edit if incorrect</span>
                                </div>
                                <input
                                    type="text"
                                    value={verifiedObjectName}
                                    onChange={(e) => setVerifiedObjectName(e.target.value)}
                                    placeholder="e.g. Aluminium Soda Can, Iron Pipe, Cardboard Box..."
                                    className="w-full px-3 py-1.5 border border-brand-brown/20 rounded-lg text-xs font-bold text-brand-brown bg-white focus:outline-none focus:ring-1 focus:ring-brand-brown"
                                />
                            </div>

                            {/* Q2: Material Selection Chips */}
                            <div className="p-3 rounded-xl border border-brand-brown/10 bg-gray-50/50 space-y-1.5">
                                <span className="font-bold text-brand-brown block">
                                    2. Material:
                                </span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                    {VERIFIED_MATERIALS.map((mat) => (
                                        <button
                                            key={mat.value}
                                            type="button"
                                            onClick={() => setVerifiedMaterial(mat.value)}
                                            className={`py-2 px-2.5 rounded-lg font-bold text-xs transition border text-left flex items-center justify-between ${
                                                verifiedMaterial === mat.value
                                                    ? 'bg-brand-brown text-white border-brand-brown'
                                                    : 'bg-white text-brand-brown/70 border-brand-brown/15 hover:bg-brand-cream/30'
                                            }`}
                                        >
                                            <span className="truncate">{mat.label}</span>
                                            {verifiedMaterial === mat.value && <Check size={13} className="flex-shrink-0 ml-1" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Q3: Condition & Weight */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl border border-brand-brown/10 bg-gray-50/50 space-y-1.5">
                                    <span className="font-bold text-brand-brown block">
                                        3. Condition:
                                    </span>
                                    <div className="grid grid-cols-1 gap-1.5">
                                        {["Clean & Dry", "Minor Dust / Labels", "Dirty / Wash Needed"].map((opt) => (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => setVerifiedCleanliness(opt)}
                                                className={`py-1.5 px-2.5 rounded-lg font-bold text-xs transition border text-left flex items-center justify-between ${
                                                    verifiedCleanliness === opt
                                                        ? 'bg-brand-brown text-white border-brand-brown'
                                                        : 'bg-white text-brand-brown/70 border-brand-brown/15 hover:bg-brand-cream/30'
                                                }`}
                                            >
                                                <span className="truncate">{opt}</span>
                                                {verifiedCleanliness === opt && <Check size={12} className="flex-shrink-0 ml-1" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl border border-brand-brown/10 bg-gray-50/50 space-y-1.5">
                                    <span className="font-bold text-brand-brown block">
                                        4. Approx Weight:
                                    </span>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {["0.5", "1.0", "2.0"].map((w) => (
                                            <button
                                                key={w}
                                                type="button"
                                                onClick={() => setVerifiedWeight(w)}
                                                className={`py-1.5 px-2 rounded-lg font-bold text-xs transition border text-center ${
                                                    verifiedWeight === w
                                                        ? 'bg-brand-brown text-white border-brand-brown'
                                                        : 'bg-white text-brand-brown/70 border-brand-brown/15 hover:bg-brand-cream/30'
                                                }`}
                                            >
                                                {w} kg
                                            </button>
                                        ))}
                                    </div>
                                    <div className="pt-1">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={verifiedWeight}
                                            onChange={(e) => setVerifiedWeight(e.target.value)}
                                            placeholder="Custom kg"
                                            className="w-full px-2 py-1 border border-brand-brown/20 rounded-md text-xs text-brand-brown bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Q5: Upcycling Goal */}
                            <div className="p-3 rounded-xl border border-brand-brown/10 bg-gray-50/50 space-y-1.5">
                                <span className="font-bold text-brand-brown block">
                                    5. Preferred Upcycling Goal:
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                                    {["Home Organizers", "Crafts & Decor", "Sell for Cash"].map((opt) => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setVerifiedGoal(opt)}
                                            className={`py-1.5 px-2.5 rounded-lg font-bold text-xs transition border text-left flex items-center justify-between ${
                                                verifiedGoal === opt
                                                    ? 'bg-brand-brown text-white border-brand-brown'
                                                    : 'bg-white text-brand-brown/70 border-brand-brown/15 hover:bg-brand-cream/30'
                                            }`}
                                        >
                                            <span className="truncate">{opt}</span>
                                            {verifiedGoal === opt && <Check size={12} className="flex-shrink-0 ml-1" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-brand-brown/10">
                            <button
                                onClick={() => setCurrentStep('upload')}
                                className="px-4 py-2 bg-gray-100 text-brand-brown/70 font-bold text-xs rounded-xl hover:bg-gray-200 transition"
                            >
                                Back
                            </button>

                            <button
                                onClick={handleGenerateIdeations}
                                className="px-5 py-2.5 bg-brand-green text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition shadow-xs active:scale-95 flex items-center gap-1.5"
                            >
                                <Sparkles size={14} />
                                <span>Generate Ideas</span>
                                <ArrowRight size={14} />
                            </button>
                        </div>

                    </div>
                )}

                {/* STEP 4: Analysis Results Screen */}
                {currentStep === 'result' && result && (
                    <AnalysisResult
                        result={result}
                        image={preview}
                        imageUrl={uploadedImageUrl}
                        onReset={handleResetAll}
                        onDone={() => navigate('/dashboard')}
                    />
                )}

            </div>

            {/* Restriction Warning Popup */}
            <RestrictionPopup
                isOpen={showRestriction}
                onClose={() => {
                    setShowRestriction(false);
                    setImage(null);
                    setPreview(null);
                    setResult(null);
                    setRestrictionCategory(null);
                    setRestrictionReason(null);
                    setRestrictionGuidance(null);
                    setCurrentStep('upload');
                }}
                refusalCategory={restrictionCategory}
                refusalReason={restrictionReason}
                guidance={restrictionGuidance}
            />
        </div>
    );
}
