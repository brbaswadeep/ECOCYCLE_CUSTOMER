import React, { useState, useEffect, useMemo } from 'react';
import { 
    ShoppingBag, Search, Filter, Star, Plus, Check, X, Tag, Package, 
    Recycle, Minus, Trash2, History, Image as ImageIcon, ArrowRight, 
    Truck, ShieldCheck, AlertCircle, Sparkles, MapPin, ChevronRight, CheckCircle2,
    Coins
} from 'lucide-react';
import ecoshopLogo from '../assets/Ecoshop.png';
import InvoiceModal from '../components/InvoiceModal';
import { db } from '../firebase';
import { 
    collection, query, getDocs, getDoc, addDoc, serverTimestamp, 
    where, doc, updateDoc, increment, deleteDoc, onSnapshot 
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const CATEGORIES = ["All", "General", "Gardening", "Kitchen", "Accessories", "Outdoor", "Decor", "Furniture"];
const POINTS_PER_RUPEE = 25; // Strict conversion: 25 EcoPoints = 1 Rs (EcoShop exclusive)

export default function Shop() {
    const [activeCategory, setActiveCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("featured"); // 'featured' | 'price-low' | 'price-high' | 'recycled'
    const [inStockOnly, setInStockOnly] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [modalQuantity, setModalQuantity] = useState(1);
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [toast, setToast] = useState(null);

    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // EcoPoints state (25 EcoPoints = 1 Rs, EcoShop exclusive)
    const [userEcoPoints, setUserEcoPoints] = useState(0);
    const [useEcoPointsInCart, setUseEcoPointsInCart] = useState(false);
    const [useEcoPointsInBuyModal, setUseEcoPointsInBuyModal] = useState(false);

    // Delivery address state
    const [deliveryAddress, setDeliveryAddress] = useState("");

    // Cart State
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Orders State
    const [orders, setOrders] = useState([]);
    const [showOrders, setShowOrders] = useState(false);
    const [loadingOrders, setLoadingOrders] = useState(false);

    // Invoice State
    const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);

    // Products State
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load Cart from LocalStorage
    useEffect(() => {
        try {
            const savedCart = localStorage.getItem('ecocycle_cart');
            if (savedCart) {
                setCart(JSON.parse(savedCart));
            }
        } catch (e) {
            console.error("Failed to parse cart from storage:", e);
        }
    }, []);

    // Save Cart to LocalStorage
    useEffect(() => {
        try {
            localStorage.setItem('ecocycle_cart', JSON.stringify(cart));
        } catch (e) {
            console.error("Failed to save cart to storage:", e);
        }
    }, [cart]);

    // Initialize delivery address from profile
    useEffect(() => {
        if (currentUser) {
            const addr = currentUser.location?.address || currentUser.address || "";
            setDeliveryAddress(addr);
        }
    }, [currentUser]);

    // Live listener for customer EcoPoints balance (strictly for EcoShop checkout)
    useEffect(() => {
        if (!currentUser?.uid) {
            setUserEcoPoints(0);
            return;
        }
        const unsub = onSnapshot(doc(db, "customers", currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserEcoPoints(Number(data.ecoPoints || 0));
            }
        }, (err) => {
            console.error("Error listening to customer ecoPoints:", err);
        });
        return () => unsub();
    }, [currentUser]);

    // Live real-time listener for products collection from vendors
    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, "products"));
        const unsubProducts = onSnapshot(q, (snapshot) => {
            const fetchedProducts = snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            })).sort((a, b) => {
                // In-stock products prioritized, then latest first
                const aInStock = (Number(a.quantity) || 0) > 0 ? 1 : 0;
                const bInStock = (Number(b.quantity) || 0) > 0 ? 1 : 0;
                if (aInStock !== bInStock) return bInStock - aInStock;

                const timeA = a.createdAt?.seconds || (a.createdAt?.toMillis ? a.createdAt.toMillis() / 1000 : 0);
                const timeB = b.createdAt?.seconds || (b.createdAt?.toMillis ? b.createdAt.toMillis() / 1000 : 0);
                return timeB - timeA;
            });

            setProducts(fetchedProducts);
            setLoading(false);
        }, (error) => {
            console.error("Error subscribing to products:", error);
            setLoading(false);
        });

        return () => unsubProducts();
    }, []);

    // Modern light-themed toast helper
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        if (window._toastTimer) clearTimeout(window._toastTimer);
        window._toastTimer = setTimeout(() => {
            setToast(null);
        }, 4000);
    };

    // Cart Management
    const addToCart = (product, quantityToAdd = 1) => {
        const availableStock = product.quantity || 999;
        
        setCart(prev => {
            const existingIndex = prev.findIndex(item => item.id === product.id);
            if (existingIndex > -1) {
                const currentQty = prev[existingIndex].quantity;
                const newQty = currentQty + quantityToAdd;
                
                if (newQty > availableStock) {
                    showToast(`Only ${availableStock} items available in stock`, 'warning');
                    return prev;
                }
                
                const updated = [...prev];
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    quantity: newQty,
                    maxStock: availableStock
                };
                showToast(`Updated "${product.name}" in cart (${newQty})`, 'success');
                return updated;
            } else {
                if (quantityToAdd > availableStock) {
                    showToast(`Only ${availableStock} items available in stock`, 'warning');
                    return prev;
                }
                showToast(`Added "${product.name}" to your cart`, 'success');
                return [...prev, {
                    ...product,
                    maxStock: availableStock,
                    quantity: quantityToAdd
                }];
            }
        });
    };

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.id !== productId));
        showToast("Item removed from cart", 'info');
    };

    const updateQuantity = (productId, change) => {
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const max = item.maxStock || item.quantity || 999;
                const newQty = item.quantity + change;
                if (change > 0 && newQty > max) {
                    showToast(`Maximum stock reached (${max} available)`, 'warning');
                    return item;
                }
                return { ...item, quantity: Math.max(1, newQty) };
            }
            return item;
        }));
    };

    const getItemCartQuantity = (productId) => {
        const item = cart.find(c => c.id === productId);
        return item ? item.quantity : 0;
    };

    // Transparent Bill Calculations with EcoPoints Redemption (25 EcoPoints = 1 Rs)
    const calculateBill = (items, applyEcoPoints = false, availablePoints = 0) => {
        const subtotal = items.reduce((sum, item) => sum + (Number(item.price || 0) * (item.quantity || 1)), 0);
        
        let pointsDiscount = 0;
        let pointsToRedeem = 0;

        if (applyEcoPoints && availablePoints >= POINTS_PER_RUPEE && subtotal > 0) {
            const maxDiscountInRupees = Math.floor(subtotal);
            const possibleDiscountInRupees = Math.floor(availablePoints / POINTS_PER_RUPEE);
            pointsDiscount = Math.min(maxDiscountInRupees, possibleDiscountInRupees);
            pointsToRedeem = pointsDiscount * POINTS_PER_RUPEE;
        }

        const discountedSubtotal = Math.max(0, subtotal - pointsDiscount);
        const gst = Math.round(discountedSubtotal * 0.18);
        // Free delivery over ₹999 original subtotal, else ₹49
        const deliveryFee = subtotal > 0 ? (subtotal >= 999 ? 0 : 49) : 0;
        const total = discountedSubtotal + gst + deliveryFee;

        return { 
            subtotal, 
            pointsDiscount, 
            pointsToRedeem, 
            discountedSubtotal, 
            gst, 
            deliveryFee, 
            total 
        };
    };

    const cartBill = calculateBill(cart, useEcoPointsInCart, userEcoPoints);

    // Fetch Orders
    const fetchOrders = async () => {
        if (!currentUser) {
            showToast("Please login to view your orders", "warning");
            return;
        }
        setLoadingOrders(true);
        try {
            const q = query(
                collection(db, "orders"),
                where("customerId", "==", currentUser.uid)
            );
            const snapshot = await getDocs(q);
            const fetchedOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).sort((a, b) => {
                const timeA = a.createdAt?.seconds || (a.createdAt?.toMillis ? a.createdAt.toMillis() / 1000 : 0);
                const timeB = b.createdAt?.seconds || (b.createdAt?.toMillis ? b.createdAt.toMillis() / 1000 : 0);
                return timeB - timeA;
            });

            setOrders(fetchedOrders);
            setShowOrders(true);
        } catch (error) {
            console.error("Error fetching orders:", error);
            showToast("Failed to load orders. Please try again.", "error");
        } finally {
            setLoadingOrders(false);
        }
    };

    // Delete Order History
    const handleDeleteOrder = async (e, orderId) => {
        e.stopPropagation();
        try {
            await deleteDoc(doc(db, "orders", orderId));
            setOrders(prev => prev.filter(o => o.id !== orderId));
            showToast("Order record removed from history", "info");
        } catch (error) {
            console.error("Error deleting order:", error);
            showToast("Failed to delete order. Please try again.", "error");
        }
    };

    // Checkout from Cart
    const checkOut = async () => {
        if (!currentUser) {
            showToast("Please login to proceed with checkout", "warning");
            return;
        }
        if (cart.length === 0) return;

        setIsPurchasing(true);
        try {
            const pointsDiscountTotal = cartBill.pointsDiscount;
            const pointsToRedeemTotal = cartBill.pointsToRedeem;

            // Deduct redeemed points from customer record and log ledger record
            if (pointsToRedeemTotal > 0) {
                try {
                    const customerRef = doc(db, "customers", currentUser.uid);
                    await updateDoc(customerRef, {
                        ecoPoints: increment(-pointsToRedeemTotal),
                        totalRedeemedPoints: increment(pointsToRedeemTotal)
                    });

                    await addDoc(collection(db, "customers", currentUser.uid, "pointsHistory"), {
                        title: "EcoShop Checkout Discount",
                        source: "EcoShop Cart",
                        points: -pointsToRedeemTotal,
                        type: "redeemed",
                        description: `Redeemed ${pointsToRedeemTotal} EcoPoints (25 pts = ₹1) for ₹${pointsDiscountTotal} discount on EcoShop checkout`,
                        createdAt: serverTimestamp()
                    });
                } catch (ptsErr) {
                    console.error("Failed to deduct ecoPoints:", ptsErr);
                }
            }

            let remainingDiscountToDistribute = pointsDiscountTotal;
            let remainingPointsToDistribute = pointsToRedeemTotal;

            for (let i = 0; i < cart.length; i++) {
                const item = cart[i];
                const itemQty = Number(item.quantity) || 1;
                const productValue = Number(item.price || 0) * itemQty;
                
                // Distribute points discount across items
                let itemDiscount = 0;
                let itemPoints = 0;
                if (pointsDiscountTotal > 0 && cartBill.subtotal > 0) {
                    if (i === cart.length - 1) {
                        itemDiscount = remainingDiscountToDistribute;
                        itemPoints = remainingPointsToDistribute;
                    } else {
                        itemDiscount = Math.min(remainingDiscountToDistribute, Math.floor((productValue / cartBill.subtotal) * pointsDiscountTotal));
                        itemPoints = itemDiscount * POINTS_PER_RUPEE;
                        remainingDiscountToDistribute -= itemDiscount;
                        remainingPointsToDistribute -= itemPoints;
                    }
                }

                const itemDiscountedSubtotal = Math.max(0, productValue - itemDiscount);
                const itemGst = Math.round(itemDiscountedSubtotal * 0.18);
                const itemDelivery = i === 0 ? cartBill.deliveryFee : 0;
                const itemTotal = itemDiscountedSubtotal + itemGst + itemDelivery;
                const platformFee = Math.round(itemDiscountedSubtotal * 0.015);
                const vendorEarnings = Math.max(0, itemTotal - platformFee);

                await addDoc(collection(db, "orders"), {
                    customerId: currentUser.uid,
                    customerName: currentUser.displayName || currentUser.name || "EcoCycle Member",
                    customerEmail: currentUser.email || "",
                    deliveryAddress: deliveryAddress || currentUser.location?.address || "Address on Profile",
                    vendorId: item.vendorId || "verified_vendor",
                    vendorName: item.vendorName || "Verified Artisan",
                    productId: item.id,
                    productName: item.name || "Eco Product",
                    productImage: item.image || (item.images && item.images[0]) || "",
                    price: itemTotal,
                    priceBreakdown: {
                        subtotal: productValue,
                        ecoPointsDiscount: itemDiscount,
                        ecoPointsRedeemed: itemPoints,
                        discountedSubtotal: itemDiscountedSubtotal,
                        gst: itemGst,
                        deliveryFee: itemDelivery,
                        total: itemTotal,
                        platformFee: platformFee,
                        vendorEarnings: vendorEarnings
                    },
                    quantity: itemQty,
                    status: 'pending',
                    createdAt: serverTimestamp()
                });

                // Decrement product inventory safely without going below 0
                try {
                    const productRef = doc(db, "products", item.id);
                    const pSnap = await getDoc(productRef);
                    if (pSnap.exists()) {
                        const currentQty = Number(pSnap.data().quantity) || 0;
                        await updateDoc(productRef, {
                            quantity: Math.max(0, currentQty - itemQty)
                        });
                    }
                } catch (stockErr) {
                    console.warn("Could not update product quantity in real-time:", stockErr);
                }
            }

            setCart([]);
            setUseEcoPointsInCart(false);
            setIsPurchasing(false);
            setIsCartOpen(false);
            showToast(pointsDiscountTotal > 0 
                ? `Order placed! Saved ₹${pointsDiscountTotal} with ${pointsToRedeemTotal} EcoPoints!` 
                : "Order placed successfully! Thank you for supporting sustainable makers.", 
                "success"
            );
        } catch (error) {
            console.error("Checkout error:", error);
            showToast("Checkout failed. Please try again.", "error");
            setIsPurchasing(false);
        }
    };

    // Instant Buy Single Item
    const handleBuySingle = async () => {
        if (!currentUser) {
            showToast("Please login to purchase items", "warning");
            return;
        }
        if (!selectedProduct) return;

        setIsPurchasing(true);
        try {
            const qty = Number(modalQuantity) || 1;
            const bill = calculateBill([{ ...selectedProduct, quantity: qty }], useEcoPointsInBuyModal, userEcoPoints);

            // Deduct redeemed points from customer record and log transaction
            if (bill.pointsToRedeem > 0) {
                try {
                    const customerRef = doc(db, "customers", currentUser.uid);
                    await updateDoc(customerRef, {
                        ecoPoints: increment(-bill.pointsToRedeem),
                        totalRedeemedPoints: increment(bill.pointsToRedeem)
                    });

                    await addDoc(collection(db, "customers", currentUser.uid, "pointsHistory"), {
                        title: "EcoShop Checkout Discount",
                        source: "EcoShop Order",
                        points: -bill.pointsToRedeem,
                        type: "redeemed",
                        description: `Redeemed ${bill.pointsToRedeem} EcoPoints (25 pts = ₹1) for ₹${bill.pointsDiscount} discount on ${selectedProduct.name}`,
                        createdAt: serverTimestamp()
                    });
                } catch (ptsErr) {
                    console.error("Failed to deduct ecoPoints:", ptsErr);
                }
            }

            const productValue = Number(selectedProduct.price || 0) * qty;
            const platformFee = Math.round(bill.discountedSubtotal * 0.015);
            const vendorEarnings = Math.max(0, bill.total - platformFee);

            await addDoc(collection(db, "orders"), {
                customerId: currentUser.uid,
                customerName: currentUser.displayName || currentUser.name || "EcoCycle Member",
                customerEmail: currentUser.email || "",
                deliveryAddress: deliveryAddress || currentUser.location?.address || "Address on Profile",
                vendorId: selectedProduct.vendorId || "verified_vendor",
                vendorName: selectedProduct.vendorName || "Verified Artisan",
                productId: selectedProduct.id,
                productName: selectedProduct.name || "Eco Product",
                productImage: selectedProduct.image || (selectedProduct.images && selectedProduct.images[0]) || "",
                price: bill.total,
                priceBreakdown: {
                    subtotal: productValue,
                    ecoPointsDiscount: bill.pointsDiscount,
                    ecoPointsRedeemed: bill.pointsToRedeem,
                    discountedSubtotal: bill.discountedSubtotal,
                    gst: bill.gst,
                    deliveryFee: bill.deliveryFee,
                    total: bill.total,
                    platformFee: platformFee,
                    vendorEarnings: vendorEarnings
                },
                quantity: qty,
                status: 'pending',
                createdAt: serverTimestamp()
            });

            // Decrement Inventory safely
            try {
                const productRef = doc(db, "products", selectedProduct.id);
                const pSnap = await getDoc(productRef);
                if (pSnap.exists()) {
                    const currentQty = Number(pSnap.data().quantity) || 0;
                    await updateDoc(productRef, {
                        quantity: Math.max(0, currentQty - qty)
                    });
                }
            } catch (stockErr) {
                console.warn("Inventory update warning:", stockErr);
            }

            setIsPurchasing(false);
            setShowBuyModal(false);
            setUseEcoPointsInBuyModal(false);
            setSelectedProduct(null);
            showToast(bill.pointsDiscount > 0
                ? `Purchase successful! Saved ₹${bill.pointsDiscount} with ${bill.pointsToRedeem} EcoPoints!` 
                : "Purchase successful! Track your package in My Orders.", 
                "success"
            );
        } catch (error) {
            console.error("Error creating order:", error);
            showToast("Failed to place order. Please try again.", "error");
            setIsPurchasing(false);
        }
    };

    // Filter & Sort Products
    const filteredProducts = useMemo(() => {
        let result = products.filter(product => {
            const matchesCategory = activeCategory === "All" || 
                (product.category && product.category.trim().toLowerCase() === activeCategory.trim().toLowerCase());
            const matchesSearch = !searchQuery.trim() || 
                product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.vendorName?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStock = !inStockOnly || (Number(product.quantity) || 0) > 0;
            return matchesCategory && matchesSearch && matchesStock;
        });

        if (sortBy === "price-low") {
            result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
        } else if (sortBy === "price-high") {
            result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
        } else if (sortBy === "recycled") {
            result.sort((a, b) => (b.type === 'recycled' ? 1 : 0) - (a.type === 'recycled' ? 1 : 0));
        } else {
            result.sort((a, b) => {
                const aInStock = (Number(a.quantity) || 0) > 0 ? 1 : 0;
                const bInStock = (Number(b.quantity) || 0) > 0 ? 1 : 0;
                if (aInStock !== bInStock) return bInStock - aInStock;
                const timeA = a.createdAt?.seconds || (a.createdAt?.toMillis ? a.createdAt.toMillis() / 1000 : 0);
                const timeB = b.createdAt?.seconds || (b.createdAt?.toMillis ? b.createdAt.toMillis() / 1000 : 0);
                return timeB - timeA;
            });
        }

        return result;
    }, [products, activeCategory, searchQuery, sortBy, inStockOnly]);

    return (
        <>
            {/* Global Light Toast Alert */}
            {toast && (
                <div className="fixed top-5 right-5 z-[150] bg-white/95 backdrop-blur-md text-brand-brown px-4 py-3 rounded-2xl shadow-xl border border-brand-brown/15 flex items-center gap-3 animate-in slide-in-from-top-3 duration-200 max-w-sm sm:max-w-md">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                        toast.type === 'error' 
                            ? 'bg-red-50 text-brand-red border-red-200' :
                        toast.type === 'warning'
                            ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        toast.type === 'info'
                            ? 'bg-blue-50 text-blue-600 border-blue-200' :
                            'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}>
                        {toast.type === 'error' ? (
                            <AlertCircle size={17} />
                        ) : toast.type === 'warning' ? (
                            <AlertCircle size={17} />
                        ) : (
                            <CheckCircle2 size={17} />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-brand-brown leading-snug">
                            {toast.message}
                        </p>
                    </div>
                    <button 
                        onClick={() => setToast(null)} 
                        className="text-brand-brown/40 hover:text-brand-brown p-1 hover:bg-gray-100 rounded-lg transition"
                        title="Dismiss"
                    >
                        <X size={15} />
                    </button>
                </div>
            )}

            <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in pb-16 font-sans">
                
                {/* Top EcoShop Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-brand-brown/10 shadow-sm">
                    <div className="flex items-center gap-3">
                        <img
                            src={ecoshopLogo}
                            alt="EcoShop"
                            className="h-12 sm:h-14 w-auto object-contain"
                        />
                        <div className="hidden sm:block h-7 w-px bg-brand-brown/15" />
                        <span className="hidden sm:inline-block text-xs font-bold text-brand-brown/60 uppercase tracking-wider">
                            Sustainable Marketplace
                        </span>
                    </div>

                    {/* Prominent, attractive Orders, EcoPoints & Cart Buttons */}
                    <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto flex-wrap sm:flex-nowrap">
                        <Link
                            to="/ecopoints"
                            className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-50 hover:bg-amber-100/80 text-amber-900 rounded-xl font-bold border border-amber-200 shadow-xs transition-all active:scale-95 text-xs"
                            title="Your EcoPoints (25 pts = ₹1 discount exclusively in EcoShop)"
                        >
                            <Coins size={16} className="text-amber-600" />
                            <span className="font-extrabold">{userEcoPoints} pts</span>
                            <span className="hidden md:inline text-[11px] text-amber-800 font-semibold bg-amber-100/90 px-1.5 py-0.5 rounded-md border border-amber-200/50">
                                ≈ ₹{Math.floor(userEcoPoints / POINTS_PER_RUPEE)} off
                            </span>
                        </Link>

                        <button
                            onClick={fetchOrders}
                            disabled={loadingOrders}
                            className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 bg-white text-brand-brown rounded-xl font-bold hover:bg-brand-cream/60 border border-brand-brown/15 shadow-sm hover:shadow transition-all active:scale-95 text-xs sm:text-sm"
                            title="View order history & tracking"
                        >
                            <History size={17} className="text-brand-brown/70" />
                            <span>My Orders</span>
                        </button>

                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="flex items-center gap-2.5 px-4 sm:px-5 py-2.5 bg-brand-brown text-white rounded-xl font-bold hover:bg-brand-black shadow-sm hover:shadow-md transition-all active:scale-95 text-xs sm:text-sm group"
                            title="View your shopping cart"
                        >
                            <div className="relative flex items-center">
                                <ShoppingBag size={18} />
                                {cart.length > 0 && (
                                    <span className="absolute -top-2 -right-2.5 bg-brand-red text-white text-[10px] font-black px-1.5 py-0.2 rounded-md border border-white shadow-xs">
                                        {cart.reduce((a, b) => a + (b.quantity || 1), 0)}
                                    </span>
                                )}
                            </div>
                            <span>Cart</span>
                            <span className="text-brand-orange font-black ml-0.5">₹{cartBill.total}</span>
                        </button>
                    </div>
                </div>

                {/* Search, Filter & Sort Controls */}
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                        
                        {/* Search Bar */}
                        <div className="group relative flex-1 max-w-xl">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-brown/45 group-focus-within:text-brand-orange transition-colors">
                                <Search className="h-4 w-4" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search by product name, materials, or vendor..."
                                className="block w-full pl-10 pr-9 py-2.5 sm:py-3 border border-brand-brown/15 rounded-2xl bg-white text-sm focus:ring-3 focus:ring-brand-orange/20 focus:border-brand-orange/70 focus:outline-none placeholder-brand-brown/40 text-brand-brown transition-all shadow-2xs font-medium"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        e.stopPropagation();
                                        setSearchQuery('');
                                    }
                                }}
                            />
                            {searchQuery ? (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-brand-brown/40 hover:text-brand-brown transition-colors"
                                    title="Clear search (Esc)"
                                >
                                    <span className="p-1 rounded-lg hover:bg-brand-brown/10 flex items-center justify-center">
                                        <X size={16} />
                                    </span>
                                </button>
                            ) : (
                                <span className="hidden sm:inline-flex absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-brand-brown/30 bg-brand-cream/60 border border-brand-brown/10 rounded px-1.5 py-0.5 pointer-events-none">
                                    Esc
                                </span>
                            )}
                        </div>

                        {/* Sort & Filter Controls */}
                        <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
                            <button
                                onClick={() => setInStockOnly(!inStockOnly)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                                    inStockOnly
                                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                                        : 'bg-white text-brand-brown/70 border-brand-brown/15 hover:bg-brand-cream/60'
                                }`}
                                title="Filter in-stock items only"
                            >
                                <span className={`w-2 h-2 rounded-full ${inStockOnly ? 'bg-white' : 'bg-emerald-600'}`}></span>
                                <span>In Stock Only</span>
                            </button>

                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-brand-brown/60 uppercase tracking-wider hidden sm:inline">Sort by:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-3 py-2 bg-white border border-brand-brown/15 rounded-xl text-xs font-bold text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-orange/30 shadow-sm"
                                >
                                    <option value="featured">Featured / In Stock</option>
                                    <option value="price-low">Price: Low to High</option>
                                    <option value="price-high">Price: High to Low</option>
                                    <option value="recycled">100% Recycled First</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Category Filter Chips (NO pill badges; clean rounded-xl) */}
                    <div className="flex overflow-x-auto pb-1 gap-2 no-scrollbar">
                        {CATEGORIES.map(category => {
                            const isSelected = activeCategory === category;
                            return (
                                <button
                                    key={category}
                                    onClick={() => setActiveCategory(category)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                                        isSelected
                                            ? 'bg-brand-brown text-white border-brand-brown shadow-sm'
                                            : 'bg-white text-brand-brown/70 border-brand-brown/10 hover:bg-brand-cream/60 hover:text-brand-brown'
                                    }`}
                                >
                                    {category}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Products Count Indicator */}
                <div className="flex justify-between items-center text-xs text-brand-brown/60 font-semibold px-1">
                    <span>Showing {filteredProducts.length} sustainable {filteredProducts.length === 1 ? 'product' : 'products'}</span>
                    {searchQuery && (
                        <span>Filtering for: <strong className="text-brand-brown">"{searchQuery}"</strong></span>
                    )}
                </div>

                {/* Product Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="bg-white rounded-2xl border border-brand-brown/10 p-4 space-y-4 animate-pulse">
                                <div className="h-48 bg-gray-200 rounded-xl"></div>
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                <div className="h-8 bg-gray-200 rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.map(product => {
                            const qty = Number(product.quantity) || 0;
                            const isOutOfStock = qty <= 0;
                            const isLowStock = !isOutOfStock && qty <= 3;
                            const cartQty = getItemCartQuantity(product.id);
                            const inCart = cartQty > 0;

                            return (
                                <div
                                    key={product.id}
                                    className="group bg-white rounded-2xl overflow-hidden border border-brand-brown/10 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col cursor-pointer relative"
                                    onClick={() => {
                                        setSelectedProduct(product);
                                        setSelectedImageIndex(0);
                                        setModalQuantity(1);
                                    }}
                                >
                                    {/* Product Image Area */}
                                    <div className="relative h-52 overflow-hidden bg-brand-cream/40">
                                        <img
                                            src={product.image || (product.images && product.images[0]) || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=500&auto=format&fit=crop&q=60'}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=500&auto=format&fit=crop&q=60';
                                            }}
                                        />

                                        {/* Top Badges */}
                                        <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-start pointer-events-none">
                                            <div className="flex flex-col gap-1.5">
                                                {product.category && (
                                                    <span className="bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] font-bold text-brand-brown border border-brand-brown/10 shadow-sm">
                                                        {product.category}
                                                    </span>
                                                )}
                                                {product.type === 'recycled' && (
                                                    <span className="bg-emerald-700 text-white px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 shadow-sm">
                                                        <Recycle size={12} /> Upcycled
                                                    </span>
                                                )}
                                            </div>

                                            {/* Photo counter if multiple */}
                                            {product.images && product.images.length > 1 && (
                                                <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 backdrop-blur-sm shadow-sm">
                                                    <ImageIcon size={11} /> {product.images.length}
                                                </span>
                                            )}
                                        </div>

                                        {/* Stock Tag on Bottom of Image */}
                                        <div className="absolute bottom-2 left-2 pointer-events-none">
                                            {isOutOfStock ? (
                                                <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm">
                                                    Out of Stock
                                                </span>
                                            ) : isLowStock ? (
                                                <span className="bg-amber-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                                                    Only {qty} left
                                                </span>
                                            ) : (
                                                <span className="bg-white/90 text-brand-brown/70 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-brand-brown/10 shadow-sm">
                                                    In Stock ({qty})
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Product Details */}
                                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                        <div>
                                            <h3 className="font-bold text-brand-brown text-base leading-snug group-hover:text-brand-orange transition-colors line-clamp-2">
                                                {product.name}
                                            </h3>
                                            
                                            <div className="text-xs text-brand-brown/60 font-medium mt-1 flex items-center gap-1">
                                                <span>by {product.vendorName || "Verified Artisan"}</span>
                                            </div>

                                            {product.type === 'recycled' && product.sourceInventoryName && (
                                                <div className="mt-2 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 line-clamp-1">
                                                    Made from: {product.sourceInventoryName}
                                                </div>
                                            )}
                                        </div>

                                        {/* Price & Action Row */}
                                        <div className="pt-2 border-t border-brand-brown/5 flex items-center justify-between gap-2">
                                            <div>
                                                <div className="text-lg font-black text-brand-brown">
                                                    ₹{product.price}
                                                </div>
                                                <div className="text-[10px] text-brand-brown/50">Incl. all taxes</div>
                                            </div>

                                            {/* Action Button */}
                                            {isOutOfStock ? (
                                                <span className="px-3 py-1.5 bg-gray-100 text-gray-400 text-xs font-bold rounded-xl border border-gray-200">
                                                    Sold Out
                                                </span>
                                            ) : inCart ? (
                                                <div 
                                                    className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-xl p-1"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={() => updateQuantity(product.id, -1)}
                                                        className="p-1 text-emerald-800 hover:bg-emerald-100 rounded-lg transition"
                                                        title="Decrease quantity"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="text-xs font-extrabold text-emerald-800 px-1 min-w-[18px] text-center">
                                                        {cartQty}
                                                    </span>
                                                    <button
                                                        onClick={() => updateQuantity(product.id, 1)}
                                                        className="p-1 text-emerald-800 hover:bg-emerald-100 rounded-lg transition"
                                                        title="Increase quantity"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addToCart(product, 1);
                                                    }}
                                                    className="px-3.5 py-2 bg-brand-brown text-white text-xs font-bold rounded-xl hover:bg-brand-black active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
                                                    title="Add directly to cart"
                                                >
                                                    <ShoppingBag size={14} />
                                                    <span>Add</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-brand-brown/20 p-8">
                        <Filter className="w-12 h-12 text-brand-brown/30 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-brand-brown">No matching eco products</h3>
                        <p className="text-sm text-brand-brown/60 max-w-md mx-auto mt-1 mb-4">
                            We couldn't find items in category "{activeCategory}" matching your search. Try resetting filters.
                        </p>
                        <button
                            onClick={() => {
                                setActiveCategory("All");
                                setSearchQuery("");
                            }}
                            className="px-5 py-2.5 bg-brand-brown text-white text-xs font-bold rounded-xl hover:bg-brand-black transition shadow-sm"
                        >
                            Reset Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Product Detail Modal */}
            {selectedProduct && (
                <div 
                    className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setSelectedProduct(null)}
                >
                    <div 
                        className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col md:flex-row relative border border-brand-brown/15"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-brand-red hover:text-white rounded-xl transition-all z-20 border border-brand-brown/10 shadow-sm"
                            onClick={() => setSelectedProduct(null)}
                        >
                            <X size={18} />
                        </button>

                        {/* Gallery / Image Showcase */}
                        <div className="w-full md:w-1/2 flex flex-col bg-brand-cream/30 border-r border-brand-brown/10">
                            <div className="relative h-72 md:h-96 w-full overflow-hidden bg-brand-cream/50 flex items-center justify-center">
                                <img
                                    src={(selectedProduct.images && selectedProduct.images[selectedImageIndex]) || selectedProduct.image || 'https://placehold.co/400x400?text=No+Image'}
                                    alt={selectedProduct.name}
                                    className="w-full h-full object-cover"
                                />

                                {selectedProduct.type === 'recycled' && (
                                    <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-emerald-200 shadow-md">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                                            <Recycle className="w-4 h-4 text-emerald-600" />
                                            <span>100% Upcycled Certified</span>
                                        </div>
                                        <p className="text-[11px] text-emerald-700/90 mt-0.5">
                                            Giving reclaimed materials ({selectedProduct.sourceInventoryName || 'Repurposed Stock'}) a new life.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Multi-image thumbnail strip */}
                            {selectedProduct.images && selectedProduct.images.length > 1 && (
                                <div className="flex gap-2 p-3 bg-white border-t border-brand-brown/10 overflow-x-auto">
                                    {selectedProduct.images.map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedImageIndex(idx)}
                                            className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition ${
                                                selectedImageIndex === idx 
                                                    ? 'border-brand-brown ring-2 ring-brand-brown/20' 
                                                    : 'border-brand-brown/10 opacity-70 hover:opacity-100'
                                            }`}
                                        >
                                            <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Product Info & Purchase Actions */}
                        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between overflow-y-auto space-y-6">
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2 items-center">
                                    <span className="px-3 py-1 bg-brand-brown/10 text-brand-brown rounded-md text-xs font-bold">
                                        {selectedProduct.category || "Eco Gear"}
                                    </span>
                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-bold">
                                        Verified Seller
                                    </span>
                                    {selectedProduct.quantity && (
                                        <span className="text-xs text-brand-brown/60 font-semibold ml-auto">
                                            Stock: {selectedProduct.quantity} units
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <h2 className="text-2xl font-black text-brand-brown leading-snug">
                                        {selectedProduct.name}
                                    </h2>
                                    <p className="text-xs text-brand-brown/60 font-semibold mt-1">
                                        Crafted by {selectedProduct.vendorName || "Verified Artisan"}
                                    </p>
                                </div>

                                <div className="flex items-baseline gap-2 pt-1 border-t border-brand-brown/10">
                                    <span className="text-3xl font-black text-brand-brown">
                                        ₹{selectedProduct.price}
                                    </span>
                                    <span className="text-xs text-brand-brown/50 font-medium">
                                        + 18% GST (transparent calculation at checkout)
                                    </span>
                                </div>

                                {/* Description */}
                                <div className="space-y-1">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-brown/70">
                                        Product Story & Specs
                                    </h4>
                                    <p className="text-sm text-brand-brown/80 leading-relaxed whitespace-pre-line bg-brand-cream/20 p-3 rounded-xl border border-brand-brown/5">
                                        {selectedProduct.description || "Every purchase supports circular economies and sustainable local creators."}
                                    </p>
                                </div>

                                {/* Eco Assurances */}
                                <div className="grid grid-cols-2 gap-2 text-xs text-brand-brown/70">
                                    <div className="flex items-center gap-1.5 p-2 bg-gray-50 rounded-lg">
                                        <CheckCircle2 size={14} className="text-emerald-600" />
                                        <span>Verified Sustainable</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 p-2 bg-gray-50 rounded-lg">
                                        <Truck size={14} className="text-brand-orange" />
                                        <span>Eco-Friendly Shipping</span>
                                    </div>
                                </div>
                            </div>

                            {/* Quantity Selector & Action Buttons */}
                            <div className="pt-4 border-t border-brand-brown/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-brand-brown uppercase tracking-wider">
                                        Quantity:
                                    </span>
                                    <div className="flex items-center gap-2 border border-brand-brown/20 rounded-xl p-1 bg-white">
                                        <button
                                            onClick={() => setModalQuantity(prev => Math.max(1, prev - 1))}
                                            className="p-1 text-brand-brown hover:bg-brand-cream rounded-lg transition disabled:opacity-40"
                                            disabled={modalQuantity <= 1 || (Number(selectedProduct.quantity) || 0) <= 0}
                                        >
                                            <Minus size={16} />
                                        </button>
                                        <span className="text-sm font-black text-brand-brown px-3 min-w-[24px] text-center">
                                            {(Number(selectedProduct.quantity) || 0) <= 0 ? 0 : modalQuantity}
                                        </span>
                                        <button
                                            onClick={() => setModalQuantity(prev => {
                                                const max = Number(selectedProduct.quantity) || 0;
                                                if (prev >= max) {
                                                    showToast(`⚠️ Max stock available is ${max}`);
                                                    return prev;
                                                }
                                                return prev + 1;
                                            })}
                                            className="p-1 text-brand-brown hover:bg-brand-cream rounded-lg transition disabled:opacity-40"
                                            disabled={(Number(selectedProduct.quantity) || 0) <= 0}
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        disabled={(Number(selectedProduct.quantity) || 0) <= 0}
                                        className="w-full py-3.5 bg-white border-2 border-brand-brown text-brand-brown rounded-xl font-bold text-sm hover:bg-brand-cream transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                        onClick={() => {
                                            addToCart(selectedProduct, modalQuantity);
                                            setSelectedProduct(null);
                                        }}
                                    >
                                        <ShoppingBag size={16} />
                                        <span>Add to Cart</span>
                                    </button>

                                    <button
                                        disabled={(Number(selectedProduct.quantity) || 0) <= 0}
                                        className="w-full py-3.5 bg-brand-brown text-white rounded-xl font-bold text-sm hover:bg-brand-black transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                        onClick={() => setShowBuyModal(true)}
                                    >
                                        <span>{(Number(selectedProduct.quantity) || 0) <= 0 ? 'Out of Stock' : `Buy Now • ₹${Number(selectedProduct.price) * modalQuantity}`}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Purchase Confirmation Modal */}
            {showBuyModal && selectedProduct && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-brand-brown/15 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-brand-brown/10">
                            <div className="w-10 h-10 bg-brand-brown/10 rounded-xl flex items-center justify-center text-brand-brown">
                                <ShoppingBag size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-brand-brown">Confirm Your Order</h3>
                                <p className="text-xs text-brand-brown/60">Review order breakdown before placing</p>
                            </div>
                        </div>

                        {/* Product Summary */}
                        <div className="flex items-center gap-3 p-3 bg-brand-cream/30 rounded-xl border border-brand-brown/10 mb-4">
                            <img
                                src={selectedProduct.image || (selectedProduct.images && selectedProduct.images[0]) || 'https://placehold.co/60'}
                                alt={selectedProduct.name}
                                className="w-12 h-12 object-cover rounded-lg"
                            />
                            <div className="flex-1">
                                <h4 className="font-bold text-xs text-brand-brown line-clamp-1">{selectedProduct.name}</h4>
                                <p className="text-xs text-brand-brown/60">Quantity: {modalQuantity} unit(s)</p>
                            </div>
                            <span className="font-bold text-sm text-brand-brown">
                                ₹{Number(selectedProduct.price) * modalQuantity}
                            </span>
                        </div>

                        {/* Delivery Address Field */}
                        <div className="mb-3 space-y-1.5">
                            <label className="block text-xs font-bold text-brand-brown uppercase tracking-wider flex items-center gap-1">
                                <MapPin size={13} className="text-brand-orange" />
                                <span>Delivery Address</span>
                            </label>
                            <input
                                type="text"
                                value={deliveryAddress}
                                onChange={(e) => setDeliveryAddress(e.target.value)}
                                placeholder="Enter street, city, pin code..."
                                className="w-full px-3 py-2.5 border border-brand-brown/20 rounded-xl text-xs text-brand-brown focus:ring-2 focus:ring-brand-orange/30 focus:outline-none"
                            />
                        </div>

                        {/* EcoPoints Redemption Widget */}
                        <div className="mb-4 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input 
                                        type="checkbox"
                                        checked={useEcoPointsInBuyModal}
                                        onChange={(e) => setUseEcoPointsInBuyModal(e.target.checked)}
                                        disabled={userEcoPoints < POINTS_PER_RUPEE}
                                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300"
                                    />
                                    <div className="flex items-center gap-1.5">
                                        <Coins size={14} className="text-amber-600" />
                                        <span className="text-xs font-bold text-amber-950">
                                            Redeem EcoPoints (25 pts = ₹1)
                                        </span>
                                    </div>
                                </label>
                                <span className="text-[11px] font-extrabold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
                                    {userEcoPoints} pts
                                </span>
                            </div>
                            <p className="text-[10px] text-amber-800/80 pl-6">
                                {userEcoPoints >= POINTS_PER_RUPEE ? (
                                    <span>
                                        Save up to <strong className="font-bold text-emerald-700">₹{Math.floor(userEcoPoints / POINTS_PER_RUPEE)}</strong>. Strictly usable for instant discounts on EcoShop orders.
                                    </span>
                                ) : (
                                    <span>
                                        You need at least 25 EcoPoints to redeem a ₹1 discount.
                                    </span>
                                )}
                            </p>
                        </div>

                        {/* Bill Breakdown */}
                        {(() => {
                            const bill = calculateBill([{ ...selectedProduct, quantity: modalQuantity }], useEcoPointsInBuyModal, userEcoPoints);
                            return (
                                <div className="bg-gray-50 p-3.5 rounded-xl mb-5 space-y-2 text-xs">
                                    <div className="flex justify-between text-brand-brown/70">
                                        <span>Item Subtotal ({modalQuantity} items)</span>
                                        <span>₹{bill.subtotal}</span>
                                    </div>
                                    {bill.pointsDiscount > 0 && (
                                        <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200/60">
                                            <span className="flex items-center gap-1">
                                                <Coins size={12} />
                                                EcoPoints Discount ({bill.pointsToRedeem} pts)
                                            </span>
                                            <span>-₹{bill.pointsDiscount}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-brand-brown/70">
                                        <span>GST (18%)</span>
                                        <span>₹{bill.gst}</span>
                                    </div>
                                    <div className="flex justify-between text-brand-brown/70">
                                        <span>Eco Delivery Fee</span>
                                        <span>{bill.deliveryFee === 0 ? <strong className="text-emerald-700">FREE</strong> : `₹${bill.deliveryFee}`}</span>
                                    </div>
                                    <div className="flex justify-between font-extrabold text-sm text-brand-brown border-t border-dashed border-gray-300 pt-2 mt-2">
                                        <span>Total Amount</span>
                                        <span>₹{bill.total}</span>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="flex gap-2.5">
                            <button
                                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 transition"
                                onClick={() => setShowBuyModal(false)}
                                disabled={isPurchasing}
                            >
                                Cancel
                            </button>
                            <button
                                className="flex-1 py-3 bg-brand-brown text-white font-bold text-xs rounded-xl hover:bg-brand-black transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                                onClick={handleBuySingle}
                                disabled={isPurchasing}
                            >
                                {isPurchasing ? 'Placing Order...' : 'Confirm Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cart Drawer */}
            {isCartOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-200">
                    <div 
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
                        onClick={() => setIsCartOpen(false)}
                    />
                    <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 border-l border-brand-brown/10 animate-in slide-in-from-right duration-300">
                        
                        {/* Drawer Header */}
                        <div className="p-5 border-b border-brand-brown/10 flex items-center justify-between bg-brand-cream/30">
                            <div className="flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5 text-brand-brown" />
                                <h2 className="text-lg font-bold text-brand-brown">Your Cart</h2>
                                <span className="text-xs bg-brand-brown text-white px-2 py-0.5 rounded-full font-bold">
                                    {cart.reduce((a, b) => a + (b.quantity || 1), 0)}
                                </span>
                            </div>
                            <button 
                                onClick={() => setIsCartOpen(false)} 
                                className="p-2 hover:bg-white rounded-xl transition text-brand-brown/70 hover:text-brand-brown"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Cart Item List */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            {cart.length === 0 ? (
                                <div className="text-center py-24 space-y-3">
                                    <div className="w-16 h-16 bg-brand-brown/5 rounded-2xl flex items-center justify-center mx-auto text-brand-brown/40">
                                        <ShoppingBag size={28} />
                                    </div>
                                    <p className="font-bold text-base text-brand-brown">Your cart is empty</p>
                                    <p className="text-xs text-brand-brown/60 max-w-xs mx-auto">
                                        Explore upcycled home decor, kitchenware, and lifestyle items.
                                    </p>
                                    <button
                                        onClick={() => setIsCartOpen(false)}
                                        className="mt-2 px-5 py-2.5 bg-brand-brown text-white text-xs font-bold rounded-xl hover:bg-brand-black transition"
                                    >
                                        Explore Products
                                    </button>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.id} className="flex items-center gap-3.5 p-3 rounded-2xl border border-brand-brown/10 bg-white hover:border-brand-brown/25 transition-all shadow-xs">
                                        {/* Product Image - Fixed crisp square dimensions without zoom distortion */}
                                        <div className="w-20 h-20 min-w-[5rem] min-h-[5rem] max-w-[5rem] max-h-[5rem] bg-brand-cream/40 rounded-xl overflow-hidden flex-shrink-0 border border-brand-brown/10 relative">
                                            <img 
                                                src={item.image || (item.images && item.images[0]) || 'https://placehold.co/200x200?text=EcoProduct'} 
                                                alt={item.name} 
                                                className="w-full h-full object-cover object-center" 
                                            />
                                        </div>

                                        {/* Product Info */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-bold text-xs sm:text-sm text-brand-brown truncate" title={item.name}>
                                                        {item.name}
                                                    </h4>
                                                    <p className="text-[11px] text-brand-brown/50 truncate mt-0.5">
                                                        by {item.vendorName || "Verified Artisan"}
                                                    </p>
                                                </div>
                                                <button 
                                                    onClick={() => removeFromCart(item.id)} 
                                                    className="text-gray-400 hover:text-brand-red p-1 transition-colors rounded-lg hover:bg-red-50 flex-shrink-0"
                                                    title="Remove item"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between mt-2.5">
                                                <div>
                                                    <span className="font-black text-sm text-brand-brown">
                                                        ₹{Number(item.price) * (item.quantity || 1)}
                                                    </span>
                                                    {item.quantity > 1 && (
                                                        <span className="text-[10px] text-brand-brown/50 ml-1 font-medium">
                                                            (₹{item.price} ea)
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1.5 bg-gray-50 border border-brand-brown/15 rounded-lg px-2 py-1">
                                                    <button 
                                                        onClick={() => updateQuantity(item.id, -1)} 
                                                        className="text-brand-brown/70 hover:text-brand-red p-0.5 transition"
                                                        title="Decrease"
                                                    >
                                                        <Minus size={13} />
                                                    </button>
                                                    <span className="font-extrabold text-xs min-w-[18px] text-center text-brand-brown">
                                                        {item.quantity}
                                                    </span>
                                                    <button 
                                                        onClick={() => updateQuantity(item.id, 1)} 
                                                        className="text-brand-brown/70 hover:text-emerald-700 p-0.5 transition"
                                                        title="Increase"
                                                    >
                                                        <Plus size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Order Summary & Checkout */}
                        {cart.length > 0 && (
                            <div className="p-5 border-t border-brand-brown/10 bg-gray-50/70 space-y-4">
                                {/* Delivery Address in Cart */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-brand-brown/70 flex items-center gap-1">
                                        <MapPin size={12} className="text-brand-orange" />
                                        <span>Ship to</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={deliveryAddress}
                                        onChange={(e) => setDeliveryAddress(e.target.value)}
                                        placeholder="Add street address, pin code..."
                                        className="w-full px-3 py-2 border border-brand-brown/15 rounded-lg text-xs text-brand-brown bg-white focus:outline-none focus:ring-1 focus:ring-brand-orange"
                                    />
                                </div>

                                {/* EcoPoints Redemption Widget in Cart */}
                                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input 
                                                type="checkbox"
                                                checked={useEcoPointsInCart}
                                                onChange={(e) => setUseEcoPointsInCart(e.target.checked)}
                                                disabled={userEcoPoints < POINTS_PER_RUPEE}
                                                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300"
                                            />
                                            <div className="flex items-center gap-1.5">
                                                <Coins size={14} className="text-amber-600" />
                                                <span className="text-xs font-bold text-amber-950">
                                                    Redeem EcoPoints (25 pts = ₹1)
                                                </span>
                                            </div>
                                        </label>
                                        <span className="text-[11px] font-extrabold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
                                            {userEcoPoints} pts
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-amber-800/80 pl-6">
                                        {userEcoPoints >= POINTS_PER_RUPEE ? (
                                            <span>
                                                Save up to <strong className="font-bold text-emerald-700">₹{Math.floor(userEcoPoints / POINTS_PER_RUPEE)}</strong>. Exclusively usable on EcoShop checkouts.
                                            </span>
                                        ) : (
                                            <span>
                                                You need at least 25 EcoPoints to redeem a ₹1 discount.
                                            </span>
                                        )}
                                    </p>
                                </div>

                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between text-brand-brown/70">
                                        <span>Subtotal</span>
                                        <span>₹{cartBill.subtotal}</span>
                                    </div>
                                    {cartBill.pointsDiscount > 0 && (
                                        <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200/60">
                                            <span className="flex items-center gap-1">
                                                <Coins size={12} />
                                                EcoPoints Discount ({cartBill.pointsToRedeem} pts)
                                            </span>
                                            <span>-₹{cartBill.pointsDiscount}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-brand-brown/70">
                                        <span>GST (18%)</span>
                                        <span>₹{cartBill.gst}</span>
                                    </div>
                                    <div className="flex justify-between text-brand-brown/70">
                                        <span>Delivery Fee</span>
                                        <span>{cartBill.deliveryFee === 0 ? <strong className="text-emerald-700">FREE</strong> : `₹${cartBill.deliveryFee}`}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-300">
                                        <span className="font-extrabold text-sm text-brand-brown">Total Amount</span>
                                        <span className="font-black text-lg text-brand-brown">₹{cartBill.total}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={checkOut}
                                    disabled={isPurchasing}
                                    className="w-full py-3.5 bg-brand-brown text-white font-bold text-sm rounded-xl hover:bg-brand-black transition shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isPurchasing ? 'Placing Orders...' : `Proceed to Checkout • ₹${cartBill.total}`}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Orders History Modal */}
            {showOrders && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowOrders(false)}
                >
                    <div 
                        className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-brand-brown/10 animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-5 border-b border-brand-brown/10 flex items-center justify-between bg-brand-cream/30">
                            <div className="flex items-center gap-2">
                                <History className="w-5 h-5 text-brand-brown" />
                                <h2 className="text-lg font-bold text-brand-brown">Your EcoShop Orders</h2>
                            </div>
                            <button 
                                onClick={() => setShowOrders(false)} 
                                className="p-2 hover:bg-white rounded-xl transition text-brand-brown/60 hover:text-brand-brown"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-3">
                            {orders.length === 0 ? (
                                <div className="text-center py-16 text-brand-brown/60">
                                    <History size={36} className="mx-auto mb-2 text-brand-brown/30" />
                                    <p className="font-bold text-sm">No orders yet</p>
                                    <p className="text-xs text-brand-brown/50">Your purchases will be listed here with tracking and invoices.</p>
                                </div>
                            ) : (
                                orders.map(order => (
                                    <div 
                                        key={order.id}
                                        className="border border-brand-brown/10 rounded-xl p-4 flex gap-4 hover:border-brand-brown/25 transition bg-white"
                                    >
                                        <div className="w-16 h-16 bg-brand-cream/30 rounded-lg overflow-hidden flex-shrink-0 border border-brand-brown/10">
                                            <img 
                                                src={order.productImage || 'https://placehold.co/100'} 
                                                alt="Product" 
                                                className="w-full h-full object-cover" 
                                            />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-bold text-xs text-brand-brown line-clamp-1">{order.productName}</h4>
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                                                        order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                                                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-amber-100 text-amber-800'
                                                    }`}>
                                                        {order.status || 'Pending'}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-brand-brown/50 mt-0.5">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-brand-brown/5 mt-2">
                                                <span className="font-black text-xs text-brand-brown">₹{order.price}</span>
                                                
                                                <div className="flex gap-2 items-center">
                                                    <button
                                                        onClick={() => navigate(`/store-orders/${order.id}`)}
                                                        className="text-[11px] font-bold text-brand-brown hover:text-brand-orange flex items-center gap-1 transition"
                                                    >
                                                        <span>Track</span>
                                                        <ChevronRight size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedInvoiceOrder(order)}
                                                        className="text-[11px] font-bold bg-gray-100 px-2.5 py-1 rounded-md hover:bg-brand-brown hover:text-white transition"
                                                    >
                                                        Invoice
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteOrder(e, order.id)}
                                                        className="text-gray-400 hover:text-red-500 transition p-1"
                                                        title="Delete order record"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Tax Invoice Modal */}
            {selectedInvoiceOrder && (
                <InvoiceModal
                    order={selectedInvoiceOrder}
                    onClose={() => setSelectedInvoiceOrder(null)}
                />
            )}
        </>
    );
}
