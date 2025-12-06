'use client';

import { useEffect, useState } from 'react';

export default function Toast({
  message,
  type = 'success',
  onClose,
  duration = 2000
}: {
  message: string;
  type?: 'success' | 'error';
  onClose?: () => void;
  duration?: number;
}) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;
  return <div className={`toast ${type === 'error' ? 'error' : ''}`}>{message}</div>;
}
