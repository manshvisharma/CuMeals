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

      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Clock size={16} className="text-indigo-400" />
            <span>Global Meal Schedule</span>
          </h3>
          <span className="text-xs text-slate-400">
            Sets default meal hours displayed in Timings and Menu
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {[
            { key: 'breakfast', label: 'Breakfast Timing' },
            { key: 'lunch', label: 'Lunch Timing' },
            { key: 'snacksBoys', label: 'Snacks (Boys) Timing' },
            { key: 'snacksGirls', label: 'Snacks (Girls) Timing' },
            { key: 'dinner', label: 'Dinner Timing' }
          ].map(item => (
            <div key={item.key} className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                {item.label}
              </label>
              <input
                type="text"
                value={timings[item.key as keyof MealTimings] || ''}
                onChange={(e) => handleChange(item.key as keyof MealTimings, e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          ))}
        </div>

        <div className="pt-2">
          <label className="text-xs font-bold text-slate-300 block mb-1.5">
            Bottom Information Note (Shown on Timings screen)
          </label>
          <textarea
            rows={2}
            value={timings.noticeNote || ''}
            onChange={(e) => handleChange('noticeNote', e.target.value)}
            className="w-full p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
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
