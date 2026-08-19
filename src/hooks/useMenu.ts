import { useState, useEffect, useCallback } from 'react';
import { DailyMenu, MealTimings, NoticeItem, MessSettings } from '../types';
import { fetchMenuForDate, fetchTimings, fetchNotices, fetchSettings } from '../firebase/firestore';
import { getTodayString } from '../utils/dateUtils';

export function useMenu(selectedDateStr: string) {
  const [menu, setMenu] = useState<DailyMenu | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadMenu = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMenuForDate(date);
      setMenu(data);
    } catch (err) {
      console.error('Error in useMenu hook', err);
      setError('Failed to load mess menu. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu(selectedDateStr);
  }, [selectedDateStr, loadMenu]);

  const refresh = () => {
    loadMenu(selectedDateStr);
  };

  return { menu, loading, error, refresh };
}

export function useMessConfig() {
  const [timings, setTimings] = useState<MealTimings | null>(null);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [settings, setSettings] = useState<MessSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const [tData, nData, sData] = await Promise.all([
        fetchTimings(),
        fetchNotices(),
        fetchSettings()
      ]);
      setTimings(tData);
      setNotices(nData);
      setSettings(sData);
    } catch (e) {
      console.error('Failed to load mess config', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return { timings, notices, settings, loading, refreshConfig: loadConfig };
}
