import { SupabaseClient } from '@supabase/supabase-js';

export async function getUserKeywordMap(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: SupabaseClient<any>,
    userId: string
): Promise<Record<string, string[]>> {
    const { data } = await supabase
        .from('user_keyword_mappings')
        .select('keyword, categories(name)')
        .eq('user_id', userId);

    const map: Record<string, string[]> = {};

    for (const row of (data ?? []) as unknown as {
        keyword: string;
        categories: { name: string } | null;
    }[]) {
        const categoryName = row.categories?.name;
        if (!categoryName) continue;
        if (!map[categoryName]) map[categoryName] = [];
        map[categoryName].push(row.keyword);
    }

    return map;
}