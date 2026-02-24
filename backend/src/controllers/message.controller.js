import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    // Fetch the current user with populated contacts
    const currentUser = await User.findById(loggedInUserId).populate("contacts", "-password").select("-password");

    // Return the contacts list (or empty array if none)
    res.status(200).json(currentUser.contacts || []);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addContact = async (req, res) => {
  try {
    const { email } = req.body;
    const currentUserId = req.user._id;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    console.log("Adding contact, searching for email:", email);

    // Case-insensitive search
    const userToAdd = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, "i") } });

    if (!userToAdd) {
      console.log("User not found in DB for email:", email);
      return res.status(404).json({ message: "User not found" });
    }

    if (userToAdd._id.toString() === currentUserId.toString()) {
      return res.status(400).json({ message: "You cannot add yourself" });
    }

    const currentUser = await User.findById(currentUserId);

    if (currentUser.contacts.includes(userToAdd._id)) {
      return res.status(400).json({ message: "User already in contacts" });
    }

    currentUser.contacts.push(userToAdd._id);
    await currentUser.save();

    // Return the new contact (excluding password)
    const newContact = await User.findById(userToAdd._id).select("-password");

    res.status(200).json(newContact);
  } catch (error) {
    console.error("Error in addContact: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, audio } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl, audioUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }
    if (audio) {
      const uploadResponse = await cloudinary.uploader.upload(audio, {
        resource_type: "video",
        folder: "audio_messages",
      });
      audioUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      audio: audioUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const senderId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.senderId.toString() !== senderId.toString()) {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }

    await Message.findByIdAndDelete(messageId);

    const receiverSocketId = getReceiverSocketId(message.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", messageId);
    }

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.log("Error in deleteMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { text } = req.body;
    const senderId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.senderId.toString() !== senderId.toString()) {
      return res.status(403).json({ message: "You can only edit your own messages" });
    }

    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      { text, isEdited: true },
      { new: true }
    );

    const receiverSocketId = getReceiverSocketId(message.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageUpdated", updatedMessage);
    }

    res.status(200).json(updatedMessage);
  } catch (error) {
    console.log("Error in editMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const markMessagesAsSeen = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    await Message.updateMany(
      { senderId: userToChatId, receiverId: myId, isSeen: false },
      { $set: { isSeen: true } }
    );

    const senderSocketId = getReceiverSocketId(userToChatId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesSeen", { seenBy: myId, senderId: userToChatId });
    }

    res.status(200).json({ message: "Messages marked as seen" });
  } catch (error) {
    console.log("Error in markMessagesAsSeen controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const toggleStarMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const myId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    // Only sender or receiver can star
    if (message.senderId.toString() !== myId.toString() && message.receiverId.toString() !== myId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    message.isStarred = !message.isStarred;
    await message.save();

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in toggleStarMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const togglePinMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const myId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (message.senderId.toString() !== myId.toString() && message.receiverId.toString() !== myId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    message.isPinned = !message.isPinned;
    await message.save();

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in togglePinMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
