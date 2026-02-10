import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, Filter, Star, Plus, Check, X, Tag, Package, Recycle, Minus, Trash2, History } from 'lucide-react';
import ecoshopLogo from '../assets/Ecoshop.png';
import InvoiceModal from '../components/InvoiceModal';
import { db } from '../firebase';
import { collection, query, getDocs, addDoc, serverTimestamp, where, doc, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = ["All", "General", "Gardening", "Kitchen", "Accessories", "Outdoor", "Decor", "Furniture"];

export default function Shop() {
    const [activeCategory, setActiveCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [isPurchasing, setIsPurchasing] = useState(false);

    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Cart State
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Orders State
    const [orders, setOrders] = useState([]);
    const [showOrders, setShowOrders] = useState(false);

    // Invoice State
    const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);

    // Load Cart from LocalStorage
    useEffect(() => {
        const savedCart = localStorage.getItem('ecocycle_cart');
        if (savedCart) {
            setCart(JSON.parse(savedCart));
        }
    }, []);

    // Save Cart to LocalStorage
    useEffect(() => {
        localStorage.setItem('ecocycle_cart', JSON.stringify(cart));
    }, [cart]);

    // Fetch Orders
    const fetchOrders = async () => {
        if (!currentUser) return;
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
            alert("Failed to load orders.");
        }
    };

    // Cart Functions
    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId, change) => {
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const newQuantity = Math.max(1, item.quantity + change);
                return { ...item, quantity: newQuantity };
            }
            return item;
        }));
    };

    const calculateBill = (items) => {
        const subtotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        const gst = subtotal * 0.18;
        const deliveryFee = subtotal > 0 ? (40 + Math.floor(Math.random() * 50)) : 0;
        const total = subtotal + gst + deliveryFee;
        return { subtotal, gst, deliveryFee, total };
    };

    const cartBill = calculateBill(cart);

    // Delete Order
    const handleDeleteOrder = async (e, orderId) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this order from history?")) return;
        try {
            await deleteDoc(doc(db, "orders", orderId));
            setOrders(prev => prev.filter(o => o.id !== orderId));
        } catch (error) {
            console.error("Error deleting order:", error);
            alert("Failed to delete order");
        }
    };

    const checkOut = async () => {
        if (!currentUser) {
            alert("Please login to checkout.");
            return;
        }
        setIsPurchasing(true);
        try {
            for (const item of cart) {
                // Check stock (optimistic)
                if (item.quantity > (item.availableQty || 999)) {
                    alert(`Not enough stock for ${item.name}`);
                    continue;
                }

                const itemBill = calculateBill([item]);

                // Finance Calculations
                const productValue = item.price * item.quantity;
                const platformFee = productValue * 0.015;
                const vendorEarnings = itemBill.total - platformFee;

                await addDoc(collection(db, "orders"), {
                    customerId: currentUser.uid,
                    customerName: currentUser.displayName || "Customer",
                    customerEmail: currentUser.email,
                    vendorId: item.vendorId,
                    vendorName: item.vendorName,
                    productId: item.id,
                    productName: item.name,
                    productImage: item.image,
                    price: itemBill.total,
                    priceBreakdown: {
                        subtotal: productValue,
                        gst: Math.round(itemBill.gst),
                        deliveryFee: itemBill.deliveryFee,
                        total: itemBill.total,
                        platformFee: platformFee,
                        vendorEarnings: vendorEarnings
                    },
                    quantity: item.quantity,
                    status: 'pending',
                    createdAt: serverTimestamp()
                });

                // Decrement Inventory
                const productRef = doc(db, "products", item.id);
                await updateDoc(productRef, {
                    quantity: increment(-item.quantity)
                });
            }
            setCart([]);
            setIsPurchasing(false);
            setIsCartOpen(false);
            alert("Order placed successfully!");
            fetchProducts();
        } catch (error) {
            console.error("Checkout error:", error);
            alert("Checkout failed.");
            setIsPurchasing(false);
        }
    };

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const q = query(collection(db, "products"));
            const snapshot = await getDocs(q);
            const fetchedProducts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).sort((a, b) => {
                const timeA = a.createdAt?.seconds || (a.createdAt?.toMillis ? a.createdAt.toMillis() / 1000 : 0);
                const timeB = b.createdAt?.seconds || (b.createdAt?.toMillis ? b.createdAt.toMillis() / 1000 : 0);
                return timeB - timeA;
            });

            const availableProducts = fetchedProducts.filter(p => p.quantity && p.quantity > 0);

            setProducts(availableProducts);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching products:", error);
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(product => {
        const matchesCategory = activeCategory === "All" || product.category === activeCategory;
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleBuy = async () => {
        if (!currentUser) {
            alert("Please login to purchase items.");
            return;
        }

        setIsPurchasing(true);
        try {
            const qty = 1;
            const bill = calculateBill([{ ...selectedProduct, quantity: qty }]);

            const productValue = selectedProduct.price * qty;
            const platformFee = productValue * 0.015;
            const vendorEarnings = bill.total - platformFee;

            await addDoc(collection(db, "orders"), {
                customerId: currentUser.uid,
                customerName: currentUser.displayName || "Customer",
                customerEmail: currentUser.email,
                vendorId: selectedProduct.vendorId,
                vendorName: selectedProduct.vendorName,
                productId: selectedProduct.id,
                productName: selectedProduct.name,
                productImage: selectedProduct.image,
                price: bill.total,
                priceBreakdown: {
                    subtotal: productValue,
                    gst: Math.round(bill.gst),
                    deliveryFee: bill.deliveryFee,
                    total: bill.total,
                    platformFee: platformFee,
                    vendorEarnings: vendorEarnings
                },
                quantity: qty,
                status: 'pending',
                createdAt: serverTimestamp()
            });

            const productRef = doc(db, "products", selectedProduct.id);
            await updateDoc(productRef, {
                quantity: increment(-qty)
            });

            setIsPurchasing(false);
            setShowBuyModal(false);
            setSelectedProduct(null);
            alert("Thank you for your purchase!");
            fetchProducts();
        } catch (error) {
            console.error("Error creating order:", error);
            alert("Failed to place order. Please try again.");
            setIsPurchasing(false);
        }
    };

    return (
        <>
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <img
                                src={ecoshopLogo}
                                alt="Eco Shop"
                                className="h-16 w-auto object-contain drop-shadow-md hover:scale-105 transition-transform"
                            />
                        </div>
                        <p className="text-brand-brown/70 font-medium ml-1">Sustainable products from our verified vendors</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => fetchOrders()}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-brand-brown rounded-xl font-bold hover:bg-brand-cream transition shadow-sm border border-brand-brown/10"
                        >
                            <History size={18} />
                            <span className="hidden sm:inline">Orders</span>
                        </button>

                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-brown text-white rounded-xl font-bold hover:bg-brand-black transition shadow-lg relative"
                        >
                            <ShoppingBag size={18} />
                            <span className="hidden sm:inline">Cart</span>
                            {cart.length > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                                    {cart.reduce((a, b) => a + b.quantity, 0)}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full md:w-96">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-brand-brown/40" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search for recycled products..."
                            className="block w-full pl-10 pr-4 py-3 border-none rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-brand-orange/50 focus:outline-none placeholder-brand-brown/30 text-brand-brown"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Categories */}
                <div className="flex overflow-x-auto pb-2 gap-3 no-scrollbar">
                    {CATEGORIES.map(category => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeCategory === category
                                ? 'bg-brand-brown text-white shadow-md transform scale-105'
                                : 'bg-white text-brand-brown/70 hover:bg-brand-brown/10'
                                }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                {/* Product Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-gray-200 rounded-2xl"></div>)}
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.map(product => (
                            <div
                                key={product.id}
                                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-brand-brown/5 flex flex-col cursor-pointer"
                                onClick={() => setSelectedProduct(product)}
                            >
                                {/* Image */}
                                <div className="relative h-48 overflow-hidden bg-brand-cream/50">
                                    <img
                                        src={product.image || 'https://placehold.co/300?text=No+Image'}
                                        alt={product.name}
                                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute top-3 right-3 flex gap-2">
                                        <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-brand-brown shadow-sm">
                                            {product.category}
                                        </div>
                                        {product.type === 'recycled' && (
                                            <div className="bg-green-500/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-white shadow-sm flex items-center gap-1">
                                                <Recycle size={10} /> Recycled
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="mb-2">
                                        <h3 className="font-bold text-brand-black text-lg leading-tight group-hover:text-brand-red transition-colors line-clamp-2">
                                            {product.name}
                                        </h3>
                                        {product.vendorName && (
                                            <div className="text-xs text-brand-brown/50 font-medium mt-1">by {product.vendorName}</div>
                                        )}
                                    </div>

                                    {product.type === 'recycled' && product.sourceInventoryName && (
                                        <div className="flex items-start gap-1 mb-3 text-[10px] text-green-700 font-medium bg-green-50 p-1.5 rounded-lg border border-green-100">
                                            <Package size={12} className="mt-0.5 flex-shrink-0" />
                                            <span>Made from recycled: {product.sourceInventoryName}</span>
                                        </div>
                                    )}

                                    <div className="mt-auto flex items-center justify-between">
                                        <span className="text-xl font-extrabold text-brand-brown">
                                            ₹{product.price}
                                        </span>
                                        <button
                                            className="p-2 bg-brand-cream text-brand-brown rounded-lg hover:bg-brand-red hover:text-white transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedProduct(product);
                                            }}
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white/50 rounded-3xl border border-dashed border-brand-brown/20">
                        <Filter className="w-12 h-12 text-brand-brown/20 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-brand-brown">No products found</h3>
                        <p className="text-brand-brown/60">Be the first to browse our new collection soon!</p>
                    </div>
                )}
            </div>

            {/* Product Detail Modal */}
            {selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}>
                    <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row relative" onClick={e => e.stopPropagation()}>
                        <button
                            className="absolute top-4 right-4 p-2 bg-white/80 rounded-full hover:bg-brand-red hover:text-white transition-colors z-10"
                            onClick={() => setSelectedProduct(null)}
                        >
                            <X size={20} />
                        </button>

                        {/* Modal Image */}
                        <div className="w-full md:w-1/2 h-64 md:h-auto bg-brand-cream relative">
                            <img
                                src={selectedProduct.image || 'https://placehold.co/300?text=No+Image'}
                                alt={selectedProduct.name}
                                className="w-full h-full object-cover"
                            />
                            {selectedProduct.type === 'recycled' && (
                                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-xl border-l-4 border-green-500 shadow-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Recycle className="text-green-600 w-5 h-5" />
                                        <h4 className="font-bold text-green-800">100% Recycled Product</h4>
                                    </div>
                                    <p className="text-xs text-green-700">
                                        This item was crafted from reclaimed materials ({selectedProduct.sourceInventoryName || 'Recycled Inventory'}), giving waste a second life.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Modal Content */}
                        <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col overflow-y-auto">
                            <div className="flex gap-2 mb-4">
                                <div className="inline-block px-3 py-1 bg-brand-orange/10 text-brand-orange rounded-full text-xs font-bold">
                                    {selectedProduct.category}
                                </div>
                            </div>

                            <h2 className="text-3xl font-extrabold text-brand-black mb-1">{selectedProduct.name}</h2>
                            <p className="text-sm font-bold text-brand-brown/40 mb-4">by {selectedProduct.vendorName || "Verified Vendor"}</p>

                            <div className="flex items-center gap-2 mb-6">
                                <span className="text-3xl font-bold text-brand-red">₹{selectedProduct.price}</span>
                            </div>

                            <p className="text-brand-brown/80 leading-relaxed mb-6 whitespace-pre-line">
                                {selectedProduct.description}
                            </p>

                            <div className="mt-auto pt-4 border-t border-gray-100 space-y-3">
                                <div className="flex items-center gap-2 text-xs text-brand-brown/60 justify-center">
                                    <Check className="w-4 h-4 text-green-500" />
                                    <span>Verified Sustainable</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                    <Check className="w-4 h-4 text-green-500" />
                                    <span>Eco-Friendly Shipping</span>
                                </div>
                                <button
                                    className="w-full py-4 bg-brand-black text-white rounded-xl font-bold text-lg hover:bg-brand-red transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-3"
                                    onClick={() => {
                                        addToCart(selectedProduct);
                                        setSelectedProduct(null);
                                    }}
                                >
                                    <ShoppingBag size={20} />
                                    Add to Cart - ₹{selectedProduct.price}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Purchase Confirmation Modal */}
            {showBuyModal && selectedProduct && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl transform transition-all scale-100">
                        <div className="w-16 h-16 bg-brand-cream rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShoppingBag className="w-8 h-8 text-brand-brown" />
                        </div>
                        <h3 className="text-xl font-bold text-brand-black mb-2 text-center">Confirm Purchase</h3>
                        <p className="text-gray-500 mb-6 text-center">
                            Are you sure you want to buy <span className="font-bold text-brand-brown">{selectedProduct.name}</span>?
                        </p>

                        {/* Bill Breakdown for Single Item */}
                        {(() => {
                            const bill = calculateBill([{ ...selectedProduct, quantity: 1 }]);
                            return (
                                <div className="bg-gray-50 p-4 rounded-xl mb-6 space-y-2 text-sm">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Subtotal</span>
                                        <span>₹{bill.subtotal}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>GST (18%)</span>
                                        <span>₹{Math.round(bill.gst)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Delivery Fee</span>
                                        <span>₹{bill.deliveryFee}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-brand-brown border-t pt-2 mt-2">
                                        <span>Total</span>
                                        <span>₹{bill.total}</span>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="flex gap-3">
                            <button
                                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                onClick={() => setShowBuyModal(false)}
                                disabled={isPurchasing}
                            >
                                Cancel
                            </button>
                            <button
                                className="flex-1 py-3 bg-brand-red text-white font-bold rounded-xl hover:bg-brand-orange transition-colors shadow-md flex items-center justify-center gap-2"
                                onClick={handleBuy}
                                disabled={isPurchasing}
                            >
                                {isPurchasing ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cart Drawer */}
            {
                isCartOpen && (
                    <div className="fixed inset-0 z-[60] flex justify-end">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
                        <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                            <div className="p-6 border-b flex items-center justify-between bg-brand-cream/30">
                                <h2 className="text-2xl font-bold text-brand-brown flex items-center gap-2">
                                    <ShoppingBag className="w-6 h-6" /> Your Cart
                                </h2>
                                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {cart.length === 0 ? (
                                    <div className="text-center py-20 opacity-50">
                                        <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                        <p className="font-bold text-lg">Your cart is empty</p>
                                        <p className="text-sm">Start adding eco-friendly products!</p>
                                    </div>
                                ) : (
                                    cart.map(item => (
                                        <div key={item.id} className="flex gap-4 items-start">
                                            <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 border border-gray-200">
                                                <img src={item.image || 'https://placehold.co/100'} alt={item.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-brand-brown line-clamp-1">{item.name}</h4>
                                                <p className="text-brand-green font-bold text-sm">₹{item.price * item.quantity}</p>

                                                <div className="flex items-center gap-3 mt-2">
                                                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-2 py-1 border">
                                                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-red-500"><Minus size={14} /></button>
                                                        <span className="font-bold text-sm min-w-[20px] text-center">{item.quantity}</span>
                                                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-green-500"><Plus size={14} /></button>
                                                    </div>
                                                    <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 transition">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {cart.length > 0 && (
                                <div className="p-6 border-t bg-gray-50">
                                    <div className="space-y-2 mb-4 text-sm">
                                        <div className="flex justify-between text-gray-500">
                                            <span>Subtotal</span>
                                            <span>₹{cartBill.subtotal}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-500">
                                            <span>GST (18%)</span>
                                            <span>₹{Math.round(cartBill.gst)}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-500">
                                            <span>Delivery Fee</span>
                                            <span>₹{cartBill.deliveryFee}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center mb-6 pt-4 border-t border-dashed border-gray-200">
                                        <span className="text-lg font-bold text-brand-brown">Total Amount</span>
                                        <span className="text-2xl font-extrabold text-brand-green">₹{cartBill.total}</span>
                                    </div>
                                    <button
                                        onClick={checkOut}
                                        disabled={isPurchasing}
                                        className="w-full py-4 bg-brand-brown text-white font-bold rounded-xl hover:bg-brand-black transition shadow-lg active:scale-95 disabled:opacity-50"
                                    >
                                        {isPurchasing ? 'Processing...' : 'Checkout Now'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Orders Modal */}
            {
                showOrders && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowOrders(false)}>
                        <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="p-6 border-b flex items-center justify-between bg-brand-cream/30">
                                <h2 className="text-xl font-bold text-brand-brown flex items-center gap-2">
                                    <History className="w-5 h-5" /> Your Orders
                                </h2>
                                <button onClick={() => setShowOrders(false)} className="p-2 hover:bg-gray-100 rounded-full transition">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {orders.length === 0 ? (
                                    <div className="text-center py-10 opacity-50">
                                        <p>No past orders found.</p>
                                    </div>
                                ) : (
                                    orders.map(order => (
                                        <div key={order.id}
                                            className="border border-brand-brown/10 rounded-xl p-4 flex gap-4 hover:bg-gray-50 transition cursor-pointer"
                                            onClick={() => navigate(`/store-orders/${order.id}`)}
                                        >
                                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                                <img src={order.productImage || 'https://placehold.co/100'} alt="Product" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="font-bold text-brand-brown line-clamp-1">{order.productName}</h4>
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {order.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mb-2">Order ID: #{order.id.slice(0, 8)}</p>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-bold text-brand-green">₹{order.price}</span>
                                                    <div className="flex gap-2 items-center">
                                                        <span className="text-gray-400 text-xs">{new Date(order.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedInvoiceOrder(order);
                                                            }}
                                                            className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded hover:bg-brand-brown hover:text-white transition"
                                                        >
                                                            Invoice
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDeleteOrder(e, order.id)}
                                                            className="text-gray-400 hover:text-red-500 transition"
                                                            title="Delete History"
                                                        >
                                                            <Trash2 size={14} />
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

            {/* Invoice Modal */}
            {selectedInvoiceOrder && (
                <InvoiceModal
                    order={selectedInvoiceOrder}
                    onClose={() => setSelectedInvoiceOrder(null)}
                />
            )}
        </>
    );
}
