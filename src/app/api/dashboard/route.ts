import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type TransactionRow = {
    id: string;
    amount: number;
    type: 'income' | 'expense';
    currency: string;
    transaction_date: string;
    note: string | null;
    category_id: string | null;
    categories: { name: string } | { name: string }[] | null;
};

function monthRange(month: string) {
    const startDate = `${month}-01`;
    const endDateObject = new Date(startDate);
    endDateObject.setMonth(endDateObject.getMonth() + 1);
    return { startDate, endDate: endDateObject.toISOString().slice(0, 10) };
}

function previousMonth(month: string) {
    const date = new Date(`${month}-01`);
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().slice(0, 7);
}

function categoryName(category: TransactionRow['categories']) {
    return (Array.isArray(category) ? category[0]?.name : category?.name) ?? 'Tanpa kategori';
}

function summarize(transactions: TransactionRow[]) {
    const byCurrency: Record<string, { income: number; expense: number }> = {};
    for (const transaction of transactions) {
        byCurrency[transaction.currency] ??= { income: 0, expense: 0 };
        byCurrency[transaction.currency][transaction.type] += Number(transaction.amount);
    }

    return Object.entries(byCurrency).map(([currency, values]) => ({
        currency,
        income: values.income,
        expense: values.expense,
        balance: values.income - values.expense,
    }));
}

function summarizeCategories(transactions: TransactionRow[]) {
    const byCategory: Record<string, number> = {};
    for (const transaction of transactions) {
        if (transaction.type !== 'expense') continue;
        const name = categoryName(transaction.categories);
        byCategory[name] = (byCategory[name] ?? 0) + Number(transaction.amount);
    }

    return Object.entries(byCategory)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
}

function buildCashflow(transactions: TransactionRow[], month: string) {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const isCurrentMonth = month === currentMonth;
    const startOfMonth = new Date(`${month}-01`);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    const totalDaysInMonth = endOfMonth.getDate();
    const dayOfMonth = isCurrentMonth ? now.getDate() : totalDaysInMonth;
    const daysRemaining = isCurrentMonth ? totalDaysInMonth - dayOfMonth : 0;
    const cutoff = isCurrentMonth ? now.toISOString().slice(0, 10) : endOfMonth.toISOString().slice(0, 10);
    const expenses = transactions.filter(
        (transaction) => transaction.type === 'expense' && transaction.transaction_date <= cutoff
    );

    const byCurrency: Record<string, number> = {};
    const byDay: Record<number, number> = {};
    const byCategory: Record<string, { name: string; spent: number }> = {};

    for (const transaction of expenses) {
        const amount = Number(transaction.amount);
        byCurrency[transaction.currency] = (byCurrency[transaction.currency] ?? 0) + amount;
        const day = new Date(transaction.transaction_date).getDate();
        byDay[day] = (byDay[day] ?? 0) + amount;
        const categoryId = transaction.category_id ?? 'none';
        byCategory[categoryId] ??= { name: categoryName(transaction.categories), spent: 0 };
        byCategory[categoryId].spent += amount;
    }

    const projections = Object.entries(byCurrency).map(([currency, totalSoFar]) => {
        const avgPerDay = dayOfMonth > 0 ? totalSoFar / dayOfMonth : 0;
        const projectedAdditional = avgPerDay * daysRemaining;
        return { currency, totalSoFar, avgPerDay, daysRemaining, projectedAdditional, projectedTotal: totalSoFar + projectedAdditional };
    });

    const totalSoFarAll = Object.values(byCurrency).reduce((sum, value) => sum + value, 0);
    const avgPerDayAll = dayOfMonth > 0 ? totalSoFarAll / dayOfMonth : 0;
    let cumulative = 0;
    const dailySeries: { day: number; actual: number | null; projected: number | null }[] = [];
    for (let day = 1; day <= totalDaysInMonth; day++) {
        if (day <= dayOfMonth) {
            cumulative += byDay[day] ?? 0;
            dailySeries.push({ day, actual: cumulative, projected: day === dayOfMonth ? cumulative : null });
        } else {
            cumulative += avgPerDayAll;
            dailySeries.push({ day, actual: null, projected: cumulative });
        }
    }

    const categoryBreakdown = Object.entries(byCategory)
        .map(([category_id, value]) => {
            const avgPerDay = dayOfMonth > 0 ? value.spent / dayOfMonth : 0;
            return {
                category_id: category_id === 'none' ? null : category_id,
                name: value.name,
                spent: value.spent,
                projectedTotal: value.spent + avgPerDay * daysRemaining,
            };
        })
        .sort((a, b) => b.projectedTotal - a.projectedTotal);

    return { month, isCurrentMonth, dayOfMonth, totalDaysInMonth, daysRemaining, projections, dailySeries, categoryBreakdown };
}

export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7);
    const previous = previousMonth(month);
    const currentRange = monthRange(month);
    const previousRange = monthRange(previous);

    const transactionSelect = 'id, amount, type, currency, transaction_date, note, category_id, categories(name)';
    const transactionsPromise = supabase
        .from('transactions')
        .select(transactionSelect)
        .eq('user_id', user.id)
        .gte('transaction_date', currentRange.startDate)
        .lt('transaction_date', currentRange.endDate)
        .order('transaction_date', { ascending: false });
    const previousTransactionsPromise = supabase
        .from('transactions')
        .select('amount, type, currency, transaction_date, category_id, categories(name)')
        .eq('user_id', user.id)
        .gte('transaction_date', previousRange.startDate)
        .lt('transaction_date', previousRange.endDate);
    const budgetsPromise = supabase
        .from('budgets')
        .select('*, categories(name)')
        .eq('user_id', user.id)
        .eq('period_month', currentRange.startDate);
    const streakPromise = supabase
        .from('transactions')
        .select('transaction_date')
        .eq('user_id', user.id)
        .gte('transaction_date', new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10))
        .order('transaction_date', { ascending: false });

    const [{ data: transactions, error: transactionError }, { data: previousTransactions, error: previousError }, { data: budgets, error: budgetError }, { data: streakRows }] = await Promise.all([
        transactionsPromise,
        previousTransactionsPromise,
        budgetsPromise,
        streakPromise,
    ]);

    if (transactionError || previousError || budgetError) {
        return NextResponse.json({ error: transactionError?.message ?? previousError?.message ?? budgetError?.message }, { status: 500 });
    }

    const currentTransactions = (transactions ?? []) as unknown as TransactionRow[];
    const previousMonthTransactions = (previousTransactions ?? []) as unknown as TransactionRow[];
    const spentByCategory: Record<string, number> = {};
    let spentTotal = 0;
    for (const transaction of currentTransactions) {
        if (transaction.type !== 'expense') continue;
        spentTotal += Number(transaction.amount);
        if (transaction.category_id) spentByCategory[transaction.category_id] = (spentByCategory[transaction.category_id] ?? 0) + Number(transaction.amount);
    }

    const budgetResult = (budgets ?? []).map((budget) => ({
        ...budget,
        spent: budget.category_id ? (spentByCategory[budget.category_id] ?? 0) : spentTotal,
    }));
    const distinctDates = Array.from(new Set((streakRows ?? []).map((row) => row.transaction_date))).sort((a, b) => (a < b ? 1 : -1));
    const today = new Date().toISOString().slice(0, 10);
    let streakDays = 0;
    if (distinctDates.includes(today)) {
        const cursor = new Date();
        for (const date of distinctDates) {
            if (date !== cursor.toISOString().slice(0, 10)) break;
            streakDays++;
            cursor.setDate(cursor.getDate() - 1);
        }
    }

    return NextResponse.json({
        month,
        summary: summarize(currentTransactions),
        previousSummary: summarize(previousMonthTransactions),
        categoryData: summarizeCategories(currentTransactions),
        budgets: budgetResult,
        recentTransactions: currentTransactions.slice(0, 10),
        cashflow: buildCashflow(currentTransactions, month),
        streak: { hasTransactionToday: distinctDates.includes(today), streakDays },
    });
}
