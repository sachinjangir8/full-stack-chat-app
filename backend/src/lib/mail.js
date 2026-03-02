import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const createTransporter = () => {
    return nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // Use STARTTLS
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 10000,
    });
};

let transporter;

// Verify connection on startup
const verifyConnection = async () => {
    try {
        if (!transporter) transporter = createTransporter();
        await transporter.verify();
        console.log(`[MailLib] SMTP connection verified successfully for ${process.env.EMAIL_USER}`);
    } catch (error) {
        console.error("[MailLib] SMTP Connection Warning:", error.message);
    }
};
verifyConnection();

export const sendEmailOtp = async (email, otp) => {
    try {
        if (!transporter) transporter = createTransporter();

        console.log(`[MailLib] Attempting to send OTP to: ${email}`);
        const mailOptions = {
            from: `"Chat App Verification" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `${otp} is your Chat App verification code`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
          <h2 style="color: #4F46E5; text-align: center;">Verify Your Account</h2>
          <p>Hello,</p>
          <p>Thank you for joining our Chat App. Use the following code to complete your signup process:</p>
          <div style="background: #f4f4f4; padding: 30px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #4F46E5; font-size: 32px; letter-spacing: 10px; margin: 0;">${otp}</h1>
          </div>
          <p>This code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">&copy; 2026 Chat App Team</p>
        </div>
      `,
        };

        const startTime = Date.now();
        const info = await transporter.sendMail(mailOptions);
        const duration = Date.now() - startTime;

        console.log(`[MailLib] Email sent successfully to ${email} in ${duration}ms: ${info.response}`);
        return true;
    } catch (error) {
        console.error("[MailLib] Critical Error sending email:", error);
        // Reset transporter on error to try a fresh connection next time
        transporter = null;
        return false;
    }
};
