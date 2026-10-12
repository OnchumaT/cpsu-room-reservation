import { useState, useCallback } from 'react';

/** The equipment-stepper + food-tag-input scratch state, hand-rolled
 * independently in BookingView, TemplatesView and HistoryView before this
 * migration (same clamping math, 3 separate copies). One implementation,
 * keyed off an `equipmentOptions` array ({k, nm, max, ...}) supplied by the
 * caller since each of the 3 forms uses a different equipment set. */
export function useFacilityRequestFields(equipmentOptions, initialEquipment = {}, initialFood = [], initialNote = '') {
  const zeroed = Object.fromEntries(equipmentOptions.map((e) => [e.k, 0]));
  const [equipment, setEquipment] = useState({ ...zeroed, ...initialEquipment });
  const [food, setFood] = useState(initialFood);
  const [facilityNote, setFacilityNote] = useState(initialNote);

  const setEquipmentQty = useCallback((key, delta) => {
    const max = equipmentOptions.find((e) => e.k === key)?.max || 5;
    setEquipment((cur) => ({ ...cur, [key]: Math.max(0, Math.min(max, (cur[key] || 0) + delta)) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipmentOptions]);

  // Typing a number directly into the field, as opposed to clicking +/−
  // repeatedly — same clamp, absolute value instead of a delta.
  const setEquipmentValue = useCallback((key, value) => {
    const max = equipmentOptions.find((e) => e.k === key)?.max || 5;
    const n = Number.isFinite(value) ? value : 0;
    setEquipment((cur) => ({ ...cur, [key]: Math.max(0, Math.min(max, Math.trunc(n))) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipmentOptions]);

  const addFood = useCallback((value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setFood((cur) => [...cur, trimmed]);
  }, []);

  const removeFood = useCallback((index) => {
    setFood((cur) => cur.filter((_, i) => i !== index));
  }, []);

  const reset = useCallback((nextEquipment = {}, nextFood = []) => {
    setEquipment({ ...zeroed, ...nextEquipment });
    setFood(nextFood);
    setFacilityNote('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { equipment, setEquipmentQty, setEquipmentValue, food, addFood, removeFood, facilityNote, setFacilityNote, reset };
}
