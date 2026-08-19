import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Copy, Save, Check, Clock, RefreshCw } from 'lucide-react';
import { DailyMenu, MealData, MealType } from '../../types';
import { fetchMenuForDate, saveMenuForDate } from '../../firebase/firestore';
import { getTodayString, addDays, getFormattedDateLong } from '../../utils/dateUtils';

export const MenuManager: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [menuData, setMenuData] = useState<DailyMenu | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const mealTypes: { id: MealType; title: string; defaultTime: string }[] = [
    { id: 'breakfast', title: 'Breakfast', defaultTime: '8:00 AM – 9:30 AM' },
    { id: 'lunch', title: 'Lunch', defaultTime: '12:30 PM – 2:00 PM' },
    { id: 'snacksBoys', title: 'Snacks (Boys)', defaultTime: '4:30 PM – 5:30 PM' },
    { id: 'snacksGirls', title: 'Snacks (Girls)', defaultTime: '4:30 PM – 5:30 PM' },
    { id: 'dinner', title: 'Dinner', defaultTime: '8:00 PM – 9:30 PM' }
  ];

  const loadDateMenu = async (dateStr: string) => {
    setLoading(true);
    const existing = await fetchMenuForDate(dateStr);
    if (existing) {
      setMenuData(existing);
    } else {
      // Default blank menu structure
      setMenuData({
        date: dateStr,
        breakfast: { time: '8:00 AM – 9:30 AM', items: ['Poha', 'Tea'] },
        lunch: { time: '12:30 PM – 2:00 PM', items: ['Rajma Chawal', 'Salad'] },
        snacksBoys: { time: '4:30 PM – 5:30 PM', items: ['Samosa', 'Tea'] },
        snacksGirls: { time: '4:30 PM – 5:30 PM', items: ['Sandwich', 'Milk'] },
        dinner: { time: '8:00 PM – 9:30 PM', items: ['Dal', 'Rice', 'Mix Veg'] }
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDateMenu(selectedDate);
  }, [selectedDate]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleTimeChange = (type: MealType, newTime: string) => {
    if (!menuData) return;
    setMenuData({
      ...menuData,
      [type]: {
        ...menuData[type],
        time: newTime
      }
    });
  };

  const handleAddItem = (type: MealType) => {
    if (!menuData) return;
    setMenuData({
      ...menuData,
      [type]: {
        ...menuData[type],
        items: [...menuData[type].items, 'New Food Item']
      }
    });
  };

  const handleItemChange = (type: MealType, index: number, value: string) => {
    if (!menuData) return;
    const newItems = [...menuData[type].items];
    newItems[index] = value;
    setMenuData({
      ...menuData,
      [type]: {
        ...menuData[type],
        items: newItems
      }
    });
  };

  const handleRemoveItem = (type: MealType, index: number) => {
    if (!menuData) return;
    const newItems = menuData[type].items.filter((_, i) => i !== index);
    setMenuData({
      ...menuData,
      [type]: {
        ...menuData[type],
        items: newItems
      }
    });
  };

  const handleCopyYesterday = async () => {
    const yesterdayStr = addDays(selectedDate, -1);
    const yesterdayMenu = await fetchMenuForDate(yesterdayStr);
    if (yesterdayMenu) {
      setMenuData({
        ...yesterdayMenu,
        date: selectedDate
      });
      showToast("Copied yesterday's menu successfully!");
    } else {
      showToast("No menu found for yesterday.");
    }
  };

  const handleDuplicateToTomorrow = async () => {
    if (!menuData) return;
    const tomorrowStr = addDays(selectedDate, 1);
    const copiedMenu: DailyMenu = {
      ...menuData,
      date: tomorrowStr
    };
    await saveMenuForDate(copiedMenu);
    showToast(`Duplicated menu to tomorrow (${tomorrowStr})!`);
  };

  const handleSaveMenu = async () => {
    if (!menuData) return;
    setSaving(true);
    await saveMenuForDate(menuData);
    setSaving(false);
    showToast(`Menu saved to Firestore for ${selectedDate}!`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-slideDown">
          <Check size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Date Bar & Quick Actions */}
      <div className="p-5 rounded-[28px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
              Select Menu Date
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {getFormattedDateLong(selectedDate)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyYesterday}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <Copy size={14} />
              <span>Copy Yesterday</span>
            </button>

            <button
              onClick={handleDuplicateToTomorrow}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <Copy size={14} />
              <span>Duplicate to Tomorrow</span>
            </button>
          </div>
        </div>
      </div>

      {/* Meal Editor Section */}
      {loading || !menuData ? (
        <div className="py-12 text-center text-slate-400">Loading menu for editor...</div>
      ) : (
        <div className="space-y-4">
          {mealTypes.map((m) => {
            const meal = menuData[m.id] || { time: m.defaultTime, items: [] };

            return (
              <div
                key={m.id}
                className="p-5 rounded-[28px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/80 dark:border-slate-800 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {m.title}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs">
                    <Clock size={13} className="text-slate-400" />
                    <input
                      type="text"
                      value={meal.time}
                      onChange={(e) => handleTimeChange(m.id, e.target.value)}
                      placeholder="e.g. 8:00 AM - 9:30 AM"
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 border-none outline-none focus:ring-1 focus:ring-indigo-500 w-36"
                    />
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2 mb-3">
                  {meal.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300 dark:text-slate-600 w-5">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => handleItemChange(m.id, idx, e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button
                        onClick={() => handleRemoveItem(m.id, idx)}
                        className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleAddItem(m.id)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center gap-1 hover:bg-indigo-100 transition-colors"
                >
                  <Plus size={14} />
                  <span>Add Food Item</span>
                </button>
              </div>
            );
          })}

          {/* Sticky Save Button */}
          <div className="pt-4 sticky bottom-20 z-30">
            <button
              onClick={handleSaveMenu}
              disabled={saving}
              className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <Save size={18} />
              <span>{saving ? 'Saving to Firestore...' : `Save Menu for ${selectedDate}`}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
