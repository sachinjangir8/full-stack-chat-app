import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import AuthImagePattern from "../components/AuthImagePattern";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import toast from "react-hot-toast";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const { login, isLoggingIn, verifySignup, resendOtp } = useAuthStore();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(formData);

    // If account exists but is unverified (403), switch to verification view
    if (result && result.userId) {
      setVerificationData({ ...verificationData, userId: result.userId });
      setIsVerifying(true);
      startResendTimer();
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    // We use the signup endpoint for resending as it regenerates the OTP
    const data = await resendOtp({
      email: formData.email,
      password: formData.password,
      fullName: "User", // Placeholder or fetch if possible
      mobile: "0000000000" // Placeholder
    });
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
            Your account is not verified. We've triggered a code to <span className="font-semibold">{formData.email}</span>.
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

            <button type="submit" className="btn btn-primary w-full" disabled={isLoggingIn}>
              {isLoggingIn ? <Loader2 className="size-5 animate-spin" /> : "Verify & Login"}
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
              Back to Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen grid lg:grid-cols-2">
      {/* Left Side - Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div
                className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20
              transition-colors overflow-hidden"
              >
                <img src="/logo.png" alt="Logo" className="size-10 object-contain" />
              </div>
              <h1 className="text-2xl font-bold mt-2">Welcome Back</h1>
              <p className="text-base-content/60">Sign in to your account</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-base-content/40" />
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
                <span className="label-text font-medium">Password</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-base-content/40" />
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
                    <EyeOff className="h-5 w-5 text-base-content/40" />
                  ) : (
                    <Eye className="h-5 w-5 text-base-content/40" />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={isLoggingIn}>
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-base-content/60">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="link link-primary">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Image/Pattern */}
      <AuthImagePattern
        title={"Welcome back!"}
        subtitle={"Sign in to continue your conversations and catch up with your messages."}
      />
    </div>
  );
};

export default LoginPage;
