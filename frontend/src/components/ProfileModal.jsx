import { X, Send, UserPlus, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const ProfileModal = ({ user, onClose }) => {
    const { authUser, onlineUsers } = useAuthStore();
    const [requestStatus, setRequestStatus] = useState("none"); // none, pending, connected, self
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!user || !authUser) return;

        if (user._id === authUser._id) {
            setRequestStatus("self");
            return;
        }

        // Check if already connected (in contacts)
        // Note: We might need to fetch contacts if not populated in authUser
        // For now, assuming basic contact check via ID if available in a store
        // But authUser.contacts usually just IDs in some versions, or ignored.
        // Let's rely on a fresh check or props if possible. 
        // Ideally we should check `authUser.contacts` if it contains `user._id`

        // Simpler: Check "connected" status via an API or just assume "none" until interaction?
        // Let's do a quick check if possible.
        // Ideally the parent component knows if they are a contact.
        // For MVP, enable "Send Request" unless we know otherwise.
    }, [user, authUser]);

    const handleSendRequest = async () => {
        setIsLoading(true);
        try {
            await axiosInstance.post("/requests/send", { toUserId: user._id });
            setRequestStatus("pending");
            toast.success("Friend request sent!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send request");
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-base-100 rounded-2xl shadow-xl w-full max-w-sm relative overflow-hidden animate-fade-in-up">
                {/* Header Image */}
                <div className="h-32 bg-gradient-to-r from-primary/10 to-secondary/10 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 btn btn-circle btn-sm btn-ghost bg-base-100/50 hover:bg-base-100"
                    >
                        <X size={20} />
                    </button>
                    <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
                        <div className="relative">
                            <img
                                src={user.profilePic || "/avatar.png"}
                                alt={user.fullName}
                                className="size-32 rounded-full object-cover border-4 border-base-100 shadow-lg"
                            />
                            {onlineUsers.includes(user._id) && (
                                <span className="absolute bottom-2 right-2 size-4 bg-green-500 rounded-full border-2 border-base-100"></span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="pt-20 px-6 pb-6 text-center">
                    <h2 className="text-2xl font-bold">{user.fullName}</h2>

                    {/* Age & Gender */}
                    {(user.age || user.gender) && (
                        <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm mt-1">
                            {user.age && <span>{user.age} years</span>}
                            {user.age && user.gender && <span>•</span>}
                            {user.gender && <span>{user.gender}</span>}
                        </div>
                    )}

                    {/* Distance */}
                    {user.distance !== undefined && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-base-200 text-xs font-medium">
                            <Clock size={12} />
                            {user.distance < 1000
                                ? `${Math.round(user.distance)}m away`
                                : `${(user.distance / 1000).toFixed(1)}km away`}
                        </div>
                    )}

                    {/* Bio */}
                    {user.bio && (
                        <p className="mt-4 text-sm text-base-content/80 italic">"{user.bio}"</p>
                    )}

                    {/* Interests */}
                    {user.interests && user.interests.length > 0 && (
                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                            {user.interests.map((interest, i) => (
                                <span key={i} className="badge badge-outline badge-sm">{interest}</span>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="mt-8 flex gap-3">
                        {requestStatus === "pending" ? (
                            <button className="btn btn-disabled w-full flex-1">
                                <Clock size={18} /> Pending
                            </button>
                        ) : (
                            <button
                                onClick={handleSendRequest}
                                disabled={isLoading || requestStatus === "self"}
                                className="btn btn-primary w-full flex-1 gap-2"
                            >
                                <UserPlus size={18} />
                                {isLoading ? "Sending..." : "Connect"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
