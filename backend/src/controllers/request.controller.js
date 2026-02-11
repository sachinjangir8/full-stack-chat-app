import User from "../models/user.model.js";

export const sendRequest = async (req, res) => {
    try {
        const fromUserId = req.user._id;
        const { toUserId } = req.body;

        if (fromUserId.toString() === toUserId) {
            return res.status(400).json({ message: "You cannot send a request to yourself" });
        }

        const targetUser = await User.findById(toUserId);
        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if they are already friends
        if (targetUser.contacts.includes(fromUserId)) {
            return res.status(400).json({ message: "You are already connected" });
        }

        // Check implementation of existing requests
        const existingRequest = targetUser.friendRequests.find(
            (req) => req.from.toString() === fromUserId.toString()
        );

        if (existingRequest) {
            if (existingRequest.status === "pending") {
                return res.status(400).json({ message: "Request already sent" });
            } else {
                // Reset rejected request to pending if needed, or deny?
                // Let's reset to pending for now
                existingRequest.status = "pending";
            }
        } else {
            targetUser.friendRequests.push({ from: fromUserId });
        }

        await targetUser.save();
        res.status(200).json({ message: "Friend request sent" });
    } catch (error) {
        console.error("Error in sendRequest:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getRequests = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).populate("friendRequests.from", "fullName profilePic email interests bio age gender");

        const pendingRequests = user.friendRequests.filter(req => req.status === "pending");
        res.status(200).json(pendingRequests);
    } catch (error) {
        console.error("Error in getRequests:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export const acceptRequest = async (req, res) => {
    try {
        const userId = req.user._id;
        const { requestId } = req.body;

        const user = await User.findById(userId);
        const request = user.friendRequests.id(requestId);

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (request.status !== "pending") {
            return res.status(400).json({ message: "Request is not pending" });
        }

        const senderId = request.from;
        const sender = await User.findById(senderId);

        if (!sender) {
            // Cleanup invalid request
            request.remove();
            await user.save();
            return res.status(404).json({ message: "Sender not found" });
        }

        // Add to each other's contacts
        if (!user.contacts.includes(senderId)) user.contacts.push(senderId);
        if (!sender.contacts.includes(userId)) sender.contacts.push(userId);

        // Remove request
        user.friendRequests.pull(requestId);

        await user.save();
        await sender.save();

        res.status(200).json({ message: "Request accepted", newContact: sender });
    } catch (error) {
        console.error("Error in acceptRequest:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const rejectRequest = async (req, res) => {
    try {
        const userId = req.user._id;
        const { requestId } = req.body;

        const user = await User.findById(userId);
        const request = user.friendRequests.id(requestId);

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        user.friendRequests.pull(requestId);
        await user.save();

        res.status(200).json({ message: "Request rejected" });
    } catch (error) {
        console.error("Error in rejectRequest:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
