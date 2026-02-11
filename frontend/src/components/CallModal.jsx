import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Video, Mic, MicOff, VideoOff } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const CallModal = ({ call, isIncoming, onClose, onAccept }) => {
    const { socket } = useAuthStore();
    const [isAccepted, setIsAccepted] = useState(false);
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);

    // WebRTC refs
    const localVideoRef = useRef();
    const remoteVideoRef = useRef();
    const peerConnectionRef = useRef();
    const localStreamRef = useRef();


    useEffect(() => {
        if (!isIncoming) {
            // If outgoing, start call immediately
            startCall();
        }

        // Cleanup on unmount
        return () => {
            endCall();
        };
    }, []);

    useEffect(() => {
        if (isIncoming && isAccepted) {
            setupIncomingCall();
        }
    }, [isIncoming, isAccepted]);

    const startCall = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            const peer = new RTCPeerConnection({
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
            });
            peerConnectionRef.current = peer;

            stream.getTracks().forEach(track => peer.addTrack(track, stream));

            peer.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("ice-candidate", { to: call.userToCall, candidate: event.candidate });
                }
            };

            peer.ontrack = (event) => {
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
            };

            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);

            socket.emit("callUser", {
                userToCall: call.userToCall,
                signalData: offer,
                from: call.from,
                name: call.name
            });

            socket.on("callAccepted", (signal) => {
                setIsAccepted(true);
                peer.setRemoteDescription(new RTCSessionDescription(signal));
            });

            socket.on("ice-candidate", (candidate) => {
                peer.addIceCandidate(new RTCIceCandidate(candidate));
            });

            socket.on("callEnded", () => {
                onClose();
            });

        } catch (error) {
            console.error("Error starting call:", error);
            toast.error("Could not access camera/microphone");
            onClose();
        }
    };

    const setupIncomingCall = async () => {
        try {
            // Same setup but with answer
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            const peer = new RTCPeerConnection({
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
            });
            peerConnectionRef.current = peer;

            stream.getTracks().forEach(track => peer.addTrack(track, stream));

            peer.onicecandidate = (event) => {
                if (event.candidate) {
                    // Send to caller (which is call.from)
                    socket.emit("ice-candidate", { to: call.from, candidate: event.candidate });
                }
            };

            peer.ontrack = (event) => {
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
            };

            peer.setRemoteDescription(new RTCSessionDescription(call.signal));

            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);

            socket.emit("answerCall", { signal: answer, to: call.from });

            socket.on("ice-candidate", (candidate) => {
                peer.addIceCandidate(new RTCIceCandidate(candidate));
            });

            socket.on("callEnded", () => {
                onClose();
            });

        } catch (error) {
            console.error("Error answering call:", error);
        }
    };

    const endCall = () => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        // Emit end call signal
        socket.emit("endCall", { to: isIncoming ? call.from : call.userToCall });

        // Remove listeners
        socket.off("callAccepted");
        socket.off("ice-candidate");
        socket.off("callEnded");

        onClose();
    };

    const toggleMic = () => {
        // Implement toggle logic on stream
        setMicOn(!micOn);
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks()[0].enabled = !micOn;
        }
    };

    const toggleCamera = () => {
        setCameraOn(!cameraOn);
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks()[0].enabled = !cameraOn;
        }
    };


    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-base-100 rounded-3xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden relative">

                {/* Header */}
                <div className="absolute top-4 left-4 z-10 bg-black/40 px-4 py-2 rounded-full text-white backdrop-blur-md">
                    <h3 className="font-semibold">{isIncoming ? call.name : "Calling..."}</h3>
                    {isAccepted && <span className="text-xs text-green-400">Connected</span>}
                </div>

                {/* Main Video Area (Remote) */}
                <div className="flex-1 bg-black relative flex items-center justify-center">
                    {!isAccepted && !isIncoming && (
                        <div className="text-white text-center animate-pulse">
                            <p className="text-xl">Calling {call.name}...</p>
                        </div>
                    )}
                    {isIncoming && !isAccepted && (
                        <div className="text-white text-center">
                            <div className="size-24 rounded-full bg-base-300 mx-auto mb-4 flex items-center justify-center">
                                <Phone className="size-10 animate-shake" />
                            </div>
                            <p className="text-2xl font-bold">{call.name}</p>
                            <p className="text-zinc-400">Incoming Video Call...</p>
                        </div>
                    )}

                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className={`w-full h-full object-cover ${!isAccepted ? 'hidden' : ''}`}
                    />
                </div>

                {/* Local Video (PiP) */}
                {(isAccepted || !isIncoming) && (
                    <div className="absolute bottom-24 right-4 w-48 h-36 bg-zinc-900 rounded-xl overflow-hidden border-2 border-base-100 shadow-xl">
                        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    </div>
                )}


                {/* Controls */}
                <div className="bg-base-200 p-6 flex items-center justify-center gap-6">
                    {isIncoming && !isAccepted ? (
                        <>
                            <button
                                onClick={endCall}
                                className="btn btn-error btn-circle btn-lg text-white shadow-lg transform hover:scale-110 transition-transform"
                            >
                                <PhoneOff size={28} />
                            </button>
                            <button
                                onClick={() => { setIsAccepted(true); onAccept?.(); }}
                                className="btn btn-success btn-circle btn-lg text-white shadow-lg animate-pulse"
                            >
                                <Video size={28} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={toggleMic} className={`btn btn-circle btn-lg ${micOn ? 'btn-ghost bg-base-300' : 'btn-error'}`}>
                                {micOn ? <Mic size={24} /> : <MicOff size={24} />}
                            </button>
                            <button onClick={endCall} className="btn btn-error btn-circle btn-lg text-white transform hover:scale-110 transition-transform">
                                <PhoneOff size={28} />
                            </button>
                            <button onClick={toggleCamera} className={`btn btn-circle btn-lg ${cameraOn ? 'btn-ghost bg-base-300' : 'btn-error'}`}>
                                {cameraOn ? <Video size={24} /> : <VideoOff size={24} />}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CallModal;
