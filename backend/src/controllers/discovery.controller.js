import User from "../models/user.model.js";

export const searchByInterests = async (req, res) => {
    try {
        const { query } = req.query;
        const myId = req.user._id;

        if (!query) {
            return res.status(400).json({ message: "Search query is required" });
        }

        // Find users with matching interests, excluding self and ghost mode users
        const users = await User.find({
            interests: { $in: [new RegExp(query, "i")] },
            _id: { $ne: myId },
            isGhostMode: { $ne: true },
        }).select("-password");

        res.status(200).json(users);
    } catch (error) {
        console.error("Error in searchByInterests: ", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};
