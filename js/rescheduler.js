class AutoRescheduler {
  constructor(config = {}) {
    this.dayStart = config.dayStart || "08:00";
    this.dayEnd = config.dayEnd || "18:00";
    this.bufferMinutes = config.bufferMinutes || 15;
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

  getOverdueTasks(tasks, currentTime = new Date()) {
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    return tasks.filter(task => {
      if (task.completed) return false;
      const taskStartMinutes = this.timeToMinutes(task.startTime);
      return taskStartMinutes < currentMinutes;
    }).sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  getFreeSlots(existingEvents, currentTime = new Date()) {
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const dayStartMinutes = Math.max(this.timeToMinutes(this.dayStart), currentMinutes);
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
      if (event.start > pointer) {
        freeSlots.push({ start: pointer, end: event.start });
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
      return { updatedTasks: allTasks, rescheduledCount: 0 };
    }

    const scheduledEvents = allTasks.filter(t => !overdueTasks.includes(t));
    let freeSlots = this.getFreeSlots(scheduledEvents, currentTime);
    const updatedTasks = [...allTasks];
    let rescheduledCount = 0;

    for (const task of overdueTasks) {
      const startMin = this.timeToMinutes(task.startTime);
      const endMin = this.timeToMinutes(task.endTime);
      const duration = (endMin > startMin) ? (endMin - startMin) : 30;
      let slotFound = false;

      for (let i = 0; i < freeSlots.length; i++) {
        const slot = freeSlots[i];
        const slotDuration = slot.end - slot.start;

        if (slotDuration >= duration) {
          const newStartMinutes = slot.start;
          const newEndMinutes = newStartMinutes + duration;

          const taskIndex = updatedTasks.findIndex(t => t.id === task.id);
          updatedTasks[taskIndex] = {
            ...task,
            startTime: this.minutesToTime(newStartMinutes),
            endTime: this.minutesToTime(newEndMinutes),
            isRescheduled: true,
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
        const taskIndex = updatedTasks.findIndex(t => t.id === task.id);
        updatedTasks[taskIndex] = {
          ...task,
          rescheduleStatus: "Failed: No available slots remaining today"
        };
      }
    }

    return { updatedTasks, rescheduledCount };
  }
}