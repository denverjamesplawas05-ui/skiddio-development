document.addEventListener("DOMContentLoaded", () => {
  const rescheduler = new AutoRescheduler({
    dayStart: "08:00",
    dayEnd: "18:00",
    bufferMinutes: 15
  });

  let tasks = [];

  const authContainer = document.getElementById("auth-container");
  const dashboardContainer = document.getElementById("dashboard-container");
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");
  const taskListEl = document.getElementById("task-list");
  const addTaskForm = document.getElementById("add-task-form");
  const rescheduleBtn = document.getElementById("reschedule-btn");
  const totalTasksEl = document.getElementById("total-tasks");
  const overdueTasksEl = document.getElementById("overdue-tasks");
  const aiNoticeEl = document.getElementById("ai-notice");
  const aiNoticeTextEl = document.getElementById("ai-notice-text");

  const taskTitleInput = document.getElementById("task-title");
  const taskStartInput = document.getElementById("task-start-time");
  const taskEndInput = document.getElementById("task-end-time");

  const navSettings = document.getElementById("nav-settings");
  const settingsModal = document.getElementById("settings-modal");
  const dayStartInput = document.getElementById("setting-day-start");
  const dayEndInput = document.getElementById("setting-day-end");
  const bufferInput = document.getElementById("setting-buffer");

  const themeToggleBtn = document.getElementById("theme-toggle");
  const themeIcon = document.getElementById("theme-icon");
  const themeText = document.getElementById("theme-text");
  const toastEl = document.getElementById("toast");

  // localStorage can throw (private mode, blocked storage) - never let that break the app
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* ignore */ } }
  };

  let toastTimer;
  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 3500);
  }

  // ---------- Theme ----------
  const savedTheme = storage.get("skiddio-theme");
  const systemPrefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(savedTheme === "dark" || (!savedTheme && systemPrefersDark) ? "dark" : "light");

  themeToggleBtn.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    setTheme(isDark ? "light" : "dark", true);
  });

  // Only remember the theme when the user picks one, so "follow the system" keeps working
  function setTheme(theme, persist = false) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      themeIcon.textContent = "☀️";
      themeText.textContent = "Light Mode";
    } else {
      document.documentElement.removeAttribute("data-theme");
      themeIcon.textContent = "🌙";
      themeText.textContent = "Dark Mode";
    }
    themeToggleBtn.setAttribute("aria-pressed", String(theme === "dark"));
    if (persist) storage.set("skiddio-theme", theme);
  }

  // ---------- Settings ----------
  let lastFocused = null;

  function openSettings() {
    lastFocused = document.activeElement;
    // Show the values currently in use, not the HTML defaults
    dayStartInput.value = rescheduler.dayStart;
    dayEndInput.value = rescheduler.dayEnd;
    bufferInput.value = rescheduler.bufferMinutes;
    settingsModal.classList.remove("hidden");
    dayStartInput.focus();
  }

  function closeSettings() {
    settingsModal.classList.add("hidden");
    if (lastFocused) lastFocused.focus();
  }

  navSettings.addEventListener("click", (e) => {
    e.preventDefault();
    openSettings();
  });

  document.getElementById("close-settings-btn").addEventListener("click", closeSettings);

  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) closeSettings();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !settingsModal.classList.contains("hidden")) closeSettings();
  });

  document.getElementById("save-settings-btn").addEventListener("click", () => {
    const newStart = dayStartInput.value;
    const newEnd = dayEndInput.value;
    const newBuffer = parseInt(bufferInput.value, 10);

    if (!newStart || !newEnd || newStart >= newEnd) {
      showToast("Day end time must be after the day start time.");
      return;
    }
    if (!Number.isFinite(newBuffer) || newBuffer < 0 || newBuffer > 120) {
      showToast("Buffer must be between 0 and 120 minutes.");
      return;
    }

    rescheduler.dayStart = newStart;
    rescheduler.dayEnd = newEnd;
    rescheduler.bufferMinutes = newBuffer;

    closeSettings();
    showToast("Settings updated successfully!");
  });

  // ---------- Auth ----------
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    authContainer.classList.add("hidden");
    dashboardContainer.classList.remove("hidden");
    renderTasks();
  });

  logoutBtn.addEventListener("click", () => {
    loginForm.reset(); // don't leave the password sitting in the form
    dashboardContainer.classList.add("hidden");
    authContainer.classList.remove("hidden");
  });

  // ---------- Tasks ----------
  addTaskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = taskTitleInput.value.trim();
    const startTime = taskStartInput.value;
    const endTime = taskEndInput.value;

    if (!title) {
      showToast("Please enter a task title.");
      taskTitleInput.focus();
      return;
    }
    if (startTime >= endTime) {
      showToast("End time must be after start time.");
      taskEndInput.focus();
      return;
    }

    tasks.push({
      id: Date.now(),
      title,
      startTime,
      endTime,
      completed: false
    });

    addTaskForm.reset();
    renderTasks();
  });

  taskListEl.addEventListener("change", (e) => {
    if (e.target.tagName === "INPUT" && e.target.type === "checkbox") {
      const taskId = parseInt(e.target.getAttribute("data-id"), 10);
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        task.completed = e.target.checked;
        renderTasks();
        // re-rendering rebuilds the list, so put keyboard focus back
        const checkbox = taskListEl.querySelector(`input[data-id="${taskId}"]`);
        if (checkbox) checkbox.focus();
      }
    }
  });

  rescheduleBtn.addEventListener("click", () => {
    const result = rescheduler.rescheduleOverdueTasks(tasks);
    tasks = result.updatedTasks;
    renderTasks();

    aiNoticeEl.classList.remove("hidden");
    if (result.rescheduledCount > 0) {
      let message = `Auto-rescheduled ${result.rescheduledCount} overdue task(s) into available slots.`;
      if (result.failedCount > 0) {
        message += ` ${result.failedCount} more could not fit into today's remaining time.`;
      }
      aiNoticeTextEl.textContent = message;
    } else if (result.failedCount > 0) {
      aiNoticeTextEl.textContent = `No room left today for ${result.failedCount} overdue task(s). Try extending the day end time in Settings.`;
    } else {
      aiNoticeTextEl.textContent = "All tasks are currently on track!";
    }
  });

  // ---------- Rendering ----------
  // Built with textContent (not innerHTML) so task titles can never inject markup
  function renderTasks() {
    taskListEl.replaceChildren();

    if (tasks.length === 0) {
      const empty = document.createElement("li");
      empty.className = "task-empty";
      empty.textContent = "No tasks yet. Add one above to get started.";
      taskListEl.appendChild(empty);
    }

    tasks.forEach(task => {
      const li = document.createElement("li");
      li.className = "task-item" + (task.isRescheduled ? " rescheduled" : "") + (task.completed ? " completed" : "");

      const info = document.createElement("div");
      info.className = "task-info";

      const title = document.createElement("strong");
      title.textContent = task.title;

      const meta = document.createElement("div");
      meta.className = "task-meta";
      meta.append(`${task.startTime} - ${task.endTime}`);

      const note = task.rescheduleStatus || task.rescheduleReason;
      if (note) {
        const em = document.createElement("em");
        em.textContent = note;
        if (task.rescheduleStatus) em.className = "task-warn";
        meta.append(" | ", em);
      }

      info.append(title, meta);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.completed;
      checkbox.setAttribute("data-id", task.id);
      checkbox.setAttribute("aria-label", `Mark "${task.title}" as done`);

      li.append(info, checkbox);
      taskListEl.appendChild(li);
    });

    updateStats();
  }

  function updateStats() {
    totalTasksEl.textContent = tasks.length;
    overdueTasksEl.textContent = rescheduler.getOverdueTasks(tasks).length;
  }

  // "Needs Rescheduling" depends on the clock, so keep it fresh while the page stays open
  setInterval(() => {
    if (!dashboardContainer.classList.contains("hidden")) updateStats();
  }, 60000);
});
