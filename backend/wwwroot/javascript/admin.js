document.addEventListener("DOMContentLoaded", () => {

const requestAPI  = "/api/requests";
const propertyAPI = "/api/properties";
const userAPI     = "/api/users";

let currentEditId = null;
let chart;

function showToast(message, type = "success") {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";
        document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => container.removeChild(toast), 300);
    }, 3000);
}

function showConfirm(message) {
    return new Promise(resolve => {
    const modal = document.getElementById("confirmModal");
    document.getElementById("confirmText").innerText = message;
    modal.style.display = "flex";
    document.getElementById("confirmYes").onclick = () => {
        modal.style.display = "none";
        resolve(true);
        };
        document.getElementById("confirmNo").onclick = () => {
        modal.style.display = "none";
        resolve(false);
        };
    });
}

function openModal(id) {
    document.getElementById(id).style.display = "flex";
}

window.closeModal = function (id) {
    document.getElementById(id).style.display = "none";
};

window.onclick = function (e) {
    document.querySelectorAll(".modal").forEach(m => {
        if (e.target === m) m.style.display = "none";
    });
};

const sidebarItems = document.querySelectorAll(".sidebar li[data-section]");

sidebarItems.forEach(li => {
    li.addEventListener("click", () => {
        const section = li.dataset.section;

    document.querySelectorAll(".section").forEach(s => s.style.display = "none");
    document.getElementById(section).style.display = "block";

    sidebarItems.forEach(item => item.classList.remove("active"));
    li.classList.add("active");

    const titles = {
        dashboard:  "Admin Dashboard",
        requests:   "Agent Requests",
        properties: "Manage Properties",
        inquire:    "Inquiry Submissions"
    };
    const titleEl = document.getElementById("pageTitle");
    if (titleEl) titleEl.innerText = titles[section] || "Admin Dashboard";

        if (section === "dashboard")  loadDashboard();
        if (section === "requests")   loadRequests();
        if (section === "properties") loadProperties();
        if (section === "inquire")    loadInquiries();
    });
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
});

async function loadDashboard() {
    try {
    const usersRes = await fetch(userAPI);
    const users = usersRes.ok ? await usersRes.json() : [];

    const reqRes = await fetch(requestAPI);
    const requests = reqRes.ok ? await reqRes.json() : [];

    const inquiries = JSON.parse(localStorage.getItem("haven_inquiries") || "[]");

    document.getElementById("totalUsers").innerText     = users.length;
    document.getElementById("totalRequests").innerText  = requests.length;
    document.getElementById("totalInquiries").innerText = inquiries.length;

    const ctx = document.getElementById("dashboardChart");
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: "bar",
        data: {
        labels: ["Users", "Agent Requests", "Inquiries"],
        datasets: [{
            label: "System Data",
            data: [users.length, requests.length, inquiries.length],
            backgroundColor: ["#534AB7", "#1D9E75", "#D85A30"]
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
    } catch {
    const inquiries = JSON.parse(localStorage.getItem("haven_inquiries") || "[]");
    document.getElementById("totalInquiries").innerText = inquiries.length;

    const ctx = document.getElementById("dashboardChart");
    if (chart) chart.destroy();
        chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Inquiries"],
            datasets: [{
            label: "Inquiries",
            data: [inquiries.length],
            backgroundColor: ["#D85A30"]
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
    }
}

setInterval(loadDashboard, 10000);

async function loadRequests() {
    try {
        const res = await fetch(requestAPI);
        const data = res.ok ? await res.json() : [];
        const table = document.getElementById("requestsTable");
        table.innerHTML = "";

    if (data.length === 0) {
        table.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:1rem;color:#888">No requests found.</td></tr>`;
        return;
    }
    data.forEach(r => {
        table.innerHTML += `
            <tr>
                <td>${r.agentName}</td>
                <td>${r.agency}</td>
                <td>${r.userName}</td>
                <td>${r.userPhone}</td>
                <td>${r.userEmail}</td>
                <td>${r.userAddress}</td>
                <td>${new Date(r.date).toLocaleString()}</td>
                <td><button class="delete" onclick="deleteRequest(${r.id})">Delete</button></td>
            </tr>`;
        });
    } catch {
        const table = document.getElementById("requestsTable");
        table.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:1rem;color:#888">No agent requests found or API not connected.</td></tr>`;
    }
}

window.deleteRequest = async (id) => {
    const ok = await showConfirm("Delete this request?");
    if (!ok) return;
    try {
        await fetch(`${requestAPI}/${id}`, { method: "DELETE" });
        showToast("Request deleted", "success");
        loadRequests();
        loadDashboard();
    } catch {
        showToast("Failed to delete request", "error");
    }
};


async function loadProperties() {
    try {
    const res = await fetch(propertyAPI);
    const data = res.ok ? await res.json() : [];
    const table = document.getElementById("propertiesTable");
    table.innerHTML = "";

    if (data.length === 0) {
        table.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:1rem;color:#888">No properties found.</td></tr>`;
        return;
    }
    data.forEach(p => {
        table.innerHTML += `
        <tr>
            <td>${p.name}</td>
            <td>${p.agent}</td>
            <td>₱${Number(p.price).toLocaleString()}</td>
            <td>
                <button class="edit"   onclick="editProperty(${p.id})">Edit</button>
                <button class="delete" onclick="deleteProperty(${p.id})">Delete</button>
            </td>
        </tr>`;
    });
    } catch {
        const table = document.getElementById("propertiesTable");
        table.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:1rem;color:#888">No properties found or API not connected.</td></tr>`;
    }
}

window.addProperty = async () => {
    const name  = document.getElementById("propName").value.trim();
    const agent = document.getElementById("propAgent").value.trim();
    const price = parseInt(document.getElementById("propPrice").value);
    if (!name || !agent || !price) {
        return showToast("Please fill all fields correctly", "error");
    }
    try {
        await fetch(propertyAPI, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, agent, price })
    });
        showToast("Property added", "success");
        document.getElementById("propName").value  = "";
        document.getElementById("propAgent").value = "";
        document.getElementById("propPrice").value = "";
        loadProperties();
        loadDashboard();
    } catch {
        showToast("Failed to add property", "error");
    }
};

window.editProperty = async (id) => {
    currentEditId = id;
    try {
        const res = await fetch(`${propertyAPI}/${id}`);
        const p   = await res.json();
        document.getElementById("editName").value  = p.name;
        document.getElementById("editAgent").value = p.agent;
        document.getElementById("editPrice").value = p.price;
        openModal("editModal");
    } catch {
        showToast("Failed to load property", "error");
    }
};
document.getElementById("saveEdit").onclick = async () => {
    const name  = document.getElementById("editName").value.trim();
    const agent = document.getElementById("editAgent").value.trim();
    const price = document.getElementById("editPrice").value;
    if (!name || !agent || !price) {
        return showToast("Fill all fields", "error");
    }
    try {
        await fetch(`${propertyAPI}/${currentEditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, agent, price: parseInt(price) })
    });
        closeModal("editModal");
        showToast("Property updated", "success");
        loadProperties();
        loadDashboard();
    } catch {
        showToast("Failed to update property", "error");
    }
};

window.deleteProperty = async (id) => {
    const ok = await showConfirm("Delete this property?");
    if (!ok) return;
    try {
        await fetch(`${propertyAPI}/${id}`, { method: "DELETE" });
        showToast("Property deleted", "success");
        loadProperties();
        loadDashboard();
    } catch {
        showToast("Failed to delete property", "error");
    }
};

document.getElementById("addPropertyBtn").addEventListener("click", window.addProperty);

function loadInquiries() {
    const data  = JSON.parse(localStorage.getItem("haven_inquiries") || "[]");
    const table = document.getElementById("inquireTable");
    table.innerHTML = "";

    if (data.length === 0) {
        table.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:1.5rem;color:#888">No inquiries submitted yet.</td></tr>`;
        return;
    }

    const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(r => {
    const shortMsg = r.message && r.message.length > 40
        ? r.message.slice(0, 40) + "…"
        : (r.message || "—");
    const dateStr = new Date(r.date).toLocaleString("en-PH", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });

    table.innerHTML += `
        <tr>
        <td><strong>${r.firstname} ${r.lastname}</strong></td>
            <td>${r.email}</td>
            <td>${r.phone}</td>
            <td>${r.subject}</td>
            <td>${r.address}</td>
            <td title="${r.message || ''}">${shortMsg}</td>
            <td style="white-space:nowrap">${dateStr}</td>
            <td style="white-space:nowrap">
            <button class="edit"   onclick="viewInquiry(${r.id})">View</button>
            <button class="delete" onclick="deleteInquiry(${r.id})">Delete</button>
        </td>
        </tr>`;
    });
}

window.viewInquiry = function (id) {
    const data = JSON.parse(localStorage.getItem("haven_inquiries") || "[]");
    const r    = data.find(x => x.id === id);
    if (!r) return;

    document.getElementById("inquiryModalContent").innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#888;width:120px">Name</td>      <td><strong>${r.firstname} ${r.lastname}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#888">Email</td>     <td>${r.email}</td></tr>
        <tr><td style="padding:6px 0;color:#888">Phone</td>     <td>${r.phone}</td></tr>
        <tr><td style="padding:6px 0;color:#888">Subject</td>   <td>${r.subject}</td></tr>
        <tr><td style="padding:6px 0;color:#888">Address</td>   <td>${r.address}</td></tr>
        <tr><td style="padding:6px 0;color:#888">Date</td>      <td>${new Date(r.date).toLocaleString()}</td></tr>
        <tr><td style="padding:6px 0;color:#888;vertical-align:top">Message</td><td style="white-space:pre-wrap">${r.message || "—"}</td></tr>
    </table>`;

    openModal("inquiryModal");
};

window.deleteInquiry = async function (id) {
    const ok = await showConfirm("Delete this inquiry?");
    if (!ok) return;
    let data = JSON.parse(localStorage.getItem("haven_inquiries") || "[]");
    data = data.filter(r => r.id !== id);
    localStorage.setItem("haven_inquiries", JSON.stringify(data));
    showToast("Inquiry deleted", "success");
    loadInquiries();
    loadDashboard();
};

loadDashboard();
loadRequests();
loadProperties();

});