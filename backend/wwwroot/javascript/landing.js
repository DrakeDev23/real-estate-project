/*
document.addEventListener("DOMContentLoaded", function () {

    const agentBtn = document.querySelector(".agent");
    const locBtn = document.querySelector(".loc");
    const buttons = [agentBtn, locBtn];
    const searchInput = document.getElementById("search-input");
    const searchWrapper = document.querySelector(".search-wrapper");

    // Default mode: Location
    searchWrapper.classList.add("location-mode");
    locBtn.classList.add("active-mode");

    // Enable hover/click after animation ends
    buttons.forEach(btn =>
    {
        btn.addEventListener("animationend", () =>
        {
            btn.style.pointerEvents = "auto";
            btn.classList.add("hover-enabled");
        });
    });

    // LOCATION CLICK
    locBtn.addEventListener("click", function ()
    {
        searchInput.placeholder = "City, Address, Zip Code";
        searchInput.value = "";
        searchWrapper.classList.remove("agent-mode");
        searchWrapper.classList.add("location-mode");
        locBtn.classList.add("active-mode");
        agentBtn.classList.remove("active-mode");
    });

    // AGENT CLICK
    agentBtn.addEventListener("click", function ()
    {
        searchInput.placeholder = "Agent Name, Agency, License ID";
        searchInput.value = "";
        searchWrapper.classList.remove("location-mode");
        searchWrapper.classList.add("agent-mode");
        agentBtn.classList.add("active-mode");
        locBtn.classList.remove("active-mode");
    });

    // ===============================
    // HAMBURGER MENU TOGGLE
    // ===============================

	const hamburger = document.querySelector(".hamburger");
	const navMenu = document.querySelector("nav.header");

	hamburger.addEventListener("click", () => {
		hamburger.classList.toggle("open");
		navMenu.classList.toggle("active");
	});

});
*/

document.addEventListener("DOMContentLoaded", function () {

    const hamburger = document.querySelector(".hamburger");
    const navMenu = document.querySelector("nav.header");

    hamburger.addEventListener("click", () => {
        hamburger.classList.toggle("open");   // Hamburger becomes X
        navMenu.classList.toggle("active");   // Slide menu in/out
    });

});


const login = document.querySelector(".login");
login.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "login.html";
});

const contact = document.querySelector(".contact");
contact.addEventListener("click", () => {
window.location.href = "#contacts";
})