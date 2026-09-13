export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
    // Jangan memberi animation/opacity/transform pada ancestor route.
    // Stacking context dari wrapper dapat membuat modal fixed berada di bawah sidebar.
    return <>{children}</>;
}
