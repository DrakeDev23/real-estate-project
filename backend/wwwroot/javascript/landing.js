document.addEventListener("DOMContentLoaded", function () {

const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector("nav.header");

hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("open");
    navMenu.classList.toggle("active");
});

const login = document.querySelector(".login");
if (login) {
    login.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "login.html";
    });
}

const contact = document.querySelector(".contact");
if (contact) {
    contact.addEventListener("click", () => {
        window.location.href = "#contacts";
    });
}

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
        !subject.value.trim() ||
        !address.value.trim() ||
        !firstname.value.trim() ||
        !lastname.value.trim() ||
        !email.value.trim() ||
        !phone.value.trim()
    ) {
        alert("Please fill in all required fields.");
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

        alert("Thank you! Your inquiry has been submitted. Our team at HAVEN will get back to you soon.");
        });
    }
});