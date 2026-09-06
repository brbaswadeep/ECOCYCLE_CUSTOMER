import React, { useState } from 'react';
import { generateIdeasFromTextOpenAI } from '../services/openai';
import { generateIdeasFromText } from '../services/gemini';
import { analyzeImageWithNvidia } from '../services/nvidia';
import { Upload, Camera, Loader2, ArrowRight, AlertCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnalysisResult from '../components/AnalysisResult';
import RestrictionPopup from '../components/RestrictionPopup';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';

export default function SmartScan() {
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [statusText, setStatusText] = useState('Analyzing...');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const [showRestriction, setShowRestriction] = useState(false);
    const [restrictionCategory, setRestrictionCategory] = useState(null);
    const [restrictionReason, setRestrictionReason] = useState(null);

    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [uploadedImageUrl, setUploadedImageUrl] = useState(null);

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
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

    const saveAnalysis = async (analysisData, imageUrl) => {
        if (!currentUser) return null;

        try {
            const historyRef = doc(collection(db, "customers", currentUser.uid, "history"));
            const analysisToSave = {
                ...analysisData,
                imageUrl: imageUrl || null,
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
            return imageUrl;
        } catch (err) {
            console.error("CRITICAL ERROR SAVING ANALYSIS:", err);
            alert(`Failed to save history: ${err.message}`);
            return null;
        }
    };

    const handleAnalyze = async () => {
        if (!image) return;

        setAnalyzing(true);
        setStatusText('Uploading image...');
        setError('');
        
        try {
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
                } else {
                    console.warn("Cloudinary upload returned non-200 status:", response.status);
                }
            } catch (cloudErr) {
                console.error("Cloudinary upload failed:", cloudErr);
            }

            setStatusText('Identifying Item (NVIDIA)...');
            const nvidiaResponse = await analyzeImageWithNvidia(image);

            let analysisText = nvidiaResponse;
            try {
                const cleanResponse = nvidiaResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                const jsonResponse = JSON.parse(cleanResponse);

                if (jsonResponse.valid === false) {
                    setRestrictionCategory(jsonResponse.refusal_category);
                    setRestrictionReason(jsonResponse.refusal_reason);
                    setShowRestriction(true);
                    setAnalyzing(false);
                    setStatusText('Analyzing...');
                    return;
                }

                if (jsonResponse.analysis) {
                    analysisText = jsonResponse.analysis;
                }
            } catch (e) {
                console.warn("NVIDIA response was not valid JSON, treating as raw text fallback:", e);
                analysisText = nvidiaResponse;
            }

            if (!analysisText || typeof analysisText !== 'string') {
                throw new Error("Failed to identify item with NVIDIA.");
            }

            setStatusText('Generating Ideas (AI)...');
            let data;
            try {
                // Primary: Use Gemini 2.5 Flash with verified active API keys
                data = await generateIdeasFromText(analysisText);
            } catch (geminiError) {
                console.warn("Gemini Failed, switching to OpenAI Fallback:", geminiError);
                setStatusText('Switching to OpenAI...');
                try {
                    data = await generateIdeasFromTextOpenAI(analysisText);
                } catch (openaiError) {
                    console.error("All AI services failed:", openaiError);
                    throw new Error("Unable to generate ideas at the moment. Please try again.");
                }
            }

            setResult(data);
            await saveAnalysis(data, uploadedUrl);
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
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold text-brand-brown mb-4">Smart Scan AI Analysis</h1>
                    <p className="text-brand-brown/60 max-w-2xl mx-auto">
                        Upload a photo of your waste to instantly identify materials, estimate value, and get household reuse ideas.
                    </p>
                </div>

                {!result && (
                    <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-dashed border-brand-brown/20 hover:border-brand-red/50 transition-colors">
                        <div className="flex flex-col items-center justify-center space-y-6">
                            {preview ? (
                                <div className="relative w-full max-w-md aspect-video rounded-2xl overflow-hidden bg-gray-100 shadow-inner">
                                    <img src={preview} alt="Upload preview" className="w-full h-full object-contain" />
                                    <button
                                        onClick={() => { setPreview(null); setImage(null); }}
                                        className="absolute top-2 right-2 p-2 bg-white/90 rounded-full shadow-sm hover:text-brand-red transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center space-y-4 py-12 w-full">
                                    <div className="w-20 h-20 bg-brand-cream rounded-full flex items-center justify-center mx-auto text-brand-brown/50">
                                        <Camera className="w-10 h-10" />
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold text-brand-brown">Drag & drop or click to upload</p>
                                        <p className="text-sm text-brand-brown/50 mt-1">Select a single photo (Max 5MB)</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4 w-full max-w-xs">
                                {!preview && (
                                    <>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                            id="image-upload"
                                        />
                                        <label
                                            htmlFor="image-upload"
                                            className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-6 py-3 bg-white border border-brand-brown/20 rounded-xl font-bold text-brand-brown hover:bg-brand-cream transition-colors"
                                        >
                                            <Upload className="w-5 h-5" />
                                            Select Image
                                        </label>
                                    </>
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
