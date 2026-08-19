import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Save, Check, Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { DailyMenu, MealType, MealTimings } from '../../types';
import { fetchMenuForDate, saveMenuForDate, fetchTimings } from '../../firebase/firestore';
import { getTodayString, addDays, getFormattedDateLong, getFullDayName } from '../../utils/dateUtils';

export const MenuManager: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [menuData, setMenuData] = useState<DailyMenu | null>(null);
  const [globalTimings, setGlobalTimings] = useState<MealTimings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const mealTypes: { id: MealType; title: string; timeKey: keyof MealTimings; defaultTime: string }[] = [
    { id: 'breakfast', title: 'Breakfast', timeKey: 'breakfast', defaultTime: '07:30 AM – 09:30 AM' },
    { id: 'lunch', title: 'Lunch', timeKey: 'lunch', defaultTime: '12:30 PM – 02:30 PM' },
    { id: 'snacksBoys', title: 'Snacks (Boys)', timeKey: 'snacksBoys', defaultTime: '04:30 PM – 05:30 PM' },
    { id: 'snacksGirls', title: 'Snacks (Girls)', timeKey: 'snacksGirls', defaultTime: '04:30 PM – 05:30 PM' },
    { id: 'dinner', title: 'Dinner', timeKey: 'dinner', defaultTime: '07:30 PM – 09:30 PM' }
  ];

  // Load global timings once
  useEffect(() => {
    fetchTimings().then(res => {
      if (res) setGlobalTimings(res);
    });
  }, []);

  const loadDateMenu = async (dateStr: string) => {
    setLoading(true);
    const existing = await fetchMenuForDate(dateStr);
    if (existing) {
      setMenuData(existing);
    } else {
      // Default blank menu structure (timings inherited automatically from Timings section)
      setMenuData({
        date: dateStr,
        breakfast: { time: '', items: [] },
        lunch: { time: '', items: [] },
        snacksBoys: { time: '', items: [] },
        snacksGirls: { time: '', items: [] },
        dinner: { time: '', items: [] }
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

  const handleAddItem = (type: MealType) => {
    if (!menuData) return;
    setMenuData({
      ...menuData,
      [type]: {
        ...menuData[type],
        items: [...(menuData[type]?.items || []), '']
      }
    });
  };

  const handleItemChange = (type: MealType, index: number, value: string) => {
    if (!menuData) return;
    const currentItems = menuData[type]?.items || [];
    const newItems = [...currentItems];
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
    const currentItems = menuData[type]?.items || [];
    const newItems = currentItems.filter((_, i) => i !== index);
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
      showToast(`Copied menu from yesterday (${yesterdayStr})!`);
    } else {
      showToast(`No menu found for yesterday (${yesterdayStr}).`);
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
    showToast(`Duplicated this menu to tomorrow (${tomorrowStr})!`);
  };

  const handleSaveMenu = async () => {
    if (!menuData) return;
    setSaving(true);

    // Clean empty item lines before saving
    const cleanedMenu: DailyMenu = {
      ...menuData,
      date: selectedDate,
      breakfast: {
        time: globalTimings?.breakfast || menuData.breakfast?.time || '',
        items: (menuData.breakfast?.items || []).filter(i => i.trim().length > 0)
      },
      lunch: {
        time: globalTimings?.lunch || menuData.lunch?.time || '',
        items: (menuData.lunch?.items || []).filter(i => i.trim().length > 0)
      },
      snacksBoys: {
        time: globalTimings?.snacksBoys || menuData.snacksBoys?.time || '',
        items: (menuData.snacksBoys?.items || []).filter(i => i.trim().length > 0)
      },
      snacksGirls: {
        time: globalTimings?.snacksGirls || menuData.snacksGirls?.time || '',
        items: (menuData.snacksGirls?.items || []).filter(i => i.trim().length > 0)
      },
      dinner: {
        time: globalTimings?.dinner || menuData.dinner?.time || '',
        items: (menuData.dinner?.items || []).filter(i => i.trim().length > 0)
      }
    };

    await saveMenuForDate(cleanedMenu);
    setMenuData(cleanedMenu);
    setSaving(false);
    showToast(`Menu saved for ${getFormattedDateLong(selectedDate)}!`);
  };

  const todayStr = getTodayString();
  const dayName = getFullDayName(selectedDate);
  const formattedLong = getFormattedDateLong(selectedDate);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-slideDown">
          <Check size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Date Header & Quick Navigation Controls */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Select Date for Menu
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-sm font-extrabold text-indigo-400">
                {dayName}, {formattedLong}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Meal timings automatically follow the <strong className="text-slate-300">Timings section</strong> schedule.
            </p>
          </div>

          {/* Quick Date Steppers & Copy Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors"
                title="Previous Day"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setSelectedDate(todayStr)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  selectedDate === todayStr ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors"
                title="Next Day"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={handleCopyYesterday}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <Copy size={14} />
              <span>Copy Yesterday</span>
            </button>

            <button
              onClick={handleDuplicateToTomorrow}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <Copy size={14} />
              <span>Duplicate to Tomorrow</span>
            </button>
          </div>
        </div>
      </div>

      {/* Meal Items Section - Laptop Responsive Grid */}
      {loading || !menuData ? (
        <div className="py-16 text-center text-slate-400">Loading menu for {formattedLong}...</div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-200">
              Editing Menu for: <span className="text-indigo-400 font-extrabold">{dayName} ({formattedLong})</span>
            </h2>
            <span className="text-xs text-slate-400 hidden md:inline">
              Add food items per meal. Timings are managed in the Timings tab.
            </span>
          </div>

          {/* 3-Column Grid on Laptop/Desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {mealTypes.map((m) => {
              const meal = menuData[m.id] || { time: '', items: [] };
              const currentScheduleTime = (globalTimings && globalTimings[m.timeKey]) || m.defaultTime;

              return (
                <div
                  key={m.id}
                  className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    {/* Meal Header (Title + Auto Timing Badge from Timings Section) */}
                    <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800">
                      <h3 className="text-sm font-bold text-slate-100">
                        {m.title}
                      </h3>

                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-semibold"
                        title="Automatic schedule timing from Timings section"
                      >
                        <Clock size={12} className="text-indigo-400 shrink-0" />
                        <span>{currentScheduleTime}</span>
                      </div>
                    </div>

                    {/* Food Items List */}
                    <div className="space-y-2 mb-4 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                      {meal.items.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2">
                          No items added yet. Click "+ Add Food Item" below.
                        </p>
                      ) : (
                        meal.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-500 w-4 text-center shrink-0">
                              {idx + 1}.
                            </span>
                            <input
                              type="text"
                              value={item}
                              placeholder="e.g. Paneer Butter Masala, Roti, Salad"
                              onChange={(e) => handleItemChange(m.id, idx, e.target.value)}
                              className="flex-1 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-medium text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-600"
                            />
                            <button
                              onClick={() => handleRemoveItem(m.id, idx)}
                              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/50 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddItem(m.id)}
                    className="w-full py-2 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus size={14} />
                    <span>Add Food Item</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Sticky Save Action Bar */}
          <div className="pt-4 sticky bottom-4 z-30">
            <button
              onClick={handleSaveMenu}
              disabled={saving}
              className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-2xl shadow-indigo-600/40 flex items-center justify-center gap-2.5 active:scale-98 transition-all"
            >
              <Save size={18} />
              <span>
                {saving
                  ? `Saving Menu for ${formattedLong}...`
                  : `Save Menu for ${dayName} (${formattedLong})`}
              </span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
