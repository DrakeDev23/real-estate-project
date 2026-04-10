const form = document.getElementById("loginForm");
const message = document.getElementById("message");
const passwordInput = document.getElementById("password");
const toggle = document.getElementById("togglePassword");
const hamburger = document.getElementById("hamburger");
const navMenu = document.getElementById("navMenu");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    message.style.color = "red";
    message.textContent = "Please enter username and password";
    return;
  }

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!data.success) {
      message.style.color = "red";
      message.textContent = data.message || "Login failed";
      return;
    }

    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("username", data.username || username);
    localStorage.setItem("role", data.role || "user");

    message.style.color = "green";
    message.textContent = data.message || "Login successful";

    setTimeout(() => {
      window.location.href = data.redirect || "buy.html";
    }, 800);
  } catch (err) {
    message.style.color = "red";
    message.textContent = "Server error. Try again later.";
  }
});

if (toggle && passwordInput) {
  toggle.addEventListener("click", () => {
    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      toggle.innerHTML = "";
    } else {
      passwordInput.type = "password";
      toggle.innerHTML = "";
    }
  });
}

if (hamburger && navMenu) {
  hamburger.addEventListener("click", () => {
    navMenu.classList.toggle("active");
  });
}
