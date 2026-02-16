import { useEffect, useState } from "react";
import { axiosInstance } from "../lib/axios";
import { Phone, PhoneMissed, PhoneIncoming, PhoneOutgoing, Clock } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const CallHistory = () => {
    const { authUser } = useAuthStore();
    const [calls, setCalls] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchCallHistory();
    }, []);

    const fetchCallHistory = async () => {
        try {
            const res = await axiosInstance.get("/calls/history");
            setCalls(res.data);
        } catch (error) {
            console.error("Error fetching call history:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getCallIcon = (call) => {
        if (call.status === "missed") return <PhoneMissed className="size-5 text-red-500" />;

        // If I am the caller
        if (call.callerId._id === authUser._id) {
            return <PhoneOutgoing className="size-5 text-green-500" />;
        }
        // If I am the receiver
        return <PhoneIncoming className="size-5 text-blue-500" />;
    };

    if (isLoading) return <div className="text-center py-4">Loading history...</div>;

    return (
        <div className="bg-base-100 rounded-lg shadow-sm border border-base-300 h-full flex flex-col">
            <div className="p-4 border-b border-base-300">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="size-5" />
                    Call History
                </h2>
            </div>

            <div className="overflow-y-auto flex-1 p-2">
                {calls.length === 0 ? (
                    <div className="text-center text-zinc-500 py-8">No call history</div>
                ) : (
                    <div className="space-y-2">
                        {calls.map((call) => {
                            const isMe = call.callerId._id === authUser._id;
                            const otherUser = isMe ? call.receiverId : call.callerId;

                            return (
                                <div key={call._id} className="flex items-center justify-between p-3 hover:bg-base-200 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={otherUser?.profilePic || "/avatar.png"}
                                            alt={otherUser?.fullName}
                                            className="size-10 rounded-full object-cover"
                                        />
                                        <div>
                                            <div className="font-medium flex items-center gap-2">
                                                {otherUser?.fullName || "Unknown User"}
                                                {call.status === "missed" && <span className="text-xs text-red-500 font-normal">(Missed)</span>}
                                            </div>
                                            <div className="text-xs text-zinc-500 flex items-center gap-1">
                                                {getCallIcon(call)}
                                                {formatMessageTime(call.createdAt)}
                                                {call.duration > 0 && ` • ${formatDuration(call.duration)}`}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

const formatDuration = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
};

export default CallHistory;
