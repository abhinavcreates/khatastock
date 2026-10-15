import { useEffect, useState } from 'react';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';
import { api } from '../api.js';
import { daysLeft, formatDate } from '../dates.js';
import { inputClass, primaryBtn, ghostBtn } from '../ui.js';

const UNITS = ['piece', 'packet', 'kg', 'g', 'L', 'ml', 'dozen'];
const EMPTY = { name: '', quantity: '', unit: 'piece', expiryDate: '', lowStockLimit: '' };
const WINDOW_OPTIONS = [3, 7, 15, 30];

// 'expired' | 'soon' | 'ok' | 'none' (no expiry date)
function expiryState(days, windowDays) {
  if (days === null) return 'none';
  if (days < 0) return 'expired';
  if (days <= windowDays) return 'soon';
  return 'ok';
}

// small rubber-stamp style tag
function Stamp({ tone, children }) {
  const tones = {
    expired: 'border-brick text-brick',
    soon: 'border-turmeric-ink text-turmeric-ink bg-turmeric/30',
    low: 'border-ink text-ink',
  };
  return (
    <span
      className={`inline-block border-2 rounded-sm px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide -rotate-2 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function ItemRow({ item, onEdit, onDelete }) {
  const stripe =
    item.state === 'expired' ? 'bg-brick' : item.state === 'soon' ? 'bg-turmeric' : 'bg-transparent';
  const isLow = item.quantity <= item.lowStockLimit;

  return (
    <li className="flex items-stretch border-b border-line">
      <span className={`w-1.5 shrink-0 ${stripe}`} aria-hidden="true" />
      <div className="flex-1 min-w-0 py-3 pl-3">
        <p className="font-medium truncate">{item.name}</p>
        {item.expiryDate && <p className="text-sm num">Expiry {formatDate(item.expiryDate)}</p>}
        {(item.state === 'expired' || item.state === 'soon' || isLow) && (
          <p className="mt-1.5 flex flex-wrap gap-2">
            {item.state === 'expired' && <Stamp tone="expired">Expired</Stamp>}
            {item.state === 'soon' && (
              <Stamp tone="soon">
                {item.days === 0 ? 'Expires today' : item.days === 1 ? 'Expires tomorrow' : `Expires in ${item.days} days`}
              </Stamp>
            )}
            {isLow && <Stamp tone="low">{item.quantity === 0 ? 'Out of stock' : 'Low stock'}</Stamp>}
          </p>
        )}
      </div>
      <div className="py-3 px-2 text-right shrink-0 num">
        <p className="font-display text-2xl font-bold leading-none">{item.quantity}</p>
        <p className="text-xs mt-1">{item.unit}</p>
      </div>
      <div className="flex items-center shrink-0">
        <button onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`} className="min-h-11 min-w-11 flex items-center justify-center">
          <Pencil size={18} aria-hidden="true" />
        </button>
        <button onClick={() => onDelete(item)} aria-label={`Delete ${item.name}`} className="min-h-11 min-w-11 flex items-center justify-center hover:text-brick">
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

export default function Items({ initialFilter = 'all' }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(initialFilter); // all | expired | expiring | low
  const [windowDays, setWindowDays] = useState(7);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setItems(await api('/items'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) await api(`/items/${editingId}`, { method: 'PUT', body: form });
      else await api('/items', { method: 'POST', body: form });
      setForm(EMPTY);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(item) {
    setEditingId(item._id);
    setForm({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      expiryDate: item.expiryDate ? item.expiryDate.slice(0, 10) : '',
      lowStockLimit: item.lowStockLimit,
    });
    window.scrollTo({ top: 0 });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function remove(item) {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try {
      await api(`/items/${item._id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // work out the expiry state of every item once
  const all = items.map((i) => {
    const days = daysLeft(i.expiryDate);
    return { ...i, days, state: expiryState(days, windowDays) };
  });
  const isLow = (i) => i.quantity <= i.lowStockLimit;
  const byDays = (a, b) => a.days - b.days;

  const counts = {
    all: all.length,
    expired: all.filter((i) => i.state === 'expired').length,
    expiring: all.filter((i) => i.state === 'soon').length,
    low: all.filter(isLow).length,
  };

  const searched = all.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  // flat list for a filter, or groups for "All"
  let flat = null;
  let groups = null;
  if (filter === 'expired') flat = searched.filter((i) => i.state === 'expired').sort(byDays);
  else if (filter === 'expiring') flat = searched.filter((i) => i.state === 'soon').sort(byDays);
  else if (filter === 'low') flat = searched.filter(isLow).sort((a, b) => a.quantity - b.quantity);
  else {
    groups = [
      { title: 'Expired', tone: 'text-brick', rows: searched.filter((i) => i.state === 'expired').sort(byDays) },
      { title: `Expiring in ${windowDays} days`, tone: 'text-turmeric-ink', rows: searched.filter((i) => i.state === 'soon').sort(byDays) },
      { title: 'Other items', tone: '', rows: searched.filter((i) => i.state === 'ok' || i.state === 'none') },
    ].filter((g) => g.rows.length > 0);
  }

  const chips = [
    { id: 'all', label: 'All', dot: null },
    { id: 'expired', label: 'Expired', dot: 'bg-brick' },
    { id: 'expiring', label: 'Expiring soon', dot: 'bg-turmeric' },
    { id: 'low', label: 'Low stock', dot: null },
  ];

  return (
    <div className="space-y-8">
      {/* add / edit form */}
      <section>
        <h2 className="font-display text-lg font-bold mb-3">{editingId ? 'Edit item' : 'Add an item'}</h2>
        <form onSubmit={save} className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <label className="col-span-2 sm:col-span-3 text-sm font-medium">
            Item name
            <input className={`${inputClass} mt-1 font-normal`} value={form.name} onChange={set('name')} required />
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Quantity
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              className={`${inputClass} mt-1 font-normal num`}
              value={form.quantity}
              onChange={set('quantity')}
              required
            />
          </label>
          <label className="text-sm font-medium">
            Unit
            <select className={`${inputClass} mt-1 font-normal`} value={form.unit} onChange={set('unit')}>
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
          <label className="col-span-1 sm:col-span-3 text-sm font-medium">
            Expiry date (optional)
            <input type="date" className={`${inputClass} mt-1 font-normal`} value={form.expiryDate} onChange={set('expiryDate')} />
          </label>
          <label className="col-span-1 sm:col-span-3 text-sm font-medium">
            Low stock below (default 5)
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              className={`${inputClass} mt-1 font-normal num`}
              value={form.lowStockLimit}
              onChange={set('lowStockLimit')}
            />
          </label>

          {error && <p className="col-span-2 sm:col-span-6 text-sm text-brick font-medium">{error}</p>}

          <div className="col-span-2 sm:col-span-6 flex gap-3">
            <button className={primaryBtn}>
              {!editingId && <Plus size={18} aria-hidden="true" />}
              {editingId ? 'Save changes' : 'Add item'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className={ghostBtn}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* filters + list */}
      <section>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter items">          {chips.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              aria-pressed={filter === c.id}
              className={` min-h-11 px-4 rounded-full border text-sm flex items-center gap-2 transition-colors duration-150 ${
                filter === c.id ? 'bg-ink text-paper border-ink font-semibold' : 'bg-page border-line'
              }`}
            >
              {c.dot && <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} aria-hidden="true" />}
              {c.label}
              <span className="num">({counts[c.id]})</span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="text-sm flex items-center gap-2">
            Expiring soon means within
            <select
              className="border border-line bg-page min-h-11 px-2 rounded-sm"
              value={windowDays}
              onChange={(e) => setWindowDays(Number(e.target.value))}
            >
              {WINDOW_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </label>
          <div className="relative sm:w-56 w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              placeholder="Search item"
              aria-label="Search item"
              className={`${inputClass} pl-10`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="py-6 text-sm">Loading...</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-sm">No items yet. Add your first item above.</p>
        ) : flat ? (
          flat.length === 0 ? (
            <p className="py-6 text-sm">
              {filter === 'expired' && 'No expired items.'}
              {filter === 'expiring' && `No items expire in the next ${windowDays} days.`}
              {filter === 'low' && 'No items are low on stock.'}
            </p>
          ) : (
            <ul className="mt-3 ledger">
              {flat.map((i) => (
                <ItemRow key={i._id} item={i} onEdit={startEdit} onDelete={remove} />
              ))}
            </ul>
          )
        ) : groups.length === 0 ? (
          <p className="py-6 text-sm">No item matches your search.</p>
        ) : (
          groups.map((g) => (
            <div key={g.title} className="mt-5">
              <h3 className={`font-display font-bold ${g.tone}`}>
                {g.title} <span className="num">({g.rows.length})</span>
              </h3>
              <ul className="mt-1 ledger">
                {g.rows.map((i) => (
                  <ItemRow key={i._id} item={i} onEdit={startEdit} onDelete={remove} />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
