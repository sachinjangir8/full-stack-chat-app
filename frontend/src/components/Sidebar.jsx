import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useLocationStore } from "../store/useLocationStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, MapPin, UserPlus, Search, Bell, Clock } from "lucide-react";
import toast from "react-hot-toast";
import ProfileModal from "./ProfileModal";
import CallHistory from "./CallHistory";
import { axiosInstance } from "../lib/axios";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading, addContact } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const { nearbyUsers, getNearbyUsers, getCurrentLocation, isLoadingNearby, isFindingLocation } = useLocationStore();

  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showNearbyOnly, setShowNearbyOnly] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const [selectedProfileUser, setSelectedProfileUser] = useState(null);
  const [friendRequests, setFriendRequests] = useState([]);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  useEffect(() => {
    if (showNearbyOnly) {
      getCurrentLocation();
    }
  }, [showNearbyOnly, getCurrentLocation]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await axiosInstance.get("/requests/get");
      setFriendRequests(res.data);
    } catch (error) {
      console.error("Failed to fetch requests", error);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await axiosInstance.post("/requests/accept", { requestId });
      toast.success("Request accepted!");
      setFriendRequests(prev => prev.filter(r => r._id !== requestId));
      getUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to accept");
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await axiosInstance.post("/requests/reject", { requestId });
      toast.success("Request rejected");
      setFriendRequests(prev => prev.filter(r => r._id !== requestId));
    } catch (error) {
      toast.error("Failed to reject");
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    const newUser = await addContact(emailInput.trim());

    if (newUser) {
      setIsAddingUser(false);
      setEmailInput("");
    }
  };

  const filteredUsers = showNearbyOnly
    ? nearbyUsers
    : showOnlineOnly
      ? users.filter((user) => onlineUsers.includes(user._id))
      : users;

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-full border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-6" />
            <span className="font-medium hidden lg:block">Contacts</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setShowRequests(!showRequests);
                setIsAddingUser(false);
                setShowCallHistory(false);
              }}
              className={`btn btn-ghost btn-xs btn-circle ${showRequests ? "text-primary bg-base-200" : ""}`}
              title="Friend Requests"
            >
              <div className="indicator">
                <Bell size={20} />
                {friendRequests.length > 0 && (
                  <span className="indicator-item badge badge-xs badge-primary"></span>
                )}
              </div>
            </button>
            <button
              onClick={() => {
                setShowCallHistory(!showCallHistory);
                setShowRequests(false);
                setIsAddingUser(false);
              }}
              className={`btn btn-ghost btn-xs btn-circle ${showCallHistory ? "text-primary bg-base-200" : ""}`}
              title="Call History"
            >
              <Clock size={20} />
            </button>
            {!showNearbyOnly && (
              <button
                onClick={() => {
                  setIsAddingUser(!isAddingUser);
                  setShowRequests(false);
                }}
                className="btn btn-ghost btn-xs btn-circle"
                title="Add User by Email"
              >
                <UserPlus size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Add User Input */}
        {isAddingUser && !showNearbyOnly && (
          <form onSubmit={handleAddUser} className="mt-4 flex gap-2">
            <input
              type="email"
              placeholder="Enter email..."
              className="input input-sm input-bordered w-full"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn-sm btn-primary btn-square">
              <Search size={16} />
            </button>
          </form>
        )}

        {/* Filters */}
        <div className="mt-3 flex flex-col gap-2">
          {!showRequests && (
            <>
              <label className="cursor-pointer flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showOnlineOnly}
                  onChange={(e) => {
                    setShowOnlineOnly(e.target.checked);
                    if (e.target.checked) setShowNearbyOnly(false);
                  }}
                  className="checkbox checkbox-sm"
                />
                <span className="text-sm">Show online only</span>
                <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
              </label>

              <label className="cursor-pointer flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showNearbyOnly}
                  onChange={(e) => {
                    setShowNearbyOnly(e.target.checked);
                    if (e.target.checked) setShowOnlineOnly(false);
                    if (e.target.checked) setIsAddingUser(false);
                  }}
                  className="checkbox checkbox-sm"
                />
                <span className="text-sm">Show nearby (500m)</span>
              </label>
            </>
          )}
        </div>
      </div>

      <div
        className="overflow-y-auto w-full py-3"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowRequests(false);
            setIsAddingUser(false);
          }
        }}
      >
        {showRequests ? (
          <div className="px-4 space-y-4">
            <h3 className="text-sm font-medium text-zinc-500 mb-2">Friend Requests</h3>
            {friendRequests.length === 0 && (
              <div className="text-center text-zinc-500 text-sm py-4">No pending requests</div>
            )}
            {friendRequests.map((req) => (
              <div key={req._id} className="bg-base-200 p-3 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <img src={req.from.profilePic || "/avatar.png"} alt={req.from.fullName} className="size-10 rounded-full object-cover" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{req.from.fullName}</div>
                    <div className="text-xs text-zinc-500 truncate">{req.from.email}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptRequest(req._id)}
                    className="btn btn-sm btn-primary flex-1"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectRequest(req._id)}
                    className="btn btn-sm btn-ghost flex-1"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : showCallHistory ? (
          <div className="h-full">
            <CallHistory />
          </div>
        ) : (
          <>
            {showNearbyOnly && isFindingLocation && (
              <div className="text-center text-zinc-500 py-4 text-sm">Finding location...</div>
            )}

            {showNearbyOnly && isLoadingNearby && !isFindingLocation && (
              <div className="text-center text-zinc-500 py-4 text-sm">Looking for users nearby...</div>
            )}

            {filteredUsers.map((user) => (
              <button
                key={user._id}
                onClick={() => {
                  if (showNearbyOnly) {
                    setSelectedProfileUser(user);
                  } else {
                    setSelectedUser(user);
                  }
                }}
                className={`
              w-full p-3 flex items-center gap-3
              hover:bg-base-300 transition-colors
              ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
            `}
              >
                <div className="relative mx-auto lg:mx-0">
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.name}
                    className="size-12 object-cover rounded-full"
                  />
                  {onlineUsers.includes(user._id) && (
                    <span
                      className="absolute bottom-0 right-0 size-3 bg-green-500 
                  rounded-full ring-2 ring-zinc-900"
                    />
                  )}
                </div>

                {/* User info - only visible on larger screens */}
                <div className="text-left min-w-0">
                  <div className="font-medium truncate">{user.fullName}</div>
                  <div className="text-sm text-zinc-400">
                    {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                  </div>
                  {showNearbyOnly && user.distance !== undefined && (
                    <div className="text-xs text-primary font-medium">
                      {user.distance < 1000
                        ? `${Math.round(user.distance)}m away`
                        : `${(user.distance / 1000).toFixed(1)}km away`}
                    </div>
                  )}
                  {user.interests && user.interests.length > 0 && (
                    <div className="text-xs text-zinc-500 truncate" title={user.interests.join(", ")}>
                      {user.interests.slice(0, 2).join(", ")}{user.interests.length > 2 && "..."}
                    </div>
                  )}
                </div>
              </button>
            ))}

            {filteredUsers.length === 0 && !isFindingLocation && !isLoadingNearby && (
              <div className="text-center text-zinc-500 py-4">
                {showNearbyOnly ? "No users nearby" : "No users found"}
              </div>
            )}
          </>
        )}
      </div>
      <ProfileModal
        user={selectedProfileUser}
        onClose={() => setSelectedProfileUser(null)}
      />
    </aside>
  );
};
export default Sidebar;
