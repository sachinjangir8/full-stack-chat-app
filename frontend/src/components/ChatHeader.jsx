import { X, Video, ArrowLeft, Users } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

import { useState } from "react";
import CallModal from "./CallModal";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, selectedGroup, setSelectedGroup } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();
  const [isCalling, setIsCalling] = useState(false);

  const displayUser = selectedGroup || selectedUser;
  if (!displayUser) return null;

  const isGroup = !!selectedGroup;

  return (
    <div className="p-2.5 border-b border-base-300 w-full bg-base-100 z-10 sticky top-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Back Button for Mobile */}
          <button
            className="lg:hidden btn btn-sm btn-circle btn-ghost"
            onClick={() => {
              setSelectedUser(null);
              setSelectedGroup(null);
            }}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="avatar">
            <div className="size-10 rounded-full relative">
              {isGroup ? (
                <div className="size-full bg-primary/10 rounded-full flex items-center justify-center">
                  {displayUser.avatar ? (
                    <img src={displayUser.avatar} alt={displayUser.name} className="size-full rounded-full object-cover" />
                  ) : (
                    <Users className="size-6 text-primary" /> // Need to import Users or use a placeholder
                  )}
                </div>
              ) : (
                <img src={displayUser.profilePic || "/avatar.png"} alt={displayUser.fullName} />
              )}
            </div>
          </div>

          {/* Info */}
          <div className="text-left">
            <h3 className="font-medium truncate max-w-[150px] lg:max-w-none">
              {isGroup ? displayUser.name : displayUser.fullName}
            </h3>
            <p className="text-sm text-base-content/70">
              {isGroup ? `${displayUser.members?.length || 0} members` : (onlineUsers.includes(displayUser._id) ? "Online" : "Offline")}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {!isGroup && (
            <button onClick={() => setIsCalling(true)} className="btn btn-sm btn-circle btn-ghost">
              <Video size={20} />
            </button>
          )}
          <button onClick={() => {
            setSelectedUser(null);
            setSelectedGroup(null);
          }}>
            <X />
          </button>
        </div>
      </div>

      {isCalling && (
        <CallModal
          isIncoming={false}
          call={{
            userToCall: displayUser._id,
            name: displayUser.fullName,
            from: authUser._id
          }}
          onClose={() => setIsCalling(false)}
        />
      )}
    </div>
  );
};
export default ChatHeader;
