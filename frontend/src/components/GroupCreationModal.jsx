import { useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { X, Users, Search, Check } from "lucide-react";

const GroupCreationModal = ({ isOpen, onClose }) => {
    const { users, createGroup } = useChatStore();
    const [groupName, setGroupName] = useState("");
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const toggleMember = (userId) => {
        setSelectedMembers((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        );
    };

    const handleCreate = async () => {
        if (!groupName.trim() || selectedMembers.length === 0) return;
        setIsSubmitting(true);
        const success = await createGroup({
            name: groupName,
            members: selectedMembers,
        });
        setIsSubmitting(false);
        if (success) {
            setGroupName("");
            setSelectedMembers([]);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-base-100 rounded-xl w-full max-w-md flex flex-col max-h-[80vh] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-base-300 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold">
                        <Users className="text-primary" />
                        <span>Create New Group</span>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <div className="p-4 flex flex-col gap-4 flex-1 overflow-hidden">
                    <div className="form-control w-full">
                        <label className="label">
                            <span className="label-text font-medium">Group Name</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Enter group name..."
                            className="input input-bordered w-full"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col flex-1 overflow-hidden">
                        <label className="label">
                            <span className="label-text font-medium">Select Members ({selectedMembers.length})</span>
                        </label>
                        <div className="flex-1 overflow-y-auto space-y-1 pr-2">
                            {users.map((user) => (
                                <div
                                    key={user._id}
                                    onClick={() => toggleMember(user._id)}
                                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedMembers.includes(user._id) ? "bg-primary/20" : "hover:bg-base-200"
                                        }`}
                                >
                                    <img
                                        src={user.profilePic || "/avatar.png"}
                                        alt={user.fullName}
                                        className="size-10 rounded-full object-cover"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{user.fullName}</p>
                                    </div>
                                    {selectedMembers.includes(user._id) && (
                                        <Check className="text-primary size-5" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-base-300 flex justify-end gap-2">
                    <button onClick={onClose} className="btn btn-ghost">Cancel</button>
                    <button
                        onClick={handleCreate}
                        disabled={!groupName.trim() || selectedMembers.length === 0 || isSubmitting}
                        className="btn btn-primary"
                    >
                        {isSubmitting ? "Creating..." : "Create Group"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupCreationModal;
