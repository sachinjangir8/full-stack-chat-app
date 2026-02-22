import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const createGroup = async (req, res) => {
    try {
        const { name, members, avatar } = req.body;
        const creatorId = req.user._id;

        if (!name || !members || members.length === 0) {
            return res.status(400).json({ message: "Group name and members are required" });
        }

        // Add creator to members if not already there
        const allMembers = Array.from(new Set([...members, creatorId]));

        let avatarUrl = "";
        if (avatar) {
            const uploadResponse = await cloudinary.uploader.upload(avatar);
            avatarUrl = uploadResponse.secure_url;
        }

        const newGroup = new Group({
            name,
            members: allMembers,
            admins: [creatorId],
            creator: creatorId,
            avatar: avatarUrl,
        });

        await newGroup.save();

        // Populate members for response
        await newGroup.populate("members", "fullName profilePic");

        res.status(201).json(newGroup);
    } catch (error) {
        console.error("Error in createGroup controller: ", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getGroups = async (req, res) => {
    try {
        const userId = req.user._id;
        const groups = await Group.find({ members: userId })
            .populate("members", "fullName profilePic")
            .populate("lastMessage");
        res.status(200).json(groups);
    } catch (error) {
        console.error("Error in getGroups controller: ", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getGroupMessages = async (req, res) => {
    try {
        const { id: groupId } = req.params;
        const userId = req.user._id;

        // Check if user is member of the group
        const group = await Group.findOne({ _id: groupId, members: userId });
        if (!group) {
            return res.status(403).json({ message: "Unauthorized or group not found" });
        }

        const messages = await Message.find({ groupId })
            .populate("senderId", "fullName profilePic")
            .sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (error) {
        console.error("Error in getGroupMessages controller: ", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const sendGroupMessage = async (req, res) => {
    try {
        const { text, image, audio } = req.body;
        const { id: groupId } = req.params;
        const senderId = req.user._id;

        const group = await Group.findOne({ _id: groupId, members: senderId });
        if (!group) {
            return res.status(403).json({ message: "Unauthorized or group not found" });
        }

        let imageUrl, audioUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }
        if (audio) {
            const uploadResponse = await cloudinary.uploader.upload(audio, {
                resource_type: "video", // Cloudinary uses 'video' for audio as well
                folder: "audio_messages",
            });
            audioUrl = uploadResponse.secure_url;
        }

        const newMessage = new Message({
            senderId,
            groupId,
            text,
            image: imageUrl,
            audio: audioUrl,
        });

        await newMessage.save();

        // Update group last message
        group.lastMessage = newMessage._id;
        await group.save();

        const populatedMessage = await newMessage.populate("senderId", "fullName profilePic");

        // Emit to all group members
        group.members.forEach((memberId) => {
            const receiverSocketId = getReceiverSocketId(memberId.toString());
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("newGroupMessage", {
                    groupId,
                    message: populatedMessage
                });
            }
        });

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.log("Error in sendGroupMessage controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const addMember = async (req, res) => {
    try {
        const { groupId, userId } = req.body;
        const group = await Group.findById(groupId);

        if (!group) return res.status(404).json({ message: "Group not found" });

        // Check if requester is admin
        if (!group.admins.includes(req.user._id)) {
            return res.status(403).json({ message: "Only admins can add members" });
        }

        if (group.members.includes(userId)) {
            return res.status(400).json({ message: "User already in group" });
        }

        group.members.push(userId);
        await group.save();

        const populatedGroup = await Group.findById(groupId)
            .populate("members", "fullName profilePic")
            .populate("admins", "fullName profilePic");
        res.status(200).json(populatedGroup);
    } catch (error) {
        console.error("Error in addMember:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const removeMember = async (req, res) => {
    try {
        const { groupId, userId } = req.body;
        const group = await Group.findById(groupId);

        if (!group) return res.status(404).json({ message: "Group not found" });

        // Check if requester is admin or the user themselves leaving
        const isAdmin = group.admins.includes(req.user._id);
        const isSelf = req.user._id.toString() === userId;

        if (!isAdmin && !isSelf) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        group.members = group.members.filter((id) => id.toString() !== userId);
        group.admins = group.admins.filter((id) => id.toString() !== userId);

        if (group.members.length === 0) {
            await Group.findByIdAndDelete(groupId);
            return res.status(200).json({ message: "Group deleted as last member left" });
        }

        // If admin left, assign new admin if none left
        if (group.admins.length === 0 && group.members.length > 0) {
            group.admins.push(group.members[0]);
        }

        await group.save();
        const populatedGroup = await Group.findById(groupId)
            .populate("members", "fullName profilePic")
            .populate("admins", "fullName profilePic");
        res.status(200).json(populatedGroup);
    } catch (error) {
        console.error("Error in removeMember:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
