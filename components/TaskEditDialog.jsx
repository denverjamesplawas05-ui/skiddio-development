"use client";

import { useEffect, useRef, useState } from "react";
import { taskPlacement } from "@/lib/tasks";

// `task` is the schedule being edited (null = dialog closed)
export default function TaskEditDialog({ task, onSave, onClose }) {
  const dialogRef = useRef(null);
  const [form, setForm] = useState({ title: "", date: "", start: "", end: "", note: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (task) {
      const placement = taskPlacement(task);
      setForm({ title: task.title, date: placement.date, start: task.startTime, end: task.endTime, note: task.note || "" });
      setError("");
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [task]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    if (!task) return;

    const title = form.title.trim();
    if (!form.date || !title || form.start >= form.end) {
      setError("Enter a title, date, and an end time after the start time.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave(task, { title, date: form.date, startTime: form.start, endTime: form.end, note: form.note.trim() });
    } catch (e) {
      setError(`Could not save schedule: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialogRef} id="task-edit-dialog" className="calendar-dialog" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <h2>Edit Schedule</h2>
        <label htmlFor="edit-task-title">Title</label>
        <input id="edit-task-title" name="title" type="text" maxLength={120} required value={form.title} onChange={set("title")} />
        <div className="calendar-dialog-fields">
          <div>
            <label htmlFor="edit-task-date">Date</label>
            <input id="edit-task-date" name="date" type="date" required value={form.date} onChange={set("date")} />
          </div>
          <div>
            <label htmlFor="edit-task-start">Starts</label>
            <input id="edit-task-start" name="start" type="time" required value={form.start} onChange={set("start")} />
          </div>
          <div>
            <label htmlFor="edit-task-end">Ends</label>
            <input id="edit-task-end" name="end" type="time" required value={form.end} onChange={set("end")} />
          </div>
        </div>
        <label htmlFor="edit-task-note">Note</label>
        <textarea id="edit-task-note" name="note" maxLength={500} placeholder="Add a note (optional)..." value={form.note} onChange={set("note")} />
        <p className="calendar-dialog-error" role="alert" aria-live="polite">{error}</p>
        <div className="calendar-dialog-actions">
          <button className="btn calendar-btn-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" disabled={saving}>Save changes</button>
        </div>
      </form>
    </dialog>
  );
}
