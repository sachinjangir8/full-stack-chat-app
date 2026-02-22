import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { generateKeyPair } from "../lib/encryption.js";

const BASE_URL = import.meta.env.MODE === "development"
  ? "http://localhost:5001"
  : "https://full-stack-chat-app-2-backend.onrender.com";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  initializeE2EE: async () => {
    const { authUser } = get();
    if (!authUser) return;

    const privateKey = localStorage.getItem(`chat_priv_${authUser._id}`);
    if (!privateKey || !authUser.publicKey) {
      console.log("Generating new E2EE key pair...");
      try {
        const { publicKey, privateKey: newPrivateKey } = await generateKeyPair();
        await axiosInstance.put("/auth/update-profile", { publicKey });
        localStorage.setItem(`chat_priv_${authUser._id}`, newPrivateKey);
        // Update local authUser state
        set({ authUser: { ...authUser, publicKey } });
      } catch (error) {
        console.error("Failed to initialize E2EE:", error);
      }
    }
  },

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
      await get().initializeE2EE();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      toast.success(res.data.message);
      return res.data;
    } catch (error) {
      toast.error(error.response.data.message);
      return null;
    } finally {
      set({ isSigningUp: false });
    }
  },

  verifySignup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/verify-signup", data);
      set({ authUser: res.data });
      toast.success("Account verified and created successfully");
      get().connectSocket();
      await get().initializeE2EE();
      return true;
    } catch (error) {
      toast.error(error.response.data.message);
      return false;
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
      await get().initializeE2EE();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response.data.message);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  sendOtp: async (mobile) => {
    try {
      const res = await axiosInstance.post("/auth/send-otp", { mobile });
      toast.success(res.data.message);
      return true;
    } catch (error) {
      toast.error(error.response.data.message);
      return false;
    }
  },

  verifyOtp: async (mobile, otp) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/verify-otp", { mobile, otp });
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
      await get().initializeE2EE();
      return true;
    } catch (error) {
      toast.error(error.response.data.message);
      return false;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
    });
    socket.connect();

    set({ socket: socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    socket.on("callUser", (data) => {
      set({
        isIncomingCall: true,
        incomingCallData: data
      });
    });

    socket.on("callEnded", () => {
      set({ isIncomingCall: false, incomingCallData: null });
    });
  },
  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },

  // Call State
  isIncomingCall: false,
  incomingCallData: null,
  setIncomingCall: (state) => set({ isIncomingCall: state }),
}));
