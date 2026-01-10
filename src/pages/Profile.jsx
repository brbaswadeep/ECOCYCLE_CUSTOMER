import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import LocationPicker from '../components/LocationPicker';
import { User, Phone, Save, Loader2, MapPin, Edit3, CheckCircle } from 'lucide-react';

export default function Profile() {
    const { currentUser, refreshProfile, logout } = useAuth();

    // State for toggle editing
    const [isEditing, setIsEditing] = useState(false);

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState(null);

    // UI States
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        if (currentUser) {
            setName(currentUser.name || '');
            setPhone(currentUser.phone || '');
            setLocation(currentUser.location || null);
        }
    }, [currentUser]);

    const handleSaveProfile = async () => {
        // Basic Validation
        if (!name.trim()) {
            setStatusMsg({ type: 'error', text: 'Name is required' });
            return;
        }

        setLoading(true);
        setStatusMsg({ type: '', text: '' });

        try {
            const userRef = doc(db, 'customers', currentUser.uid);
            await updateDoc(userRef, {
                name,
                phone,
                location
            });
            await refreshProfile();
            setStatusMsg({ type: 'success', text: 'Profile updated successfully!' });
            setIsEditing(false);

            // Clear success msg after 3s
            setTimeout(() => setStatusMsg({ type: '', text: '' }), 3000);
        } catch (err) {
            console.error("Error updating profile:", err);
            setStatusMsg({ type: 'error', text: 'Failed to update profile. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-cream pt-8 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-sm border border-brand-brown/5">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-brand-brown rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-brand-cream">
                            {currentUser?.name?.[0]?.toUpperCase() || <User />}
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-brand-brown">
                                {currentUser?.name || 'Hello!'}
                            </h1>
                            <p className="text-brand-brown/60 text-sm font-medium">
                                {currentUser?.email}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all text-sm ${isEditing
                            ? 'bg-brand-brown/10 text-brand-brown hover:bg-brand-brown/20'
                            : 'bg-brand-red text-white hover:bg-brand-brown shadow-lg hover:shadow-xl active:scale-95'
                            }`}
                    >
                        {isEditing ? 'Cancel Edit' : (
                            <>
                                <Edit3 className="w-4 h-4" />
                                Edit Profile
                            </>
                        )}
                    </button>
                </div>

                {/* Status Message */}
                {statusMsg.text && (
                    <div className={`p-4 rounded-xl text-center font-bold animate-in fade-in slide-in-from-top-4 ${statusMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                        }`}>
                        {statusMsg.text}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Personal Info Card */}
                    <div className={`bg-white p-8 rounded-3xl shadow-sm border border-brand-brown/10 transition-all duration-300 ${isEditing ? 'ring-2 ring-brand-red/10' : ''}`}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-brand-cream rounded-xl text-brand-brown">
                                <User className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-brand-brown">Personal Details</h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-brand-black/60 mb-2 uppercase tracking-wide">Full Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={!isEditing}
                                    className={`w-full px-4 py-3 rounded-xl font-medium transition-all ${isEditing
                                        ? 'bg-brand-cream/30 border-2 border-brand-brown/10 focus:border-brand-brown focus:outline-none text-brand-brown'
                                        : 'bg-transparent border-transparent px-0 text-lg text-brand-brown'
                                        }`}
                                    placeholder="Enter your name"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-brand-black/60 mb-2 uppercase tracking-wide">Mobile Number</label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        disabled={!isEditing}
                                        className={`w-full rounded-xl font-medium transition-all ${isEditing
                                            ? 'pl-10 pr-4 py-3 bg-brand-cream/30 border-2 border-brand-brown/10 focus:border-brand-brown focus:outline-none text-brand-brown'
                                            : 'pl-0 bg-transparent border-transparent text-lg text-brand-brown'
                                            }`}
                                        placeholder="Add phone number"
                                    />
                                    {isEditing && <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-brown/40" />}
                                </div>
                            </div>

                            {!isEditing && (
                                <div className="pt-4 border-t border-dashed border-brand-brown/10">
                                    <div className="flex justify-between items-center text-sm text-brand-brown/60">
                                        <span>Account Type</span>
                                        <span className="font-bold text-brand-brown capitalize">{currentUser?.role}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm text-brand-brown/60 mt-2">
                                        <span>Member Since</span>
                                        <span className="font-bold text-brand-brown">{new Date(currentUser?.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Location Card */}
                    <div className={`bg-white p-8 rounded-3xl shadow-sm border border-brand-brown/10 transition-all duration-300 ${isEditing ? 'ring-2 ring-brand-red/10' : ''}`}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-brand-cream rounded-xl text-brand-red">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-brand-brown">Pickup Location</h2>
                        </div>

                        {/* View Mode: Static Map / Address */}
                        {!isEditing && location && (
                            <div className="space-y-4">
                                <div className="p-4 bg-brand-cream/50 rounded-2xl border border-brand-brown/5">
                                    <p className="text-brand-brown font-medium leading-relaxed">
                                        {location.address}
                                    </p>
                                </div>
                                {/* Show Read-Only Map */}
                                <div className="relative group">
                                    <LocationPicker
                                        initialLocation={location.coordinates}
                                        readOnly={true}
                                    />
                                    {/* Overlay hint */}
                                    <div
                                        onClick={() => setIsEditing(true)}
                                        className="absolute inset-0 bg-brand-brown/0 hover:bg-brand-brown/10 transition-colors cursor-pointer flex items-center justify-center group-hover:opacity-100 opacity-0"
                                    >
                                        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-xs font-bold text-brand-brown flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                            <Edit3 className="w-3 h-3" />
                                            Unknown Location? Click to Update
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {!isEditing && !location && (
                            <div className="text-center py-12 bg-brand-cream/30 rounded-2xl border-2 border-dashed border-brand-brown/10">
                                <MapPin className="w-10 h-10 text-brand-brown/20 mx-auto mb-3" />
                                <p className="text-brand-brown/50 font-medium">No location set.</p>
                                <button onClick={() => setIsEditing(true)} className="mt-4 text-brand-red font-bold text-sm hover:underline">
                                    Add Location
                                </button>
                            </div>
                        )}

                        {/* Edit Mode: Interactive Picker */}
                        {isEditing && (
                            <div className="animate-in fade-in zoom-in-95 duration-300">
                                <LocationPicker
                                    initialLocation={location?.coordinates}
                                    onLocationSelect={(newLoc) => setLocation(newLoc)}
                                />
                                <div className="p-3 mt-4 bg-brand-cream/50 rounded-lg text-sm text-brand-brown/70 text-center">
                                    Selected: <span className="font-bold text-brand-brown">{location?.address || 'None'}</span>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                {/* Save Button (Only in Edit Mode) */}
                {isEditing && (
                    <div className="flex justify-end pt-4 animate-in slide-in-from-bottom-4">
                        <button
                            onClick={handleSaveProfile}
                            disabled={loading}
                            className="w-full sm:w-auto px-8 py-4 bg-brand-brown text-white font-bold rounded-xl hover:bg-brand-black transition-all shadow-xl hover:shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <CheckCircle className="w-6 h-6" />
                            )}
                            {loading ? 'Saving Changes...' : 'Save Profile Changes'}
                        </button>
                    </div>
                )}

                {/* Logout Button */}
                <div className="pt-8 border-t border-brand-brown/10">
                    <button
                        onClick={logout}
                        className="w-full sm:w-auto px-6 py-3 text-brand-red font-bold hover:bg-brand-red/5 rounded-xl transition-colors border border-brand-red/20 flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                        Log Out of Account
                    </button>
                </div>
            </div>
        </div>
    );
}
