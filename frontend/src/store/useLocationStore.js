import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

export const useLocationStore = create((set, get) => ({
    location: null,
    nearbyUsers: [],
    isFindingLocation: false,
    isLoadingNearby: false,

    updateLocation: async (latitude, longitude) => {
        try {
            const res = await axiosInstance.put("/location/update", { latitude, longitude });
            set({ location: res.data.location });
        } catch (error) {
            console.error("Error updating location:", error);
            // Don't toast here to avoid spamming if location updates frequently
        }
    },

    getNearbyUsers: async () => {
        set({ isLoadingNearby: true });
        try {
            const res = await axiosInstance.get("/location/nearby");
            set({ nearbyUsers: res.data });
        } catch (error) {
            // If 400 (location not set), it's expected if user hasn't allowed location yet
            if (error.response?.status !== 400) {
                toast.error(error.response?.data?.message || "Failed to fetch nearby users");
            }
            set({ nearbyUsers: [] });
        } finally {
            set({ isLoadingNearby: false });
        }
    },

    getCurrentLocation: () => {
        set({ isFindingLocation: true });
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            set({ isFindingLocation: false });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                await get().updateLocation(latitude, longitude);
                get().getNearbyUsers();
                set({ isFindingLocation: false });
            },
            (error) => {
                toast.error("Unable to retrieve your location");
                set({ isFindingLocation: false });
                console.error(error);
            }
        );
    },
}));
