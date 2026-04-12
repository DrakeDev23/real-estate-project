document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    const message = document.getElementById("message");

    const password = document.getElementById("password");
    const toggle = document.getElementById("togglePassword");
    const icon = toggle.querySelector("ion-icon");

    const hamburger = document.getElementById("hamburger");
    const navMenu = document.getElementById("navMenu");

    toggle.addEventListener("click", () => {
        if (password.type === "password") {
            password.type = "text";
            icon.setAttribute("name", "eye-off-outline");
        } else {
            password.type = "password";
            icon.setAttribute("name", "eye-outline");
        }
    });

    hamburger.addEventListener("click", () => {
        navMenu.classList.toggle("active");
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value.trim();
        const passwordValue = password.value.trim();

        if (!username || !passwordValue) {
            message.style.color = "red";
            message.textContent = "Please enter username and password";
            return;
        }

        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username,
                    password: passwordValue
                })
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
            console.error(err);
        }
    });
});