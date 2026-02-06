import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, Filter, Star, Plus, Check, X, Tag, Package, Recycle } from 'lucide-react';
import ecoshopLogo from '../assets/Ecoshop.png';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

const CATEGORIES = ["All", "General", "Gardening", "Kitchen", "Accessories", "Outdoor", "Decor", "Furniture"];

export default function Shop() {
    const [activeCategory, setActiveCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [isPurchasing, setIsPurchasing] = useState(false);

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            const fetchedProducts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setProducts(fetchedProducts);
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

    const handleBuy = () => {
        setIsPurchasing(true);
        // Simulate API call
        setTimeout(() => {
            setIsPurchasing(false);
            setShowBuyModal(false);
            setSelectedProduct(null);
            alert("Thank you for your purchase! Your order has been placed.");
        }, 1500);
    };

    return (
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
                                    src={product.image || 'https://via.placeholder.com/300?text=No+Image'}
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
                                src={selectedProduct.image || 'https://via.placeholder.com/300?text=No+Image'}
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
                                    onClick={() => setShowBuyModal(true)}
                                >
                                    <ShoppingBag size={20} />
                                    Buy Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Purchase Confirmation Modal */}
            {showBuyModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl transform transition-all scale-100">
                        <div className="w-16 h-16 bg-brand-cream rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShoppingBag className="w-8 h-8 text-brand-brown" />
                        </div>
                        <h3 className="text-xl font-bold text-brand-black mb-2">Confirm Purchase</h3>
                        <p className="text-gray-500 mb-6">
                            Are you sure you want to buy <span className="font-bold text-brand-brown">{selectedProduct?.name}</span> for ₹{selectedProduct?.price}?
                        </p>

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
        </div>
    );
}
