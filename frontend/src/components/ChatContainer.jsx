import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import { X, Pencil, Trash, Check, Star, Pin, Lock } from "lucide-react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    selectedGroup,
    subscribeToMessages,
    unsubscribeFromMessages,
    deleteMessage,
    editMessage,
    typingUsers,
    subscribeToTyping,
    unsubscribeFromTyping,
    markMessagesAsSeen,
    toggleStar,
    togglePin,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    if (!selectedUser) return;

    // Only mark as seen if there are UNSEEN messages from the other user
    const hasUnseen = messages.some(m => (m.senderId === selectedUser._id || m.senderId?._id === selectedUser._id) && !m.isSeen);
    if (hasUnseen) {
      markMessagesAsSeen(selectedUser._id);
    }
  }, [messages, selectedUser?._id, markMessagesAsSeen]);

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editedText, setEditedText] = useState("");

  useEffect(() => {
    if (selectedGroup) {
      getMessages(selectedGroup._id, true);
    } else if (selectedUser) {
      getMessages(selectedUser._id, false);
    }

    subscribeToMessages();
    subscribeToTyping();

    return () => {
      unsubscribeFromMessages();
      unsubscribeFromTyping();
    };
  }, [
    selectedUser?._id,
    selectedGroup?._id,
    getMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
    subscribeToTyping,
    unsubscribeFromTyping,
  ]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      const chatContainer = messageEndRef.current.parentElement;
      const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop <= chatContainer.clientHeight + 100;
      const lastMessageIsMine = messages[messages.length - 1]?.senderId === authUser._id;

      // Only scroll if user is at bottom OR the user just sent a message
      if (isAtBottom || lastMessageIsMine) {
        messageEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages, typingUsers, authUser._id]);

  const handleEditClick = (message) => {
    setEditingMessageId(message._id);
    setEditedText(message.text);
  };

  const handleUpdateMessage = async (messageId) => {
    if (editedText.trim()) {
      await editMessage(messageId, editedText);
    }
    setEditingMessageId(null);
    setEditedText("");
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scrollbar-hide">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"} group`}
          >
            <div className=" chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId?._id === authUser._id || message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : (message.senderId?.profilePic || selectedUser?.profilePic || "/avatar.png")
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1 flex flex-col items-start">
              {selectedGroup && message.senderId?._id !== authUser._id && (
                <span className="text-[10px] font-bold text-primary mb-0.5">
                  {message.senderId?.fullName || "Member"}
                </span>
              )}
              <time className="text-[10px] opacity-50">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>

            <div className={`chat-bubble flex flex-col ${message.senderId === authUser._id ? "bg-primary text-primary-content" : "bg-base-200"}`}>
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}

              {editingMessageId === message._id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="input input-sm input-bordered w-full max-w-xs text-black"
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    autoFocus
                  />
                  <button onClick={() => handleUpdateMessage(message._id)} className="btn btn-xs btn-circle btn-success">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditingMessageId(null)} className="btn btn-xs btn-circle btn-error">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  {(message.isStarred || message.isPinned) && (
                    <div className="flex gap-1 mb-1">
                      {message.isPinned && <Pin size={10} className="text-primary fill-primary" />}
                      {message.isStarred && <Star size={10} className="text-yellow-500 fill-yellow-500" />}
                    </div>
                  )}
                  {message.isE2EE && (
                    <div className="flex items-center gap-1 opacity-50 mb-1">
                      <Lock size={10} />
                      <span className="text-[8px] uppercase tracking-wider font-bold">Encrypted</span>
                    </div>
                  )}
                  {message.text && <p className="mb-2">{message.text}</p>}
                  {message.audio && (
                    <div className="mt-2 min-w-[200px]">
                      <audio
                        src={message.audio}
                        controls
                        className="w-full h-8 opacity-90 brightness-90 filter invert"
                      />
                    </div>
                  )}
                  {message.isEdited && (
                    <span className="text-[10px] opacity-70 block text-right mt-1">
                      (edited)
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className={`chat-footer opacity-50 text-[10px] flex items-center gap-1 mt-1 ${message.senderId === authUser._id ? "justify-end" : ""}`}>
              {!selectedGroup && message.senderId === authUser._id && (
                <span className={message.isSeen ? "text-blue-500" : ""}>
                  {message.isSeen ? "Seen" : "Sent"}
                </span>
              )}
            </div>
            {!editingMessageId && (
              <div className={`flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${message.senderId === authUser._id ? "justify-end" : "justify-start"}`}>
                <button
                  onClick={() => toggleStar(message._id)}
                  className={`btn btn-ghost btn-xs ${message.isStarred ? "text-yellow-500" : "text-zinc-500"}`}
                  title={message.isStarred ? "Unstar" : "Star"}
                >
                  <Star size={14} className={message.isStarred ? "fill-current" : ""} />
                </button>
                <button
                  onClick={() => togglePin(message._id)}
                  className={`btn btn-ghost btn-xs ${message.isPinned ? "text-primary" : "text-zinc-500"}`}
                  title={message.isPinned ? "Unpin" : "Pin"}
                >
                  <Pin size={14} className={message.isPinned ? "fill-current" : ""} />
                </button>
                {message.senderId === authUser._id && (
                  <>
                    <button
                      onClick={() => handleEditClick(message)}
                      className="btn btn-ghost btn-xs text-info"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deleteMessage(message._id)}
                      className="btn btn-ghost btn-xs text-error"
                      title="Delete"
                    >
                      <Trash size={14} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
        {((selectedUser && typingUsers[selectedUser._id]) || (selectedGroup && typingUsers[selectedGroup._id])) && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img src={(selectedUser?.profilePic || selectedGroup?.avatar) || "/avatar.png"} alt="profile pic" />
              </div>
            </div>
            <div className="chat-bubble bg-base-200">
              <span className="loading loading-dots loading-xs"></span>
            </div>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>

      <MessageInput />
    </div >
  );
};
export default ChatContainer;
