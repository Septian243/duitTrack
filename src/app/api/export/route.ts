import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

function formatRupiah(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);
}

export async function GET(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') ?? 'csv';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabase
        .from('transactions')
        .select('transaction_date, type, amount, currency, note, categories(name)')
        .order('transaction_date', { ascending: false });

    if (from) query = query.gte('transaction_date', from);
    if (to) query = query.lte('transaction_date', to);

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data as unknown as {
        transaction_date: string;
        type: string;
        amount: number;
        currency: string;
        note: string | null;
        categories: { name: string } | null;
    }[]);

    // --- CSV ---
    if (format === 'csv') {
        const header = 'Tanggal,Jenis,Kategori,Jumlah,Mata Uang,Catatan';
        const lines = rows.map((r) =>
            [
                r.transaction_date,
                r.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
                r.categories?.name ?? '-',
                r.amount,
                r.currency,
                `"${(r.note ?? '').replace(/"/g, '""')}"`,
            ].join(',')
        );
        const csv = [header, ...lines].join('\n');

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': 'attachment; filename="duittrack-export.csv"',
            },
        });
    }

    // --- Excel ---
    if (format === 'xlsx') {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Transaksi');

        sheet.columns = [
            { header: 'Tanggal', key: 'date', width: 14 },
            { header: 'Jenis', key: 'type', width: 14 },
            { header: 'Kategori', key: 'category', width: 20 },
            { header: 'Jumlah', key: 'amount', width: 16 },
            { header: 'Mata Uang', key: 'currency', width: 10 },
            { header: 'Catatan', key: 'note', width: 30 },
        ];

        rows.forEach((r) => {
            sheet.addRow({
                date: r.transaction_date,
                type: r.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
                category: r.categories?.name ?? '-',
                amount: r.amount,
                currency: r.currency,
                note: r.note ?? '-',
            });
        });

        sheet.getRow(1).font = { bold: true };

        const arrayBuffer = await workbook.xlsx.writeBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': 'attachment; filename="duittrack-export.xlsx"',
            },
        });
    }

    // --- PDF ---
    if (format === 'pdf') {
        const buffer: Buffer = await new Promise((resolve) => {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            doc.fontSize(16).text('DuitTrack - Riwayat Transaksi', { align: 'center' });
            doc.moveDown();

            doc.fontSize(9);
            let totalIncome = 0;
            let totalExpense = 0;

            rows.forEach((r) => {
                if (r.type === 'income') totalIncome += Number(r.amount);
                else totalExpense += Number(r.amount);

                const line = `${r.transaction_date}  |  ${r.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}  |  ${r.categories?.name ?? '-'}  |  ${formatRupiah(Number(r.amount))}  |  ${r.note ?? '-'}`;
                doc.text(line);
            });

            doc.moveDown();
            doc.fontSize(11).text(`Total Pemasukan: ${formatRupiah(totalIncome)}`);
            doc.text(`Total Pengeluaran: ${formatRupiah(totalExpense)}`);
            doc.text(`Saldo: ${formatRupiah(totalIncome - totalExpense)}`);

            doc.end();
        });

        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="duittrack-export.pdf"',
            },
        });
    }

    return NextResponse.json({ error: 'Format tidak dikenali' }, { status: 400 });
}