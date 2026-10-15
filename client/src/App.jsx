import { useState } from 'react';
import { ClipboardList, Package, Users, LogOut } from 'lucide-react';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Items from './pages/Items.jsx';
import Customers from './pages/Customers.jsx';

const TABS = [
  { id: 'home', label: 'Today', icon: ClipboardList },
  { id: 'items', label: 'Items', icon: Package },
  { id: 'customers', label: 'Customers', icon: Users },
];

export default function App() {
  const [shopName, setShopName] = useState(localStorage.getItem('shopName'));
  const [tab, setTab] = useState('home');
  const [itemsFilter, setItemsFilter] = useState('all');
  const loggedIn = Boolean(localStorage.getItem('token'));

  function handleLogin({ token, shopName }) {
    localStorage.setItem('token', token);
    localStorage.setItem('shopName', shopName);
    setShopName(shopName);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('shopName');
    window.location.reload();
  }

  // go to a tab; the Today page uses this to open Items with a filter already chosen
  function go(nextTab, filter = 'all') {
    setItemsFilter(filter);
    setTab(nextTab);
    window.scrollTo({ top: 0 });
  }

  if (!loggedIn) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-paper sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-display font-bold text-xl truncate">{shopName}</h1>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm min-h-11 px-2">
            <LogOut size={18} aria-hidden="true" />
            Log out
          </button>
        </div>

        {/* tabs on bigger screens */}
        <nav className="hidden md:flex max-w-4xl mx-auto px-4" aria-label="Main">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => go(id)}
              className={`min-h-11 px-4 flex items-center gap-2 text-sm border-b-[3px] ${
                tab === id ? 'border-ink font-semibold' : 'border-transparent'
              }`}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-10">
        {tab === 'home' && <Home go={go} />}
        {tab === 'items' && <Items key={itemsFilter} initialFilter={itemsFilter} />}
        {tab === 'customers' && <Customers />}
      </main>

      {/* bottom bar on phones, easy to reach with a thumb */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 bg-paper border-t border-line z-10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Main"
      >
        <div className="grid grid-cols-3">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => go(id)}
              className={`min-h-16 flex flex-col items-center justify-center gap-1 text-xs border-t-[3px] ${
                tab === id ? 'border-ink font-semibold' : 'border-transparent'
              }`}
            >
              <Icon size={22} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
