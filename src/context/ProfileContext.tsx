'use client';

import { createContext, useContext } from 'react';

export type DashboardProfile = {
    username: string | null;
    avatarUrl: string | null;
};

const ProfileContext = createContext<DashboardProfile>({ username: null, avatarUrl: null });

export function ProfileProvider({ profile, children }: { profile: DashboardProfile; children: React.ReactNode }) {
    return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
    return useContext(ProfileContext);
}
