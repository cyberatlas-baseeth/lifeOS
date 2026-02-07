// Net Worth Calculator
// Derives Net Worth from Income, Expenses, and Investments
// All calculations are TRY-based, USD is for display only
// 
// Investment Logic (Claim-Based):
// - Active investments: SUBTRACT invested_try (locked capital outflow)
// - Claimed investments: ADD invested_try + realized_pl_try (capital + realized P/L)

import { createClient } from '@/lib/supabase/client';

export interface NetWorthSnapshot {
    date: string;
    total_try: number;
    total_usd: number;
    income_try: number;
    income_usd: number;
    expenses_try: number;
    expenses_usd: number;
    // Investment breakdown
    active_investments_try: number;
    active_investments_usd: number;
    claimed_investments_try: number;
    claimed_investments_usd: number;
}

export interface NetWorthSummary {
    current_try: number;
    current_usd: number;
    change_try: number;
    change_percent: number;
    total_income_try: number;
    total_income_usd: number;
    total_expenses_try: number;
    total_expenses_usd: number;
    // Investment summary
    locked_capital_try: number;
    locked_capital_usd: number;
    realized_returns_try: number;
    realized_returns_usd: number;
}

interface InvestmentRecord {
    date: string;
    invested_try: number;
    invested_usd: number;
    status: 'active' | 'claimed';
    realized_pl_try: number | null;
    realized_pl_usd: number | null;
    claimed_at: string | null;
}

/**
 * Calculate Net Worth from all financial sources
 * 
 * Net Worth = Total Income 
 *           - Total Expenses 
 *           - Sum(Active Investments.invested_try)
 *           + Sum(Claimed Investments.invested_try + realized_pl_try)
 */
export async function calculateNetWorth(walletAddress: string): Promise<{
    summary: NetWorthSummary;
    snapshots: NetWorthSnapshot[];
}> {
    const supabase = createClient();
    const wallet = walletAddress.toLowerCase();

    // Fetch all income records
    const { data: incomeData } = await supabase
        .from('income')
        .select('date, amount_try, amount_usd, amount')
        .eq('wallet_address', wallet)
        .order('date', { ascending: true });

    // Fetch all expense records
    const { data: expenseData } = await supabase
        .from('expenses')
        .select('date, amount_try, amount_usd, amount')
        .eq('wallet_address', wallet)
        .order('date', { ascending: true });

    // Fetch all investment records with new schema
    const { data: investmentData } = await supabase
        .from('investments')
        .select('date, invested_try, invested_usd, status, realized_pl_try, realized_pl_usd, claimed_at')
        .eq('wallet_address', wallet)
        .order('date', { ascending: true });

    // Type assertion for investment data
    const investments: InvestmentRecord[] = (investmentData || []).map(r => ({
        date: r.date,
        invested_try: Number(r.invested_try || 0),
        invested_usd: Number(r.invested_usd || 0),
        status: r.status || 'active',
        realized_pl_try: r.realized_pl_try ? Number(r.realized_pl_try) : null,
        realized_pl_usd: r.realized_pl_usd ? Number(r.realized_pl_usd) : null,
        claimed_at: r.claimed_at || null,
    }));

    // Calculate income totals
    const totalIncomeTry = (incomeData || []).reduce((sum, r) =>
        sum + Number(r.amount_try || r.amount || 0), 0);
    const totalIncomeUsd = (incomeData || []).reduce((sum, r) =>
        sum + Number(r.amount_usd || 0), 0);

    // Calculate expense totals
    const totalExpensesTry = (expenseData || []).reduce((sum, r) =>
        sum + Number(r.amount_try || r.amount || 0), 0);
    const totalExpensesUsd = (expenseData || []).reduce((sum, r) =>
        sum + Number(r.amount_usd || 0), 0);

    // Calculate investment totals (separated by status)
    const activeInvestments = investments.filter(i => i.status === 'active');
    const claimedInvestments = investments.filter(i => i.status === 'claimed');

    // Locked capital (active investments - outflow)
    const lockedCapitalTry = activeInvestments.reduce((sum, i) => sum + i.invested_try, 0);
    const lockedCapitalUsd = activeInvestments.reduce((sum, i) => sum + i.invested_usd, 0);

    // Realized returns (claimed investments - inflow: principal + P/L)
    const realizedReturnsTry = claimedInvestments.reduce((sum, i) =>
        sum + i.invested_try + (i.realized_pl_try || 0), 0);
    const realizedReturnsUsd = claimedInvestments.reduce((sum, i) =>
        sum + i.invested_usd + (i.realized_pl_usd || 0), 0);

    // Current Net Worth = Income - Expenses - LockedCapital + RealizedReturns
    const currentTry = totalIncomeTry - totalExpensesTry - lockedCapitalTry + realizedReturnsTry;
    const currentUsd = totalIncomeUsd - totalExpensesUsd - lockedCapitalUsd + realizedReturnsUsd;

    // Generate time-series snapshots by date
    const allDates = new Set<string>();
    (incomeData || []).forEach(r => allDates.add(r.date));
    (expenseData || []).forEach(r => allDates.add(r.date));
    investments.forEach(r => {
        allDates.add(r.date);
        // Also add claim date for claimed investments
        if (r.claimed_at) {
            const claimDate = r.claimed_at.split('T')[0];
            allDates.add(claimDate);
        }
    });

    const sortedDates = Array.from(allDates).sort();

    // Build cumulative snapshots
    const snapshots: NetWorthSnapshot[] = [];
    let cumulativeIncomeTry = 0;
    let cumulativeIncomeUsd = 0;
    let cumulativeExpensesTry = 0;
    let cumulativeExpensesUsd = 0;
    let cumulativeActiveInvTry = 0;
    let cumulativeActiveInvUsd = 0;
    let cumulativeClaimedInvTry = 0;
    let cumulativeClaimedInvUsd = 0;

    // Track which investments are active at each date
    const investmentStatusByDate = new Map<string, { activeTry: number; activeUsd: number; claimedTry: number; claimedUsd: number }>();

    for (const date of sortedDates) {
        // Add income for this date
        (incomeData || [])
            .filter(r => r.date === date)
            .forEach(r => {
                cumulativeIncomeTry += Number(r.amount_try || r.amount || 0);
                cumulativeIncomeUsd += Number(r.amount_usd || 0);
            });

        // Add expenses for this date
        (expenseData || [])
            .filter(r => r.date === date)
            .forEach(r => {
                cumulativeExpensesTry += Number(r.amount_try || r.amount || 0);
                cumulativeExpensesUsd += Number(r.amount_usd || 0);
            });

        // Process investments created on this date (initially active = capital outflow)
        investments
            .filter(r => r.date === date)
            .forEach(r => {
                cumulativeActiveInvTry += r.invested_try;
                cumulativeActiveInvUsd += r.invested_usd;
            });

        // Process investments claimed on this date (move from active to claimed)
        investments
            .filter(r => r.claimed_at && r.claimed_at.split('T')[0] === date)
            .forEach(r => {
                // Remove from active
                cumulativeActiveInvTry -= r.invested_try;
                cumulativeActiveInvUsd -= r.invested_usd;
                // Add to claimed (principal + realized P/L)
                cumulativeClaimedInvTry += r.invested_try + (r.realized_pl_try || 0);
                cumulativeClaimedInvUsd += r.invested_usd + (r.realized_pl_usd || 0);
            });

        // Net Worth = Income - Expenses - ActiveInvestments + ClaimedInvestments
        const totalTry = cumulativeIncomeTry - cumulativeExpensesTry - cumulativeActiveInvTry + cumulativeClaimedInvTry;
        const totalUsd = cumulativeIncomeUsd - cumulativeExpensesUsd - cumulativeActiveInvUsd + cumulativeClaimedInvUsd;

        snapshots.push({
            date,
            total_try: totalTry,
            total_usd: totalUsd,
            income_try: cumulativeIncomeTry,
            income_usd: cumulativeIncomeUsd,
            expenses_try: cumulativeExpensesTry,
            expenses_usd: cumulativeExpensesUsd,
            active_investments_try: cumulativeActiveInvTry,
            active_investments_usd: cumulativeActiveInvUsd,
            claimed_investments_try: cumulativeClaimedInvTry,
            claimed_investments_usd: cumulativeClaimedInvUsd,
        });
    }

    // Calculate change from previous snapshot
    const previousTry = snapshots.length > 1 ? snapshots[snapshots.length - 2].total_try : 0;
    const changeTry = currentTry - previousTry;
    const changePercent = previousTry !== 0 ? (changeTry / previousTry) * 100 : 0;

    return {
        summary: {
            current_try: currentTry,
            current_usd: currentUsd,
            change_try: changeTry,
            change_percent: changePercent,
            total_income_try: totalIncomeTry,
            total_income_usd: totalIncomeUsd,
            total_expenses_try: totalExpensesTry,
            total_expenses_usd: totalExpensesUsd,
            locked_capital_try: lockedCapitalTry,
            locked_capital_usd: lockedCapitalUsd,
            realized_returns_try: realizedReturnsTry,
            realized_returns_usd: realizedReturnsUsd,
        },
        snapshots,
    };
}
