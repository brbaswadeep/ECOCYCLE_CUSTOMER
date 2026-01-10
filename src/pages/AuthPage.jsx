import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Loader2, Eye, EyeOff, User, Phone, Lock } from 'lucide-react';
import logo from '../assets/logo.png';

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // UI State
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);

    const { login, signup, googleSignIn, resetPassword } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (!isLogin && password !== confirmPassword) {
            return setError('Passwords do not match');
        }

        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password, rememberMe);
            } else {
                await signup(email, password, name, phone);
            }
            navigate('/dashboard');
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        }

        setLoading(false);
    }

    async function handleGoogleSignIn() {
        try {
            setError('');
            setLoading(true);
            await googleSignIn();
            navigate('/dashboard');
        } catch (err) {
            console.error("Google Sign In Error:", err);
            setError(err.message.replace('Firebase: ', '') || 'Failed to sign in with Google');
        }
        setLoading(false);
    }

    async function handleResetPassword(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await resetPassword(email);
            alert('Check your email for password reset instructions');
            setIsForgotPassword(false);
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        }
        setLoading(false);
    }

    return (
        <div className="min-h-screen flex font-sans bg-white overflow-y-auto">
            {/* LEFT PANEL: FORM */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-16 xl:px-24 py-12 bg-white relative">

                {/* Logo Area */}
                <Link to="/" className="absolute top-6 left-6 hover:scale-105 transition-transform duration-300 drop-shadow-md">
                    <img src={logo} alt="EcoCycle Logo" className="h-24 w-auto object-contain" />
                </Link>

                <div className="mt-12 lg:mt-0 w-full max-w-lg mx-auto">
                    <h1 className="text-3xl font-extrabold text-brand-black mb-2">
                        {isForgotPassword ? 'Reset Password' : (isLogin ? 'Welcome back !' : 'Create Account')}
                    </h1>
                    <p className="text-brand-brown/70 mb-6">
                        {isForgotPassword ? '' : (isLogin ? 'Enter to get unlimited access to data & information.' : 'Join Ecocycle today.')}
                    </p>

                    {error && (
                        <div className="mb-4 bg-red-50 border-l-4 border-brand-red p-3 text-sm text-brand-red font-medium rounded-r animate-pulse">
                            {error}
                        </div>
                    )}

                    {isForgotPassword ? (
                        <div className="space-y-4">
                            <p className="text-brand-brown/70 mb-6">
                                Enter your email address and we'll send you a link to reset your password.
                            </p>
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-brand-black mb-1.5 uppercase tracking-wide">Email Address <span className="text-brand-red">*</span></label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red text-brand-black placeholder-gray-400 transition-colors"
                                            placeholder="name@example.com"
                                        />
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 bg-brand-red text-white font-bold rounded-xl hover:bg-brand-brown transition-all shadow-lg shadow-brand-red/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Reset Password'}
                                </button>
                            </form>
                            <button
                                onClick={() => setIsForgotPassword(false)}
                                className="w-full text-center text-sm font-bold text-brand-black hover:text-brand-red transition-colors"
                            >
                                Back to Login
                            </button>
                        </div>
                    ) : (
                        <>
                            <form onSubmit={handleSubmit} className="space-y-4">

                                {!isLogin && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-brand-black mb-1.5 uppercase tracking-wide">Full Name <span className="text-brand-red">*</span></label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    required
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red text-brand-black placeholder-gray-400 transition-colors"
                                                    placeholder="John Doe"
                                                />
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-brand-black mb-1.5 uppercase tracking-wide">Mobile Number <span className="text-brand-red">*</span></label>
                                            <div className="relative">
                                                <input
                                                    type="tel"
                                                    required
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red text-brand-black placeholder-gray-400 transition-colors"
                                                    placeholder="+1 (555) 000-0000"
                                                />
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-brand-black mb-1.5 uppercase tracking-wide">Email Address <span className="text-brand-red">*</span></label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red text-brand-black placeholder-gray-400 transition-colors"
                                            placeholder="name@example.com"
                                        />
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-brand-black mb-1.5 uppercase tracking-wide">Password <span className="text-brand-red">*</span></label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red text-brand-black placeholder-gray-400 transition-colors"
                                                placeholder="Min. 8 characters"
                                            />
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-brown transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {!isLogin && (
                                        <div>
                                            <label className="block text-xs font-bold text-brand-black mb-1.5 uppercase tracking-wide">Confirm Password <span className="text-brand-red">*</span></label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    required
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red text-brand-black placeholder-gray-400 transition-colors"
                                                    placeholder="Repeat Password"
                                                />
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-brown transition-colors"
                                                >
                                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="w-4 h-4 text-brand-red rounded border-gray-300 focus:ring-brand-red"
                                        />
                                        <span className="ml-2 text-sm font-bold text-brand-black">Remember me</span>
                                    </label>
                                    <button type="button" onClick={() => setIsForgotPassword(true)} className="text-sm font-bold text-brand-red hover:underline">Forgot your password ?</button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 bg-brand-red text-white font-bold rounded-xl hover:bg-brand-brown transition-all shadow-lg shadow-brand-red/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (isLogin ? 'Log In' : 'Sign Up')}
                                </button>
                            </form>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white text-gray-500">Or, Login with</span>
                                </div>
                            </div>

                            <button
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                className="w-full py-3.5 bg-white border border-gray-200 hover:bg-gray-50 font-bold text-brand-black rounded-xl transition-all flex items-center justify-center gap-3"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Sign up with google
                            </button>

                            <p className="mt-8 text-center text-sm font-bold text-brand-black">
                                {isLogin ? "Don't have an account ? " : "Already have an account ? "}
                                <button
                                    onClick={() => setIsLogin(!isLogin)}
                                    className="text-brand-red hover:underline ml-1"
                                >
                                    {isLogin ? 'Register here' : 'Log In'}
                                </button>
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* RIGHT PANEL: GEOMETRIC ART (Themed with Brand Colors) */}
            <div className="hidden lg:block w-1/2 bg-brand-cream relative overflow-hidden fixed h-screen">
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 h-full w-full">

                    {/* Top Left: Leaf/Petal Shape */}
                    <div className="bg-brand-red/90 relative overflow-hidden flex items-center justify-center">
                        <div className="w-full h-full bg-brand-red flex">
                            <div className="w-1/2 h-full bg-brand-orange/80 rounded-br-full rounded-tr-full"></div>
                            <div className="w-1/2 h-full bg-brand-orange/80 rounded-bl-full rounded-tl-full"></div>
                        </div>
                    </div>

                    {/* Top Right: Darker geometric pattern */}
                    <div className="bg-brand-black relative p-8 flex flex-col justify-center items-center">
                        <div className="bg-brand-cream w-16 h-1 bg-transparent mb-2 border-b-4 border-brand-cream border-dashed"></div>
                        <div className="w-24 h-24 border-4 border-brand-orange rotate-45 flex items-center justify-center">
                            <div className="w-12 h-12 bg-brand-red rotate-45"></div>
                        </div>
                        <div className="mt-8 w-full h-12 bg-transparent border-t-2 border-brand-cream/20 flex gap-1 items-end">
                            {[...Array(20)].map((_, i) => (
                                <div key={i} className="w-1 bg-brand-cream h-4"></div>
                            ))}
                        </div>
                    </div>

                    {/* Middle Left: Triangles and Stars */}
                    <div className="bg-brand-brown/90 relative flex flex-col items-center justify-center overflow-hidden">
                        <div className="absolute top-10 left-10">
                            <div className="w-0 h-0 border-l-[20px] border-l-transparent border-b-[40px] border-b-brand-cream border-r-[20px] border-r-transparent"></div>
                            <div className="w-0 h-0 border-l-[20px] border-l-transparent border-b-[40px] border-b-brand-cream border-r-[20px] border-r-transparent mt-2"></div>
                        </div>

                        <div className="absolute right-12 bottom-12">
                            {/* Star shape */}
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                <div className="absolute w-24 h-24 bg-brand-orange rotate-45"></div>
                                <div className="absolute w-24 h-24 bg-brand-orange rotate-0"></div>
                            </div>
                        </div>

                        {/* Decorative Line */}
                        <div className="w-full h-24 border-t-4 border-brand-black mt-32"></div>
                    </div>

                    {/* Middle Right: Curves and Circles */}
                    <div className="bg-brand-orange/20 relative overflow-hidden">
                        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full border-[40px] border-brand-brown/20"></div>
                        <div className="absolute right-0 bottom-20 w-full h-20 bg-brand-red/20 -skew-y-6"></div>
                        <div className="absolute left-10 top-1/2 flex gap-4">
                            {[1, 2, 3, 4].map(i => <div key={i} className="w-4 h-4 rounded-full bg-brand-brown/40"></div>)}
                        </div>
                    </div>

                    {/* Bottom Left: Curves */}
                    <div className="bg-brand-black relative overflow-hidden">
                        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-tr-full border-t-2 border-r-2 border-brand-brown/50"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-tr-full border-t-2 border-r-2 border-brand-brown/50"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 rounded-tr-full border-t-2 border-r-2 border-brand-brown/50"></div>
                    </div>

                    {/* Bottom Right: Quarter Circle & Dots */}
                    <div className="bg-brand-red relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-brand-orange to-brand-red"></div>
                        <div className="absolute bottom-0 right-0 w-64 h-64 bg-brand-black rounded-tl-full flex items-center justify-center p-12">
                            <div className="w-full h-full bg-brand-brown rounded-tl-full opacity-50"></div>
                        </div>
                        <div className="absolute bottom-8 right-8 grid grid-cols-4 gap-2">
                            {[...Array(16)].map((_, i) => (
                                <div key={i} className="w-1.5 h-1.5 bg-brand-cream rounded-full"></div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Overlaying Element in Center-Right */}
                <div className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-black rounded-full border-8 border-brand-brown/30 flex items-center justify-center z-10 shadow-2xl">
                    <div className="w-48 h-48 bg-brand-red rounded-full opacity-80 backdrop-blur-md"></div>
                    <div className="absolute w-2 h-2 bg-white rounded-full"></div>
                </div>
            </div>
        </div>
    );
}
