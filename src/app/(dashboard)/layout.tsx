import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/supabase/actions';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    return (
        <div>
            <nav
                style={{
                    display: 'flex',
                    gap: 16,
                    padding: 16,
                    borderBottom: '1px solid #ddd',
                }}
            >
                <Link href="/">Ringkasan</Link>
                <Link href="/transactions">Transaksi</Link>
                <Link href="/budgets">Budget</Link>
                <Link href="/cashflow">Cash Flow</Link>
                <Link href="/settings">Settings</Link>
                <Link href="/settings/categories">Categories</Link>
                <Link href="/settings/tags">Tag</Link>
                <form action={signOut} style={{ marginLeft: 'auto' }}>
                    <button type="submit">Keluar</button>
                </form>
            </nav>
            <main style={{ padding: 16 }}>{children}</main>
        </div>
    );
}