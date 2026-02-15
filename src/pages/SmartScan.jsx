import React, { useState } from 'react';
import { generateIdeasFromTextOpenAI } from '../services/openai';
import { generateIdeasFromText } from '../services/gemini'; // Import Gemini service fallback
import { analyzeImageWithNvidia } from '../services/nvidia';
import { Upload, Camera, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnalysisResult from '../components/AnalysisResult';
import RestrictionPopup from '../components/RestrictionPopup';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';

export default function SmartScan() {
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [statusText, setStatusText] = useState('Analyzing...');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    // Restriction State
    const [showRestriction, setShowRestriction] = useState(false);
    const [restrictionCategory, setRestrictionCategory] = useState(null);
    const [restrictionReason, setRestrictionReason] = useState(null);

    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleFile = (file) => {
        if (file.size > 5 * 1024 * 1024) {
            setError('Image size should be less than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result);
            setImage(reader.result);
            setResult(null);
            setError('');
        };
        reader.readAsDataURL(file);
    };

    const [uploadedImageUrl, setUploadedImageUrl] = useState(null);

    const saveAnalysis = async (analysisData, imageUrl) => {
        if (!currentUser) return null;

        let downloadURL = null;

        try {
            const timestamp = Date.now();
            const storageRef = ref(storage, `scans/${currentUser.uid}/${timestamp}.jpg`);
            await uploadString(storageRef, imageUrl, 'data_url');
            downloadURL = await getDownloadURL(storageRef);
        } catch (uploadError) {
            console.error("Image upload failed (CORS or Network issue):", uploadError);
        }

        try {
            const historyRef = doc(collection(db, "customers", currentUser.uid, "history"));
            const analysisToSave = {
                ...analysisData,
                imageUrl: downloadURL,
                timestamp: serverTimestamp(),
                userId: currentUser.uid,
                summary: {
                    material: analysisData.waste_analysis?.detected_items?.[0]?.material_type || "Unknown",
                    object: analysisData.waste_analysis?.detected_items?.[0]?.specific_object || "Item",
                    score: analysisData.environmental_impact?.sustainability_score || 0
                }
            };

            await setDoc(historyRef, analysisToSave);
            console.log("Analysis saved successfully!", historyRef.id);

            if (!downloadURL) {
                alert("Analysis saved! (Image could not be saved due to network restrictions)");
            }
            return downloadURL;
        } catch (err) {
            console.error("CRITICAL ERROR SAVING ANALYSIS:", err);
            alert(`Failed to save history: ${err.message}`);
            return null;
        }
    };

    const handleAnalyze = async () => {
        if (!image) return;

        setAnalyzing(true);
        setStatusText('Identifying Item (NVIDIA)...');
        setError('');
        try {
            // Step 1: NVIDIA Analysis
            console.log("Starting NVIDIA Analysis...");
            const nvidiaResponse = await analyzeImageWithNvidia(image);
            console.log("NVIDIA Result:", nvidiaResponse);

            let analysisText = nvidiaResponse;

            // Attempt to parse JSON response from NVIDIA
            try {
                // Sanitize response in case of markdown code blocks
                const cleanResponse = nvidiaResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                const jsonResponse = JSON.parse(cleanResponse);

                if (jsonResponse.valid === false) {
                    setRestrictionCategory(jsonResponse.refusal_category);
                    setRestrictionReason(jsonResponse.refusal_reason);
                    setShowRestriction(true);
                    setAnalyzing(false);
                    setStatusText('Analyzing...');
                    return; // STOP: Do not proceed to OpenAI
                }

                // If valid, use the analysis text from JSON
                if (jsonResponse.analysis) {
                    analysisText = jsonResponse.analysis;
                }
            } catch (e) {
                console.warn("NVIDIA response was not valid JSON, treating as raw text fallback:", e);
                // Fallback: Use raw response if parsing fails (legacy compatibility)
                analysisText = nvidiaResponse;
            }

            if (!analysisText || typeof analysisText !== 'string') {
                throw new Error("Failed to identify item with NVIDIA.");
            }

            // Step 2: OpenAI Ideas (with Gemini Fallback)
            setStatusText('Generating Ideas (OpenAI)...');
            let data;

            try {
                // Primary: Try OpenAI
                data = await generateIdeasFromTextOpenAI(analysisText);
            } catch (openaiError) {
                console.warn("OpenAI Failed, switching to Gemini Fallback:", openaiError);
                setStatusText('OpenAI Busy. Switching to Gemini...');

                try {
                    // Fallback: Try Gemini
                    data = await generateIdeasFromText(analysisText);
                } catch (geminiError) {
                    console.error("Gemini Fallback also failed:", geminiError);
                    throw new Error("Both AI services failed to generate ideas. Please try again later.");
                }
            }

            setResult(data);
            const url = await saveAnalysis(data, image);
            setUploadedImageUrl(url);
        } catch (err) {
            console.error("Analysis Pipeline Error:", err);
            setError(err.message || 'Failed to analyze image. Please try again.');
        } finally {
            setAnalyzing(false);
            setStatusText('Analyzing...');
        }
    };

    return (
        <div className="min-h-screen bg-brand-cream pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold text-brand-brown mb-4">Smart Scan AI Analysis</h1>
                    <p className="text-brand-brown/60 max-w-2xl mx-auto">
                        Upload a photo of your waste to instantly identify materials, estimate value, and get household reuse ideas.
                    </p>
                </div>

                {/* Upload Section */}
                {!result && (
                    <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-dashed border-brand-brown/20 hover:border-brand-red/50 transition-colors">
                        <div className="flex flex-col items-center justify-center space-y-6">
                            {preview ? (
                                <div className="relative w-full max-w-md aspect-video rounded-2xl overflow-hidden bg-gray-100 shadow-inner">
                                    <img src={preview} alt="Upload preview" className="w-full h-full object-contain" />
                                    <button
                                        onClick={() => { setPreview(null); setImage(null); }}
                                        className="absolute top-2 right-2 p-2 bg-white/90 rounded-full shadow-sm hover:text-brand-red"
                                    >
                                        <Upload className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center space-y-4 py-12">
                                    <div className="w-20 h-20 bg-brand-cream rounded-full flex items-center justify-center mx-auto text-brand-brown/50">
                                        <Camera className="w-10 h-10" />
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold text-brand-brown">Drag & drop or click to upload</p>
                                        <p className="text-sm text-brand-brown/50 mt-1">Supports JPG, PNG (Max 5MB)</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4 w-full max-w-xs">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    id="image-upload"
                                />
                                {!preview && (
                                    <label
                                        htmlFor="image-upload"
                                        className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-6 py-3 bg-white border border-brand-brown/20 rounded-xl font-bold text-brand-brown hover:bg-brand-cream transition-colors"
                                    >
                                        <Upload className="w-5 h-5" />
                                        Select Image
                                    </label>
                                )}
                                {preview && (
                                    <button
                                        onClick={handleAnalyze}
                                        disabled={analyzing}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-brand-red text-white rounded-xl font-bold hover:bg-[#c4442b] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-brand-red/25"
                                    >
                                        {analyzing ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                {statusText}
                                            </>
                                        ) : (
                                            <>
                                                Run Analysis
                                                <ArrowRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-brand-red bg-red-50 px-4 py-2 rounded-lg text-sm font-medium">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Results Section */}
                {result && (
                    <AnalysisResult
                        result={result}
                        image={preview}
                        imageUrl={uploadedImageUrl}
                        onReset={() => { setResult(null); setImage(null); setPreview(null); setUploadedImageUrl(null); }}
                        onDone={() => navigate('/dashboard')}
                    />
                )}
            </div>

            {/* Restriction Popup */}
            <RestrictionPopup
                isOpen={showRestriction}
                onClose={() => {
                    setShowRestriction(false);
                    setImage(null);
                    setPreview(null);
                    setResult(null);
                }}
                refusalCategory={restrictionCategory}
                refusalReason={restrictionReason}
            />
        </div>
    );
}
