import React, { useState } from 'react';
import { ArrowLeft, Heart, Sparkles, Clock, Share2 } from 'lucide-react';
import { MealIcon } from './MealIcon';
import { MealData, MealType } from '../types';
import { addDays, getFormattedDateLong } from '../utils/dateUtils';
import { fetchMenuForDate } from '../firebase/firestore';

interface MealDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: MealType;
  title: string;
  data?: MealData;
  selectedDate: string;
}

export const MealDetailModal: React.FC<MealDetailModalProps> = ({
  isOpen,
  onClose,
  type,
  title,
  data,
  selectedDate
}) => {
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [tomorrowData, setTomorrowData] = useState<MealData | null>(null);
  const [loadingTomorrow, setLoadingTomorrow] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen) {
      const tomorrowStr = addDays(selectedDate, 1);
      setLoadingTomorrow(true);
      fetchMenuForDate(tomorrowStr).then(menu => {
        if (menu && menu[type]) {
          setTomorrowData(menu[type]);
        } else {
          setTomorrowData(null);
        }
        setLoadingTomorrow(false);
      });
    }
  }, [isOpen, selectedDate, type]);

  if (!isOpen) return null;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${title} - ${getFormattedDateLong(selectedDate)}`,
        text: `Hostel Mess Menu (${title}): ${data?.items.join(', ')}`
      }).catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 dark:bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md h-[90vh] sm:h-auto max-h-[85vh] rounded-t-[36px] sm:rounded-[36px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white dark:border-slate-800 shadow-2xl overflow-y-auto no-scrollbar p-6 flex flex-col justify-between animate-slideUp">
        
        <div>
          {/* Top Navbar */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft size={20} strokeWidth={2.2} />
            </button>

            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 tracking-tight">
              {getFormattedDateLong(selectedDate)}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors"
                aria-label="Share"
              >
                <Share2 size={18} />
              </button>
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={`p-2.5 rounded-full transition-colors ${
                  isFavorite 
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-500' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
                aria-label="Favorite"
              >
                <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          {/* Large Soft Glass Icon Area */}
          <div className="flex flex-col items-center justify-center py-6">
            <div className="scale-125 mb-4">
              <MealIcon type={type} size={28} />
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {title}
            </h2>

            <div className="flex items-center gap-1.5 mt-2 px-3.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Clock size={13} />
              <span>{data?.time || '8:00 AM – 9:30 AM'}</span>
            </div>
          </div>

          {/* Today's Menu Section */}
          <div className="mt-4 p-5 rounded-[24px] bg-white/60 dark:bg-slate-800/40 border border-white dark:border-slate-800 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Today's Menu
            </h3>

            {data?.items && data.items.length > 0 ? (
              <ul className="space-y-2.5">
                {data.items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-base font-semibold text-slate-800 dark:text-slate-100">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">No menu available for this meal.</p>
            )}
          </div>

          {/* Tomorrow's Preview Section */}
          <div className="mt-5 p-5 rounded-[24px] bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <Sparkles size={14} />
                <span>Tomorrow's Preview</span>
              </div>
              <span className="text-xs text-slate-400">{addDays(selectedDate, 1)}</span>
            </div>

            {loadingTomorrow ? (
              <div className="h-12 flex items-center justify-center text-xs text-slate-400">Loading tomorrow's menu...</div>
            ) : tomorrowData && tomorrowData.items.length > 0 ? (
              <ul className="space-y-2">
                {tomorrowData.items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 italic">Tomorrow's menu will be updated soon.</p>
            )}
          </div>
        </div>

        {/* Done / Close Button */}
        <div className="mt-6 pt-4">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-full bg-slate-900 dark:bg-indigo-600 text-white font-semibold text-sm shadow-lg active:scale-98 transition-all"
          >
            Close Details
          </button>
        </div>

      </div>
    </div>
  );
};
