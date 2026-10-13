import { useContext, useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '@/auth/auth-context';
import { Logo, IconGrid, IconPlus, IconScan, IconLogout } from './Icons';

export const FullPageLoader = () => (
    <div className="full-loader"><Logo size={40} /><span className="spinner" /></div>
);

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

export default function AppShell({ children }) {
    return (
        <>
            <header className="topbar">
                <div className="topbar-inner">
                    <NavLink to="/dashboard" className="brand"><Logo /> <span>ProvNet</span></NavLink>
                    <nav className="nav-pills">
                        <NavLink to="/dashboard"><IconGrid size={16} /> <span>Dashboard</span></NavLink>
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
