document.addEventListener("DOMContentLoaded", () => {
    const requestAPI = "/api/requests";
    const propertyAPI = "/api/properties";

    const sidebarItems = document.querySelectorAll(".sidebar li[data-section]");
    sidebarItems.forEach(li => {
        li.addEventListener("click", () => {
            const section = li.dataset.section;
            document.querySelectorAll(".section").forEach(s => s.style.display = "none");
            document.getElementById(section).style.display = "block";
            sidebarItems.forEach(item => item.classList.remove("active"));
            li.classList.add("active");
        });
    });

    document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.removeItem("token"); 
        window.location.href = "/login.html";
    });

    async function loadRequests() {
        try {
            const res = await fetch(requestAPI);
            const data = res.ok ? await res.json() : [];
            const table = document.getElementById("requestsTable");
            table.innerHTML = "";

            if (data.length === 0) {
                table.innerHTML = `<tr><td colspan="8" style="text-align:center">No requests found</td></tr>`;
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
                        <td>
                            <button onclick="deleteRequest(${r.id})">Delete</button>
                        </td>
                    </tr>
                `;
            });
        } catch (err) {
            console.error("Error loading requests:", err);
            document.getElementById("requestsTable").innerHTML =
                `<tr><td colspan="8" style="text-align:center">Failed to load requests</td></tr>`;
        }
    }

    window.deleteRequest = async (id) => {
        if (!confirm("Are you sure you want to delete this request?")) return;
        try {
            await fetch(`${requestAPI}/${id}`, { method: "DELETE" });
            loadRequests();
        } catch (err) {
            console.error("Error deleting request:", err);
            alert("Failed to delete request");
        }
    };

    async function loadProperties() {
        try {
            const res = await fetch(propertyAPI);
            const data = res.ok ? await res.json() : [];
            const table = document.getElementById("propertiesTable");
            table.innerHTML = "";

            if (data.length === 0) {
                table.innerHTML = `<tr><td colspan="4" style="text-align:center">No properties found</td></tr>`;
                return;
            }

            data.forEach(p => {
                table.innerHTML += `
                    <tr>
                        <td>${p.name}</td>
                        <td>${p.agent}</td>
                        <td>$${p.price}</td>
                        <td>
                            <button onclick="editProperty(${p.id})">Edit</button>
                            <button onclick="deleteProperty(${p.id})">Delete</button>
                        </td>
                    </tr>
                `;
            });
        } catch (err) {
            console.error("Error loading properties:", err);
            document.getElementById("propertiesTable").innerHTML =
                `<tr><td colspan="4" style="text-align:center">Failed to load properties</td></tr>`;
        }
    }

    window.addProperty = async () => {
        const name = document.getElementById("propName").value.trim();
        const agent = document.getElementById("propAgent").value.trim();
        const price = parseInt(document.getElementById("propPrice").value);
        if (!name || !agent || !price) return alert("Please fill all fields correctly.");

        try {
            await fetch(propertyAPI, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, agent, price })
            });
            document.getElementById("propName").value = "";
            document.getElementById("propAgent").value = "";
            document.getElementById("propPrice").value = "";
            loadProperties();
        } catch (err) {
            console.error("Error adding property:", err);
        }
    };

    window.editProperty = async (id) => {
        const name = prompt("New property name:");
        const agent = prompt("New agent name:");
        const price = prompt("New price:");
        if (!name || !agent || !price) return;

        try {
            await fetch(`${propertyAPI}/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, agent, price: parseInt(price) })
            });
            loadProperties();
        } catch (err) {
            console.error("Error editing property:", err);
        }
    };

    window.deleteProperty = async (id) => {
        if (!confirm("Are you sure you want to delete this property?")) return;
        try {
            await fetch(`${propertyAPI}/${id}`, { method: "DELETE" });
            loadProperties();
        } catch (err) {
            console.error("Error deleting property:", err);
            alert("Failed to delete property");
        }
    };

    document.getElementById("addPropertyBtn").addEventListener("click", window.addProperty);

    loadRequests();
    loadProperties();
});