import { useState, useCallback, useEffect, useRef } from 'react';
import { amalJumatApi } from '../services/api';

export function useAmalJumatMarker(fridayDate: string) {
  const [handedOver, setHandedOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    try {
      setLoading(true);
      const marker = await amalJumatApi.get(fridayDate);
      if (seq === requestSeq.current && marker) {
        setHandedOver(marker.handedOver);
      }
    } catch (err) {
      console.error('Failed to load amal jumat marker:', err);
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false);
      }
    }
  }, [fridayDate]);

  useEffect(() => {
    setHandedOver(false);
    setLoading(false);
    load();
  }, [load]);

  const toggle = useCallback(async (): Promise<boolean> => {
    const next = !handedOver;
    setSaving(true);
    setHandedOver(next);
    try {
      await amalJumatApi.upsert(fridayDate, next);
      return true;
    } catch (err) {
      setHandedOver(!next);
      console.error('Failed to update amal jumat marker:', err);
      return false;
    } finally {
      setSaving(false);
    }
  }, [fridayDate, handedOver]);

  return {
    handedOver,
    loading,
    saving,
    load,
    toggle,
  };
}