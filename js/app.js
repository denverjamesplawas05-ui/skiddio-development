document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.skiddioSupabase;
  const rescheduler = new AutoRescheduler({
    dayStart: "08:00",
    dayEnd: "18:00",
    bufferMinutes: 15
  });

  let tasks = [];
  let currentUser = null;
  let isSignUpMode = false;

  const authContainer = document.getElementById("auth-container");
  const dashboardContainer = document.getElementById("dashboard-container");
  const loginForm = document.getElementById("login-form");
  const authError = document.getElementById("auth-error");
  const authModeToggle = document.getElementById("auth-mode-toggle");
  const authSubmitButton = loginForm.querySelector('button[type="submit"]');
  const passwordInput = document.getElementById("password");
  const logoutBtn = document.getElementById("logout-btn");
  const userNameEl = document.getElementById("user-name");
  const taskListEl = document.getElementById("task-list");
  const addTaskForm = document.getElementById("add-task-form");
  const taskDateInput = document.getElementById("task-date");
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
  const taskEditDialog = document.getElementById("task-edit-dialog");
  const taskEditForm = document.getElementById("task-edit-form");
  const scheduleDetailsDialog = document.getElementById("schedule-details-dialog");
  const scheduleConflictDialog = document.getElementById("schedule-conflict-dialog");

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
      openScheduleDetails(evt);
    },
    onEventEdit: (evt) => {
      openTaskEditor(evt);
    },
    onEventToggle: (evt, completed) => {
      updateTaskCompletion(evt, completed);
    },
    onEventDrop: async (evt, date, startTime, endTime, collision) => {
      await handleScheduleDrop(evt, date, startTime, endTime, collision);
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
    authError.classList.remove("auth-error--success");
  }

  function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  taskDateInput.value = localDateString();

  function taskPlacement(task) {
    return {
      date: localDateString(new Date(task.date)),
      startTime: task.startTime,
      endTime: task.endTime
    };
  }

  function openTaskEditor(evt) {
    const task = tasks.find(item => String(item.id) === String(evt.id));
    if (!task) return;

    const titleInput = document.getElementById("edit-task-title");
    titleInput.dataset.taskId = String(task.id);
    titleInput.value = task.title;
    document.getElementById("edit-task-date").value = taskPlacement(task).date;
    document.getElementById("edit-task-start").value = task.startTime;
    document.getElementById("edit-task-end").value = task.endTime;
    document.getElementById("edit-task-error").textContent = "";
    taskEditDialog.showModal();
  }

  function openScheduleDetails(evt) {
    const task = tasks.find(item => String(item.id) === String(evt.id));
    if (!task) return;

    const date = new Date(`${taskPlacement(task).date}T00:00:00`);
    document.getElementById("schedule-details-title").textContent = task.title;
    document.getElementById("schedule-details-date").textContent = date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
    document.getElementById("schedule-details-time").textContent =
      `${skiddioCal.formatTime(task.startTime)} – ${skiddioCal.formatTime(task.endTime)}`;

    const status = document.getElementById("schedule-details-status");
    status.textContent = task.completed ? "Completed" : task.isRescheduled ? "Rescheduled" : "Scheduled";
    status.classList.toggle("is-complete", Boolean(task.completed));
    status.classList.toggle("is-rescheduled", Boolean(task.isRescheduled));

    const note = document.getElementById("schedule-details-note");
    note.textContent = task.rescheduleReason || "";
    note.classList.toggle("hidden", !task.rescheduleReason);

    const title = document.getElementById("schedule-details-title");
    title.dataset.taskId = String(task.id);
    document.getElementById("toggle-schedule-completion").textContent =
      task.completed ? "Mark as upcoming" : "Mark complete";
    if (!scheduleDetailsDialog.open) scheduleDetailsDialog.showModal();
  }

  document.getElementById("close-schedule-details").addEventListener("click", () => scheduleDetailsDialog.close());
  document.getElementById("edit-schedule-details").addEventListener("click", () => {
    const task = tasks.find(item => String(item.id) === document.getElementById("schedule-details-title").dataset.taskId);
    scheduleDetailsDialog.close();
    if (task) openTaskEditor(task);
  });
  document.getElementById("toggle-schedule-completion").addEventListener("click", async event => {
    const button = event.currentTarget;
    const task = tasks.find(item => String(item.id) === document.getElementById("schedule-details-title").dataset.taskId);
    if (!task) return;

    button.disabled = true;
    try {
      await updateTaskCompletion(task, !task.completed);
      const updatedTask = tasks.find(item => String(item.id) === String(task.id));
      if (updatedTask) openScheduleDetails(updatedTask);
    } finally {
      button.disabled = false;
    }
  });

  async function updateTaskCompletion(evt, completed) {
    if (!currentUser) return;
    const userId = currentUser.id;
    const task = tasks.find(item => String(item.id) === String(evt.id));
    if (!task || task.completed === completed) return;

    const previousValue = task.completed;
    task.completed = completed;
    renderTasks();

    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({ completed })
        .eq("id", task.id)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();
      if (error || !data) throw new Error(error?.message || "The task was not found for this account.");
    } catch (error) {
      if (currentUser?.id !== userId) return;
      task.completed = previousValue;
      renderTasks();
      alert(`Could not update task: ${error.message}`);
    }
  }

  document.getElementById("cancel-task-edit").addEventListener("click", () => taskEditDialog.close());

  taskEditForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser) return;

    const task = tasks.find(item => String(item.id) === document.getElementById("edit-task-title").dataset.taskId);
    const titleInput = document.getElementById("edit-task-title");
    const date = document.getElementById("edit-task-date").value;
    const startTime = document.getElementById("edit-task-start").value;
    const endTime = document.getElementById("edit-task-end").value;
    const errorEl = document.getElementById("edit-task-error");
    if (!task || !date || !titleInput.value.trim() || startTime >= endTime) {
      errorEl.textContent = "Enter a title, date, and an end time after the start time.";
      return;
    }

    const userId = currentUser.id;
    const saveButton = document.getElementById("save-task-edit");
    saveButton.disabled = true;
    errorEl.textContent = "";
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          title: titleInput.value.trim(),
          task_date: date,
          start_time: startTime,
          end_time: endTime
        })
        .eq("id", task.id)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();
      if (error || !data) throw new Error(error?.message || "The task was not found for this account.");
      if (currentUser?.id !== userId) return;

      task.title = titleInput.value.trim();
      task.date = `${date}T00:00:00`;
      task.startTime = startTime;
      task.endTime = endTime;
      skiddioCal.currentDate = new Date(`${date}T00:00:00`);
      taskEditDialog.close();
      renderTasks();
    } catch (error) {
      if (currentUser?.id === userId) errorEl.textContent = `Could not save schedule: ${error.message}`;
    } finally {
      saveButton.disabled = false;
    }
  });

  function requestCollisionChoice(moving, occupied) {
    document.getElementById("schedule-conflict-summary").textContent =
      `“${moving.title}” was dropped on “${occupied.title}”. Choose whether to swap their slots or replace the occupied schedule.`;

    return new Promise(resolve => {
      let settled = false;
      const buttons = scheduleConflictDialog.querySelectorAll("[data-drop-choice]");
      const finish = choice => {
        if (settled) return;
        settled = true;
        scheduleConflictDialog.removeEventListener("cancel", cancelChoice);
        if (scheduleConflictDialog.open) scheduleConflictDialog.close();
        resolve(choice);
      };
      const cancelChoice = () => finish("cancel");

      buttons.forEach(button => {
        button.onclick = () => finish(button.dataset.dropChoice);
      });
      scheduleConflictDialog.addEventListener("cancel", cancelChoice);
      scheduleConflictDialog.showModal();
    });
  }

  async function updateTaskPlacement(task, placement, userId) {
    const { data, error } = await supabase
      .from("tasks")
      .update({ task_date: placement.date, start_time: placement.startTime, end_time: placement.endTime })
      .eq("id", task.id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (error || !data) throw new Error(error?.message || "A task was not found for this account.");
  }

  async function deleteTaskRecord(task, userId) {
    const { data, error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", task.id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (error || !data) throw new Error(error?.message || "The schedule to replace was not found.");
  }

  async function handleScheduleDrop(evt, date, startTime, endTime, collision) {
    if (!currentUser) return;
    const userId = currentUser.id;
    const moving = tasks.find(task => String(task.id) === String(evt.id));
    const occupied = collision && tasks.find(task => String(task.id) === String(collision.id));
    if (!moving) return;

    const originalMoving = taskPlacement(moving);
    const originalOccupied = occupied && taskPlacement(occupied);
    let choice = "move";
    let destination = { date, startTime, endTime };

    if (occupied) {
      choice = await requestCollisionChoice(moving, occupied);
      if (choice === "cancel") return;
      destination = originalOccupied;
    }

    try {
      await updateTaskPlacement(moving, destination, userId);
      if (choice === "switch") {
        try {
          await updateTaskPlacement(occupied, originalMoving, userId);
        } catch (error) {
          try {
            await updateTaskPlacement(moving, originalMoving, userId);
          } catch (rollbackError) {
            throw new Error(`${error.message} Rollback also failed: ${rollbackError.message}`);
          }
          throw error;
        }
      } else if (choice === "replace") {
        try {
          await deleteTaskRecord(occupied, userId);
        } catch (error) {
          try {
            await updateTaskPlacement(moving, originalMoving, userId);
          } catch (rollbackError) {
            throw new Error(`${error.message} Rollback also failed: ${rollbackError.message}`);
          }
          throw error;
        }
      }

      if (currentUser?.id !== userId) return;
      Object.assign(moving, { date: `${destination.date}T00:00:00`, startTime: destination.startTime, endTime: destination.endTime });
      if (choice === "switch") {
        Object.assign(occupied, { date: `${originalMoving.date}T00:00:00`, startTime: originalMoving.startTime, endTime: originalMoving.endTime });
      } else if (choice === "replace") {
        tasks = tasks.filter(task => String(task.id) !== String(occupied.id));
      }
      renderTasks();
    } catch (error) {
      if (currentUser?.id === userId) alert(`Could not move schedule: ${error.message}`);
    }
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

  authModeToggle.addEventListener("click", () => {
    isSignUpMode = !isSignUpMode;
    showAuthError();
    authSubmitButton.textContent = isSignUpMode ? "Create Account" : "Sign In";
    authModeToggle.textContent = isSignUpMode
      ? "Already have an account? Sign in"
      : "Don't have an account? Sign up";
    passwordInput.autocomplete = isSignUpMode ? "new-password" : "current-password";
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showAuthError();
    authSubmitButton.disabled = true;
    try {
      const credentials = {
        email: document.getElementById("email").value.trim(),
        password: passwordInput.value
      };
      const { data, error } = isSignUpMode
        ? await supabase.auth.signUp(credentials)
        : await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      if (isSignUpMode && !data.session) {
        authError.textContent = "Account created. Check your email to confirm your account before signing in.";
        authError.classList.remove("hidden");
        authError.classList.add("auth-error--success");
      } else if (data.user) {
        await activateUser(data.user);
      }
    } catch (error) {
      showAuthError(error.message);
    } finally {
      authSubmitButton.disabled = false;
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
    const date = taskDateInput.value;
    const startTime = document.getElementById("task-start-time").value;
    const endTime = document.getElementById("task-end-time").value;

    if (!date) {
      alert("Choose a date for the task.");
      return;
    }

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
          task_date: date
        })
        .select()
        .single();
      if (error) throw error;
      if (currentUser?.id !== userId) return;

      tasks.push(toTask(data));
      addTaskForm.reset();
      taskDateInput.value = localDateString();
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
      if (task) await updateTaskCompletion(task, e.target.checked);
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
      meta.textContent = `${skiddioCal.formatTime(task.startTime)} - ${skiddioCal.formatTime(task.endTime)}${task.rescheduleReason ? ` | ${task.rescheduleReason}` : ""}`;
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