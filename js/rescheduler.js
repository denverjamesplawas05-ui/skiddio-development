class AutoRescheduler {
  constructor(config = {}) {
    this.dayStart = config.dayStart || "08:00";
    this.dayEnd = config.dayEnd || "18:00";
    // ?? (not ||) so a buffer of 0 minutes is respected instead of becoming 15
    this.bufferMinutes = config.bufferMinutes ?? 15;
  }

  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  }

  minutesToTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
    const minutes = (totalMinutes % 60).toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  nowMinutes(currentTime) {
    return currentTime.getHours() * 60 + currentTime.getMinutes();
  }

  getOverdueTasks(tasks, currentTime = new Date()) {
    const currentMinutes = this.nowMinutes(currentTime);

    return tasks.filter(task => {
      if (task.completed) return false;
      return this.timeToMinutes(task.startTime) < currentMinutes;
    }).sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  getFreeSlots(existingEvents, currentTime = new Date()) {
    const dayStartMinutes = Math.max(this.timeToMinutes(this.dayStart), this.nowMinutes(currentTime));
    const dayEndMinutes = this.timeToMinutes(this.dayEnd);

    const sortedEvents = existingEvents
      .filter(e => !e.isOverdue && !e.completed)
      .map(e => ({
        start: this.timeToMinutes(e.startTime),
        end: this.timeToMinutes(e.endTime)
      }))
      .sort((a, b) => a.start - b.start);

    const freeSlots = [];
    let pointer = dayStartMinutes;

    for (const event of sortedEvents) {
      // Keep the buffer on BOTH sides of an existing task, not just after it
      const slotEnd = event.start - this.bufferMinutes;
      if (slotEnd > pointer) {
        freeSlots.push({ start: pointer, end: slotEnd });
      }
      pointer = Math.max(pointer, event.end + this.bufferMinutes);
    }

    if (pointer < dayEndMinutes) {
      freeSlots.push({ start: pointer, end: dayEndMinutes });
    }

    return freeSlots;
  }

  rescheduleOverdueTasks(allTasks, currentTime = new Date()) {
    const overdueTasks = this.getOverdueTasks(allTasks, currentTime);
    if (overdueTasks.length === 0) {
      return { updatedTasks: allTasks, rescheduledCount: 0, failedCount: 0 };
    }

    const scheduledEvents = allTasks.filter(t => !overdueTasks.includes(t));
    const freeSlots = this.getFreeSlots(scheduledEvents, currentTime);
    const updatedTasks = [...allTasks];
    let rescheduledCount = 0;
    let failedCount = 0;

    for (const task of overdueTasks) {
      const startMin = this.timeToMinutes(task.startTime);
      const endMin = this.timeToMinutes(task.endTime);
      const duration = (endMin > startMin) ? (endMin - startMin) : 30;
      const taskIndex = updatedTasks.findIndex(t => t.id === task.id);
      let slotFound = false;

      for (let i = 0; i < freeSlots.length; i++) {
        const slot = freeSlots[i];

        if (slot.end - slot.start >= duration) {
          const newStartMinutes = slot.start;
          const newEndMinutes = newStartMinutes + duration;

          updatedTasks[taskIndex] = {
            ...task,
            startTime: this.minutesToTime(newStartMinutes),
            endTime: this.minutesToTime(newEndMinutes),
            isRescheduled: true,
            rescheduleStatus: undefined, // clear any earlier "Failed" note
            rescheduleReason: `Auto-shifted to first available slot at ${this.minutesToTime(newStartMinutes)}`
          };

          freeSlots[i] = {
            start: newEndMinutes + this.bufferMinutes,
            end: slot.end
          };

          slotFound = true;
          rescheduledCount++;
          break;
        }
      }

      if (!slotFound) {
        failedCount++;
        updatedTasks[taskIndex] = {
          ...task,
          rescheduleStatus: "Failed: No available slots remaining today"
        };
      }
    }

    return { updatedTasks, rescheduledCount, failedCount };
  }
}

// Allows the engine to be unit-tested in Node without affecting the browser
if (typeof module !== "undefined" && module.exports) {
  module.exports = AutoRescheduler;
}
