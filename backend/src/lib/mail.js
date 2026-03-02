import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // use SSL
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Verify environment variables are loaded
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("[MailLib] WARNING: EMAIL_USER or EMAIL_PASS environment variables are missing!");
} else {
    console.log(`[MailLib] Email transport initialized for: ${process.env.EMAIL_USER}`);
}

export const sendEmailOtp = async (email, otp) => {
    try {
        console.log(`[MailLib] Attempting to send OTP to: ${email}`);
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Your Chat App Verification Code",
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #4F46E5;">Verify Your Email</h2>
          <p>Your verification code is:</p>
          <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #4F46E5; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p style="font-size: 12px; color: #666;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
        };

        const startTime = Date.now();
        const info = await transporter.sendMail(mailOptions);
        const duration = Date.now() - startTime;

        console.log(`[MailLib] Email sent successfully in ${duration}ms: ${info.response}`);
        return true;
    } catch (error) {
        console.error("[MailLib] Critical Error sending email:", error);
        return false;
    }
};
