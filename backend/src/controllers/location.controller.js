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

        const nearbyUsers = await User.aggregate([
            {
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: currentUser.location.coordinates,
                    },
                    distanceField: "distance",
                    maxDistance: 500, // 500 meters
                    spherical: true,
                    key: "location",
                },
            },
            {
                $match: {
                    _id: { $ne: currentUser._id }, // Exclude current user
                    isGhostMode: { $ne: true },   // Exclude ghost mode users
                },
            },
            {
                $project: {
                    _id: 1,
                    fullName: 1,
                    profilePic: 1,
                    interests: 1,
                    bio: 1,
                    age: 1,
                    gender: 1,
                    distance: 1, // Return distance in meters
                },
            },
        ]);

        res.status(200).json(nearbyUsers);
    } catch (error) {
        console.error("Error in getNearbyUsers: ", error.message);
        res.status(500).json({ message: error.message });
    }
};
