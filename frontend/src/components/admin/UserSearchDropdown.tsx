"use client";

import { useEffect, useState, useRef } from "react";
import { Search, X, User as UserIcon, Check, Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Props {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function UserSearchDropdown({ selectedIds, onSelectionChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load users when dropdown opens or search changes
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const url = search.trim()
          ? `${API_BASE}/admin/users?search=${encodeURIComponent(search.trim())}&limit=50`
          : `${API_BASE}/admin/users?limit=50`;
        const res = await fetchWithAuth(url, {});
        if (res.ok) {
          const data = await res.json();
          setUsers(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 250); // debounce
    return () => clearTimeout(timer);
  }, [open, search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load details of already-selected users on mount
  useEffect(() => {
    if (selectedIds.length === 0) {
      setSelectedUsers([]);
      return;
    }
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/admin/users?limit=200`, {});
        if (res.ok) {
          const all = await res.json();
          setSelectedUsers(all.filter((u: User) => selectedIds.includes(u.id)));
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const toggleUser = (user: User) => {
    const isSelected = selectedIds.includes(user.id);
    const newIds = isSelected
      ? selectedIds.filter((id) => id !== user.id)
      : [...selectedIds, user.id];
    onSelectionChange(newIds);

    if (isSelected) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const removeUser = (id: string) => {
    onSelectionChange(selectedIds.filter((uid) => uid !== id));
    setSelectedUsers(selectedUsers.filter((u) => u.id !== id));
  };

  const displayName = (u: User) => u.full_name || u.email.split("@")[0];

  return (
    <div ref={containerRef} className="relative">
      {/* Selected users chips */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedUsers.map((u) => (
            <span
              key={u.id}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#7559E8]/20 border border-[#7559E8]/30 px-2 py-1 text-xs text-white"
            >
              <span className="font-medium">{displayName(u)}</span>
              <button
                type="button"
                onClick={() => removeUser(u.id)}
                className="text-[#A78BFA] hover:text-white transition"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="flex items-center gap-2 w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 cursor-text hover:border-white/20 transition"
      >
        <Search size={16} className="text-[#7A8199]" />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={selectedIds.length > 0 ? "Add more users..." : "Search by name or email..."}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-[#7A8199] focus:outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setSearch(""); }}
            className="text-[#7A8199] hover:text-white transition"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-72 overflow-y-auto rounded-lg border border-white/10 bg-[#171B33] shadow-2xl shadow-black/50">
          {loading ? (
            <div className="p-4 text-center">
              <Loader2 size={16} className="animate-spin text-[#A78BFA] mx-auto" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-4 text-center text-sm text-[#7A8199]">
              {search ? "No users found." : "Type to search..."}
            </div>
          ) : (
            users.map((u) => {
              const isSelected = selectedIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleUser(u)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition border-b border-white/5 last:border-0 ${
                    isSelected ? "bg-[#7559E8]/10" : ""
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-[#7559E8]/20 border border-[#7559E8]/30 flex items-center justify-center overflow-hidden shrink-0">
                    {u.avatar_url ? (
                      <img
                        src={`http://127.0.0.1:8010${u.avatar_url}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon size={14} className="text-[#A78BFA]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm text-white font-medium truncate">
                      {u.full_name || "No name"}
                    </p>
                    <p className="text-xs text-[#7A8199] truncate">{u.email}</p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#755E8] flex items-center justify-center shrink-0">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
