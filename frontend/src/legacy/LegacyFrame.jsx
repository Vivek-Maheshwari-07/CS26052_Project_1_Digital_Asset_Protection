import { Outlet } from 'react-router-dom';
import { ToastProvider } from './components/Toast';

/**
 * Hosts screens that still use the original stylesheet; its rules only apply inside `.legacy-ui`.
 * `contained` adds the original page container, for screens shown inside the app shell.
 */
export default function LegacyFrame({ contained = false }) {
    return (
        <div className="legacy-ui">
            <ToastProvider>
                {contained ? <div className="app-container"><Outlet /></div> : <Outlet />}
            </ToastProvider>
        </div>
    );
}
