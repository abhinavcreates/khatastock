import { useEffect, useState } from 'react';
import { ArrowLeft, Phone, MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { formatMoney } from '../money.js';
import { formatEntryDate } from '../dates.js';
import { reminderLink, reminderMessage } from '../whatsapp.js';
import { inputClass, primaryBtn, ghostBtn, waBtn } from '../ui.js';

const QUICK_AMOUNTS = [50, 100, 200, 500];

export default function CustomerDetail({ id, onBack }) {
  const [data, setData] = useState(null); // { customer, transactions }
  const [entry, setEntry] = useState({ type: 'given', amount: '', note: '' });
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [error, setError] = useState('');

  async function load() {
    try {
      setData(await api(`/customers/${id}`));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function addEntry(e) {
    e.preventDefault();
    setError('');
    try {
      await api(`/customers/${id}/transactions`, { method: 'POST', body: entry });
      setEntry({ ...entry, amount: '', note: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteEntry(tx) {
    const label = tx.type === 'given' ? 'udhaar given' : 'payment received';
    if (!window.confirm(`Delete this entry (${label} ${formatMoney(tx.amountPaise)})?`)) return;
    try {
      await api(`/customers/${id}/transactions/${tx._id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveCustomer(e) {
    e.preventDefault();
    setError('');
    try {
      await api(`/customers/${id}`, { method: 'PUT', body: editForm });
      setEditing(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteCustomer() {
    if (!window.confirm(`Delete ${data.customer.name} and all their entries? This cannot be undone.`)) return;
    try {
      await api(`/customers/${id}`, { method: 'DELETE' });
      onBack();
    } catch (err) {
      setError(err.message);
    }
  }

  // sticky bar with a clear back arrow (sits just under the app header)
  const backBar = (title) => (
    <div className="sticky top-14 md:top-25 z-[5] bg-paper border-b border-line -mx-4 px-4">
      <button onClick={onBack} className="flex items-center gap-2 min-h-12 pr-4 font-semibold">
        <ArrowLeft size={22} aria-hidden="true" />
        <span>{title}</span>
      </button>
    </div>
  );

  if (!data) {
    return (
      <div>
        {backBar('Customers')}
        <p className="py-6 text-sm">{error || 'Loading...'}</p>
      </div>
    );
  }

  const { customer, transactions } = data;
  const balance = customer.balancePaise;
  const shopName = localStorage.getItem('shopName') || '';

  // running balance after each entry, worked out backwards from the current balance
  let running = balance;
  const rows = transactions.map((tx) => {
    const row = { tx, after: running };
    running += tx.type === 'given' ? -tx.amountPaise : tx.amountPaise;
    return row;
  });

  const addQuick = (n) => setEntry({ ...entry, amount: String((Number(entry.amount) || 0) + n) });

  const gridCols = 'grid grid-cols-[1fr_4.5rem_4.5rem_5rem] md:grid-cols-[1fr_7rem_7rem_8rem] gap-x-2';

  return (
    <div>
      {backBar('Customers')}

      <div className="space-y-8 pt-5">
        {/* name + balance */}
        <section className="border-b border-line pb-6">
          {editing ? (
            <form onSubmit={saveCustomer} className="grid grid-cols-1 sm:grid-cols-6 gap-3">
              <label className="sm:col-span-3 text-sm font-medium">
                Name
                <input
                  className={`${inputClass} mt-1 font-normal`}
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </label>
              <label className="sm:col-span-2 text-sm font-medium">
                Mobile number
                <input
                  type="tel"
                  inputMode="numeric"
                  className={`${inputClass} mt-1 font-normal num`}
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  required
                />
              </label>
              <div className="sm:self-end flex gap-2">
                <button className={primaryBtn}>Save</button>
                <button type="button" onClick={() => setEditing(false)} className={ghostBtn}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-3xl font-bold truncate">{customer.name}</h2>
                <a href={`tel:+91${customer.phone}`} className="inline-flex items-center gap-2 min-h-11 num">
                  <Phone size={16} aria-hidden="true" />
                  {customer.phone}
                </a>
              </div>
              <div className="flex shrink-0">
                <button
                  onClick={() => {
                    setEditForm({ name: customer.name, phone: customer.phone });
                    setEditing(true);
                  }}
                  aria-label="Edit customer"
                  className="min-h-11 min-w-11 flex items-center justify-center"
                >
                  <Pencil size={18} aria-hidden="true" />
                </button>
                <button
                  onClick={deleteCustomer}
                  aria-label="Delete customer"
                  className="min-h-11 min-w-11 flex items-center justify-center hover:text-brick"
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          <div className="mt-3">
            {balance > 0 ? (
              <>
                <p className="text-sm">Amount due</p>
                <p className="font-display text-5xl font-extrabold text-brick num">{formatMoney(balance)}</p>
                <a href={reminderLink(customer, shopName)} target="_blank" rel="noopener noreferrer" className={`${waBtn} mt-4`}>
                  <MessageCircle size={18} aria-hidden="true" />
                  Remind on WhatsApp
                </a>
                <p className="mt-3 text-sm border border-line bg-page rounded-sm p-3 max-w-md">
                  {reminderMessage(customer, shopName)}
                </p>
              </>
            ) : balance < 0 ? (
              <p className="text-lg num">Paid {formatMoney(balance)} in advance</p>
            ) : (
              <p className="font-display text-2xl font-bold">No dues</p>
            )}
          </div>
        </section>

        {/* new entry */}
        <section>
          <h3 className="font-display text-lg font-bold mb-3">Add an entry</h3>
          <form onSubmit={addEntry} className="space-y-3">
            <div className="grid grid-cols-2 border border-ink rounded-sm overflow-hidden">
              {[
                ['given', 'Udhaar given'],
                ['received', 'Payment received'],
              ].map(([value, label]) => (
                <label
                  key={value}
                  className={`min-h-11 flex items-center justify-center text-sm cursor-pointer text-center px-2 ${
                    entry.type === value ? 'bg-ink text-paper font-semibold' : 'bg-page'
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={value}
                    checked={entry.type === value}
                    onChange={() => setEntry({ ...entry, type: value })}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
              <label className="sm:col-span-2 text-sm font-medium">
                Amount (₹)
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  className={`${inputClass} mt-1 font-normal num text-lg`}
                  value={entry.amount}
                  onChange={(e) => setEntry({ ...entry, amount: e.target.value })}
                  required
                />
              </label>
              <label className="sm:col-span-3 text-sm font-medium">
                Note (optional)
                <input
                  className={`${inputClass} mt-1 font-normal`}
                  placeholder="e.g. rice, oil, sugar"
                  value={entry.note}
                  onChange={(e) => setEntry({ ...entry, note: e.target.value })}
                />
              </label>
              <div className="sm:self-end">
                <button className={`${primaryBtn} w-full`}>Save entry</button>
              </div>
            </div>

            {/* quick amounts: each tap adds to the amount */}
            <div className="flex flex-wrap items-center gap-2">
              {QUICK_AMOUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => addQuick(n)}
                  className="min-h-11 px-4 rounded-full border border-line bg-page text-sm num"
                >
                  +₹{n}
                </button>
              ))}
              <button type="button" onClick={() => setEntry({ ...entry, amount: '' })} className="min-h-11 px-2 text-sm underline underline-offset-2">
                Clear
              </button>
            </div>

            {error && <p className="text-sm text-brick font-medium">{error}</p>}
          </form>
        </section>

        {/* khata page */}
        <section>
          <h3 className="font-display text-lg font-bold">Khata</h3>
          <p className="text-sm mb-2">Diya = udhaar given, Mila = payment received, Baaki = due after that entry.</p>

          {transactions.length === 0 ? (
            <p className="py-6 text-sm">No entries yet. Add the first one above.</p>
          ) : (
            <div className="ledger">
              <div className={`${gridCols} border-b-2 border-ink py-2 text-sm font-semibold`}>
                <span>Date</span>
                <span className="text-right">Diya</span>
                <span className="text-right">Mila</span>
                <span className="text-right">Baaki</span>
              </div>
              <ul>
                {rows.map(({ tx, after }) => (
                  <li key={tx._id} className={`${gridCols} border-b border-line py-2 items-start`}>
                    <div className="min-w-0">
                      <p className="text-sm num">{formatEntryDate(tx.createdAt)}</p>
                      {tx.note && <p className="text-sm break-words">{tx.note}</p>}
                      <button onClick={() => deleteEntry(tx)} className="text-xs underline underline-offset-2 py-2 hover:text-brick">
                        Delete
                      </button>
                    </div>
                    <span className="text-right text-sm num">{tx.type === 'given' ? formatMoney(tx.amountPaise) : ''}</span>
                    <span className="text-right text-sm num">{tx.type === 'received' ? formatMoney(tx.amountPaise) : ''}</span>
                    <span className={`text-right text-sm font-semibold num ${after > 0 ? 'text-brick' : ''}`}>
                      {after < 0 ? `${formatMoney(after)} adv.` : formatMoney(after)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
