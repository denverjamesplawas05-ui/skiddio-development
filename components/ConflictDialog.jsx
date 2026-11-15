"use client";

import { useEffect, useRef } from "react";

// `request` = { moving, occupied } while the user has to choose; null otherwise
export default function ConflictDialog({ request, onChoice }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (request && !dialog.open) dialog.showModal();
    else if (!request && dialog.open) dialog.close();
  }, [request]);

  return (
    <dialog
      ref={dialogRef}
      id="schedule-conflict-dialog"
      className="calendar-dialog conflict-dialog"
      onCancel={(e) => { e.preventDefault(); onChoice("cancel"); }}
    >
      <div className="conflict-dialog-mark" aria-hidden="true">↔</div>
      <p className="conflict-eyebrow">Schedule collision</p>
      <h2>Choose what happens next</h2>
      <p className="conflict-summary">
        {request && `“${request.moving.title}” was dropped on “${request.occupied.title}”. Choose whether to swap their slots or replace the occupied schedule.`}
      </p>
      <div className="conflict-options">
        <button className="conflict-option" type="button" onClick={() => onChoice("switch")}>
          <span className="conflict-option-icon" aria-hidden="true">⇄</span>
          <span><strong>Switch schedules</strong><small>Swap their dates and times.</small></span>
        </button>
        <button className="conflict-option conflict-option-replace" type="button" onClick={() => onChoice("replace")}>
          <span className="conflict-option-icon" aria-hidden="true">↗</span>
          <span><strong>Replace schedule</strong><small>Move this schedule into the occupied slot and delete the other one.</small></span>
        </button>
      </div>
      <button className="btn calendar-btn-secondary conflict-cancel" type="button" onClick={() => onChoice("cancel")}>Cancel</button>
    </dialog>
  );
}
