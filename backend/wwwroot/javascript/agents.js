document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    const clearIcon = document.querySelector(".clear-icon");
    const agentCards = Array.from(document.querySelectorAll(".agent-card"));
    const pagination = document.querySelector(".pagination");
    const pageSize = 5;
    let currentPage = 1;
    let filteredAgents = agentCards;

    function renderAgents() {
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        agentCards.forEach(card => card.style.display = "none");
        filteredAgents.slice(start, end).forEach(card => card.style.display = "flex");
        renderPagination();
    }

    function renderPagination() {
        pagination.querySelectorAll(".page-btn:not([data-page='prev']):not([data-page='next'])")
                .forEach(btn => btn.remove());
        const totalPages = Math.ceil(filteredAgents.length / pageSize);
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.classList.add("page-btn");
            btn.textContent = i;
            btn.dataset.page = i;
            if (i === currentPage) btn.classList.add("active");
            pagination.insertBefore(btn, pagination.querySelector("[data-page='next']"));
        }
    }

    function filterAgents() {
        const query = searchInput.value.toLowerCase().trim();
        filteredAgents = agentCards.filter(card => {
            const name = card.querySelector("h2").textContent.toLowerCase();
            const location = card.querySelector(".address").textContent.toLowerCase();
            return name.includes(query) || location.includes(query);
        });
        currentPage = 1;
        renderAgents();
    }

    searchInput.addEventListener("input", () => {
        filterAgents();
        clearIcon.style.display = searchInput.value.length ? "block" : "none";
    });

    clearIcon.addEventListener("click", () => {
        searchInput.value = "";
        filterAgents();
        clearIcon.style.display = "none";
    });

    pagination.addEventListener("click", e => {
        if (!e.target.classList.contains("page-btn")) return;
        const page = e.target.dataset.page;
        const totalPages = Math.ceil(filteredAgents.length / pageSize);
        if (page === "prev" && currentPage > 1) currentPage--;
        else if (page === "next" && currentPage < totalPages) currentPage++;
        else currentPage = parseInt(page);
        renderAgents();
    });

    renderAgents();

    const sendBtns = document.querySelectorAll(".send-message");
    const modalOverlay = document.getElementById("agentModal");
    const modalClose = document.getElementById("modalClose");
    const modalPhoto = document.getElementById("modalPhoto");
    const modalName = document.getElementById("modalName");
    const modalRole = document.getElementById("modalRole");
    const modalAgency = document.getElementById("modalAgency");
    const modalContact = document.getElementById("modalContact");
    const modalSocial = document.getElementById("modalSocial");
    const contactForm = document.getElementById("contactForm");

    sendBtns.forEach(btn => {
        btn.addEventListener("click", e => {
            e.preventDefault();
            const card = btn.closest(".agent-card");
            if (!card) return;

            const photo = card.querySelector(".agent-photo");
            const name = card.querySelector(".agent-info h2");
            const role = card.querySelector(".role");
            const agency = card.querySelector(".agency");
            const contactPs = card.querySelectorAll(".agent-contact p");

            if (!photo || !name || !role || !agency || contactPs.length < 3) {
                console.error("Agent info missing", card);
                return;
            }

            modalPhoto.src = photo.src;
            modalName.textContent = name.textContent;
            modalRole.textContent = role.textContent;
            modalAgency.textContent = agency.textContent;

            const email = contactPs[1].textContent;
            const phone = contactPs[2].textContent;
            modalContact.innerHTML = `<p>Email: ${email}</p><p>Phone: ${phone}</p>`;
            modalSocial.textContent = "Instagram: @" + name.textContent.split(" ")[0].toLowerCase();

            modalOverlay.style.display = "flex";
        });
    });

    modalClose.addEventListener("click", () => modalOverlay.style.display = "none");
    modalOverlay.addEventListener("click", e => {
        if (e.target === modalOverlay) modalOverlay.style.display = "none";
    });

    contactForm.addEventListener("submit", async e => {
        e.preventDefault();

        const agentName = modalName.textContent;
        const agency = modalAgency.textContent;

        const userName = document.getElementById("userName").value.trim();
        const userPhone = document.getElementById("userPhone").value.trim();
        const userEmail = document.getElementById("userEmail").value.trim();
        const userAddress = document.getElementById("userAddress").value.trim();

        if (!userName || !userPhone || !userEmail || !userAddress) {
            return alert("Please fill in all fields.");
        }

        try {
            const res = await fetch("http://localhost:5083/api/requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentName,
                    agency,
                    userName,
                    userPhone,
                    userEmail,
                    userAddress,
                    date: new Date().toISOString()
                })
            });

            if (res.ok) {
                alert("Message sent!");
                contactForm.reset();
                modalOverlay.style.display = "none";
            } else {
                alert("Failed to send message.");
            }
        } catch (err) {
            console.error("Error sending message:", err);
            alert("Error sending message.");
        }
    });

    const hamburger = document.getElementById("hamburger");
    const navMenu = document.getElementById("navMenu");
    const closeMenu = document.getElementById("closeMenu");

    hamburger?.addEventListener("click", () => navMenu.classList.add("active"));
    closeMenu?.addEventListener("click", () => navMenu.classList.remove("active"));
    document.addEventListener("click", e => {
        if (!navMenu?.contains(e.target) && !hamburger?.contains(e.target)) {
            navMenu?.classList.remove("active");
        }
    });
});