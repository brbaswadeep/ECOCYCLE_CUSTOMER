import React, { useState } from 'react';
import { ShoppingBag, Search, Filter, Star, Plus, Check, X, Tag } from 'lucide-react';
import ecoshopLogo from '../assets/Ecoshop.png';

const PRODUCTS = [
    {
        id: 1,
        name: "Eco-Friendly Composter",
        price: 49.99,
        category: "Gardening",
        rating: 4.8,
        image: "https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?q=80&w=600&auto=format&fit=crop",
        description: "Turn your kitchen scraps into nutrient-rich soil with this odorless, compact composter.",
        features: ["Odorless design", "Compact size", "Easy to clean"]
    },
    {
        id: 2,
        name: "Bamboo Cutlery Set",
        price: 12.50,
        category: "Kitchen",
        rating: 4.5,
        image: "https://images.unsplash.com/photo-1622379361307-2a6230b06b9b?q=80&w=600&auto=format&fit=crop",
        description: "Reusable bamboo cutlery set with a travel pouch. Perfect for zero-waste living.",
        features: ["100% Biodegradable", "Lightweight", "Durable"]
    },
    {
        id: 3,
        name: "Recycled Plastic Planter",
        price: 18.00,
        category: "Gardening",
        rating: 4.2,
        image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?q=80&w=600&auto=format&fit=crop",
        description: "Stylish planter made from 100% recycled plastic bottles. Weather-resistant.",
        features: ["Weather-resistant", "Modern design", "Various colors"]
    },
    {
        id: 4,
        name: "Organic Cotton Tote",
        price: 8.99,
        category: "Accessories",
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1597484662317-9bd7bdda2907?q=80&w=600&auto=format&fit=crop",
        description: "Heavy-duty organic cotton tote bag for all your shopping needs.",
        features: ["Hold up to 15kg", "Washable", "Long handles"]
    },
    {
        id: 5,
        name: "Solar Garden Light",
        price: 24.99,
        category: "Outdoor",
        rating: 4.6,
        image: "https://images.unsplash.com/photo-1597843797686-e26090e80766?q=80&w=600&auto=format&fit=crop",
        description: "Brighten up your garden with these energy-efficient solar lights.",
        features: ["Waterproof", "Auto on/off", "Warm white LED"]
    },
    {
        id: 6,
        name: "Reusauble Water Bottle",
        price: 29.99,
        category: "Accessories",
        rating: 4.7,
        image: "https://images.unsplash.com/photo-1602143407151-011141920e4b?q=80&w=600&auto=format&fit=crop",
        description: "Stainless steel water bottle keeps drinks cold for 24 hours.",
        features: ["Vacuum insulated", "Leak-proof", "BPA-free"]
    }
];

const CATEGORIES = ["All", "Gardening", "Kitchen", "Accessories", "Outdoor"];

export default function Shop() {
    const [activeCategory, setActiveCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [isPurchasing, setIsPurchasing] = useState(false);

    const filteredProducts = PRODUCTS.filter(product => {
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
        <div className="max-w-7xl mx-auto space-y-8">
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
                    <p className="text-brand-brown/70 font-medium ml-1">Sustainable products for a greener lifestyle</p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-brand-brown/40" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search for eco products..."
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
            {filteredProducts.length > 0 ? (
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
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-brand-brown shadow-sm">
                                    {product.category}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-brand-black text-lg leading-tight group-hover:text-brand-red transition-colors">
                                        {product.name}
                                    </h3>
                                </div>

                                <div className="flex items-center gap-1 mb-3">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            size={14}
                                            className={`${i < Math.floor(product.rating) ? 'text-brand-orange fill-brand-orange' : 'text-gray-300'}`}
                                        />
                                    ))}
                                    <span className="text-xs text-brand-brown/50 ml-1">({product.rating})</span>
                                </div>

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
                    <p className="text-brand-brown/60">Try adjusting your filters or search query</p>
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
                                src={selectedProduct.image}
                                alt={selectedProduct.name}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Modal Content */}
                        <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col overflow-y-auto">
                            <div className="inline-block px-3 py-1 bg-brand-orange/10 text-brand-orange rounded-full text-xs font-bold mb-4 w-fit">
                                {selectedProduct.category}
                            </div>

                            <h2 className="text-3xl font-extrabold text-brand-black mb-2">{selectedProduct.name}</h2>
                            <div className="flex items-center gap-2 mb-6">
                                <span className="text-2xl font-bold text-brand-red">₹{selectedProduct.price}</span>
                                <div className="w-px h-6 bg-gray-200 mx-2"></div>
                                <div className="flex items-center gap-1">
                                    <Star size={18} className="text-brand-orange fill-brand-orange" />
                                    <span className="font-bold text-brand-brown">{selectedProduct.rating}</span>
                                </div>
                            </div>

                            <p className="text-brand-brown/80 leading-relaxed mb-6">
                                {selectedProduct.description}
                            </p>

                            <div className="mb-8">
                                <h4 className="font-bold text-brand-black mb-3 flex items-center gap-2">
                                    <Tag size={16} /> Key Features
                                </h4>
                                <ul className="space-y-2">
                                    {selectedProduct.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-brand-brown/70">
                                            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                                                <Check size={12} />
                                            </div>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="mt-auto pt-4 border-t border-gray-100">
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
