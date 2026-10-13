import { Outlet } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import AppShell from './components/AppShell';

/** Hosts screens that still use the original stylesheet; its rules only apply inside `.legacy-ui`. */
export default function LegacyFrame({ shell = false }) {
    return (
        <div className="legacy-ui">
            <ToastProvider>
                {shell ? <AppShell><Outlet /></AppShell> : <Outlet />}
            </ToastProvider>
        </div>
    );
}
