import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
    collection, query, where, onSnapshot, addDoc, 
    updateDoc, doc, getDoc, serverTimestamp 
} from 'firebase/firestore';
import { 
    Calendar, Clock, Scale, DollarSign, CheckCircle2, 
    AlertCircle, Phone, MapPin, Pause, Play, 
    Trash2, ArrowRight, Sparkles, Sun, Sunset, Moon, Loader2
} from 'lucide-react';

const PRICE_PER_KG = 0.5; // ₹0.50 per kg
const DEFAULT_THRESHOLD = 2; // Min 2 kg

const SLOTS = [
    { id: 'Morning (7-9 AM)', label: 'Morning', time: '7:00 - 9:00 AM', icon: Sun },
    { id: 'Afternoon (1-3 PM)', label: 'Afternoon', time: '1:00 - 3:00 PM', icon: Sunset },
    { id: 'Evening (5-7 PM)', label: 'Evening', time: '5:00 - 7:00 PM', icon: Moon },
];

const CATEGORIES = [
    'Fruit & Veg Peels',
    'Cooked Leftovers',
    'Coffee & Tea Leaves',
    'Egg & Nut Shells',
    'Garden Leaves'
];

export default function EcoWaste() {
    const { currentUser } = useAuth();
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [pickupLogs, setPickupLogs] = useState([]);

    const [preferredSlot, setPreferredSlot] = useState('Morning (7-9 AM)');
    const [thresholdKg, setThresholdKg] = useState('2');
    const [estimatedDailyKg, setEstimatedDailyKg] = useState('2.5');
    const [selectedCategories, setSelectedCategories] = useState([
        'Fruit & Veg Peels',
        'Cooked Leftovers'
    ]);
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });

    // Load user defaults
    useEffect(() => {
        if (!currentUser) return;
        async function fetchProfile() {
            try {
                const userDoc = await getDoc(doc(db, 'customers', currentUser.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (data.phone) setPhone(data.phone);
                    if (data.address) setAddress(data.address);
                }
            } catch (err) {
                console.error("Profile load err:", err);
            }
        }
        fetchProfile();
    }, [currentUser]);

    // Live subscription listener
    useEffect(() => {
        if (!currentUser) return;
        const q = query(
            collection(db, 'wet_waste_subscriptions'),
            where('customerId', '==', currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                const current = docs[0];
                setSubscription(current);
                setPickupLogs(current.pickupLogs || []);
            } else {
                setSubscription(null);
                setPickupLogs([]);
            }
            setLoading(false);
        }, () => setLoading(false));

        return () => unsubscribe();
    }, [currentUser]);

    const handleCategoryToggle = (category) => {
        if (selectedCategories.includes(category)) {
            setSelectedCategories(selectedCategories.filter(c => c !== category));
        } else {
            setSelectedCategories([...selectedCategories, category]);
        }
    };

    const handleCreateSubscription = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (!phone.trim() || !address.trim()) {
            setMessage({ type: 'error', text: 'Address and phone number are required.' });
            return;
        }

        setSubmitting(true);
        try {
            await addDoc(collection(db, 'wet_waste_subscriptions'), {
                customerId: currentUser.uid,
                customerName: currentUser.displayName || currentUser.name || 'Resident',
                customerEmail: currentUser.email || '',
                phone: phone.trim(),
                address: address.trim(),
                preferredSlot,
                estimatedDailyKg: Number(estimatedDailyKg) || 2,
                thresholdKg: Number(thresholdKg) || DEFAULT_THRESHOLD,
                pricePerKg: PRICE_PER_KG,
                wasteCategories: selectedCategories,
                status: 'pending',
                acceptedBy: null,
                vendorName: null,
                vendorPhone: null,
                totalKgCollected: 0,
                totalEarnings: 0,
                pickupCount: 0,
                pickupLogs: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            setMessage({ type: 'success', text: 'Subscription created. Nearby vendors notified!' });
        } catch (err) {
            console.error("Error creating subscription:", err);
            setMessage({ type: 'error', text: 'Failed to create request. Please retry.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleTogglePause = async () => {
        if (!subscription) return;
        const newStatus = subscription.status === 'paused' ? 'active' : 'paused';
        try {
            await updateDoc(doc(db, 'wet_waste_subscriptions', subscription.id), {
                status: newStatus,
                updatedAt: serverTimestamp()
            });
        } catch (err) {
            console.error("Pause toggle error:", err);
        }
    };

    const handleCancelSubscription = async () => {
        if (!subscription) return;
        if (!window.confirm("Cancel daily wet waste pickup?")) return;
        try {
            await updateDoc(doc(db, 'wet_waste_subscriptions', subscription.id), {
                status: 'cancelled',
                updatedAt: serverTimestamp()
            });
            setSubscription(null);
        } catch (err) {
            console.error("Cancel error:", err);
        }
    };

    const estMonthly = (Number(estimatedDailyKg || 2) * 30 * PRICE_PER_KG).toFixed(0);

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12 font-sans animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-brand-brown/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <img 
                        src="/ecowaste.png" 
                        alt="EcoWaste" 
                        className="h-16 w-auto sm:h-20 object-contain flex-shrink-0"
                    />
                    <div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 inline-block mb-1">
                            Daily Wet Waste Collection
                        </span>
                        <p className="text-xs text-brand-brown/70 font-medium">
                            Doorstep organic pickup • Paid per kilogram
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto bg-brand-cream/40 px-4 py-2 rounded-xl border border-brand-brown/10">
                    <span className="text-xs font-bold text-brand-brown/60 uppercase">Payout</span>
                    <span className="text-lg font-black text-brand-green">₹{PRICE_PER_KG.toFixed(2)} / kg</span>
                </div>
            </div>

            {/* Micro Highlights Ribbon */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-3 border border-brand-brown/10 shadow-xs flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-sm">
                        <DollarSign size={16} />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-brand-black">₹{PRICE_PER_KG.toFixed(2)} / kg Paid</div>
                        <div className="text-[10px] text-brand-brown/60">Direct to you</div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-3 border border-brand-brown/10 shadow-xs flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-sm">
                        <Scale size={16} />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-brand-black">Min {thresholdKg} kg / day</div>
                        <div className="text-[10px] text-brand-brown/60">Collection threshold</div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-3 border border-brand-brown/10 shadow-xs flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center font-bold text-sm">
                        <Clock size={16} />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-brand-black">Daily Pickup</div>
                        <div className="text-[10px] text-brand-brown/60">Verified collectors</div>
                    </div>
                </div>
            </div>

            {/* Alert Messages */}
            {message.text && (
                <div className={`p-3.5 rounded-xl text-xs font-semibold border flex items-center gap-2 ${
                    message.type === 'error' 
                        ? 'bg-red-50 text-red-800 border-red-200' 
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}>
                    {message.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                    <span>{message.text}</span>
                </div>
            )}

            {/* Active Subscription View */}
            {subscription && subscription.status !== 'cancelled' ? (
                <div className="space-y-5">
                    <div className="bg-white rounded-2xl border border-brand-brown/10 p-5 sm:p-6 shadow-sm space-y-5">
                        {/* Status Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-brand-brown/10">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider border ${
                                        subscription.status === 'active'
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                            : subscription.status === 'paused'
                                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                : 'bg-blue-50 text-blue-800 border-blue-200'
                                    }`}>
                                        {subscription.status === 'active' ? '● Active' : subscription.status === 'paused' ? '❚❚ Paused' : '◌ Finding Collector'}
                                    </span>
                                    <span className="text-xs font-bold text-brand-black">
                                        {subscription.status === 'active' 
                                            ? (subscription.vendorName || 'Verified Vendor') 
                                            : 'Awaiting local vendor'}
                                    </span>
                                </div>
                                <div className="text-[11px] text-brand-brown/60 mt-1 flex items-center gap-2">
                                    <span>Slot: {subscription.preferredSlot}</span>
                                    <span>•</span>
                                    <span>Threshold: {subscription.thresholdKg} kg</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {subscription.status === 'active' && (
                                    <button
                                        onClick={handleTogglePause}
                                        className="px-3 py-1.5 rounded-lg bg-brand-cream border border-brand-brown/15 text-brand-brown font-bold text-xs hover:bg-brand-brown hover:text-white transition-colors flex items-center gap-1"
                                    >
                                        <Pause size={13} />
                                        <span>Pause</span>
                                    </button>
                                )}
                                {subscription.status === 'paused' && (
                                    <button
                                        onClick={handleTogglePause}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs hover:bg-emerald-600 hover:text-white transition-colors flex items-center gap-1"
                                    >
                                        <Play size={13} />
                                        <span>Resume</span>
                                    </button>
                                )}
                                <button
                                    onClick={handleCancelSubscription}
                                    className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-brand-red font-bold text-xs hover:bg-brand-red hover:text-white transition-colors flex items-center gap-1"
                                >
                                    <Trash2 size={13} />
                                    <span>Cancel</span>
                                </button>
                            </div>
                        </div>

                        {/* Stat Pills */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                            <div className="p-3 rounded-xl bg-brand-cream/30 border border-brand-brown/10">
                                <span className="text-[10px] font-bold text-brand-brown/50 uppercase">Rate</span>
                                <div className="text-xl font-black text-brand-green">₹{subscription.pricePerKg || PRICE_PER_KG}/kg</div>
                            </div>
                            <div className="p-3 rounded-xl bg-brand-cream/30 border border-brand-brown/10">
                                <span className="text-[10px] font-bold text-brand-brown/50 uppercase">Threshold</span>
                                <div className="text-xl font-black text-brand-black">{subscription.thresholdKg} kg</div>
                            </div>
                            <div className="p-3 rounded-xl bg-brand-cream/30 border border-brand-brown/10">
                                <span className="text-[10px] font-bold text-brand-brown/50 uppercase">Collected</span>
                                <div className="text-xl font-black text-brand-black">{subscription.totalKgCollected || 0} kg</div>
                            </div>
                            <div className="p-3 rounded-xl bg-brand-cream/30 border border-brand-brown/10">
                                <span className="text-[10px] font-bold text-brand-brown/50 uppercase">Earnings</span>
                                <div className="text-xl font-black text-brand-green">₹{subscription.totalEarnings || 0}</div>
                            </div>
                        </div>

                        {/* Address info */}
                        <div className="text-xs text-brand-brown/70 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 pt-1">
                            <span className="flex items-center gap-1.5"><MapPin size={13} className="text-brand-brown/40" /> {subscription.address}</span>
                            <span className="flex items-center gap-1.5"><Phone size={13} className="text-brand-brown/40" /> {subscription.phone}</span>
                        </div>
                    </div>

                    {/* Pickup History */}
                    <div className="bg-white rounded-2xl border border-brand-brown/10 p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-brand-brown/10">
                            <h3 className="text-sm font-bold text-brand-black flex items-center gap-2">
                                <Calendar size={15} className="text-brand-brown/60" />
                                Pickup History
                            </h3>
                            <span className="text-xs font-bold text-brand-brown/50">
                                {pickupLogs.length} total
                            </span>
                        </div>

                        {pickupLogs.length === 0 ? (
                            <div className="text-center py-6 text-brand-brown/50 text-xs">
                                No pickups recorded yet. Payouts will show here after each collection.
                            </div>
                        ) : (
                            <div className="divide-y divide-brand-brown/5 max-h-64 overflow-y-auto">
                                {pickupLogs.map((log, i) => (
                                    <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                                        <div>
                                            <div className="font-bold text-brand-black">{log.date || 'Pickup'}</div>
                                            <div className="text-[10px] text-brand-brown/50">{log.vendorName || 'Collector'}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-brand-black">{log.kgCollected} kg</div>
                                            <div className="text-xs font-black text-brand-green">+₹{log.amountPaid}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* New Subscription Form */
                <form onSubmit={handleCreateSubscription} className="bg-white rounded-2xl border border-brand-brown/10 p-5 sm:p-7 shadow-sm space-y-5">
                    <div className="border-b border-brand-brown/10 pb-3">
                        <h2 className="text-base sm:text-lg font-bold text-brand-black">
                            Daily Pickup Request
                        </h2>
                        <p className="text-xs text-brand-brown/60 mt-0.5">
                            Configure your daily collection preferences.
                        </p>
                    </div>

                    {/* Time Slot Picker */}
                    <div>
                        <label className="block text-xs font-bold text-brand-black uppercase tracking-wider mb-2">
                            Collection Time Slot
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {SLOTS.map(slot => {
                                const Icon = slot.icon;
                                const isSelected = preferredSlot === slot.id;
                                return (
                                    <button
                                        key={slot.id}
                                        type="button"
                                        onClick={() => setPreferredSlot(slot.id)}
                                        className={`p-3 rounded-xl border text-left transition-colors flex items-center gap-3 ${
                                            isSelected 
                                                ? 'bg-brand-brown text-white border-brand-brown shadow-xs' 
                                                : 'bg-brand-cream/20 text-brand-brown border-brand-brown/10 hover:bg-brand-cream/50'
                                        }`}
                                    >
                                        <Icon size={18} className={isSelected ? 'text-brand-orange' : 'text-brand-brown/60'} />
                                        <div>
                                            <div className="text-xs font-bold">{slot.label}</div>
                                            <div className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-brand-brown/50'}`}>
                                                {slot.time}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Daily Threshold & Est Weight */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-brand-black uppercase tracking-wider mb-2">
                                Daily Threshold (kg)
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {['1.5', '2', '3'].map(val => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => setThresholdKg(val)}
                                        className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                                            thresholdKg === val 
                                                ? 'bg-brand-brown text-white border-brand-brown' 
                                                : 'bg-brand-cream/20 text-brand-brown border-brand-brown/10 hover:bg-brand-cream/50'
                                        }`}
                                    >
                                        {val} kg min
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-brand-black uppercase tracking-wider mb-2">
                                Est. Daily Waste (kg)
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {['2', '3', '5'].map(val => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => setEstimatedDailyKg(val)}
                                        className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                                            estimatedDailyKg === val 
                                                ? 'bg-brand-brown text-white border-brand-brown' 
                                                : 'bg-brand-cream/20 text-brand-brown border-brand-brown/10 hover:bg-brand-cream/50'
                                        }`}
                                    >
                                        ~{val} kg
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Categories Chips */}
                    <div>
                        <label className="block text-xs font-bold text-brand-black uppercase tracking-wider mb-2">
                            Waste Items
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map(cat => {
                                const isSelected = selectedCategories.includes(cat);
                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => handleCategoryToggle(cat)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                            isSelected 
                                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                                                : 'bg-white text-brand-brown/60 border-brand-brown/10 hover:bg-brand-cream/30'
                                        }`}
                                    >
                                        {isSelected ? '✓ ' : '+ '}{cat}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Address & Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-brand-black uppercase tracking-wider mb-1.5">
                                Pickup Address *
                            </label>
                            <input
                                type="text"
                                required
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Door / Flat, Street, Landmark"
                                className="w-full px-3.5 py-2.5 bg-brand-cream/20 border border-brand-brown/15 rounded-xl text-brand-black text-xs font-medium focus:outline-none focus:border-brand-red"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-brand-black uppercase tracking-wider mb-1.5">
                                Contact Number *
                            </label>
                            <input
                                type="tel"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Mobile number"
                                className="w-full px-3.5 py-2.5 bg-brand-cream/20 border border-brand-brown/15 rounded-xl text-brand-black text-xs font-medium focus:outline-none focus:border-brand-red"
                            />
                        </div>
                    </div>

                    {/* Estimated Earning Pill */}
                    <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-900">Est. Monthly Earnings:</span>
                        <span className="text-sm font-black text-emerald-800">₹{estMonthly} / mo</span>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-brand-red hover:bg-brand-brown text-white font-extrabold text-xs rounded-xl transition-colors shadow-xs active:scale-98 disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <span>Start Wet Waste Subscription</span>
                                <ArrowRight size={14} />
                            </>
                        )}
                    </button>
                </form>
            )}
        </div>
    );
}
