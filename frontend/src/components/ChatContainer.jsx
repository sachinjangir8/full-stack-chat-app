import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import { X, Pencil, Trash, Check } from "lucide-react";

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
    subscribeToMessages,
    unsubscribeFromMessages,
    deleteMessage,
    editMessage,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editedText, setEditedText] = useState("");

  useEffect(() => {
    getMessages(selectedUser._id);

    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"} group`}
            ref={messageEndRef}
          >
            <div className=" chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
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
                  {message.text && <p>{message.text}</p>}
                  {message.isEdited && (
                    <span className="text-[10px] opacity-70 block text-right mt-1">
                      (edited)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions for own messages */}
            {message.senderId === authUser._id && !editingMessageId && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 mt-1">
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
              </div>
            )}
          </div>
        ))}
      </div>

      <MessageInput />
    </div>
  );
};
export default ChatContainer;
