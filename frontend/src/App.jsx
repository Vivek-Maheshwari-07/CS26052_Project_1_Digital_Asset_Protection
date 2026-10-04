import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useContext, useEffect, useRef, useState } from 'react';
import { AuthProvider, AuthContext } from './AuthContext';
import { ToastProvider } from './components/Toast';
import { Logo, IconGrid, IconPlus, IconScan, IconLogout } from './components/Icons';
import Register from './pages/Register';
import Check from './pages/Check';
import Dashboard from './pages/Dashboard';
import Evidence from './pages/Evidence';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Verify from './pages/Verify';

const FullPageLoader = () => (
    <div className="full-loader"><Logo size={40} /><span className="spinner" /></div>
);

const ProtectedRoute = () => {
    const { status } = useContext(AuthContext);
    const location = useLocation();
    if (status === 'loading') return <FullPageLoader />;
    if (status !== 'authed') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    return <AppShell><Outlet /></AppShell>;
};

const GuestRoute = () => {
    const { status } = useContext(AuthContext);
    if (status === 'loading') return <FullPageLoader />;
    if (status === 'authed') return <Navigate to="/dashboard" replace />;
    return <Outlet />;
};

function UserMenu() {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const name = user?.full_name || user?.username || '';
    const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

    return (
        <div className="user-menu" ref={ref}>
            <button className="avatar" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Account menu">
                {initials || '?'}
            </button>
            {open && (
                <div className="menu-pop">
                    <div className="menu-user">
                        <span className="avatar avatar-lg">{initials}</span>
                        <div>
                            <strong>{name}</strong>
                            <small>{user?.email || `@${user?.username}`}</small>
                        </div>
                    </div>
                    <button className="menu-item danger" onClick={() => { logout(); navigate('/login'); }}>
                        <IconLogout size={16} /> Log out
                    </button>
                </div>
            )}
        </div>
    );
}

function AppShell({ children }) {
    return (
        <>
            <header className="topbar">
                <div className="topbar-inner">
                    <NavLink to="/dashboard" className="brand"><Logo /> <span>Provenance</span></NavLink>
                    <nav className="nav-pills">
                        <NavLink to="/dashboard"><IconGrid size={16} /> <span>Portfolio</span></NavLink>
                        <NavLink to="/works/new"><IconPlus size={16} /> <span>Register</span></NavLink>
                        <NavLink to="/check"><IconScan size={16} /> <span>Check copies</span></NavLink>
                    </nav>
                    <UserMenu />
                </div>
            </header>
            <main className="app-container">{children}</main>
        </>
    );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route element={<GuestRoute />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                </Route>
                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/works/new" element={<Register />} />
                    <Route path="/check" element={<Check />} />
                    <Route path="/check/:checkId" element={<Check />} />
                    <Route path="/evidence/:checkId/:matchWorkId" element={<Evidence />} />
                </Route>
                <Route path="/verify/:workId" element={<Verify />} />
                <Route path="/register" element={<Navigate to="/works/new" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
