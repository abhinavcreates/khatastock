import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { api } from '../api.js';
import { formatMoney } from '../money.js';
import { daysLeft } from '../dates.js';
import { reminderLink } from '../whatsapp.js';
import { ghostBtn, primaryBtn, waBtn } from '../ui.js';

const WINDOW_DAYS = 7;

export default function Home({ go }) {
  const [items, setItems] = useState(null);
  const [customers, setCustomers] = useState(null);
  const [error, setError] = useState('');
  const shopName = localStorage.getItem('shopName') || '';

  useEffect(() => {
    Promise.all([api('/items'), api('/customers')])
      .then(([i, c]) => {
        setItems(i);
        setCustomers(c);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="text-sm text-brick font-medium">{error}</p>;
  if (!items || !customers) return <p className="text-sm">Loading...</p>;

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (items.length === 0 && customers.length === 0) {
    return (
      <div>
        <p className="text-sm">{today}</p>
        <h2 className="font-display text-2xl font-bold mt-1">Nothing here yet</h2>
        <p className="mt-2 text-sm max-w-md">
          Add the items in your shop with their quantity and expiry date, and add customers who take udhaar.
          What needs your attention will show up on this page.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={() => go('items')} className={primaryBtn}>
            Add items
          </button>
          <button onClick={() => go('customers')} className={ghostBtn}>
            Add customers
          </button>
        </div>
      </div>
    );
  }

  const withDays = items.map((i) => ({ ...i, days: daysLeft(i.expiryDate) }));
  const expired = withDays.filter((i) => i.days !== null && i.days < 0);
  const soon = withDays.filter((i) => i.days !== null && i.days >= 0 && i.days <= WINDOW_DAYS);
  const low = items.filter((i) => i.quantity <= i.lowStockLimit);
  const owing = customers
    .filter((c) => c.balancePaise > 0)
    .sort((a, b) => b.balancePaise - a.balancePaise);
  const totalDue = owing.reduce((sum, c) => sum + c.balancePaise, 0);

  const attention = [...expired, ...soon].sort((a, b) => a.days - b.days);

  const cells = [
    { label: 'Expired', value: expired.length, color: expired.length ? 'text-brick' : '', onClick: () => go('items', 'expired') },
    { label: `Expiring in ${WINDOW_DAYS} days`, value: soon.length, color: soon.length ? 'text-turmeric-ink' : '', onClick: () => go('items', 'expiring') },
    { label: 'Low stock', value: low.length, color: '', onClick: () => go('items', 'low') },
    {
      label: owing.length ? `To collect from ${owing.length} customer${owing.length === 1 ? '' : 's'}` : 'To collect',
      value: owing.length ? formatMoney(totalDue) : '₹0',
      color: owing.length ? 'text-brick' : '',
      onClick: () => go('customers'),
    },
  ];

  return (
    <div className="space-y-10">
      <section>
        <p className="text-sm">{today}</p>
        <h2 className="font-display text-2xl font-bold mt-1 mb-4">Today at your shop</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-l border-line">
          {cells.map((c) => (
            <button key={c.label} onClick={c.onClick} className="border-b border-r border-line p-4 text-left min-h-24">
              <span className={`block font-display text-3xl font-bold num ${c.color}`}>{c.value}</span>
              <span className="block text-sm mt-1">{c.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg font-bold border-b border-line pb-2">Customers to remind</h3>
        {owing.length === 0 ? (
          <p className="py-4 text-sm">No one owes you money right now.</p>
        ) : (
          <ul className="ledger">
            {owing.slice(0, 5).map((c) => (
              <li key={c._id} className="border-b border-line py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.name}</p>
                  <p className="font-semibold text-brick num">{formatMoney(c.balancePaise)}</p>
                </div>
                <a href={reminderLink(c, shopName)} target="_blank" rel="noopener noreferrer" className={waBtn}>
                  <MessageCircle size={18} aria-hidden="true" />
                  Remind
                </a>
              </li>
            ))}
          </ul>
        )}
        {owing.length > 5 && (
          <button onClick={() => go('customers')} className="mt-2 min-h-11 text-sm underline underline-offset-2">
            See all {owing.length} customers
          </button>
        )}
      </section>

      <section>
        <h3 className="font-display text-lg font-bold border-b border-line pb-2">Items to check</h3>
        {attention.length === 0 ? (
          <p className="py-4 text-sm">Nothing is expired or expiring in the next {WINDOW_DAYS} days.</p>
        ) : (
          <ul className="ledger">
            {attention.slice(0, 6).map((i) => (
              <li key={i._id} className="border-b border-line py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{i.name}</p>
                  <p className="text-sm num">
                    {i.quantity} {i.unit}
                  </p>
                </div>
                <span
                  className={`shrink-0 inline-block border-2 rounded-sm px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide -rotate-2 ${
                    i.days < 0 ? 'border-brick text-brick' : 'border-turmeric-ink text-turmeric-ink bg-turmeric/30'
                  }`}
                >
                  {i.days < 0 ? 'Expired' : i.days === 0 ? 'Expires today' : `Expires in ${i.days} day${i.days === 1 ? '' : 's'}`}
                </span>
              </li>
            ))}
          </ul>
        )}
        {attention.length > 6 && (
          <button onClick={() => go('items', 'expiring')} className="mt-2 min-h-11 text-sm underline underline-offset-2">
            See all {attention.length} items
          </button>
        )}
      </section>
    </div>
  );
}
