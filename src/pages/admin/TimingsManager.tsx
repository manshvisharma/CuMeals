import React, { useState, useEffect } from 'react';
import { Clock, Save, Check } from 'lucide-react';
import { fetchTimings, saveTimings } from '../../firebase/firestore';
import { MealTimings } from '../../types';

export const TimingsManager: React.FC = () => {
  const [timings, setTimings] = useState<MealTimings>({
    breakfast: '8:00 AM – 9:30 AM',
    lunch: '12:30 PM – 2:00 PM',
    snacksBoys: '4:30 PM – 5:30 PM',
    snacksGirls: '4:30 PM – 5:30 PM',
    dinner: '8:00 PM – 9:30 PM',
    noticeNote: 'Timings may vary on special days.'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetchTimings().then(res => {
      if (res) setTimings(res);
      setLoading(false);
    });
  }, []);

  const handleChange = (key: keyof MealTimings, val: string) => {
    setTimings(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await saveTimings(timings);
    setSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-400">Loading timings config...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 animate-fadeIn">
      {savedSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
          <Check size={16} />
          <span>Timings configuration saved to Firestore!</span>
        </div>
      )}

      <div className="p-5 rounded-[28px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Clock size={16} />
          <span>Global Meal Schedule</span>
        </h3>

        {[
          { key: 'breakfast', label: 'Breakfast Timing' },
          { key: 'lunch', label: 'Lunch Timing' },
          { key: 'snacksBoys', label: 'Snacks (Boys) Timing' },
          { key: 'snacksGirls', label: 'Snacks (Girls) Timing' },
          { key: 'dinner', label: 'Dinner Timing' }
        ].map(item => (
          <div key={item.key}>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
              {item.label}
            </label>
            <input
              type="text"
              value={timings[item.key as keyof MealTimings] || ''}
              onChange={(e) => handleChange(item.key as keyof MealTimings, e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        ))}

        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Bottom Information Note
          </label>
          <textarea
            rows={2}
            value={timings.noticeNote || ''}
            onChange={(e) => handleChange('noticeNote', e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all"
      >
        <Save size={16} />
        <span>{saving ? 'Saving...' : 'Save Global Timings'}</span>
      </button>
    </form>
  );
};
