import Call from "../models/call.model.js";

export const getCallHistory = async (req, res) => {
    try {
        const userId = req.user._id;

        const calls = await Call.find({
            $or: [{ callerId: userId }, { receiverId: userId }],
        })
            .populate("callerId", "fullName profilePic")
            .populate("receiverId", "fullName profilePic")
            .sort({ createdAt: -1 });

        res.status(200).json(calls);
    } catch (error) {
        console.log("Error in getCallHistory controller: ", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const logCall = async (req, res) => {
    try {
        const { callerId, receiverId, status, duration } = req.body;

        const newCall = new Call({
            callerId,
            receiverId,
            status,
            duration,
            endTime: new Date(),
        });

        await newCall.save();

        res.status(201).json(newCall);
    } catch (error) {
        console.log("Error in logCall controller: ", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};
