let homeBtnItem, loginBtnItem, logoutBtnItem, logoutBtn;

async function fetchCurrentUser() {
  const res = await fetch("/api/auth/me", {
    credentials: "include",
  });

  if (!res.ok) return { isLoggedIn: false };

  return await res.json();
}

function updateHeaderAuthUi(user) {
  const isLoggedIn = user?.isLoggedIn === true;

  homeBtnItem?.classList.toggle("hidden", isLoggedIn);
  loginBtnItem?.classList.toggle("hidden", isLoggedIn);
  logoutBtnItem?.classList.toggle("hidden", !isLoggedIn);
}

async function logout() {
  try {
    const res = await fetch("/api/logout", {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) throw new Error("Logout failed");

    const user = await fetchCurrentUser();
    updateHeaderAuthUi(user);

    window.location.href = "index.html";
  } catch (err) {
    console.error("Logout failed:", err);
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  homeBtnItem = document.getElementById("homeBtnItem");
  loginBtnItem = document.getElementById("loginBtnItem");
  logoutBtnItem = document.getElementById("logoutBtnItem");
  logoutBtn = document.getElementById("logoutBtn");

  const user = await fetchCurrentUser();
  updateHeaderAuthUi(user);

  logoutBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    await logout();
  });

  const messageInput = document.getElementById("message");
  const chat = document.getElementById("chat");
  const sendBtn = document.getElementById("send-btn");
  const quickChoices = document.getElementById("quick-choices");
  const hamburger = document.getElementById("hamburger");
  const sidebar = document.querySelector(".sidebar");
  const closeBtn = document.getElementById("closeBtn");

  const messageQueue = [];
  let isSending = false;
  let lastSentTimes = [];
  const SPAM_THRESHOLD = 3;
  const SPAM_INTERVAL = 1500;
  let warningVisible = false;

  function appendMessage(text, type) {
    const div = document.createElement("div");
    div.classList.add("message", type);
    if (type === "bot") {
      div.innerHTML = `<img src="images/logo.png" alt="Agent" class="avatar"><div class="bubble">${text}</div>`;
    } else {
      div.innerHTML = `<div class="bubble">${text}</div>`;
    }
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
    return div;
  }

  function appendTyping() {
    const div = document.createElement("div");
    div.classList.add("message", "bot");
    div.innerHTML = `<img src="images/logo.png" alt="Agent" class="avatar"><div class="bubble typing">Typing</div>`;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
    return div;
  }

  function disableQuickChoices(disable) {
    quickChoices
      .querySelectorAll(".choice-btn")
      .forEach((btn) => (btn.disabled = disable));
  }

  function showSpamWarning() {
    if (warningVisible) return;
    warningVisible = true;

    const warningDiv = document.createElement("div");
    warningDiv.classList.add("message", "bot");
    warningDiv.innerHTML = `<div class="bubble" style="background-color: #ffcc00; color: #333;">You're sending messages too quickly! Please wait a moment.</div>`;
    chat.appendChild(warningDiv);
    chat.scrollTop = chat.scrollHeight;

    setTimeout(() => {
      warningDiv.remove();
      warningVisible = false;
    }, 3000);
  }

  function isSpamming() {
    const now = Date.now();
    lastSentTimes = lastSentTimes.filter((time) => now - time < SPAM_INTERVAL);
    lastSentTimes.push(now);
    return lastSentTimes.length >= SPAM_THRESHOLD;
  }

  async function processQueue() {
    if (isSending || messageQueue.length === 0) return;

    if (isSpamming()) {
      showSpamWarning();
      return;
    }

    isSending = true;
    disableQuickChoices(true);
    messageInput.disabled = true;
    sendBtn.disabled = true;

    const message = messageQueue.shift();
    const formattedMessage =
      message.charAt(0).toUpperCase() + message.slice(1).toLowerCase();

    appendMessage(formattedMessage, "user");
    messageInput.value = "";

    const typingDiv = appendTyping();
    const startTime = Date.now();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: formattedMessage }),
      });

      if (!response.ok) throw new Error("Error connecting to server");

      const data = await response.json();

      const elapsed = Date.now() - startTime;
      if (elapsed < 800) await new Promise((r) => setTimeout(r, 800 - elapsed));

      typingDiv.remove();
      appendMessage(data.reply, "bot");
    } catch (err) {
      typingDiv.remove();
      appendMessage(err.message || "Error connecting to server", "bot");
      console.error(err);
    } finally {
      isSending = false;
      disableQuickChoices(false);
      messageInput.disabled = false;
      sendBtn.disabled = false;
      messageInput.focus();

      if (messageQueue.length > 0) processQueue();
    }
  }

  function queueMessage(msg) {
    messageQueue.push(msg);
    processQueue();
  }

  messageInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (messageInput.value.trim()) queueMessage(messageInput.value.trim());
    }
  });

  sendBtn.addEventListener("click", function () {
    if (messageInput.value.trim()) queueMessage(messageInput.value.trim());
  });

  quickChoices.addEventListener("click", function (event) {
    if (event.target.classList.contains("choice-btn")) {
      queueMessage(event.target.textContent.trim());
    }
  });

  hamburger.addEventListener("click", () => sidebar.classList.add("active"));
  closeBtn.addEventListener("click", () => sidebar.classList.remove("active"));
});
