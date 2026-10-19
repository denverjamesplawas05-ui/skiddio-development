class SkiddioCalendar {
  constructor(containerId, options = {}) {
    this.container = typeof containerId === "string" ? document.getElementById(containerId) : containerId;
    if (!this.container) {
      throw new Error(`Calendar container element '${containerId}' not found.`);
    }

    this.view = options.view || "month"; // 'month', 'week', 'day'
    this.currentDate = options.currentDate ? new Date(options.currentDate) : new Date();
    this.events = options.events || [];
    this.onEventClick = options.onEventClick || null;
    this.onEventEdit = options.onEventEdit || null;
    this.onEventToggle = options.onEventToggle || null;
    this.onEventDrop = options.onEventDrop || null;
    this.onDateSelect = options.onDateSelect || null;
    this.theme = options.theme || "system"; // Matches Skiddio themes
    this.accentColor = options.accentColor || "var(--primary)";
    this.dayStartHour = options.dayStartHour || 8;
    this.dayEndHour = options.dayEndHour || 18;
    this.activeGridStartHour = this.dayStartHour;
    this.activeGridEndHour = this.dayEndHour;
    this.dragState = null;
    this.suppressEventClick = false;
    this.eventClickTimer = null;
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);

    this.init();
  }

  init() {
    this.container.classList.add("skiddio-calendar-root");
    this.render();
  }

  setEvents(events) {
    this.events = Array.isArray(events) ? events : [];
    this.render();
  }

  startEventDrag(evt, element, pointerEvent) {
    if (pointerEvent.button !== 0 || !this.onEventDrop) return;

    window.clearTimeout(this.eventClickTimer);
    const rect = element.getBoundingClientRect();
    this.dragState = {
      event: evt,
      element,
      pointerId: pointerEvent.pointerId,
      startX: pointerEvent.clientX,
      startY: pointerEvent.clientY,
      offsetX: pointerEvent.clientX - rect.left,
      offsetY: pointerEvent.clientY - rect.top,
      rect,
      ghost: null,
      dropTarget: null
    };
    document.addEventListener("pointermove", this.handlePointerMove);
    document.addEventListener("pointerup", this.handlePointerUp);
    document.addEventListener("pointercancel", this.handlePointerUp);
  }

  handlePointerMove(pointerEvent) {
    const drag = this.dragState;
    if (!drag || pointerEvent.pointerId !== drag.pointerId) return;

    if (!drag.ghost) {
      const distance = Math.hypot(pointerEvent.clientX - drag.startX, pointerEvent.clientY - drag.startY);
      if (distance < 5) return;

      drag.element.classList.add("is-dragging");
      drag.ghost = drag.element.cloneNode(true);
      drag.ghost.classList.add("cal-event-drag-ghost");
      drag.ghost.style.width = `${drag.rect.width}px`;
      drag.ghost.style.height = `${drag.rect.height}px`;
      drag.ghost.style.left = `${drag.rect.left}px`;
      drag.ghost.style.top = `${drag.rect.top}px`;
      document.body.appendChild(drag.ghost);
    }

    drag.ghost.style.left = `${pointerEvent.clientX - drag.offsetX}px`;
    drag.ghost.style.top = `${pointerEvent.clientY - drag.offsetY}px`;

    const underPointer = document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY);
    const selector = this.view === "month"
      ? ".skiddio-cal-cell[data-date]"
      : ".time-day-col[data-date]";
    const target = underPointer?.closest(selector) || null;
    if (drag.dropTarget !== target) {
      drag.dropTarget?.classList.remove("drop-target");
      drag.dropTarget = target;
      drag.dropTarget?.classList.add("drop-target");
    }

    const collisionElement = underPointer?.closest("[data-event-id]");
    const collisionTarget = collisionElement && collisionElement !== drag.element
      ? collisionElement
      : null;
    if (drag.collisionTarget !== collisionTarget) {
      drag.collisionTarget?.classList.remove("is-collision-target");
      drag.collisionTarget = collisionTarget;
      drag.collisionTarget?.classList.add("is-collision-target");
    }
  }

  handlePointerUp(pointerEvent) {
    const drag = this.dragState;
    if (!drag || pointerEvent.pointerId !== drag.pointerId) return;

    const didDrag = Boolean(drag.ghost);
    const underPointer = didDrag && pointerEvent.type !== "pointercancel"
      ? document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)
      : null;
    const selector = this.view === "month"
      ? ".skiddio-cal-cell[data-date]"
      : ".time-day-col[data-date]";
    const target = underPointer?.closest(selector);
    const collisionElement = underPointer?.closest("[data-event-id]");
    const collisionEvent = collisionElement && collisionElement !== drag.element
      ? this.events.find(evt => String(evt.id) === collisionElement.dataset.eventId)
      : null;

    drag.dropTarget?.classList.remove("drop-target");
    drag.collisionTarget?.classList.remove("is-collision-target");
    drag.element.classList.remove("is-dragging");
    drag.ghost?.remove();
    document.removeEventListener("pointermove", this.handlePointerMove);
    document.removeEventListener("pointerup", this.handlePointerUp);
    document.removeEventListener("pointercancel", this.handlePointerUp);
    this.dragState = null;

    if (!didDrag) return;
    this.suppressEventClick = true;
    window.setTimeout(() => { this.suppressEventClick = false; }, 250);
    if (!target) return;

    let startTime = drag.event.startTime;
    let endTime = drag.event.endTime;
    if (this.view !== "month") {
      const rect = target.getBoundingClientRect();
      const gridMinutes = (this.activeGridEndHour - this.activeGridStartHour + 1) * 60;
      const duration = this.timeToMinutes(endTime) - this.timeToMinutes(startTime);
      const eventTop = pointerEvent.clientY - drag.offsetY;
      const minutesFromTop = Math.max(0, Math.min(1, (eventTop - rect.top) / rect.height)) * gridMinutes;
      const latestStart = Math.max(this.activeGridStartHour * 60, this.activeGridEndHour * 60 - duration);
      const proposedStart = this.activeGridStartHour * 60 + Math.round(minutesFromTop / 15) * 15;
      const newStart = Math.max(this.activeGridStartHour * 60, Math.min(latestStart, proposedStart));
      startTime = this.minutesToTime(newStart);
      endTime = this.minutesToTime(newStart + duration);
    }

    Promise.resolve(this.onEventDrop(drag.event, target.dataset.date, startTime, endTime, collisionEvent))
      .catch(error => console.error("Could not move calendar event:", error));
  }

  timeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  formatTime(time) {
    if (!time) return "";
    const [hours, minutes] = time.split(":").map(Number);
    const normalizedHour = hours % 24;
    const period = normalizedHour >= 12 ? "PM" : "AM";
    const displayHour = normalizedHour % 12 || 12;
    return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
  }

  getEventsForDay(year, month, day) {
    return this.events
      .filter(event => this.isEventOnDay(event, year, month, day))
      .sort((first, second) => {
        const firstStart = this.timeToMinutes(first.startTime || "00:00");
        const secondStart = this.timeToMinutes(second.startTime || "00:00");
        return firstStart - secondStart || first.title.localeCompare(second.title);
      });
  }

  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}`;
  }

  dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  handleEventClick(evt, pointerEvent) {
    pointerEvent.stopPropagation();
    if (this.suppressEventClick || !this.onEventClick) return;

    window.clearTimeout(this.eventClickTimer);
    this.eventClickTimer = window.setTimeout(() => this.onEventClick(evt), 600);
  }

  handleEventDoubleClick(evt, pointerEvent) {
    pointerEvent.stopPropagation();
    window.clearTimeout(this.eventClickTimer);
    if (this.suppressEventClick) return;
    if (this.onEventEdit) this.onEventEdit(evt);
  }

  createEventCheckbox(evt) {
    if (!this.onEventToggle) return null;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "cal-event-checkbox";
    checkbox.checked = Boolean(evt.completed);
    checkbox.setAttribute("aria-label", `Mark ${evt.title} ${evt.completed ? "unfinished" : "finished"}`);
    checkbox.title = `Mark ${evt.title} ${evt.completed ? "unfinished" : "finished"}`;
    checkbox.addEventListener("pointerdown", event => event.stopPropagation());
    checkbox.addEventListener("click", event => event.stopPropagation());
    checkbox.addEventListener("dblclick", event => event.stopPropagation());
    checkbox.addEventListener("change", async event => {
      event.stopPropagation();
      checkbox.disabled = true;
      try {
        await this.onEventToggle(evt, checkbox.checked);
      } catch (error) {
        checkbox.checked = Boolean(evt.completed);
        console.error("Could not update schedule completion:", error);
      } finally {
        checkbox.disabled = false;
      }
    });
    return checkbox;
  }

  setView(view) {
    if (["month", "week", "day"].includes(view)) {
      this.view = view;
      this.render();
    }
  }

  navigate(direction) {
    const d = new Date(this.currentDate);
    if (this.view === "month") {
      d.setMonth(d.getMonth() + direction);
    } else if (this.view === "week") {
      d.setDate(d.getDate() + direction * 7);
    } else if (this.view === "day") {
      d.setDate(d.getDate() + direction);
    }
    this.currentDate = d;
    this.render();
  }

  today() {
    this.currentDate = new Date();
    this.render();
  }

  render() {
    this.container.innerHTML = "";

    const header = this.createHeader();
    this.container.appendChild(header);

    const body = document.createElement("div");
    body.className = "skiddio-cal-body";

    if (this.view === "month") {
      body.appendChild(this.renderMonthView());
    } else if (this.view === "week") {
      body.appendChild(this.renderWeekView());
    } else if (this.view === "day") {
      body.appendChild(this.renderDayView());
    }

    this.container.appendChild(body);
  }

  createHeader() {
    const header = document.createElement("div");
    header.className = "skiddio-cal-header";

    const title = document.createElement("h3");
    title.className = "skiddio-cal-title";
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    if (this.view === "month") {
      title.innerText = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
    } else if (this.view === "week") {
      const weekStart = this.getStartOfWeek(this.currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      title.innerText = `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
    } else {
      title.innerText = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getDate()}, ${this.currentDate.getFullYear()}`;
    }

    const navGroup = document.createElement("div");
    navGroup.className = "skiddio-cal-nav-group";

    const prevBtn = document.createElement("button");
    prevBtn.className = "btn btn-small btn-cal-nav";
    prevBtn.innerHTML = "‹";
    prevBtn.addEventListener("click", () => this.navigate(-1));

    const todayBtn = document.createElement("button");
    todayBtn.className = "btn btn-small btn-cal-nav";
    todayBtn.innerText = "Today";
    todayBtn.addEventListener("click", () => this.today());

    const nextBtn = document.createElement("button");
    nextBtn.className = "btn btn-small btn-cal-nav";
    nextBtn.innerHTML = "›";
    nextBtn.addEventListener("click", () => this.navigate(1));

    navGroup.appendChild(prevBtn);
    navGroup.appendChild(todayBtn);
    navGroup.appendChild(nextBtn);

    const viewGroup = document.createElement("div");
    viewGroup.className = "skiddio-cal-view-group";

    ["month", "week", "day"].forEach(mode => {
      const btn = document.createElement("button");
      btn.className = `btn-cal-view ${this.view === mode ? "active" : ""}`;
      btn.innerText = mode.charAt(0).toUpperCase() + mode.slice(1);
      btn.addEventListener("click", () => this.setView(mode));
      viewGroup.appendChild(btn);
    });

    header.appendChild(title);
    header.appendChild(navGroup);
    header.appendChild(viewGroup);

    return header;
  }

  renderMonthView() {
    const grid = document.createElement("div");
    grid.className = "skiddio-cal-month-grid";

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    daysOfWeek.forEach(day => {
      const head = document.createElement("div");
      head.className = "skiddio-cal-day-header";
      head.innerText = day;
      grid.appendChild(head);
    });

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDaysInMonth = new Date(year, month, 0).getDate();

    const today = new Date();

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayCell = document.createElement("div");
      dayCell.className = "skiddio-cal-cell inactive";
      dayCell.innerHTML = `<span class="cell-num">${prevDaysInMonth - i}</span>`;
      grid.appendChild(dayCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement("div");
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
      
      dayCell.className = `skiddio-cal-cell ${isToday ? "today" : ""}`;
      dayCell.dataset.date = this.dateKey(new Date(year, month, day));
      dayCell.setAttribute("aria-label", `Double-click to open schedule for ${month + 1}/${day}/${year}`);
      const cellHeader = document.createElement("div");
      cellHeader.className = "cal-cell-header";

      const dayNumber = document.createElement("span");
      dayNumber.className = "cell-num";
      dayNumber.textContent = day;
      cellHeader.appendChild(dayNumber);

      const openDayButton = document.createElement("button");
      openDayButton.className = "cal-day-open";
      openDayButton.type = "button";
      openDayButton.setAttribute("aria-label", `Open full schedule for ${month + 1}/${day}/${year}`);
      openDayButton.title = "Open full day schedule";
      openDayButton.innerHTML = '<span aria-hidden="true">↗</span>';
      openDayButton.addEventListener("click", event => {
        event.stopPropagation();
        this.currentDate = new Date(year, month, day);
        this.setView("day");
      });
      cellHeader.appendChild(openDayButton);
      dayCell.appendChild(cellHeader);

      const dayEvents = this.getEventsForDay(year, month, day);
      
      const eventsContainer = document.createElement("div");
      eventsContainer.className = "cell-events";

      dayEvents.slice(0, 2).forEach(evt => {
        const badge = document.createElement("div");
        badge.className = `cal-event-badge ${evt.completed ? "completed" : ""} ${evt.isRescheduled ? "rescheduled" : ""}`;
        badge.dataset.eventId = String(evt.id);
        const checkbox = this.createEventCheckbox(evt);
        if (checkbox) badge.appendChild(checkbox);

        const label = document.createElement("span");
        label.className = "cal-event-label";
        label.innerText = `${this.formatTime(evt.startTime)} ${evt.title}`;
        badge.appendChild(label);
        badge.title = `${evt.title} (${this.formatTime(evt.startTime)} - ${this.formatTime(evt.endTime)}). Click for details; double-click to edit.`;
        
        badge.addEventListener("click", (e) => {
          this.handleEventClick(evt, e);
        });
        badge.addEventListener("pointerdown", (e) => this.startEventDrag(evt, badge, e));
        badge.addEventListener("dblclick", (e) => this.handleEventDoubleClick(evt, e));
        
        eventsContainer.appendChild(badge);
      });

      if (dayEvents.length > 2) {
        const moreButton = document.createElement("button");
        moreButton.type = "button";
        moreButton.className = "cal-day-more";
        moreButton.textContent = `+${dayEvents.length - 2} more`;
        moreButton.setAttribute("aria-label", `Show all ${dayEvents.length} schedules for ${month + 1}/${day}/${year}`);
        moreButton.addEventListener("click", event => {
          event.stopPropagation();
          this.currentDate = new Date(year, month, day);
          this.setView("day");
        });
        eventsContainer.appendChild(moreButton);
      }

      dayCell.appendChild(eventsContainer);

      dayCell.addEventListener("click", () => {
        if (this.onDateSelect) this.onDateSelect(new Date(year, month, day));
      });
      dayCell.title = "Double-click to open this day's schedule";
      dayCell.addEventListener("dblclick", event => {
        if (event.target.closest("button, .cal-event-badge")) return;
        this.currentDate = new Date(year, month, day);
        this.setView("day");
      });

      grid.appendChild(dayCell);
    }

    const totalRendered = firstDayIndex + daysInMonth;
    const remainingSlots = (42 - totalRendered) % 7;
    for (let i = 1; i <= remainingSlots; i++) {
      const dayCell = document.createElement("div");
      dayCell.className = "skiddio-cal-cell inactive";
      dayCell.innerHTML = `<span class="cell-num">${i}</span>`;
      grid.appendChild(dayCell);
    }

    return grid;
  }

  renderWeekView() {
    this.activeGridStartHour = this.dayStartHour;
    this.activeGridEndHour = this.dayEndHour;
    const container = document.createElement("div");
    container.className = "skiddio-cal-time-grid";

    const startOfWeek = this.getStartOfWeek(this.currentDate);
    const today = new Date();

    const headerRow = document.createElement("div");
    headerRow.className = "time-grid-header";
    headerRow.appendChild(document.createElement("div"));

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      weekDays.push(d);

      const colHead = document.createElement("div");
      const isToday = today.toDateString() === d.toDateString();
      colHead.className = `time-header-cell ${isToday ? "today" : ""}`;
      colHead.innerHTML = `<strong>${d.toLocaleDateString('en-US', { weekday: 'short' })}</strong> <span>${d.getDate()}</span>`;
      headerRow.appendChild(colHead);
    }
    container.appendChild(headerRow);

    const bodyRow = document.createElement("div");
    bodyRow.className = "time-grid-body";

    const timeCol = document.createElement("div");
    timeCol.className = "time-labels-col";
    for (let hour = this.dayStartHour; hour <= this.dayEndHour; hour++) {
      const label = document.createElement("div");
      label.className = "time-label";
      label.innerText = this.formatTime(`${String(hour).padStart(2, "0")}:00`);
      timeCol.appendChild(label);
    }
    bodyRow.appendChild(timeCol);

    weekDays.forEach(dayDate => {
      const dayCol = document.createElement("div");
      dayCol.className = "time-day-col";
      dayCol.dataset.date = this.dateKey(dayDate);

      for (let hour = this.dayStartHour; hour <= this.dayEndHour; hour++) {
        const slot = document.createElement("div");
        slot.className = "time-slot";
        dayCol.appendChild(slot);
      }

      const dayEvents = this.getEventsForDay(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());

      dayEvents.forEach(evt => {
        const eventEl = this.createTimeGridEventElement(evt);
        if (eventEl) dayCol.appendChild(eventEl);
      });

      bodyRow.appendChild(dayCol);
    });

    container.appendChild(bodyRow);
    return container;
  }

  renderDayView() {
    const container = document.createElement("div");
    container.className = "skiddio-cal-time-grid day-view";

    const dayEvents = this.getEventsForDay(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
      this.currentDate.getDate()
    );
    const earliestStart = dayEvents.reduce((earliest, event) => {
      if (!event.startTime) return earliest;
      return Math.min(earliest, Math.floor(this.timeToMinutes(event.startTime) / 60));
    }, this.dayStartHour);
    const latestEnd = dayEvents.reduce((latest, event) => {
      if (!event.endTime) return latest;
      return Math.max(latest, Math.ceil(this.timeToMinutes(event.endTime) / 60));
    }, this.dayEndHour);
    this.activeGridStartHour = earliestStart;
    this.activeGridEndHour = Math.max(earliestStart, latestEnd);

    const bodyRow = document.createElement("div");
    bodyRow.className = "time-grid-body";

    const timeCol = document.createElement("div");
    timeCol.className = "time-labels-col";
    for (let hour = this.activeGridStartHour; hour <= this.activeGridEndHour; hour++) {
      const label = document.createElement("div");
      label.className = "time-label";
      label.innerText = this.formatTime(`${String(hour).padStart(2, "0")}:00`);
      timeCol.appendChild(label);
    }
    bodyRow.appendChild(timeCol);

    const dayCol = document.createElement("div");
    dayCol.className = "time-day-col";
    dayCol.dataset.date = this.dateKey(this.currentDate);

    for (let hour = this.activeGridStartHour; hour <= this.activeGridEndHour; hour++) {
      const slot = document.createElement("div");
      slot.className = "time-slot";
      dayCol.appendChild(slot);
    }

    dayEvents.forEach(evt => {
      const eventEl = this.createTimeGridEventElement(evt, this.activeGridStartHour, this.activeGridEndHour);
      if (eventEl) dayCol.appendChild(eventEl);
    });

    bodyRow.appendChild(dayCol);
    container.appendChild(bodyRow);

    return container;
  }

  createTimeGridEventElement(evt, gridStartHour = this.dayStartHour, gridEndHour = this.dayEndHour) {
    if (!evt.startTime || !evt.endTime) return null;

    const [startH, startM] = evt.startTime.split(":").map(Number);
    const [endH, endM] = evt.endTime.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const gridStartMinutes = gridStartHour * 60;
    const totalGridMinutes = (gridEndHour - gridStartHour + 1) * 60;

    const topPercent = Math.max(0, ((startMinutes - gridStartMinutes) / totalGridMinutes) * 100);
    const heightPercent = Math.max(5, ((endMinutes - startMinutes) / totalGridMinutes) * 100);

    const card = document.createElement("div");
    card.className = `cal-time-event ${evt.completed ? "completed" : ""} ${evt.isRescheduled ? "rescheduled" : ""}`;
    card.dataset.eventId = String(evt.id);
    card.title = `${evt.title}. Click for details; double-click to edit.`;
    card.style.top = `${topPercent}%`;
    card.style.height = `${heightPercent}%`;

    const title = document.createElement("div");
    title.className = "cal-event-title";
    title.textContent = evt.title;
    card.appendChild(title);

    const checkbox = this.createEventCheckbox(evt);
    if (checkbox) card.appendChild(checkbox);

    const time = document.createElement("div");
    time.className = "cal-event-time";
    time.textContent = `${this.formatTime(evt.startTime)} - ${this.formatTime(evt.endTime)}`;
    card.appendChild(time);

    card.addEventListener("click", (e) => {
      this.handleEventClick(evt, e);
    });
    card.addEventListener("pointerdown", (e) => this.startEventDrag(evt, card, e));
    card.addEventListener("dblclick", (e) => this.handleEventDoubleClick(evt, e));

    return card;
  }

  getStartOfWeek(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
  }

  isEventOnDay(evt, year, month, day) {
    if (!evt.date) {
      const today = new Date();
      return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    }
    const evtDate = new Date(evt.date);
    return evtDate.getFullYear() === year && evtDate.getMonth() === month && evtDate.getDate() === day;
  }
}