import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useLocationStore } from "../store/useLocationStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, MapPin, UserPlus, Search } from "lucide-react";
import toast from "react-hot-toast";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading, addContact } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const { nearbyUsers, getNearbyUsers, getCurrentLocation, isLoadingNearby, isFindingLocation } = useLocationStore();

  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showNearbyOnly, setShowNearbyOnly] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  useEffect(() => {
    if (showNearbyOnly) {
      getCurrentLocation();
    }
  }, [showNearbyOnly, getCurrentLocation]);

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
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-6" />
            <span className="font-medium hidden lg:block">Contacts</span>
          </div>
          {!showNearbyOnly && (
            <button
              onClick={() => setIsAddingUser(!isAddingUser)}
              className="btn btn-ghost btn-xs btn-circle"
              title="Add User by Email"
            >
              <UserPlus size={20} />
            </button>
          )}
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
        <div className="mt-3 hidden lg:flex flex-col gap-2">
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
            <MapPin size={14} className="text-primary" />
          </label>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-3">
        {showNearbyOnly && isFindingLocation && (
          <div className="text-center text-zinc-500 py-4 text-sm">Finding location...</div>
        )}

        {showNearbyOnly && isLoadingNearby && !isFindingLocation && (
          <div className="text-center text-zinc-500 py-4 text-sm">Looking for users nearby...</div>
        )}

        {filteredUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => setSelectedUser(user)}
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
            <div className="hidden lg:block text-left min-w-0">
              <div className="font-medium truncate">{user.fullName}</div>
              <div className="text-sm text-zinc-400">
                {onlineUsers.includes(user._id) ? "Online" : "Offline"}
              </div>
            </div>
          </button>
        ))}

        {filteredUsers.length === 0 && !isFindingLocation && !isLoadingNearby && (
          <div className="text-center text-zinc-500 py-4">
            {showNearbyOnly ? "No users nearby" : "No users found"}
          </div>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;
