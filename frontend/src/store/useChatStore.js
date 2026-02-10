import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

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

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  addContact: async (email) => {
    try {
      console.log("Attempting to add contact:", email);
      const res = await axiosInstance.post("/messages/add", { email });
      console.log("Add contact response:", res.data);
      set({ users: [...get().users, res.data] });
      toast.success("User added directly for chat!");
      return res.data;
    } catch (error) {
      console.error("Add contact error:", error);
      toast.error(error.response.data.message);
      return null;
    }
  },

  deleteMessage: async (messageId) => {
    const { messages } = get();
    // Optimistic update
    set({ messages: messages.filter((m) => m._id !== messageId) });
    try {
      await axiosInstance.delete(`/messages/${messageId}`);
    } catch (error) {
      toast.error(error.response.data.message);
      // Revert if failed
      set({ messages });
    }
  },

  editMessage: async (messageId, newText) => {
    const { messages } = get();
    // Optimistic update
    set({
      messages: messages.map((m) =>
        m._id === messageId ? { ...m, text: newText, isEdited: true } : m
      ),
    });
    try {
      const res = await axiosInstance.put(`/messages/${messageId}`, { text: newText });
      // Update with actual server response data to ensure consistency
      set({
        messages: messages.map((m) => (m._id === messageId ? res.data : m)),
      });
    } catch (error) {
      toast.error(error.response.data.message);
      // Revert if failed
      set({ messages });
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      set({
        messages: [...get().messages, newMessage],
      });
    });

    socket.on("messageDeleted", (messageId) => {
      set({ messages: get().messages.filter((m) => m._id !== messageId) });
    });

    socket.on("messageUpdated", (updatedMessage) => {
      set({
        messages: get().messages.map((m) =>
          m._id === updatedMessage._id ? updatedMessage : m
        ),
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messageDeleted");
    socket.off("messageUpdated");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
