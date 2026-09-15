import { useState, useEffect, useCallback } from 'react';
import { DailyMenu, MealTimings, NoticeItem, MessSettings } from '../types';
import { fetchMenuForDate, fetchTimings, fetchNotices, fetchSettings, getLocalStorageMenu } from '../firebase/firestore';
import { getTodayString } from '../utils/dateUtils';

export function useMenu(selectedDateStr: string) {
  // Initialize with cached data if available for instant load
  const [menu, setMenu] = useState<DailyMenu | null>(() => getLocalStorageMenu(selectedDateStr));
  const [loading, setLoading] = useState<boolean>(!menu);
  const [error, setError] = useState<string | null>(null);

  const loadMenu = useCallback(async (date: string) => {
    // Only show loading indicator if we don't already have cached data
    const cachedData = getLocalStorageMenu(date);
    if (!cachedData) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchMenuForDate(date);
      setMenu(data || cachedData); // Keep cached data if fetch returns null incorrectly
    } catch (err) {
      console.error('Error in useMenu hook', err);
      if (!cachedData) {
        setError('Failed to load mess menu. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Instantly set cached data when date changes while we fetch new data
    const cachedData = getLocalStorageMenu(selectedDateStr);
    if (cachedData) {
      setMenu(cachedData);
    }
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
