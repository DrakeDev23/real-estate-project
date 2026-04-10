//bandaid fix - don't mind. wala bitaw mu check sa backend.

document.addEventListener("DOMContentLoaded", async () => {
  const logoutBtn = document.getElementById("logoutBtn");

  if (!logoutBtn) {
    return;
  }

  try {
    const meResponse = await fetch("/api/auth/me", {
      credentials: "same-origin",
    });

    if (meResponse.ok) {
      const me = await meResponse.json();

      if (!me.isLoggedIn) {
        logoutBtn.style.display = "none";
        return;
      }
    }
  } catch (error) {
    console.error("Failed to check login state:", error);
  }

  logoutBtn.addEventListener("click", async (event) => {
    event.preventDefault();

    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Logout failed.");
      }

      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("username");
      localStorage.removeItem("role");

      window.location.href = "login.html";
    } catch (error) {
      console.error("Logout error:", error);
      alert("Could not log out right now. Please try again.");
    }
  });
});
