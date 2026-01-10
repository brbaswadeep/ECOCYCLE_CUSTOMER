import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import AnalysisResult from '../components/AnalysisResult';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function HistoryDetail() {
    const { id } = useParams();
    const { currentUser } = useAuth();
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        async function fetchAnalysis() {
            if (!currentUser || !id) return;
            try {
                const docRef = doc(db, "customers", currentUser.uid, "history", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setAnalysis(docSnap.data());
                } else {
                    console.log("No such analysis!");
                }
            } catch (error) {
                console.error("Error fetching analysis:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchAnalysis();
    }, [currentUser, id]);

    if (loading) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-red" />
            </div>
        );
    }

    if (!analysis) {
        return (
            <div className="min-h-screen pt-24 flex flex-col items-center justify-center text-brand-brown">
                <h2 className="text-xl font-bold">Analysis not found</h2>
                <button
                    onClick={() => navigate('/history')}
                    className="mt-4 text-brand-red font-bold hover:underline"
                >
                    Back to History
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-cream pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto space-y-8">
                <button
                    onClick={() => navigate('/history')}
                    className="flex items-center text-brand-brown/60 hover:text-brand-brown font-bold transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to History
                </button>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-brand-brown capitalize">
                            {analysis.summary?.object || "Analyzed Item"}
                        </h1>
                        <p className="text-brand-brown/60">
                            Scanned on {analysis.timestamp?.toDate().toLocaleDateString()} at {analysis.timestamp?.toDate().toLocaleTimeString()}
                        </p>
                    </div>
                </div>

                <AnalysisResult
                    result={analysis}
                    image={analysis.imageUrl}
                    isHistoryView={true}
                />
            </div>
        </div>
    );
}
