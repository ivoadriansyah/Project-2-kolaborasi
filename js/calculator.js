// Format angka ke Rupiah
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.round(amount));
}

// Fungsi utama kalkulasi Split Bill secara proporsional
function calculateSplitBill(data) {
    const { members, items, extra } = data;
    const memberSubtotals = {};

    // Inisialisasi subtotal tiap anggota = 0
    members.forEach(member => {
        memberSubtotals[member] = 0;
    });

    let totalItemsAmount = 0;

    // 1. Hitung subtotal masing-masing anggota berdasarkan item yang diikuti
    items.forEach(item => {
        const itemTotal = item.price * item.qty;
        totalItemsAmount += itemTotal;

        const validSharers = item.sharedBy.filter(m => members.includes(m));
        if (validSharers.length > 0) {
            const splitPrice = itemTotal / validSharers.length;
            validSharers.forEach(member => {
                memberSubtotals[member] += splitPrice;
            });
        }
    });

    // 2. Hitung total pajak, service, ongkir, dan diskon
    const taxAmount = totalItemsAmount * (extra.taxPercent / 100);
    const serviceAmount = totalItemsAmount * (extra.servicePercent / 100);
    const netAdjustment = taxAmount + serviceAmount + extra.deliveryFee - extra.discount;
    const grandTotal = Math.max(0, totalItemsAmount + netAdjustment);

    // 3. Distribusikan biaya tambahan & diskon secara proporsional sesuai porsi belanja
    const breakdown = members.map(member => {
        const subtotal = memberSubtotals[member];
        const ratio = totalItemsAmount > 0 ? subtotal / totalItemsAmount : 0;
        const adjustmentShare = netAdjustment * ratio;
        const finalTotal = Math.max(0, subtotal + adjustmentShare);

        return {
            name: member,
            subtotal,
            adjustmentShare,
            finalTotal
        };
    });

    return {
        totalItemsAmount,
        taxAmount,
        serviceAmount,
        deliveryFee: extra.deliveryFee,
        discount: extra.discount,
        grandTotal,
        breakdown
    };
}

// Generator teks ringkasan untuk dibagikan ke WhatsApp
function generateWhatsAppText(data, result) {
    let text = `*🧾 RINCIAN PATUNGAN: ${data.title.toUpperCase()}*\n`;
    text += `Total Tagihan: *${formatRupiah(result.grandTotal)}*\n`;
    text += `-------------------------\n`;

    result.breakdown.forEach(person => {
        text += `• *${person.name}*: ${formatRupiah(person.finalTotal)}\n`;
    });

    text += `-------------------------\n`;
    text += `_Dihitung otomatis pakai PatunganYuk_`;
    return text;
}