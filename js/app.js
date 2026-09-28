/**
 * Skiddio Application & UI Controller
 */
document.addEventListener("DOMContentLoaded", () => {
  const rescheduler = new AutoRescheduler({
    dayStart: "08:00",
    dayEnd: "18:00",
    bufferMinutes: 15
  });

  let tasks = [];

  // DOM Elements
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

  // NAVIGATION & MODALS
  const navSettings = document.getElementById("nav-settings");
  const settingsModal = document.getElementById("settings-modal");

  // DARK MODE TOGGLE LOGIC
  const themeToggleBtn = document.getElementById("theme-toggle");
  const themeIcon = document.getElementById("theme-icon");
  const themeText = document.getElementById("theme-text");

  const savedTheme = localStorage.getItem("skiddio-theme");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
    setTheme("dark");
  } else {
    setTheme("light");
  }

  themeToggleBtn.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    setTheme(currentTheme === "dark" ? "light" : "dark");
  });

  function setTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      themeIcon.innerText = "☀️";
      themeText.innerText = "Light Mode";
      localStorage.setItem("skiddio-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      themeIcon.innerText = "🌙";
      themeText.innerText = "Dark Mode";
      localStorage.setItem("skiddio-theme", "light");
    }
  }

  // NAV HANDLER: SETTINGS MODAL
  navSettings.addEventListener("click", (e) => {
    e.preventDefault();
    settingsModal.classList.remove("hidden");
  });

  document.getElementById("close-settings-btn").addEventListener("click", () => {
    settingsModal.classList.add("hidden");
  });

  document.getElementById("save-settings-btn").addEventListener("click", () => {
    const newStart = document.getElementById("setting-day-start").value;
    const newEnd = document.getElementById("setting-day-end").value;
    const newBuffer = parseInt(document.getElementById("setting-buffer").value, 10);

    rescheduler.dayStart = newStart;
    rescheduler.dayEnd = newEnd;
    rescheduler.bufferMinutes = newBuffer;

    settingsModal.classList.add("hidden");
    alert("Settings updated successfully!");
  });

  // AUTH HANDLERS
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    authContainer.classList.add("hidden");
    dashboardContainer.classList.remove("hidden");
    renderTasks();
  });

  logoutBtn.addEventListener("click", () => {
    dashboardContainer.classList.add("hidden");
    authContainer.classList.remove("hidden");
  });

  // TASK SUBMISSION
  addTaskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("task-title").value;
    const startTime = document.getElementById("task-start-time").value;
    const endTime = document.getElementById("task-end-time").value;

    if (startTime >= endTime) {
      alert("End time must be after start time.");
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

  // TASK CHECKBOX TOGGLE
  taskListEl.addEventListener("change", (e) => {
    if (e.target.tagName === "INPUT" && e.target.type === "checkbox") {
      const taskId = parseInt(e.target.getAttribute("data-id"), 10);
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        task.completed = e.target.checked;
        renderTasks();
      }
    }
  });

  // AI RESCHEDULING TRIGGER
  rescheduleBtn.addEventListener("click", () => {
    const result = rescheduler.rescheduleOverdueTasks(tasks);
    tasks = result.updatedTasks;
    renderTasks();

    aiNoticeEl.classList.remove("hidden");
    if (result.rescheduledCount > 0) {
      aiNoticeTextEl.innerText = `Auto-rescheduled ${result.rescheduledCount} overdue task(s) into available slots.`;
    } else {
      aiNoticeTextEl.innerText = "All tasks are currently on track!";
    }
  });

  // RENDER UI
  function renderTasks() {
    taskListEl.innerHTML = "";

    tasks.forEach(task => {
      const li = document.createElement("li");
      li.className = `task-item ${task.isRescheduled ? 'rescheduled' : ''}`;
      
      li.innerHTML = `
        <div>
          <strong style="${task.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${task.title}</strong>
          <div class="task-meta">${task.startTime} - ${task.endTime} ${task.rescheduleReason ? `| <em>${task.rescheduleReason}</em>` : ''}</div>
        </div>
        <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
      `;

      taskListEl.appendChild(li);
    });

    totalTasksEl.innerText = tasks.length;
    overdueTasksEl.innerText = rescheduler.getOverdueTasks(tasks).length;
  }
});