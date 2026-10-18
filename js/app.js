document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.skiddioSupabase;
  const rescheduler = new AutoRescheduler({
    dayStart: "08:00",
    dayEnd: "18:00",
    bufferMinutes: 15
  });

  let tasks = [];
  let currentUser = null;

  const authContainer = document.getElementById("auth-container");
  const dashboardContainer = document.getElementById("dashboard-container");
  const loginForm = document.getElementById("login-form");
  const authError = document.getElementById("auth-error");
  const logoutBtn = document.getElementById("logout-btn");
  const userNameEl = document.getElementById("user-name");
  const taskListEl = document.getElementById("task-list");
  const addTaskForm = document.getElementById("add-task-form");
  const rescheduleBtn = document.getElementById("reschedule-btn");
  const totalTasksEl = document.getElementById("total-tasks");
  const overdueTasksEl = document.getElementById("overdue-tasks");
  const aiNoticeEl = document.getElementById("ai-notice");
  const aiNoticeTextEl = document.getElementById("ai-notice-text");

  const navChecklist = document.getElementById("nav-checklist");
  const navCalendar = document.getElementById("nav-calendar");
  const checklistView = document.getElementById("checklist-view");
  const calendarViewContainer = document.getElementById("calendar-view-container");
  const viewTitle = document.getElementById("view-title");

  const navSettings = document.getElementById("nav-settings");
  const settingsModal = document.getElementById("settings-modal");

  const themeToggleBtn = document.getElementById("theme-toggle");
  const authThemeToggleBtn = document.getElementById("auth-theme-toggle");
  const themeIcon = document.getElementById("theme-icon");
  const authThemeIcon = document.getElementById("auth-theme-icon");
  const themeText = document.getElementById("theme-text");

  const skiddioCal = new SkiddioCalendar("calendar-container", {
    view: "month",
    events: tasks,
    dayStartHour: 8,
    dayEndHour: 18,
    onEventClick: (evt) => {
      alert(`Task: ${evt.title}\nTime: ${evt.startTime} - ${evt.endTime}\nStatus: ${evt.completed ? 'Completed' : 'Pending'}`);
    }
  });

  navChecklist.addEventListener("click", (e) => {
    e.preventDefault();
    navChecklist.classList.add("active");
    navCalendar.classList.remove("active");
    checklistView.classList.remove("hidden");
    calendarViewContainer.classList.add("hidden");
    viewTitle.innerText = "Today's Tasks";
  });

  navCalendar.addEventListener("click", (e) => {
    e.preventDefault();
    navCalendar.classList.add("active");
    navChecklist.classList.remove("active");
    calendarViewContainer.classList.remove("hidden");
    checklistView.classList.add("hidden");
    viewTitle.innerText = "Schedule Calendar";
    skiddioCal.render();
  });

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

  if (authThemeToggleBtn) {
    authThemeToggleBtn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      setTheme(currentTheme === "dark" ? "light" : "dark");
    });
  }

  function setTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      if (themeIcon) themeIcon.innerText = "☀️";
      if (authThemeIcon) authThemeIcon.innerText = "☀️";
      if (themeText) themeText.innerText = "Light Mode";
      localStorage.setItem("skiddio-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      if (themeIcon) themeIcon.innerText = "🌙";
      if (authThemeIcon) authThemeIcon.innerText = "🌙";
      if (themeText) themeText.innerText = "Dark Mode";
      localStorage.setItem("skiddio-theme", "light");
    }
  }

  function showAuthError(message = "") {
    authError.textContent = message;
    authError.classList.toggle("hidden", !message);
  }

  function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function toTask(row) {
    return {
      id: row.id,
      title: row.title,
      startTime: row.start_time.slice(0, 5),
      endTime: row.end_time.slice(0, 5),
      date: `${row.task_date}T00:00:00`,
      completed: row.completed,
      isRescheduled: row.is_rescheduled,
      rescheduleReason: row.reschedule_reason
    };
  }

  async function loadTasks(userId) {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("task_date")
      .order("start_time");

    if (error) throw error;
    if (currentUser?.id !== userId) return;
    tasks = data.map(toTask);
    renderTasks();
  }

  async function loadSettings(userId) {
    const { data, error } = await supabase
      .from("user_settings")
      .select("day_start, day_end, buffer_minutes")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (currentUser?.id !== userId) return;

    const settings = data || {
      day_start: "08:00",
      day_end: "18:00",
      buffer_minutes: 15
    };

    document.getElementById("setting-day-start").value = settings.day_start.slice(0, 5);
    document.getElementById("setting-day-end").value = settings.day_end.slice(0, 5);
    document.getElementById("setting-buffer").value = settings.buffer_minutes;
    rescheduler.dayStart = settings.day_start.slice(0, 5);
    rescheduler.dayEnd = settings.day_end.slice(0, 5);
    rescheduler.bufferMinutes = settings.buffer_minutes;
    skiddioCal.dayStartHour = parseInt(rescheduler.dayStart.split(":")[0], 10);
    skiddioCal.dayEndHour = parseInt(rescheduler.dayEnd.split(":")[0], 10);
    skiddioCal.render();
  }

  async function activateUser(user) {
    if (currentUser?.id === user.id) return;

    currentUser = user;
    tasks = [];
    userNameEl.textContent = user.email || "Student Account";
    authContainer.classList.add("hidden");
    dashboardContainer.classList.remove("hidden");
    renderTasks();

    try {
      await Promise.all([loadTasks(user.id), loadSettings(user.id)]);
    } catch (error) {
      if (currentUser?.id === user.id) {
        alert(`Could not load your Supabase data: ${error.message}`);
      }
    }
  }

  function deactivateUser() {
    currentUser = null;
    tasks = [];
    userNameEl.textContent = "Student Account";
    dashboardContainer.classList.add("hidden");
    authContainer.classList.remove("hidden");
    renderTasks();
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      deactivateUser();
      return;
    }
    if (session?.user) {
      setTimeout(() => {
        activateUser(session.user).catch(error => {
          alert(`Could not load your Supabase data: ${error.message}`);
        });
      }, 0);
    }
  });

  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      showAuthError(`Could not restore your session: ${error.message}`);
      return;
    }
    if (data.session?.user) {
      activateUser(data.session.user);
    }
  }).catch(error => {
    showAuthError(`Could not restore your session: ${error.message}`);
  });

  navSettings.addEventListener("click", (e) => {
    e.preventDefault();
    settingsModal.classList.remove("hidden");
  });

  document.getElementById("close-settings-btn").addEventListener("click", () => {
    settingsModal.classList.add("hidden");
  });

  document.getElementById("save-settings-btn").addEventListener("click", async () => {
    const newStart = document.getElementById("setting-day-start").value;
    const newEnd = document.getElementById("setting-day-end").value;
    const newBuffer = parseInt(document.getElementById("setting-buffer").value, 10);

    if (!currentUser) return;
    if (!newStart || !newEnd || newStart >= newEnd || !Number.isInteger(newBuffer) || newBuffer < 0) {
      alert("Enter a valid working day and a non-negative buffer.");
      return;
    }

    const userId = currentUser.id;
    const saveSettingsBtn = document.getElementById("save-settings-btn");
    saveSettingsBtn.disabled = true;
    try {
      const { error } = await supabase.from("user_settings").upsert({
        user_id: userId,
        day_start: newStart,
        day_end: newEnd,
        buffer_minutes: newBuffer,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      if (currentUser?.id !== userId) return;

      rescheduler.dayStart = newStart;
      rescheduler.dayEnd = newEnd;
      rescheduler.bufferMinutes = newBuffer;

      skiddioCal.dayStartHour = parseInt(newStart.split(":")[0], 10);
      skiddioCal.dayEndHour = parseInt(newEnd.split(":")[0], 10);
      skiddioCal.render();

      settingsModal.classList.add("hidden");
      alert("Settings updated successfully!");
    } catch (error) {
      alert(`Could not save settings: ${error.message}`);
    } finally {
      saveSettingsBtn.disabled = false;
    }
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showAuthError();
    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: document.getElementById("email").value.trim(),
        password: document.getElementById("password").value
      });
      if (error) throw error;
      await activateUser(data.user);
    } catch (error) {
      showAuthError(error.message);
    } finally {
      submitButton.disabled = false;
    }
  });

  logoutBtn.addEventListener("click", async () => {
    logoutBtn.disabled = true;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      deactivateUser();
    } catch (error) {
      alert(`Could not sign out: ${error.message}`);
    } finally {
      logoutBtn.disabled = false;
    }
  });

  addTaskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const title = document.getElementById("task-title").value;
    const startTime = document.getElementById("task-start-time").value;
    const endTime = document.getElementById("task-end-time").value;

    if (startTime >= endTime) {
      alert("End time must be after start time.");
      return;
    }

    if (!title.trim()) {
      alert("Enter a task title.");
      return;
    }

    const userId = currentUser.id;
    const addTaskButton = addTaskForm.querySelector('button[type="submit"]');
    addTaskButton.disabled = true;
    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: userId,
          title: title.trim(),
          start_time: startTime,
          end_time: endTime,
          task_date: localDateString()
        })
        .select()
        .single();
      if (error) throw error;
      if (currentUser?.id !== userId) return;

      tasks.push(toTask(data));
      addTaskForm.reset();
      renderTasks();
    } catch (error) {
      alert(`Could not add task: ${error.message}`);
    } finally {
      addTaskButton.disabled = false;
    }
  });

  taskListEl.addEventListener("change", async (e) => {
    if (e.target instanceof HTMLInputElement && e.target.type === "checkbox") {
      const task = tasks.find(t => String(t.id) === e.target.dataset.id);
      if (task && currentUser) {
        const userId = currentUser.id;
        const completed = e.target.checked;
        task.completed = completed;
        renderTasks();
        const { data, error } = await supabase
          .from("tasks")
          .update({ completed })
          .eq("id", task.id)
          .eq("user_id", userId)
          .select("id")
          .maybeSingle();
        if (error || !data) {
          if (currentUser?.id !== userId) return;
          task.completed = !completed;
          renderTasks();
          alert(`Could not update task: ${error?.message || "The task was not found for this account."}`);
        }
      }
    }
  });

  rescheduleBtn.addEventListener("click", async () => {
    if (!currentUser) return;
    const userId = currentUser.id;
    const today = localDateString();
    const todayTasks = tasks.filter(task => localDateString(new Date(task.date)) === today);
    const result = rescheduler.rescheduleOverdueTasks(todayTasks);
    const updatedTodayTasks = new Map(result.updatedTasks.map(task => [task.id, task]));
    const updatedTasks = tasks.map(task => updatedTodayTasks.get(task.id) || task);
    const changedTasks = updatedTasks.filter(task => {
      const original = tasks.find(current => current.id === task.id);
      return original && (original.startTime !== task.startTime || original.endTime !== task.endTime);
    });

    let saveFailed = false;
    try {
      for (const task of changedTasks) {
        const { data, error } = await supabase
          .from("tasks")
          .update({
            start_time: task.startTime,
            end_time: task.endTime,
            is_rescheduled: task.isRescheduled,
            reschedule_reason: task.rescheduleReason || null
          })
          .eq("id", task.id)
          .eq("user_id", userId)
          .select("id")
          .maybeSingle();
        if (error || !data) {
          throw new Error(error?.message || "A task was not found for this account.");
        }
      }
      if (currentUser?.id !== userId) return;
      tasks = updatedTasks;
      renderTasks();
    } catch (error) {
      if (currentUser?.id !== userId) return;
      saveFailed = true;
      try {
        await loadTasks(userId);
      } catch (reloadError) {
        alert(`Could not save rescheduled tasks: ${error.message}. Reload also failed: ${reloadError.message}`);
        aiNoticeEl.classList.remove("hidden");
        aiNoticeTextEl.innerText = "Rescheduling failed; task changes could not be saved.";
        return;
      }
      alert(`Could not save rescheduled tasks: ${error.message}`);
    }

    if (saveFailed) {
      aiNoticeEl.classList.remove("hidden");
      aiNoticeTextEl.innerText = "Rescheduling failed; task changes could not be saved.";
      return;
    }
    aiNoticeEl.classList.remove("hidden");
    if (result.rescheduledCount > 0 && changedTasks.length === result.rescheduledCount) {
      aiNoticeTextEl.innerText = `Auto-rescheduled ${result.rescheduledCount} overdue task(s) into available slots.`;
    } else {
      aiNoticeTextEl.innerText = "All tasks are currently on track!";
    }
  });

  function renderTasks() {
    taskListEl.innerHTML = "";

    tasks.forEach(task => {
      const li = document.createElement("li");
      li.className = `task-item ${task.isRescheduled ? "rescheduled" : ""}`;

      const details = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = task.title;
      if (task.completed) {
        title.style.textDecoration = "line-through";
        title.style.opacity = "0.6";
      }
      details.appendChild(title);

      const meta = document.createElement("div");
      meta.className = "task-meta";
      meta.textContent = `${task.startTime} - ${task.endTime}${task.rescheduleReason ? ` | ${task.rescheduleReason}` : ""}`;
      details.appendChild(meta);
      li.appendChild(details);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.completed;
      checkbox.dataset.id = String(task.id);
      checkbox.setAttribute("aria-label", `Mark ${task.title} completed`);
      li.appendChild(checkbox);

      taskListEl.appendChild(li);
    });

    totalTasksEl.innerText = tasks.length;
    const today = localDateString();
    const todayTasks = tasks.filter(task => localDateString(new Date(task.date)) === today);
    overdueTasksEl.innerText = rescheduler.getOverdueTasks(todayTasks).length;

    skiddioCal.setEvents(tasks);
  }
});