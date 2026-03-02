import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

import { sendEmailOtp } from "../lib/mail.js";

const formatNumber = (num) => num && (num.startsWith("+") ? num : `+${num}`);

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

    // Generate Email OTP
    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP and Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const emailOtpHash = await bcrypt.hash(emailOtp, salt);

    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Create or Update User
    let newUser;
    if (user && !user.isVerified) {
      newUser = user;
      newUser.fullName = fullName;
      newUser.password = hashedPassword;
      newUser.mobile = mobile;
      newUser.emailOtp = emailOtpHash;
      newUser.otpExpiry = otpExpiry;
    } else {
      newUser = new User({
        fullName,
        email,
        password: hashedPassword,
        mobile,
        emailOtp: emailOtpHash,
        otpExpiry,
        isVerified: false,
      });
    }

    await newUser.save();

    // Send OTPs
    console.log(`Starting OTP delivery for ${email}...`);

    // 1. Send Email OTP (Awaiting to ensure delivery for debugging)
    console.log(`[Signup] Starting Email OTP delivery for ${email}...`);
    try {
      const emailSent = await sendEmailOtp(email, emailOtp);
      if (emailSent) {
        console.log("[Signup] Email OTP sent successfully.");
      } else {
        console.warn("[Signup] Email OTP failed to send (Returned false).");
      }
    } catch (emailError) {
      console.error("[Signup] Critical error in email delivery flow:", emailError);
    }

    console.log("[Signup] Process complete, sending response to user.");
    res.status(200).json({
      message: "Verification OTP has been sent to your email. Please check your inbox (and spam folder).",
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
  const { userId, emailOtp } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.isVerified) return res.status(400).json({ message: "User already verified" });

    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "OTPs expired. Please resend." });
    }

    const isEmailMatch = await bcrypt.compare(emailOtp, user.emailOtp);

    if (!isEmailMatch) {
      return res.status(400).json({ message: "Invalid Email OTP" });
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

    if (!user.isVerified) {
      return res.status(403).json({ message: "Account not verified. Please sign up again to receive a new verification code." });
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
    // This function is now deprecated after switching to Firebase Auth
    res.status(501).json({ message: "This endpoint is deprecated. Use Firebase Phone Auth on the frontend." });

    res.status(200).json({ message: "OTP sent successfully" });

  } catch (error) {
    console.log("Error in sendOtp controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifyOtp = async (req, res) => {
  // This function is now deprecated
  res.status(501).json({ message: "Mobile OTP login is no longer supported. Please use Email/Password login." });
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
