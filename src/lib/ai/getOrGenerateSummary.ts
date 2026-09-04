import { SupabaseClient } from '@supabase/supabase-js';
import { computeSummaryNumbers } from './computeSummaryNumbers';
import { generateSummaryNarrative } from './generateSummaryNarrative';

export async function getOrGenerateSummary(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: SupabaseClient<any>,
    userId: string,
    month: string,
    forceRegenerate = false
): Promise<string> {
    const periodMonth = `${month}-01`;

    if (!forceRegenerate) {
        const { data: cached } = await supabase
            .from('ai_summaries')
            .select('content')
            .eq('user_id', userId)
            .eq('period_month', periodMonth)
            .single();

        if (cached) {
            return cached.content;
        }
    }

    const numbers = await computeSummaryNumbers(supabase, userId, month);
    const narrative = await generateSummaryNarrative(numbers);

    await supabase.from('ai_summaries').upsert(
        {
            user_id: userId,
            period_month: periodMonth,
            content: narrative,
        },
        { onConflict: 'user_id,period_month' }
    );

    return narrative;
}