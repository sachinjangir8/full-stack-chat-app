import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useLocationStore } from "../store/useLocationStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, MapPin, UserPlus, Search, Bell, Clock, Plus } from "lucide-react";
import { Users as GroupsIcon } from "lucide-react";
import toast from "react-hot-toast";
import ProfileModal from "./ProfileModal";
import GroupCreationModal from "./GroupCreationModal";
import CallHistory from "./CallHistory";
import { axiosInstance } from "../lib/axios";

const Sidebar = () => {
  const {
    getUsers, users, selectedUser, setSelectedUser, isUsersLoading, addContact,
    getGroups, groups, selectedGroup, setSelectedGroup, isGroupsLoading
  } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const { nearbyUsers, getNearbyUsers, getCurrentLocation, isLoadingNearby, isFindingLocation } = useLocationStore();

  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("contacts"); // "contacts" | "groups" | "discovery"
  const [showRequests, setShowRequests] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [interestSearch, setInterestSearch] = useState("");

  const [selectedProfileUser, setSelectedProfileUser] = useState(null);
  const [friendRequests, setFriendRequests] = useState([]);

  const { discoveryResults, searchUsersByInterests, isDiscoveryLoading } = useChatStore();

  useEffect(() => {
    getUsers();
    getGroups();
  }, [getUsers, getGroups]);

  useEffect(() => {
    if (activeTab === "groups") {
      setSelectedUser(null);
    } else if (activeTab === "contacts") {
      setSelectedGroup(null);
    }
  }, [activeTab, setSelectedUser, setSelectedGroup]);

  useEffect(() => {
    fetchRequests();
    getCurrentLocation(); // Pre-fetch location for discovery
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

  const handleInterestSearch = (e) => {
    e.preventDefault();
    if (interestSearch.trim()) {
      searchUsersByInterests(interestSearch.trim());
    }
  };

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  return (
    <aside className="h-full w-full border-r border-base-300 flex flex-col transition-all duration-200">
      {/* Search and Filters Header */}
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-6" />
            <span className="font-medium hidden lg:block">Chat Room</span>
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
            {activeTab === "contacts" && (
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

        {/* Global Filters (Only for Contacts) - Moved Nearby to Discovery */}
        {activeTab === "contacts" && !showRequests && (
          <div className="mt-3 flex flex-col gap-2">
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="checkbox checkbox-sm"
              />
              <span className="text-sm">Show online only</span>
              <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
            </label>
          </div>
        )}

        {/* Discovery Tab Search */}
        {activeTab === "discovery" && (
          <form onSubmit={handleInterestSearch} className="mt-4 flex gap-2">
            <input
              type="text"
              placeholder="Search by interests (e.g. music)..."
              className="input input-sm input-bordered w-full"
              value={interestSearch}
              onChange={(e) => setInterestSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-sm btn-primary">
              <Search size={16} />
            </button>
          </form>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-base-300">
        <button
          onClick={() => setActiveTab("contacts")}
          className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "contacts" ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
        >
          Chats
        </button>
        <button
          onClick={() => setActiveTab("groups")}
          className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "groups" ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
        >
          Groups
        </button>
        <button
          onClick={() => {
            setActiveTab("discovery");
            getNearbyUsers();
          }}
          className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "discovery" ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
        >
          Discovery
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto w-full py-3 flex-1">
        {showRequests ? (
          // ... Requests UI stays same ...
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
                  <button onClick={() => handleAcceptRequest(req._id)} className="btn btn-sm btn-primary flex-1">Accept</button>
                  <button onClick={() => handleRejectRequest(req._id)} className="btn btn-sm btn-ghost flex-1">Reject</button>
                </div>
              </div>
            ))}
          </div>
        ) : showCallHistory ? (
          <div className="h-full">
            <CallHistory />
          </div>
        ) : activeTab === "groups" ? (
          <>
            <div className="px-4 mb-4">
              <button
                onClick={() => setIsCreatingGroup(true)}
                className="btn btn-sm btn-outline btn-primary w-full gap-2"
              >
                <Plus size={16} /> New Group
              </button>
            </div>
            {groups.map((group) => (
              <button
                key={group._id}
                onClick={() => setSelectedGroup(group)}
                className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${selectedGroup?._id === group._id ? "bg-base-300 ring-1 ring-base-300" : ""}`}
              >
                <div className="relative">
                  <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center">
                    {group.avatar ? (
                      <img src={group.avatar} className="size-full rounded-full object-cover" />
                    ) : (
                      <GroupsIcon className="size-6 text-primary" />
                    )}
                  </div>
                </div>
                <div className="text-left min-w-0">
                  <div className="font-medium truncate">{group.name}</div>
                  <div className="text-xs text-zinc-500">{group.members.length} members</div>
                </div>
              </button>
            ))}
            {groups.length === 0 && <div className="text-center text-zinc-500 py-4">No groups yet</div>}
          </>
        ) : activeTab === "discovery" ? (
          <>
            <div className="px-4 mb-2">
              <h3 className="text-xs font-bold text-zinc-500 flex items-center gap-2">
                <MapPin size={12} /> NEARBY (500m)
              </h3>
            </div>
            {isFindingLocation && <div className="text-center text-zinc-500 py-2 text-xs">Finding location...</div>}
            {isLoadingNearby && <div className="text-center text-zinc-500 py-2 text-xs">Looking for users...</div>}
            {nearbyUsers.map((user) => (
              <button
                key={user._id}
                onClick={() => setSelectedProfileUser(user)}
                className="w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors"
              >
                <div className="relative">
                  <img src={user.profilePic || "/avatar.png"} alt={user.fullName} className="size-12 object-cover rounded-full" />
                </div>
                <div className="text-left min-w-0">
                  <div className="font-medium truncate">{user.fullName}</div>
                  <div className="text-xs text-primary font-medium">
                    {user.distance < 1000 ? `${Math.round(user.distance)}m away` : `${(user.distance / 1000).toFixed(1)}km away`}
                  </div>
                </div>
              </button>
            ))}
            {nearbyUsers.length === 0 && !isLoadingNearby && !isFindingLocation && (
              <div className="text-center text-zinc-500 py-2 text-xs">No users nearby</div>
            )}

            {discoveryResults.length > 0 && (
              <>
                <div className="px-4 mt-4 mb-2">
                  <h3 className="text-xs font-bold text-zinc-500 flex items-center gap-2">
                    <Search size={12} /> SEARCH RESULTS
                  </h3>
                </div>
                {discoveryResults.map((user) => (
                  <button
                    key={user._id}
                    onClick={() => setSelectedProfileUser(user)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors"
                  >
                    <div className="relative">
                      <img src={user.profilePic || "/avatar.png"} alt={user.fullName} className="size-12 object-cover rounded-full" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="font-medium truncate">{user.fullName}</div>
                      <div className="text-xs text-zinc-500 truncate">
                        {user.interests?.join(", ")}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </>
        ) : (
          <>
            {filteredUsers.map((user) => (
              <button
                key={user._id}
                onClick={() => setSelectedUser(user)}
                className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}`}
              >
                <div className="relative">
                  <img src={user.profilePic || "/avatar.png"} alt={user.fullName} className="size-12 object-cover rounded-full" />
                  {onlineUsers.includes(user._id) && (
                    <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-zinc-900" />
                  )}
                </div>
                <div className="text-left min-w-0">
                  <div className="font-medium truncate">{user.fullName}</div>
                  <div className="text-sm text-zinc-400">
                    {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                  </div>
                </div>
              </button>
            ))}
            {filteredUsers.length === 0 && <div className="text-center text-zinc-500 py-4">No chats yet</div>}
          </>
        )}
      </div>

      <ProfileModal
        user={selectedProfileUser}
        onClose={() => setSelectedProfileUser(null)}
      />
      <GroupCreationModal
        isOpen={isCreatingGroup}
        onClose={() => setIsCreatingGroup(false)}
      />
    </aside>
  );
};
export default Sidebar;
