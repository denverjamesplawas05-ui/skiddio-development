"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

// Mounted only while open, so the fields always start from the saved settings.
export default function SettingsModal({ settings, userId, onSaved, onClose }) {
  const [dayStart, setDayStart] = useState(settings.dayStart);
  const [dayEnd, setDayEnd] = useState(settings.dayEnd);
  const [buffer, setBuffer] = useState(String(settings.bufferMinutes));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const bufferMinutes = parseInt(buffer, 10);

    if (!dayStart || !dayEnd || dayStart >= dayEnd || !Number.isInteger(bufferMinutes) || bufferMinutes < 0) {
      alert("Enter a valid working day and a non-negative buffer.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("user_settings").upsert({
        user_id: userId,
        day_start: dayStart,
        day_end: dayEnd,
        buffer_minutes: bufferMinutes,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;

      onSaved({ dayStart, dayEnd, bufferMinutes });
      onClose();
      alert("Settings updated successfully!");
    } catch (error) {
      alert(`Could not save settings: ${error.message}`);
      setSaving(false);
    }
  }

  return (
    <div className="auth-wrapper settings-overlay">
      <div className="auth-card settings-card">
        <h2>Engine Settings</h2>
        <p className="settings-hint">Configure working hours and buffer preferences.</p>

        <div className="form-group">
          <label htmlFor="setting-day-start">Day Start Time</label>
          <input type="time" id="setting-day-start" value={dayStart} onChange={(e) => setDayStart(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="setting-day-end">Day End Time</label>
          <input type="time" id="setting-day-end" value={dayEnd} onChange={(e) => setDayEnd(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="setting-buffer">Buffer Between Tasks (minutes)</label>
          <input type="number" id="setting-buffer" value={buffer} onChange={(e) => setBuffer(e.target.value)} />
        </div>

        <div className="settings-actions">
          <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSave}>Save Settings</button>
          <button type="button" className="btn btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
