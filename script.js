(() => {
  'use strict';

  // v2: store only names (no school/grade)
  const STORAGE_KEY = 'noor_amnesty_students_v2';

  const $ = (sel) => document.querySelector(sel);

  const els = {
    form: $('#addForm'),
    name: $('#name'),
    nameError: $('#nameError'),


    tbody: $('#tbody'),
    search: $('#search'),
    countText: $('#countText'),
    emptyState: $('#emptyState'),

    clearBtn: $('#clearBtn'),

    toast: $('#toast'),
    toastText: $('#toastText'),
    toastClose: $('#toastClose')
  };

  const state = {
    items: [],
    toastTimer: null
  };

  const normalizeText = (s) => String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ');

  const makeKey = (name) => {
    const n = normalizeText(name).toLowerCase();
    return n;
  };

  const loadItems = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((x) => x && typeof x === 'object')
        .map((x) => ({
          id: String(x.id ?? crypto.randomUUID?.() ?? Date.now().toString()),
          name: normalizeText(x.name)
        }))
        .filter((x) => x.name);
    } catch {
      return [];
    }
  };

  const saveItems = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  };

  const sortItems = (items) => {
    return [...items].sort((a, b) => {
      return (a.name ?? '').localeCompare(b.name ?? '', 'ar');
    });
  };

  const matchesSearch = (item, q) => {
    if (!q) return true;
    const name = (item.name ?? '').toLowerCase();
    const qq = q.toLowerCase();
    return name.includes(qq);
  };

  const render = () => {
    const q = normalizeText(els.search.value);
    const filtered = sortItems(state.items).filter((item) => matchesSearch(item, q));

    els.tbody.innerHTML = '';
    els.emptyState.hidden = filtered.length !== 0;

    // hide inline error while listing
    if (els.nameError) els.nameError.hidden = true;


    const frag = document.createDocumentFragment();
    for (const item of filtered) {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      tdName.textContent = item.name;

      const tdActions = document.createElement('td');
      tdActions.className = 'actions-col';

      const btnWrap = document.createElement('div');
      btnWrap.className = 'row-actions';

      const btnEdit = document.createElement('button');
      btnEdit.type = 'button';
      btnEdit.className = 'mini-btn mini-btn-edit';
      btnEdit.textContent = 'تعديل';
      btnEdit.addEventListener('click', () => onEdit(item.id));

      const btnDelete = document.createElement('button');
      btnDelete.type = 'button';
      btnDelete.className = 'mini-btn mini-btn-del';
      btnDelete.textContent = 'حذف';
      btnDelete.addEventListener('click', () => onDelete(item.id));

      btnWrap.append(btnEdit, btnDelete);
      tdActions.appendChild(btnWrap);

      tr.append(tdName, tdActions);
      frag.appendChild(tr);
    }

    els.tbody.appendChild(frag);
    els.countText.textContent = `${filtered.length} طالب`;
  };

  const showToast = (text) => {
    els.toastText.textContent = text;
    els.toast.hidden = false;

    if (state.toastTimer) clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      els.toast.hidden = true;
    }, 3000);
  };

  const validate = (name) => {
    const n = normalizeText(name);

    if (!n) return { ok: false, type: 'error', message: 'الاسم مطلوب.' };
    if (n.length < 2) return { ok: false, type: 'error', message: 'الاسم قصير جداً.' };

    const key = makeKey(n);
    const exists = state.items.some((x) => makeKey(x.name) === key);
    if (exists) return { ok: false, type: 'duplicate', message: 'هذا الاسم مضاف مسبقاً.' };

    return { ok: true, data: { name: n } };
  };

  const showInlineNameError = (message, isVisible = true) => {
    if (!els.nameError) return;
    els.nameError.textContent = message;
    els.nameError.hidden = !isVisible;
  };

  const onSubmit = (e) => {
    e.preventDefault();

    const name = els.name.value;
    const v = validate(name);
    if (!v.ok) {
      showInlineNameError(v.message, true);
      // لا نعرض Toast في حالة الاسم المكرر/الخطأ حتى تكون الرسالة تحت الحقل فقط
      if (v.type !== 'duplicate' && v.type !== 'error') showToast(v.message);
      return;
    }

    showInlineNameError('', false);


    const newItem = {
      id: crypto.randomUUID?.() ?? Date.now().toString(),
      name: v.data.name
    };

    state.items.push(newItem);
    saveItems();

    els.form.reset();

    // keep current search text
    const currentQ = els.search.value;
    els.search.value = currentQ;

    render();
    showToast('تمت الإضافة بنجاح');
  };

  const onSearch = () => {
    render();
  };

  const onClearAll = () => {
    if (!confirm('هل أنت متأكد من حذف جميع البيانات؟')) return;
    state.items = [];
    saveItems();
    render();
    showToast('تم حذف جميع البيانات');
  };

  const onToastClose = () => {
    els.toast.hidden = true;
  };

  const onDelete = (id) => {
    const item = state.items.find((x) => x.id === id);
    if (!item) return;
    if (!confirm(`هل تريد حذف الاسم: ${item.name}?`)) return;

    state.items = state.items.filter((x) => x.id !== id);
    saveItems();
    render();
    showToast('تم حذف الاسم');
  };

  const onEdit = (id) => {
    const item = state.items.find((x) => x.id === id);
    if (!item) return;

    const next = prompt('عدل الاسم:', item.name);
    if (next === null) return; // cancelled

    const n = normalizeText(next);
    if (!n) {
      showToast('الاسم مطلوب.');
      return;
    }
    if (n.length < 2) {
      showToast('الاسم قصير جداً.');
      return;
    }

    const exists = state.items.some((x) => x.id !== id && makeKey(x.name) === makeKey(n));
    if (exists) {
      showToast('هذا الاسم موجود مسبقاً.');
      return;
    }

    item.name = n;
    saveItems();
    render();
    showToast('تم تعديل الاسم');
  };

  const init = () => {
    state.items = loadItems();
    render();

    const toolBtns = Array.from(document.querySelectorAll('.tool-btn[data-target]'));
    const tabs = Array.from(document.querySelectorAll('.tab[id]'));

    const setActive = (targetId) => {
      for (const btn of toolBtns) {
        const isActive = btn.dataset.target === targetId;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      }
      for (const tab of tabs) {
        const active = tab.id === targetId;
        tab.classList.toggle('is-active', active);
      }
    };

    for (const btn of toolBtns) {
      btn.addEventListener('click', () => setActive(btn.dataset.target));
    }

    setActive('tab-add');

    els.form.addEventListener('submit', onSubmit);
    els.search.addEventListener('input', onSearch);
    els.clearBtn.addEventListener('click', onClearAll);
    els.toastClose.addEventListener('click', onToastClose);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') els.toast.hidden = true;
    });
  };

  init();
})();

