import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import twilio from "twilio";

import { sendEmailOtp } from "../lib/mail.js";

export const signup = async (req, res) => {
  const { fullName, email, password, mobile } = req.body;
  try {
    if (!fullName || !email || !password || !mobile) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });
    if (user && user.isVerified) return res.status(400).json({ message: "Email already exists" });

    const existingMobile = await User.findOne({ mobile });
    if (existingMobile && existingMobile.isVerified) return res.status(400).json({ message: "Mobile number already exists" });

    // Generate OTPs
    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const mobileOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTPs and Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const emailOtpHash = await bcrypt.hash(emailOtp, salt);
    const mobileOtpHash = await bcrypt.hash(mobileOtp, salt);

    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Create or Update User
    let newUser;
    if (user && !user.isVerified) {
      newUser = user;
      newUser.fullName = fullName;
      newUser.password = hashedPassword;
      newUser.mobile = mobile;
      newUser.emailOtp = emailOtpHash;
      newUser.mobileOtp = mobileOtpHash;
      newUser.otpExpiry = otpExpiry;
    } else {
      newUser = new User({
        fullName,
        email,
        password: hashedPassword,
        mobile,
        emailOtp: emailOtpHash,
        mobileOtp: mobileOtpHash,
        otpExpiry,
        isVerified: false,
      });
    }

    await newUser.save();

    // Send OTPs
    // 1. Email
    await sendEmailOtp(email, emailOtp);

    // 2. Mobile (Twilio)
    try {
      const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: `Your Chat App Verification Code is: ${mobileOtp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: mobile,
      });
    } catch (twilioError) {
      console.error("Twilio Error:", twilioError);
      // Continue even if SMS fails, user can resend
    }

    res.status(200).json({
      message: "Verification OTPs sent to email and mobile",
      userId: newUser._id,
      email,
      mobile
    });

  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifySignup = async (req, res) => {
  const { userId, emailOtp, mobileOtp } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.isVerified) return res.status(400).json({ message: "User already verified" });

    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "OTPs expired. Please resend." });
    }

    const isEmailMatch = await bcrypt.compare(emailOtp, user.emailOtp);
    const isMobileMatch = await bcrypt.compare(mobileOtp, user.mobileOtp);

    if (!isEmailMatch || !isMobileMatch) {
      return res.status(400).json({ message: "Invalid Email or Mobile OTP" });
    }

    user.isVerified = true;
    user.emailOtp = undefined;
    user.mobileOtp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      profilePic: user.profilePic,
      isGhostMode: user.isGhostMode || false,
      interests: user.interests || [],
      bio: user.bio || "",
      age: user.age,
      gender: user.gender || "",
    });

  } catch (error) {
    console.log("Error in verifySignup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      isGhostMode: user.isGhostMode || false,
      interests: user.interests || [],
      bio: user.bio || "",
      age: user.age,
      gender: user.gender || "",
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const sendOtp = async (req, res) => {
  const { mobile } = req.body;
  if (!mobile) return res.status(400).json({ message: "Mobile number is required" });

  try {
    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    // Expiry 5 mins
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    // Find user and update, or upsert
    let user = await User.findOne({ mobile });

    if (user) {
      user.otp = otpHash;
      user.otpExpiry = otpExpiry;
      await user.save();
    } else {
      return res.status(404).json({ message: "User not found. Please sign up first." });
    }

    // Send OTP via Twilio
    const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    await client.messages.create({
      body: `Your OTP for Chat App is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: mobile,
    });

    res.status(200).json({ message: "OTP sent successfully" });

  } catch (error) {
    console.log("Error in sendOtp controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifyOtp = async (req, res) => {
  const { mobile, otp } = req.body;
  try {
    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const isMatch = await bcrypt.compare(otp, user.otp);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Clear OTP
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      mobile: user.mobile,
      isGhostMode: user.isGhostMode,
      interests: user.interests,
      bio: user.bio,
      age: user.age,
      gender: user.gender,
    });

  } catch (error) {
    console.log("Error in verifyOtp controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic, interests, isGhostMode, bio, age, gender } = req.body;
    const userId = req.user._id;

    let updateData = {};

    if (profilePic) {
      const uploadResponse = await cloudinary.uploader.upload(profilePic);
      updateData.profilePic = uploadResponse.secure_url;
    }

    if (interests !== undefined) updateData.interests = interests;
    if (isGhostMode !== undefined) updateData.isGhostMode = isGhostMode;
    if (bio !== undefined) updateData.bio = bio;
    if (age !== undefined) updateData.age = age;
    if (gender !== undefined) updateData.gender = gender;
    if (req.body.publicKey !== undefined) updateData.publicKey = req.body.publicKey;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
