import { createContext, useContext, useState, ReactNode } from "react";

interface ProfileOverride {
  name?: string;
  avatarUrl?: string;
  planName?: string;
  planCancelled?: boolean;
}

interface ProfileCtx {
  override: ProfileOverride;
  updateOverride: (data: ProfileOverride) => void;
}

const ProfileContext = createContext<ProfileCtx>({
  override: {},
  updateOverride: () => {},
});

export const useProfileOverride = () => useContext(ProfileContext);

const STORAGE_KEY = "rh_profile_override";

function loadFromStorage(): ProfileOverride {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export const ProfileOverrideProvider = ({ children }: { children: ReactNode }) => {
  const [override, setOverride] = useState<ProfileOverride>(loadFromStorage);

  const updateOverride = (data: ProfileOverride) => {
    const next = { ...override, ...data };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setOverride(next);
  };

  return (
    <ProfileContext.Provider value={{ override, updateOverride }}>
      {children}
    </ProfileContext.Provider>
  );
};
