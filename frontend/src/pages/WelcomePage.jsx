import { Link } from "react-router-dom";
import { MessageSquare, ArrowRight } from "lucide-react";

const WelcomePage = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-base-200 p-4">
            <div className="max-w-md w-full text-center space-y-8 animate-fade-in-up">
                {/* Logo/Icon */}
                <div className="flex justify-center">
                    <div className="size-24 rounded-3xl bg-primary/10 flex items-center justify-center animate-bounce-slow">
                        <MessageSquare className="size-12 text-primary" />
                    </div>
                </div>

                {/* Text */}
                <div className="space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight">Welcome to ChatApp!</h1>
                    <p className="text-base-content/60 text-lg">
                        Connect with friends, share moments, and experience real-time video calling.
                    </p>
                </div>

                {/* Action */}
                <div className="pt-8">
                    <Link to="/" className="btn btn-primary btn-lg w-full gap-2 group">
                        Get Started
                        <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default WelcomePage;
