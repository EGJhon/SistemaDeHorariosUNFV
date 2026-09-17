import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function AlertBanner({ type = 'danger', title, message }) {
  if (!message) return null;

  const isDanger = type === 'danger';

  return (
    <div className={`alert-banner alert-banner-${type}`}>
      {isDanger ? (
        <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
      ) : (
        <CheckCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
      )}
      <div>
        {title && <strong>{title}</strong>}
        <div style={{ marginTop: title ? 2 : 0 }}>{message}</div>
      </div>
    </div>
  );
}
