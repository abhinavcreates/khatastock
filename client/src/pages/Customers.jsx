import { useEffect, useState } from 'react';
import { MessageCircle, Search, UserPlus } from 'lucide-react';
import { api } from '../api.js';
import { formatMoney } from '../money.js';
import { reminderLink } from '../whatsapp.js';
import { inputClass, primaryBtn, waBtn } from '../ui.js';
import CustomerDetail from './CustomerDetail.jsx';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const shopName = localStorage.getItem('shopName') || '';

  async function load() {
    try {
      setCustomers(await api('/customers'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // reload the list every time we come back to it (balances may have changed)
  useEffect(() => {
    if (!selectedId) load();
  }, [selectedId]);

  // phone's back button: go from customer page back to the list
  useEffect(() => {
    const onPop = () => setSelectedId(window.history.state?.customerId || null);
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (window.history.state?.customerId) window.history.replaceState(null, '');
    };
  }, []);

  function openCustomer(id) {
    window.history.pushState({ customerId: id }, '');
    setSelectedId(id);
  }

  function closeCustomer() {
    if (window.history.state?.customerId) window.history.back();
    else setSelectedId(null);
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function addCustomer(e) {
    e.preventDefault();
    setError('');
    try {
      await api('/customers', { method: 'POST', body: form });
      setForm({ name: '', phone: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (selectedId) return <CustomerDetail id={selectedId} onBack={closeCustomer} />;

  const owing = customers.filter((c) => c.balancePaise > 0);
  const totalDue = owing.reduce((sum, c) => sum + c.balancePaise, 0);

  // customers who owe the most come first
  const shown = customers
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search.trim()))
    .sort((a, b) => b.balancePaise - a.balancePaise || a.name.localeCompare(b.name));

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-lg font-bold mb-3">Add a customer</h2>
        <form onSubmit={addCustomer} className="grid grid-cols-1 sm:grid-cols-6 gap-3">
          <label className="sm:col-span-3 text-sm font-medium">
            Name
            <input className={`${inputClass} mt-1 font-normal`} value={form.name} onChange={set('name')} required />
          </label>
          <label className="sm:col-span-2 text-sm font-medium">
            Mobile number
            <input
              type="tel"
              inputMode="numeric"
              className={`${inputClass} mt-1 font-normal num`}
              value={form.phone}
              onChange={set('phone')}
              required
            />
          </label>
          <div className="sm:self-end">
            <button className={`${primaryBtn} w-full`}>
              <UserPlus size={18} aria-hidden="true" />
              Add
            </button>
          </div>
          {error && <p className="sm:col-span-6 text-sm text-brick font-medium">{error}</p>}
        </form>
      </section>

      <section>
        {owing.length > 0 && (
          <p className="mb-4 text-sm">
            Total to collect: <span className="font-semibold text-brick num">{formatMoney(totalDue)}</span> from {owing.length}{' '}
            customer{owing.length === 1 ? '' : 's'}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2">
          <h2 className="font-display text-lg font-bold">Customers ({customers.length})</h2>
          <div className="relative sm:w-64 w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              placeholder="Search name or number"
              aria-label="Search customer"
              className={`${inputClass} pl-10`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="py-6 text-sm">Loading...</p>
        ) : customers.length === 0 ? (
          <p className="py-6 text-sm">No customers yet. Add your first customer above.</p>
        ) : shown.length === 0 ? (
          <p className="py-6 text-sm">No customer matches your search.</p>
        ) : (
          <ul className="ledger">
            {shown.map((c) => (
              <li key={c._id} className="border-b border-line flex items-center gap-2">
                <button onClick={() => openCustomer(c._id)} className="flex-1 min-w-0 min-h-16 py-3 flex items-center justify-between gap-2 text-left">
                  <span className="min-w-0">
                    <span className="block font-medium truncate">{c.name}</span>
                    <span className="block text-sm num">{c.phone}</span>
                  </span>
                  <span className="shrink-0 text-right num">
                    {c.balancePaise > 0 ? (
                      <span className="font-display font-bold text-brick text-xl">{formatMoney(c.balancePaise)}</span>
                    ) : c.balancePaise < 0 ? (
                      <span className="text-sm">Advance {formatMoney(c.balancePaise)}</span>
                    ) : (
                      <span className="text-sm">No dues</span>
                    )}
                  </span>
                </button>
                {c.balancePaise > 0 && (
                  <a
                    href={reminderLink(c, shopName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Remind ${c.name} on WhatsApp`}
                    className={`${waBtn} shrink-0 px-3`}
                  >
                    <MessageCircle size={18} aria-hidden="true" />
                    <span className="hidden sm:inline">Remind</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
