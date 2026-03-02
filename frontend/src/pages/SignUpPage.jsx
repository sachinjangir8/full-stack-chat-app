import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Eye, EyeOff, Loader2, Lock, Mail, MessageSquare, User, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";

import AuthImagePattern from "../components/AuthImagePattern";
import toast from "react-hot-toast";

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    mobile: "",
  });

  const { signup, isSigningUp, verifySignup, resendOtp } = useAuthStore();

  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [verificationData, setVerificationData] = useState({
    userId: null,
    emailOtp: "",
  });

  const startResendTimer = () => {
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) return toast.error("Full name is required");
    if (!formData.email.trim()) return toast.error("Email is required");
    if (!/\S+@\S+\.\S+/.test(formData.email)) return toast.error("Invalid email format");
    if (!formData.mobile) return toast.error("Mobile number is required");
    if (formData.mobile.length < 10) return toast.error("Mobile number must be at least 10 digits");
    if (!formData.password) return toast.error("Password is required");
    if (formData.password.length < 6) return toast.error("Password must be at least 6 characters");

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = validateForm();
    if (success === true) {
      const data = await signup(formData);
      if (data) {
        setVerificationData({ ...verificationData, userId: data.userId });
        setIsVerifying(true);
        startResendTimer();
      }
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    const data = await resendOtp(formData);
    if (data) {
      setVerificationData({ ...verificationData, userId: data.userId });
      startResendTimer();
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    if (!verificationData.emailOtp) return toast.error("Please enter Email OTP");

    await verifySignup({ userId: verificationData.userId, emailOtp: verificationData.emailOtp });
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex justify-center items-center p-4">
        <div className="bg-base-100 p-8 rounded-lg shadow-lg w-full max-w-md">
          <h2 className="text-2xl font-bold mb-2 text-center">Verify Your Account</h2>
          <p className="text-center text-sm text-base-content/60 mb-6">
            We've sent a 6-digit code to <span className="font-semibold">{formData.email}</span>.
            Check your inbox and spam folder.
          </p>

          <form onSubmit={handleVerificationSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email Verification Code</span>
              </label>
              <input
                type="text"
                maxLength="6"
                placeholder="000000"
                className="input input-bordered w-full text-center text-2xl tracking-[12px] font-mono"
                value={verificationData.emailOtp}
                onChange={(e) => setVerificationData({ ...verificationData, emailOtp: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={isSigningUp}>
              {isSigningUp ? <Loader2 className="size-5 animate-spin" /> : "Verify & Login"}
            </button>

            <div className="text-center mt-4">
              <p className="text-sm text-base-content/60">
                Didn't receive the code?{" "}
                {resendTimer > 0 ? (
                  <span className="text-primary font-medium">Wait {resendTimer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="link link-primary font-medium"
                    disabled={isSigningUp}
                  >
                    Resend Code
                  </button>
                )}
              </p>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm w-full mt-2"
              onClick={() => setIsVerifying(false)}
            >
              Back to Signup
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* left side */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* LOGO */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div
                className="size-12 rounded-xl bg-primary/10 flex items-center justify-center 
              group-hover:bg-primary/20 transition-colors overflow-hidden"
              >
                <img src="/logo.png" alt="Logo" className="size-10 object-contain" />
              </div>
              <h1 className="text-2xl font-bold mt-2">Create Account</h1>
              <p className="text-base-content/60">Get started with your free account</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Full Name</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="size-5 text-base-content/40" />
                </div>
                <input
                  type="text"
                  className={`input input-bordered w-full pl-10`}
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="size-5 text-base-content/40" />
                </div>
                <input
                  type="email"
                  className={`input input-bordered w-full pl-10`}
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Mobile Number</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Smartphone className="size-5 text-base-content/40" />
                </div>
                <input
                  type="tel"
                  className={`input input-bordered w-full pl-10`}
                  placeholder="1234567890"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="size-5 text-base-content/40" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className={`input input-bordered w-full pl-10`}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="size-5 text-base-content/40" />
                  ) : (
                    <Eye className="size-5 text-base-content/40" />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={isSigningUp}>
              {isSigningUp ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Loading...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-base-content/60">
              Already have an account?{" "}
              <Link to="/login" className="link link-primary">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* right side */}

      <AuthImagePattern
        title="Join our community"
        subtitle="Connect with friends, share moments, and stay in touch with your loved ones."
      />
    </div>
  );
};
export default SignUpPage;
