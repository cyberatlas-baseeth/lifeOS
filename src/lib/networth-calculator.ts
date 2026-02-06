// Net Worth Calculator
// Derives Net Worth from Income, Expenses, and Investments
// All calculations are TRY-based, USD is for display only

import { createClient } from '@/lib/supabase/client';

export interface NetWorthSnapshot {
    date: string;
    total_try: number;
    total_usd: number;
    income_try: number;
    income_usd: number;
    expenses_try: number;
    expenses_usd: number;
    investments_try: number;
    investments_usd: number;
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
    total_investments_try: number;
    total_investments_usd: number;
}

/**
 * Calculate Net Worth from all financial sources
 * Net Worth = Total Income - Total Expenses + Total Investments
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

    // Fetch all investment records
    const { data: investmentData } = await supabase
        .from('investments')
        .select('date, amount_try, amount_usd, amount, profit_loss_try, profit_loss_usd, profit_loss')
        .eq('wallet_address', wallet)
        .order('date', { ascending: true });

    // Calculate totals
    const totalIncomeTry = (incomeData || []).reduce((sum, r) =>
        sum + Number(r.amount_try || r.amount || 0), 0);
    const totalIncomeUsd = (incomeData || []).reduce((sum, r) =>
        sum + Number(r.amount_usd || 0), 0);

    const totalExpensesTry = (expenseData || []).reduce((sum, r) =>
        sum + Number(r.amount_try || r.amount || 0), 0);
    const totalExpensesUsd = (expenseData || []).reduce((sum, r) =>
        sum + Number(r.amount_usd || 0), 0);

    const totalInvestmentsTry = (investmentData || []).reduce((sum, r) =>
        sum + Number(r.amount_try || r.amount || 0) + Number(r.profit_loss_try || r.profit_loss || 0), 0);
    const totalInvestmentsUsd = (investmentData || []).reduce((sum, r) =>
        sum + Number(r.amount_usd || 0) + Number(r.profit_loss_usd || 0), 0);

    // Current Net Worth
    const currentTry = totalIncomeTry - totalExpensesTry + totalInvestmentsTry;
    const currentUsd = totalIncomeUsd - totalExpensesUsd + totalInvestmentsUsd;

    // Generate time-series snapshots by date
    const allDates = new Set<string>();
    (incomeData || []).forEach(r => allDates.add(r.date));
    (expenseData || []).forEach(r => allDates.add(r.date));
    (investmentData || []).forEach(r => allDates.add(r.date));

    const sortedDates = Array.from(allDates).sort();

    // Build cumulative snapshots
    const snapshots: NetWorthSnapshot[] = [];
    let cumulativeIncomeTry = 0;
    let cumulativeIncomeUsd = 0;
    let cumulativeExpensesTry = 0;
    let cumulativeExpensesUsd = 0;
    let cumulativeInvestmentsTry = 0;
    let cumulativeInvestmentsUsd = 0;

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

        // Add investments for this date
        (investmentData || [])
            .filter(r => r.date === date)
            .forEach(r => {
                cumulativeInvestmentsTry += Number(r.amount_try || r.amount || 0) + Number(r.profit_loss_try || r.profit_loss || 0);
                cumulativeInvestmentsUsd += Number(r.amount_usd || 0) + Number(r.profit_loss_usd || 0);
            });

        snapshots.push({
            date,
            total_try: cumulativeIncomeTry - cumulativeExpensesTry + cumulativeInvestmentsTry,
            total_usd: cumulativeIncomeUsd - cumulativeExpensesUsd + cumulativeInvestmentsUsd,
            income_try: cumulativeIncomeTry,
            income_usd: cumulativeIncomeUsd,
            expenses_try: cumulativeExpensesTry,
            expenses_usd: cumulativeExpensesUsd,
            investments_try: cumulativeInvestmentsTry,
            investments_usd: cumulativeInvestmentsUsd,
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
            total_investments_try: totalInvestmentsTry,
            total_investments_usd: totalInvestmentsUsd,
        },
        snapshots,
    };
}
