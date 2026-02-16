import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
    {
        callerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: ["audio", "video"],
            default: "video",
        },
        status: {
            type: String,
            enum: ["completed", "missed", "rejected"],
            default: "completed",
        },
        startTime: {
            type: Date,
            default: Date.now,
        },
        endTime: {
            type: Date,
        },
        duration: {
            type: Number, // in seconds
            default: 0,
        },
    },
    { timestamps: true }
);

const Call = mongoose.model("Call", callSchema);

export default Call;
