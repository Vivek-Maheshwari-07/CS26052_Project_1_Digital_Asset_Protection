import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Download,
  Award,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Eye,
  Trash2
} from 'lucide-react';
import Button from '../ui/Button';

export const NotificationCard = ({
  notification,
  onMarkRead,
  onDismiss
}) => {
  const getIcon = (type) => {
    switch (type) {
      case 'match_found':
        return <ShieldAlert className="w-5 h-5 text-amber-400" />;
      case 'download_request':
        return <Download className="w-5 h-5 text-cyan-400" />;
      case 'certificate_generated':
        return <Award className="w-5 h-5 text-emerald-400" />;
      case 'registration_successful':
        return <CheckCircle2 className="w-5 h-5 text-blue-400" />;
      default:
        return <Info className="w-5 h-5 text-slate-400" />;
    }
  };

  const getBg = () => {
    if (!notification.isRead) {
      return 'bg-slate-900/90 border-cyan-500/30 shadow-lg shadow-cyan-950/20';
    }
    return 'bg-slate-900/40 border-slate-800/80 text-slate-400';
  };

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${getBg()} flex flex-col sm:flex-row items-start justify-between gap-4`}>
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0">
          {getIcon(notification.type)}
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className={`text-sm font-bold ${notification.isRead ? 'text-slate-300' : 'text-white'}`}>
              {notification.title}
            </h4>
            {!notification.isRead && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
            {notification.message}
          </p>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono pt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{new Date(notification.timestamp).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
        {notification.evidenceId && (
          <Link to={`/evidence/${notification.evidenceId}`}>
            <Button variant="glow" size="xs" icon={Eye}>
              View Evidence
            </Button>
          </Link>
        )}

        {notification.requestId && (
          <Link to="/download-requests">
            <Button variant="primary" size="xs" icon={Download}>
              Manage Request
            </Button>
          </Link>
        )}

        {notification.certificateId && (
          <Link to={`/certificate/${notification.certificateId}`}>
            <Button variant="secondary" size="xs" icon={Award}>
              Certificate
            </Button>
          </Link>
        )}

        {!notification.isRead && onMarkRead && (
          <Button variant="outline" size="xs" onClick={() => onMarkRead(notification.id)}>
            Mark Read
          </Button>
        )}

        {onDismiss && (
          <button
            onClick={() => onDismiss(notification.id)}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Dismiss notification"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationCard;
