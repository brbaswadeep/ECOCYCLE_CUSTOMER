import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc, updateDoc } from 'firebase/firestore';
import { MessageCircle, User, Loader2, Clock } from 'lucide-react';
import ChatModal from '../components/ChatModal';

export default function Messages() {
    const { currentUser } = useAuth();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedChat, setSelectedChat] = useState(null);

    useEffect(() => {
        if (!currentUser) return;

        // Query chats where user is a participant
        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', currentUser.uid)
            // orderBy('lastUpdated', 'desc') // Requires index usually, handle client side sort if needed
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedChats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Client-side sort
            loadedChats.sort((a, b) => (b.lastUpdated?.seconds || 0) - (a.lastUpdated?.seconds || 0));

            setChats(loadedChats);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const getOtherParticipantName = (chat) => {
        if (!chat.participantNames) return 'User';
        const otherId = chat.participants.find(id => id !== currentUser.uid);
        return chat.participantNames[otherId] || 'User';
    };

    const getOtherParticipantId = (chat) => {
        return chat.participants.find(id => id !== currentUser.uid);
    };

    return (
        <div className="min-h-screen pt-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-8 px-4 lg:px-0">
                <div className="p-3 bg-brand-brown/10 rounded-2xl text-brand-brown">
                    <MessageCircle className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-brand-black tracking-tight">Messages</h1>
                    <p className="text-brand-brown font-medium opacity-60">Your conversations</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 text-brand-orange animate-spin" />
                </div>
            ) : chats.length === 0 ? (
                <div className="text-center py-20 bg-white mx-4 rounded-3xl border border-brand-brown/10 shadow-sm">
                    <MessageCircle className="w-16 h-16 text-brand-brown/20 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-brand-brown">No messages yet</h3>
                    <p className="text-brand-brown/60">Chats with vendors will appear here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4 lg:px-0">
                    {chats.map(chat => {
                        const otherName = getOtherParticipantName(chat);
                        const otherId = getOtherParticipantId(chat);

                        return (
                            <div
                                key={chat.id}
                                onClick={async () => {
                                    setSelectedChat({ ...chat, otherName, otherId });
                                    if (chat.unreadCount?.[currentUser.uid] > 0) {
                                        try {
                                            await updateDoc(doc(db, 'chats', chat.id), {
                                                [`unreadCount.${currentUser.uid}`]: 0
                                            });
                                        } catch (err) { console.error("Error marking read:", err); }
                                    }
                                }}
                                className="bg-white p-5 rounded-[2rem] shadow-sm border border-brand-brown/5 hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1"
                            >
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-12 h-12 bg-brand-cream rounded-full flex items-center justify-center text-brand-brown font-bold text-lg border-2 border-white shadow-sm group-hover:scale-110 transition-transform">
                                        {otherName[0]?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-brand-black truncate">{otherName}</h3>
                                        <div className="text-xs text-brand-brown/50 truncate flex items-center gap-1">
                                            <span className="font-mono">#{chat.orderId?.slice(0, 6)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl">
                                    <p className="text-sm text-brand-brown/80 line-clamp-2 italic">"{chat.lastMessage}"</p>
                                </div>
                                <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-brand-brown/40 font-bold uppercase tracking-widest">
                                    <Clock className="w-3 h-3" />
                                    {chat.lastUpdated?.toDate ? chat.lastUpdated.toDate().toLocaleDateString() : 'Just now'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {selectedChat && (
                <ChatModal
                    orderId={selectedChat.orderId}
                    currentUser={currentUser}
                    recipientName={selectedChat.otherName}
                    receiverId={selectedChat.otherId}
                    onClose={() => setSelectedChat(null)}
                />
            )}
        </div>
    );
}
