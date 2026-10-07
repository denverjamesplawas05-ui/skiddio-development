document.addEventListener("DOMContentLoaded", () => {
  const loginCard = document.getElementById("login-card");
  const registerCard = document.getElementById("register-card");
  const authContainer = document.getElementById("auth-container");
  const dashboardContainer = document.getElementById("dashboard-container");
  const registerForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");

  document.getElementById("show-register").addEventListener("click", (event) => {
    event.preventDefault();
    loginCard.style.display = "none";
    registerCard.style.display = "block";
  });

  document.getElementById("show-login").addEventListener("click", (event) => {
    event.preventDefault();
    registerCard.style.display = "none";
    loginCard.style.display = "block";
  });

  function getSavedUser() {
    try {
      return JSON.parse(localStorage.getItem("skiddioUser"));
    } catch {
      return null;
    }
  }

  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim().toLowerCase();
    const password = document.getElementById("register-password").value;
    const existingUser = getSavedUser();

    if (existingUser && existingUser.email === email) {
      alert("An account with this email already exists.");
      return;
    }

    localStorage.setItem("skiddioUser", JSON.stringify({ name, email, password }));
    alert("Registration successful! You can now log in.");
    registerForm.reset();
    registerCard.style.display = "none";
    loginCard.style.display = "block";
    document.getElementById("login-email").value = email;
    document.getElementById("login-password").focus();
  });

  // Capture the submit before app.js's older handler can bypass credential checks.
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const email = document.getElementById("login-email").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value;
    const savedUser = getSavedUser();

    if (!savedUser) {
      alert("No account found. Please register first.");
      return;
    }
    if (email !== savedUser.email || password !== savedUser.password) {
      alert("Incorrect email or password.");
      return;
    }

    localStorage.setItem("skiddioLoggedIn", "true");
    authContainer.classList.add("hidden");
    dashboardContainer.classList.remove("hidden");
    const userName = document.getElementById("user-name");
    if (userName) userName.textContent = savedUser.name || savedUser.email;
  }, true);
});