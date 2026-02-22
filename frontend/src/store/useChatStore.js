import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { deriveKey, encryptMessage, decryptMessage } from "../lib/encryption";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  groups: [],
  selectedUser: null,
  selectedGroup: null,
  isUsersLoading: false,
  isGroupsLoading: false,
  isMessagesLoading: false,
  typingUsers: {}, // { [userId]: boolean }
  sharedKeys: {}, // { [userId]: CryptoKey }
  discoveryResults: [],
  isDiscoveryLoading: false,

  searchUsersByInterests: async (query) => {
    set({ isDiscoveryLoading: true });
    try {
      const res = await axiosInstance.get(`/discovery/search?query=${query}`);
      set({ discoveryResults: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isDiscoveryLoading: false });
    }
  },

  getSharedKey: async (remoteUser) => {
    const { sharedKeys } = get();
    if (sharedKeys[remoteUser._id]) return sharedKeys[remoteUser._id];

    if (!remoteUser.publicKey) return null;

    const authUser = useAuthStore.getState().authUser;
    const privateKey = localStorage.getItem(`chat_priv_${authUser._id}`);
    if (!privateKey) return null;

    try {
      const key = await deriveKey(privateKey, remoteUser.publicKey);
      set({ sharedKeys: { ...sharedKeys, [remoteUser._id]: key } });
      return key;
    } catch (error) {
      console.error("Failed to derive shared key:", error);
      return null;
    }
  },

  decryptMessagesList: async (messagesList, remoteUser) => {
    if (!remoteUser) return messagesList;
    const sharedKey = await get().getSharedKey(remoteUser);
    if (!sharedKey) return messagesList;

    const decryptedMessages = await Promise.all(
      messagesList.map(async (m) => {
        if (m.text && m.text.startsWith("{\"ciphertext\":")) {
          try {
            const encryptedData = JSON.parse(m.text);
            const decryptedText = await decryptMessage(encryptedData, sharedKey);
            return { ...m, text: decryptedText, isE2EE: true };
          } catch (e) {
            return m;
          }
        }
        return m;
      })
    );
    return decryptedMessages;
  },

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  getMessages: async (id, isGroup = false) => {
    set({ isMessagesLoading: true });
    try {
      const endpoint = isGroup ? `/groups/messages/${id}` : `/messages/${id}`;
      const res = await axiosInstance.get(endpoint);

      let messages = res.data;
      if (!isGroup) {
        const { selectedUser } = get();
        messages = await get().decryptMessagesList(messages, selectedUser);
      }

      set({ messages });
    } catch (error) {
      toast.error(error.response.data.message);
      set({ messages: [] }); // Clear messages on error to prevent old chat persistence
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, selectedGroup, messages } = get();
    try {
      let dataToSend = { ...messageData };

      // E2EE for private chat if both have keys
      if (selectedUser && selectedUser.publicKey && dataToSend.text) {
        const sharedKey = await get().getSharedKey(selectedUser);
        if (sharedKey) {
          const encrypted = await encryptMessage(dataToSend.text, sharedKey);
          dataToSend.text = JSON.stringify(encrypted);
        }
      }

      const endpoint = selectedGroup ? `/groups/send/${selectedGroup._id}` : `/messages/send/${selectedUser._id}`;
      const res = await axiosInstance.post(endpoint, dataToSend);

      let newMessage = res.data;
      if (selectedUser && dataToSend.text && dataToSend.text.startsWith("{\"ciphertext\":")) {
        // Replace back the encrypted text with original for local UI
        newMessage.text = messageData.text;
        newMessage.isE2EE = true;
      }

      set({ messages: [...messages, newMessage] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  createGroup: async (groupData) => {
    try {
      const res = await axiosInstance.post("/groups/create", groupData);
      set({ groups: [...get().groups, res.data] });
      toast.success("Group created successfully!");
      return res.data;
    } catch (error) {
      toast.error(error.response.data.message);
      return null;
    }
  },

  addContact: async (email) => {
    try {
      const res = await axiosInstance.post("/messages/add", { email });
      set({ users: [...get().users, res.data] });
      toast.success("User added directly for chat!");
      return res.data;
    } catch (error) {
      toast.error(error.response.data.message);
      return null;
    }
  },

  deleteMessage: async (messageId) => {
    const { messages } = get();
    set({ messages: messages.filter((m) => m._id !== messageId) });
    try {
      await axiosInstance.delete(`/messages/${messageId}`);
    } catch (error) {
      toast.error(error.response.data.message);
      set({ messages });
    }
  },

  editMessage: async (messageId, newText) => {
    const { messages, selectedUser } = get();
    const oldMessages = [...messages];

    // Optimistic update
    set({
      messages: messages.map((m) =>
        m._id === messageId ? { ...m, text: newText, isEdited: true } : m
      ),
    });

    try {
      let textToSend = newText;
      if (selectedUser && selectedUser.publicKey) {
        const sharedKey = await get().getSharedKey(selectedUser);
        if (sharedKey) {
          const encrypted = await encryptMessage(newText, sharedKey);
          textToSend = JSON.stringify(encrypted);
        }
      }

      const res = await axiosInstance.put(`/messages/${messageId}`, { text: textToSend });

      let updatedMessage = res.data;
      if (selectedUser && textToSend.startsWith("{\"ciphertext\":")) {
        updatedMessage.text = newText;
        updatedMessage.isE2EE = true;
      }

      set({
        messages: get().messages.map((m) => (m._id === messageId ? updatedMessage : m)),
      });
    } catch (error) {
      toast.error(error.response.data.message);
      set({ messages: oldMessages });
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", async (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      if (newMessage.text && newMessage.text.startsWith("{\"ciphertext\":")) {
        const sharedKey = await get().getSharedKey(selectedUser);
        if (sharedKey) {
          try {
            const encryptedData = JSON.parse(newMessage.text);
            newMessage.text = await decryptMessage(encryptedData, sharedKey);
            newMessage.isE2EE = true;
          } catch (e) { }
        }
      }

      set({
        messages: [...get().messages, newMessage],
      });
    });

    socket.on("messageDeleted", (messageId) => {
      set({ messages: get().messages.filter((m) => m._id !== messageId) });
    });

    socket.on("messageUpdated", async (updatedMessage) => {
      if (updatedMessage.text && updatedMessage.text.startsWith("{\"ciphertext\":")) {
        const sharedKey = await get().getSharedKey(selectedUser);
        if (sharedKey) {
          try {
            const encryptedData = JSON.parse(updatedMessage.text);
            updatedMessage.text = await decryptMessage(encryptedData, sharedKey);
            updatedMessage.isE2EE = true;
          } catch (e) { }
        }
      }

      set({
        messages: get().messages.map((m) =>
          m._id === updatedMessage._id ? updatedMessage : m
        ),
      });
    });

    socket.on("newGroupMessage", ({ groupId, message }) => {
      const { selectedGroup } = get();
      if (selectedGroup && selectedGroup._id === groupId) {
        set({
          messages: [...get().messages, message],
        });
      }
    });

    socket.on("messagesSeen", ({ seenBy, senderId }) => {
      const { selectedUser, messages } = get();
      if (selectedUser && selectedUser._id === seenBy) {
        set({
          messages: messages.map((m) => (m.senderId !== seenBy ? { ...m, isSeen: true } : m)),
        });
      }
    });
  },

  markMessagesAsSeen: async (userId) => {
    try {
      await axiosInstance.post(`/messages/seen/${userId}`);
      set({
        messages: get().messages.map((m) =>
          m.senderId === userId ? { ...m, isSeen: true } : m
        ),
      });
    } catch (error) {
      console.log("Error in markMessagesAsSeen:", error);
    }
  },

  toggleStar: async (messageId) => {
    const { messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/star/${messageId}`);

      let updatedMessage = res.data;
      // If encrypted, the server returned blob, we should keep the local decrypted one
      const original = messages.find(m => m._id === messageId);
      if (original && original.isE2EE) {
        updatedMessage.text = original.text;
        updatedMessage.isE2EE = true;
      }

      set({
        messages: messages.map((m) => (m._id === messageId ? updatedMessage : m)),
      });
      toast.success(res.data.isStarred ? "Message starred" : "Message unstarred");
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  togglePin: async (messageId) => {
    const { messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/pin/${messageId}`);

      let updatedMessage = res.data;
      const original = messages.find(m => m._id === messageId);
      if (original && original.isE2EE) {
        updatedMessage.text = original.text;
        updatedMessage.isE2EE = true;
      }

      set({
        messages: messages.map((m) => (m._id === messageId ? updatedMessage : m)),
      });
      toast.success(res.data.isPinned ? "Message pinned" : "Message unpinned");
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  subscribeToTyping: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("typing", (data) => {
      const userId = typeof data === "string" ? data : data.userId;
      set((state) => ({
        typingUsers: { ...state.typingUsers, [userId]: true },
      }));
    });

    socket.on("stop-typing", (data) => {
      const userId = typeof data === "string" ? data : data.userId;
      set((state) => ({
        typingUsers: { ...state.typingUsers, [userId]: false },
      }));
    });
  },

  unsubscribeFromTyping: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("typing");
    socket.off("stop-typing");
  },

  sendTypingStatus: (isTyping) => {
    const { selectedUser, selectedGroup } = get();
    if (!selectedUser && !selectedGroup) return;
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    const receiverId = selectedGroup ? selectedGroup._id : selectedUser._id;
    socket.emit(isTyping ? "typing" : "stop-typing", {
      receiverId,
      isGroup: !!selectedGroup
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messageDeleted");
    socket.off("messageUpdated");
    socket.off("newGroupMessage");
  },

  setSelectedUser: (selectedUser) => {
    const { selectedGroup } = get();
    const socket = useAuthStore.getState().socket;
    if (selectedGroup && socket) {
      socket.emit("leaveGroup", selectedGroup._id);
    }
    set({ selectedUser, selectedGroup: null });
  },

  setSelectedGroup: (selectedGroup) => {
    const { selectedGroup: prevGroup, selectedUser: prevUser } = get();
    const socket = useAuthStore.getState().socket;
    if (socket) {
      if (prevGroup) socket.emit("leaveGroup", prevGroup._id);
      if (selectedGroup) socket.emit("joinGroup", selectedGroup._id);
    }
    set({ selectedGroup, selectedUser: null });
  },
}));
