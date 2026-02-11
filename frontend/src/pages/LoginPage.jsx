import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import AuthImagePattern from "../components/AuthImagePattern";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail, MessageSquare, Smartphone, KeyRound } from "lucide-react";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const { login, isLoggingIn, sendOtp, verifyOtp } = useAuthStore();

  const [loginMethod, setLoginMethod] = useState("email"); // email or mobile
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loginMethod === "email") {
      login(formData);
    } else {
      if (!isOtpSent) {
        const success = await sendOtp(mobile);
        if (success) setIsOtpSent(true);
      } else {
        verifyOtp(mobile, otp);
      }
    }
  };

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
              transition-colors"
              >
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mt-2">Welcome Back</h1>
              <p className="text-base-content/60">Sign in to your account</p>
            </div>
          </div>

          {/* Login Method Toggle */}
          <div className="flex gap-4 justify-center mb-6">
            <button
              onClick={() => setLoginMethod("email")}
              className={`btn btn-sm ${loginMethod === "email" ? "btn-primary" : "btn-ghost"}`}
            >
              Email
            </button>
            <button
              onClick={() => setLoginMethod("mobile")}
              className={`btn btn-sm ${loginMethod === "mobile" ? "btn-primary" : "btn-ghost"}`}
            >
              Mobile
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">

            {loginMethod === "email" ? (
              <>
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
              </>
            ) : (
              <>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Mobile Number</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Smartphone className="h-5 w-5 text-base-content/40" />
                    </div>
                    <input
                      type="tel"
                      className={`input input-bordered w-full pl-10`}
                      placeholder="1234567890"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      disabled={isOtpSent}
                    />
                  </div>
                </div>

                {isOtpSent && (
                  <div className="form-control animate-fade-in-up">
                    <label className="label">
                      <span className="label-text font-medium">OTP Code</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <KeyRound className="h-5 w-5 text-base-content/40" />
                      </div>
                      <input
                        type="text"
                        className={`input input-bordered w-full pl-10`}
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                      />
                    </div>
                    <label className="label">
                      <span className="label-text-alt link link-hover" onClick={() => setIsOtpSent(false)}>Change Number?</span>
                    </label>
                  </div>
                )}
              </>
            )}

            <button type="submit" className="btn btn-primary w-full" disabled={isLoggingIn}>
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading...
                </>
              ) : (
                loginMethod === "email" ? "Sign in" : (isOtpSent ? "Verify & Login" : "Send OTP")
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
