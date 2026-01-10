import { Link } from 'react-router-dom';
import { Camera, Recycle, MapPin, BarChart3, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="overflow-hidden bg-brand-cream">
            {/* Hero Section */}
            <section className="relative pt-20 pb-32 lg:pt-32 bg-gradient-to-br from-brand-cream to-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">

                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/20 text-brand-orange text-sm font-medium mb-8 animate-fade-in-down border border-brand-orange/20">
                        <Sparkles className="w-4 h-4" />
                        <span>AI-Powered Waste Management</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-brand-black mb-6 drop-shadow-sm">
                        Recycle Smarter, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-red to-brand-orange">
                            Live Greener.
                        </span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-xl text-brand-brown mb-10 leading-relaxed font-medium">
                        Snap a photo, and let our AI identify your waste, guide you on how to recycle it, and connect you with local vendors.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link
                            to="/auth"
                            className="px-8 py-4 bg-brand-red text-white rounded-full font-bold text-lg hover:bg-brand-brown transition-all shadow-xl hover:shadow-brand-red/30 flex items-center gap-2"
                        >
                            Start Recycling Now <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>

                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-brand-orange/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 translate-y-24 -translate-x-24 w-[500px] h-[500px] bg-brand-red/10 rounded-full blur-3xl" />
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-white relative z-10 border-t border-brand-brown/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h2 className="text-3xl font-bold text-brand-black mb-4">Everything you need to close the loop</h2>
                        <p className="text-brand-brown text-lg">EcoCycle provides a complete ecosystem for sustainable waste management.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

                        <FeatureCard
                            icon={<Camera className="w-8 h-8 text-white" />}
                            color="bg-brand-red"
                            title="AI Identification"
                            description="Instantly identify waste types (plastic, metal, organic) just by taking a photo."
                        />

                        <FeatureCard
                            icon={<Recycle className="w-8 h-8 text-white" />}
                            color="bg-brand-orange"
                            title="Smart Instructions"
                            description="Get step-by-step guides on how to clean, sort, and prepare items for recycling."
                        />

                        <FeatureCard
                            icon={<MapPin className="w-8 h-8 text-white" />}
                            color="bg-brand-brown"
                            title="Local Vendors"
                            description="Connect with nearby recycling centers and businesses that accept your materials."
                        />

                        <FeatureCard
                            icon={<BarChart3 className="w-8 h-8 text-white" />}
                            color="bg-brand-black"
                            title="Impact Tracking"
                            description="Monitor your contribution to the environment with detailed stats and metrics."
                        />

                    </div>
                </div>
            </section>

            {/* Bento Grid / Showcase */}
            <section className="py-24 bg-brand-cream border-t border-brand-brown/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                        <div className="space-y-8">
                            <h2 className="text-4xl font-bold text-brand-black">Transform Waste into Worth</h2>
                            <p className="text-lg text-brand-brown font-medium">
                                Don't just throw it away. Our AI suggests creative DIY projects and transformation ideas for your waste materials, supporting a true circular economy.
                            </p>

                            <ul className="space-y-4">
                                {['Creative DIY Ideas', 'Upcycling Inspiration', 'Reduce Landfill Waste'].map((item) => (
                                    <li key={item} className="flex items-center gap-3">
                                        <CheckCircle2 className="w-6 h-6 text-brand-red" />
                                        <span className="text-brand-black font-medium">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-brand-red to-brand-orange rounded-3xl rotate-3 opacity-20 transform scale-105" />
                            <div className="relative bg-white border border-brand-brown/10 rounded-3xl p-8 shadow-2xl space-y-6">
                                <div className="flex items-center gap-4 border-b border-brand-brown/10 pb-4">
                                    <div className="w-12 h-12 bg-brand-cream rounded-full flex items-center justify-center">
                                        <Camera className="w-6 h-6 text-brand-brown" />
                                    </div>
                                    <div>
                                        <div className="h-4 w-32 bg-brand-cream rounded mb-2"></div>
                                        <div className="h-3 w-20 bg-brand-cream/50 rounded"></div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="h-32 bg-brand-cream rounded-xl flex items-center justify-center border-2 border-brand-brown/10 border-dashed text-brand-brown">
                                        Waste Image Analysis
                                    </div>
                                    <div className="flex justify-between items-center bg-brand-cream/50 p-4 rounded-xl">
                                        <span className="font-semibold text-brand-black">Plastic Bottle</span>
                                        <span className="px-3 py-1 bg-brand-red/10 text-brand-red text-xs font-bold rounded-full">RECYCLABLE</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

        </div>
    );
}

function FeatureCard({ icon, color, title, description }) {
    return (
        <div className="group bg-white rounded-2xl p-8 border border-brand-brown/10 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center mb-6 shadow-lg rotate-3 group-hover:rotate-6 transition-transform`}>
                {icon}
            </div>
            <h3 className="text-xl font-bold text-brand-black mb-3">{title}</h3>
            <p className="text-brand-brown font-medium leading-relaxed">{description}</p>
        </div>
    );
}
