import { X, Video, ArrowLeft } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

import { useState } from "react";
import CallModal from "./CallModal";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();
  const [isCalling, setIsCalling] = useState(false);

  return (
    <div className="p-2.5 border-b border-base-300 w-full bg-base-100 z-10 sticky top-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Back Button for Mobile */}
          <button
            className="lg:hidden btn btn-sm btn-circle btn-ghost"
            onClick={() => setSelectedUser(null)}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
            </div>
          </div>

          {/* User info */}
          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <p className="text-sm text-base-content/70">
              {onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        {/* Close button */}
        <div className="flex items-center gap-2">
          <button onClick={() => setIsCalling(true)} className="btn btn-sm btn-circle btn-ghost">
            <Video size={20} />
          </button>
          <button onClick={() => setSelectedUser(null)}>
            <X />
          </button>
        </div>
      </div>

      {isCalling && (
        <CallModal
          isIncoming={false}
          call={{
            userToCall: selectedUser._id,
            name: selectedUser.fullName,
            from: authUser._id
          }}
          onClose={() => setIsCalling(false)}
        />
      )}
    </div>
  );
};
export default ChatHeader;
