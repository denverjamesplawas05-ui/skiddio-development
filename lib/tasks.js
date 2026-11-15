// Small helpers shared by the dashboard and the calendar.

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function formatTime(time) {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const normalizedHour = hours % 24;
  const period = normalizedHour >= 12 ? "PM" : "AM";
  const displayHour = normalizedHour % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
}

// Database row -> task used by the UI
export function toTask(row) {
  return {
    id: row.id,
    title: row.title,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    date: `${row.task_date}T00:00:00`,
    completed: row.completed,
    isRescheduled: row.is_rescheduled,
    rescheduleReason: row.reschedule_reason,
    note: row.note || "",
  };
}

export function taskPlacement(task) {
  return {
    date: localDateString(new Date(task.date)),
    startTime: task.startTime,
    endTime: task.endTime,
  };
}
