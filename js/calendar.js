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
    this.onDateSelect = options.onDateSelect || null;
    this.theme = options.theme || "system"; // Matches Skiddio themes
    this.accentColor = options.accentColor || "var(--primary)";
    this.dayStartHour = options.dayStartHour || 8;
    this.dayEndHour = options.dayEndHour || 18;

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
      dayCell.innerHTML = `<span class="cell-num">${day}</span>`;

      const dayEvents = this.events.filter(e => this.isEventOnDay(e, year, month, day));
      
      const eventsContainer = document.createElement("div");
      eventsContainer.className = "cell-events";

      dayEvents.forEach(evt => {
        const badge = document.createElement("div");
        badge.className = `cal-event-badge ${evt.completed ? "completed" : ""} ${evt.isRescheduled ? "rescheduled" : ""}`;
        badge.innerText = `${evt.startTime || ""} ${evt.title}`;
        badge.title = `${evt.title} (${evt.startTime} - ${evt.endTime})`;
        
        badge.addEventListener("click", (e) => {
          e.stopPropagation();
          if (this.onEventClick) this.onEventClick(evt);
        });
        
        eventsContainer.appendChild(badge);
      });

      dayCell.appendChild(eventsContainer);

      dayCell.addEventListener("click", () => {
        if (this.onDateSelect) this.onDateSelect(new Date(year, month, day));
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
      label.innerText = `${hour.toString().padStart(2, "0")}:00`;
      timeCol.appendChild(label);
    }
    bodyRow.appendChild(timeCol);

    weekDays.forEach(dayDate => {
      const dayCol = document.createElement("div");
      dayCol.className = "time-day-col";

      for (let hour = this.dayStartHour; hour <= this.dayEndHour; hour++) {
        const slot = document.createElement("div");
        slot.className = "time-slot";
        dayCol.appendChild(slot);
      }

      const dayEvents = this.events.filter(e => this.isEventOnDay(e, dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()));

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

    const bodyRow = document.createElement("div");
    bodyRow.className = "time-grid-body";

    const timeCol = document.createElement("div");
    timeCol.className = "time-labels-col";
    for (let hour = this.dayStartHour; hour <= this.dayEndHour; hour++) {
      const label = document.createElement("div");
      label.className = "time-label";
      label.innerText = `${hour.toString().padStart(2, "0")}:00`;
      timeCol.appendChild(label);
    }
    bodyRow.appendChild(timeCol);

    const dayCol = document.createElement("div");
    dayCol.className = "time-day-col";

    for (let hour = this.dayStartHour; hour <= this.dayEndHour; hour++) {
      const slot = document.createElement("div");
      slot.className = "time-slot";
      dayCol.appendChild(slot);
    }

    const dayEvents = this.events.filter(e => 
      this.isEventOnDay(e, this.currentDate.getFullYear(), this.currentDate.getMonth(), this.currentDate.getDate())
    );

    dayEvents.forEach(evt => {
      const eventEl = this.createTimeGridEventElement(evt);
      if (eventEl) dayCol.appendChild(eventEl);
    });

    bodyRow.appendChild(dayCol);
    container.appendChild(bodyRow);

    return container;
  }

  createTimeGridEventElement(evt) {
    if (!evt.startTime || !evt.endTime) return null;

    const [startH, startM] = evt.startTime.split(":").map(Number);
    const [endH, endM] = evt.endTime.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const gridStartMinutes = this.dayStartHour * 60;
    const totalGridMinutes = (this.dayEndHour - this.dayStartHour + 1) * 60;

    const topPercent = Math.max(0, ((startMinutes - gridStartMinutes) / totalGridMinutes) * 100);
    const heightPercent = Math.max(5, ((endMinutes - startMinutes) / totalGridMinutes) * 100);

    const card = document.createElement("div");
    card.className = `cal-time-event ${evt.completed ? "completed" : ""} ${evt.isRescheduled ? "rescheduled" : ""}`;
    card.style.top = `${topPercent}%`;
    card.style.height = `${heightPercent}%`;

    card.innerHTML = `
      <div class="cal-event-title">${evt.title}</div>
      <div class="cal-event-time">${evt.startTime} - ${evt.endTime}</div>
    `;

    card.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.onEventClick) this.onEventClick(evt);
    });

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