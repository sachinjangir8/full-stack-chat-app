import User from "../models/user.model.js";

export const updateLocation = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const userId = req.user._id;

        if (!latitude || !longitude) {
            return res.status(400).json({ message: "Latitude and longitude are required" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                location: {
                    type: "Point",
                    coordinates: [parseFloat(longitude), parseFloat(latitude)],
                },
            },
            { new: true }
        ).select("-password");

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Error in updateLocation: ", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getNearbyUsers = async (req, res) => {
    try {
        const userId = req.user._id;
        const currentUser = await User.findById(userId);

        if (!currentUser.location || !currentUser.location.coordinates || currentUser.location.coordinates.length === 0) {
            return res.status(400).json({ message: "User location not set" });
        }

        const nearbyUsers = await User.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: currentUser.location.coordinates,
                    },
                    $maxDistance: 500, // 500 meters
                },
            },
            _id: { $ne: userId }, // Exclude current user
        }).select("-password");

        res.status(200).json(nearbyUsers);
    } catch (error) {
        console.error("Error in getNearbyUsers: ", error.message);
        res.status(500).json({ message: error.message });
    }
};
