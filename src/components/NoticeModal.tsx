import React from 'react';
import { NoticeItem } from '../types';
import { Sheet } from './bento/Sheet';

interface NoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  notices: NoticeItem[];
}

function niceDate(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s || '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export const NoticeModal: React.FC<NoticeModalProps> = ({ isOpen, onClose, notices }) => {
  const list = (notices || []).filter((n) => n && n.active !== false);
  return (
    <Sheet open={isOpen} onClose={onClose} label="Notice board">
      <div className="sh-title">
        <h2>Notice board</h2>
        <p>From the mess committee</p>
      </div>
      {list.length === 0 ? (
        <p className="notice" style={{ textAlign: 'center' }}>No announcements right now.</p>
      ) : (
        list.map((n) => (
          <div key={n.id} className={`notice ${n.priority || 'normal'}`}>
            <div className="n-top">
              <b>{n.title}</b>
              <small>{niceDate(n.date)}</small>
            </div>
            <p>{n.content}</p>
          </div>
        ))
      )}
    </Sheet>
  );
};
