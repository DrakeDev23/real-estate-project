document.addEventListener("DOMContentLoaded", function () {

    /* ── Hamburger menu ── */
    const hamburger = document.querySelector(".hamburger");
    const navMenu   = document.querySelector("nav.header");

    hamburger.addEventListener("click", () => {
        hamburger.classList.toggle("open");
        navMenu.classList.toggle("active");
    });

    /* Close nav when a link is clicked (mobile) */
    navMenu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            hamburger.classList.remove("open");
            navMenu.classList.remove("active");
        });
    });

    /* ── Login button ── */
    const login = document.querySelector(".login");
    if (login) {
        login.addEventListener("click", (e) => {
            e.preventDefault();
            window.location.href = "login.html";
        });
    }

    /* ── Contact button ── */
    const contact = document.querySelector(".contact");
    if (contact) {
        contact.addEventListener("click", () => {
            const target = document.getElementById("contacts");
            if (target) target.scrollIntoView({ behavior: "smooth" });
        });
    }

    /* ── Toast notification ── */
    function showToast(message, type = "success") {
        const existing = document.querySelector(".haven-toast");
        if (existing) existing.remove();

        const toast = document.createElement("div");
        toast.className = "haven-toast";

        const icon = document.createElement("div");
        icon.className = "haven-toast-icon";
        icon.innerHTML = type === "success"
            ? `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="11" cy="11" r="11" fill="#ff7400"/>
                    <polyline points="5,11 9,15 17,7" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
               </svg>`
            : `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="11" cy="11" r="11" fill="#e53935"/>
                    <line x1="7" y1="7" x2="15" y2="15" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
                    <line x1="15" y1="7" x2="7" y2="15" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
               </svg>`;

        const text  = document.createElement("div");
        text.className = "haven-toast-text";

        const title = document.createElement("p");
        title.className = "haven-toast-title";
        title.textContent = type === "success" ? "Inquiry Submitted!" : "Missing Fields";

        const sub   = document.createElement("p");
        sub.className = "haven-toast-sub";
        sub.textContent = message;

        text.appendChild(title);
        text.appendChild(sub);

        const close = document.createElement("button");
        close.className = "haven-toast-close";
        close.innerHTML = "&#x2715;";
        close.addEventListener("click", () => {
            toast.classList.remove("haven-toast-show");
            setTimeout(() => toast.remove(), 400);
        });

        toast.appendChild(icon);
        toast.appendChild(text);
        toast.appendChild(close);
        document.body.appendChild(toast);

        requestAnimationFrame(() => requestAnimationFrame(() => {
            toast.classList.add("haven-toast-show");
        }));

        setTimeout(() => {
            toast.classList.remove("haven-toast-show");
            setTimeout(() => toast.remove(), 400);
        }, 4500);
    }

    /* ── Inquiry form submit ── */
    const submitBtn = document.querySelector(".submit-btn");

    if (submitBtn) {
        submitBtn.addEventListener("click", function (e) {
            e.preventDefault();

            const subject   = document.querySelector('input[name="subject"]');
            const address   = document.querySelector('input[name="address"]');
            const firstname = document.querySelector('input[name="firstname"]');
            const lastname  = document.querySelector('input[name="lastname"]');
            const email     = document.querySelector('input[name="email"]');
            const phone     = document.querySelector('input[name="phone"]');
            const message   = document.querySelector('textarea[name="message"]');

            if (
                !subject.value.trim()   ||
                !address.value.trim()   ||
                !firstname.value.trim() ||
                !lastname.value.trim()  ||
                !email.value.trim()     ||
                !phone.value.trim()
            ) {
                showToast("Please fill in all required fields.", "error");
                return;
            }

            const entry = {
                id:        Date.now(),
                subject:   subject.value.trim(),
                address:   address.value.trim(),
                firstname: firstname.value.trim(),
                lastname:  lastname.value.trim(),
                email:     email.value.trim(),
                phone:     phone.value.trim(),
                message:   message.value.trim(),
                date:      new Date().toISOString()
            };

            const existing = JSON.parse(localStorage.getItem("haven_inquiries") || "[]");
            existing.push(entry);
            localStorage.setItem("haven_inquiries", JSON.stringify(existing));

            subject.value   = "";
            address.value   = "";
            firstname.value = "";
            lastname.value  = "";
            email.value     = "";
            phone.value     = "";
            message.value   = "";

            showToast("Thank you! Our team at HAVEN will get back to you soon.", "success");
        });
    }

});