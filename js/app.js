const STORAGE_KEY = 'patungan_yuk_data_v1';
const THEME_STORAGE_KEY = 'patungan_yuk_theme';

function getInitialTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
        const isDark = theme === 'dark';
        toggleBtn.textContent = isDark ? '☀️' : '🌙';
        toggleBtn.setAttribute('aria-label', isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap');
        toggleBtn.setAttribute('title', isDark ? 'Mode Terang' : 'Mode Gelap');
    }
}

document.getElementById('theme-toggle').addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
});

applyTheme(getInitialTheme());

// State awal
let state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    title: 'Patungan Nongkrong',
    members: ['Andi', 'Budi'],
    items: [],
    extra: {
        taxPercent: 0,
        servicePercent: 0,
        deliveryFee: 0,
        discount: 0
    }
};

function saveAndRender() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderAll();
}

// Render Daftar Anggota & Checkbox di Form Item
function renderMembers() {
    const memberListEl = document.getElementById('member-list');
    const checkboxGroupEl = document.getElementById('item-members-checkbox');

    memberListEl.innerHTML = state.members.map(name => `
    <span class="chip">
      ${name}
      <button type="button" onclick="removeMember('${name}')" title="Hapus">&times;</button>
    </span>
  `).join('');

    checkboxGroupEl.innerHTML = state.members.map(name => `
    <label class="checkbox-pill">
      <input type="checkbox" name="sharedBy" value="${name}" checked>
      ${name}
    </label>
  `).join('');
}

// Render Daftar Pesanan
function renderItems() {
    const itemListEl = document.getElementById('item-list');
    if (state.items.length === 0) {
        itemListEl.innerHTML = '<li class="item-meta">Belum ada item ditambahkan.</li>';
        return;
    }

    itemListEl.innerHTML = state.items.map(item => `
    <li>
      <div>
        <strong>${item.name}</strong> (${item.qty}x ${formatRupiah(item.price)})
        <div class="item-meta">Dibagi ke: ${item.sharedBy.join(', ')}</div>
      </div>
      <div>
        <strong>${formatRupiah(item.price * item.qty)}</strong>
        <button type="button" onclick="removeItem(${item.id})" style="color:#dc2626;background:none;margin-left:8px;">Hapus</button>
      </div>
    </li>
  `).join('');
}

// Render Hasil Kalkulasi
function renderSummary() {
    const result = calculateSplitBill(state);
    const summaryTotalEl = document.getElementById('summary-total');
    const summaryListEl = document.getElementById('summary-list');

    summaryTotalEl.innerHTML = `
    <div>Subtotal Menu: <strong>${formatRupiah(result.totalItemsAmount)}</strong></div>
    <div>Pajak & Service: <strong>${formatRupiah(result.taxAmount + result.serviceAmount)}</strong></div>
    <div>Ongkir: <strong>${formatRupiah(result.deliveryFee)}</strong> | Diskon: <strong>-${formatRupiah(result.discount)}</strong></div>
    <div style="margin-top:6px;font-size:1.05rem;">Grand Total: <strong>${formatRupiah(result.grandTotal)}</strong></div>
  `;

    summaryListEl.innerHTML = result.breakdown.map(p => `
    <div class="summary-row">
      <span>${p.name}</span>
      <span>${formatRupiah(p.finalTotal)}</span>
    </div>
  `).join('');
}

function renderAll() {
    document.getElementById('event-title').value = state.title;
    document.getElementById('tax-percent').value = state.extra.taxPercent;
    document.getElementById('service-percent').value = state.extra.servicePercent;
    document.getElementById('delivery-fee').value = state.extra.deliveryFee;
    document.getElementById('discount-amount').value = state.extra.discount;

    renderMembers();
    renderItems();
    renderSummary();
}

// Aksi Tambah / Hapus Anggota
document.getElementById('member-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('member-input');
    const name = input.value.trim();
    if (name && !state.members.includes(name)) {
        state.members.push(name);
        input.value = '';
        saveAndRender();
    }
});

window.removeMember = function (name) {
    state.members = state.members.filter(m => m !== name);
    state.items.forEach(item => {
        item.sharedBy = item.sharedBy.filter(m => m !== name);
    });
    saveAndRender();
};

// Aksi Tambah / Hapus Item
document.getElementById('item-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('item-name').value.trim();
    const price = parseFloat(document.getElementById('item-price').value) || 0;
    const qty = parseInt(document.getElementById('item-qty').value) || 1;
    const checkedBoxes = document.querySelectorAll('input[name="sharedBy"]:checked');
    const sharedBy = Array.from(checkedBoxes).map(cb => cb.value);

    if (sharedBy.length === 0) {
        alert('Pilih minimal satu orang untuk membagi item ini!');
        return;
    }

    state.items.push({
        id: Date.now(),
        name,
        price,
        qty,
        sharedBy
    });

    e.target.reset();
    document.getElementById('item-qty').value = 1;
    saveAndRender();
});

window.removeItem = function (id) {
    state.items = state.items.filter(item => item.id !== id);
    saveAndRender();
};

// Listener Input Judul & Biaya Tambahan
document.getElementById('event-title').addEventListener('input', e => {
    state.title = e.target.value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
});

['tax-percent', 'service-percent', 'delivery-fee', 'discount-amount'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        state.extra.taxPercent = parseFloat(document.getElementById('tax-percent').value) || 0;
        state.extra.servicePercent = parseFloat(document.getElementById('service-percent').value) || 0;
        state.extra.deliveryFee = parseFloat(document.getElementById('delivery-fee').value) || 0;
        state.extra.discount = parseFloat(document.getElementById('discount-amount').value) || 0;
        saveAndRender();
    });
});

// Tombol Salin ke WhatsApp
document.getElementById('copy-wa-btn').addEventListener('click', () => {
    const result = calculateSplitBill(state);
    const text = generateWhatsAppText(state, result);
    navigator.clipboard.writeText(text).then(() => {
        alert('Rincian tagihan berhasil disalin! Silakan paste di grup WhatsApp.');
    });
});

// Tombol Reset
document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('Hapus semua data dan mulai dari awal?')) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
});

// Inisialisasi tampilan awal
renderAll();