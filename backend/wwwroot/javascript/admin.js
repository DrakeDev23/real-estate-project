document.addEventListener("DOMContentLoaded", () => {
  const requestAPI = "/api/requests";
  const userAPI = "/api/users";

  let chart;
  let currentEditId = null;

  let adminCurrentUser = null;
  let adminProducts = [];
  let adminListingsPage = 1;

  let adminIsEditMode = false;
  let adminCurrentEditId = null;
  let adminImageItems = [];
  let adminAmenitiesState = [];
  let adminTempImageCounter = 0;
  let adminDraggedImageId = null;
  let adminToastTimer = null;

  const ADMIN_ITEMS_PER_PAGE = 8;

  const sidebarItems = document.querySelectorAll(".sidebar li[data-section]");

  const adminPropertyGrid = document.getElementById("adminPropertyGrid");
  const adminListingPagination = document.getElementById(
    "adminListingPagination",
  );
  const adminAddListingBtn = document.getElementById("adminAddListingBtn");
  const adminSortToggleBtn = document.getElementById("adminSortToggleBtn");
  const adminFilterPanel = document.getElementById("adminFilterPanel");
  const adminCategoryFilter = document.getElementById("adminCategoryFilter");
  const adminSortOrder = document.getElementById("adminSortOrder");

  const adminPropertyModal = document.getElementById("adminPropertyModal");
  const closeAdminPropertyModalBtn = document.getElementById(
    "closeAdminPropertyModalBtn",
  );
  const adminPropertyModalTitleDisplay = document.getElementById(
    "adminPropertyModalTitleDisplay",
  );
  const adminSellForm = document.getElementById("adminSellForm");
  const adminSellToast = document.getElementById("adminSellToast");

  const adminTitleInput = document.getElementById("adminTitleInput");
  const adminAddressInput = document.getElementById("adminAddressInput");
  const adminPriceInput = document.getElementById("adminPriceInput");
  const adminFrequencyInput = document.getElementById("adminFrequencyInput");
  const adminCategoryInput = document.getElementById("adminCategoryInput");
  const adminSellerNameDisplay = document.getElementById(
    "adminSellerNameDisplay",
  );
  const adminAgentNameInput = document.getElementById("adminAgentNameInput");
  const adminBedroomsInput = document.getElementById("adminBedroomsInput");
  const adminBathroomsInput = document.getElementById("adminBathroomsInput");
  const adminOverviewInput = document.getElementById("adminOverviewInput");
  const adminMapLinkInput = document.getElementById("adminMapLinkInput");
  const adminDeleteListingBtn = document.getElementById(
    "adminDeleteListingBtn",
  );

  const adminTitleCounter = document.getElementById("adminTitleCounter");
  const adminAddressCounter = document.getElementById("adminAddressCounter");
  const adminAgentCounter = document.getElementById("adminAgentCounter");
  const adminOverviewCounter = document.getElementById("adminOverviewCounter");
  const adminMapLinkCounter = document.getElementById("adminMapLinkCounter");

  const adminShowAmenityInputBtn = document.getElementById(
    "adminShowAmenityInputBtn",
  );
  const adminAmenityInputRow = document.getElementById("adminAmenityInputRow");
  const adminAmenityInput = document.getElementById("adminAmenityInput");
  const adminAmenityInputCounter = document.getElementById(
    "adminAmenityInputCounter",
  );
  const adminAddAmenityBtn = document.getElementById("adminAddAmenityBtn");
  const adminCancelAmenityBtn = document.getElementById(
    "adminCancelAmenityBtn",
  );
  const adminAmenityChipList = document.getElementById("adminAmenityChipList");
  const adminAmenityCount = document.getElementById("adminAmenityCount");

  const adminImageDropzone = document.getElementById("adminImageDropzone");
  const adminImageFileInput = document.getElementById("adminImageFileInput");
  const adminImagePreviews = document.getElementById("adminImagePreviews");

  function escapeHtml(text) {
    return String(text ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getFallbackImage() {
    return "/images/products/no_image.png";
  }

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
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  function showAdminSellToast(message) {
    adminSellToast.textContent = message;
    adminSellToast.classList.remove("hidden");

    if (adminToastTimer) {
      clearTimeout(adminToastTimer);
    }

    adminToastTimer = setTimeout(() => {
      adminSellToast.classList.add("hidden");
    }, 2200);
  }

  function showConfirm(message) {
    return new Promise((resolve) => {
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
    document.querySelectorAll(".modal").forEach((m) => {
      if (e.target === m) m.style.display = "none";
    });
  };

  async function ensureAdminSession() {
    try {
      const response = await fetch("/api/auth/me");
      const me = await response.json();

      if (!me.isLoggedIn || me.role !== "admin") {
        window.location.href = "/login.html";
        return false;
      }

      adminCurrentUser = me;
      return true;
    } catch {
      window.location.href = "/login.html";
      return false;
    }
  }

  async function logout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}

    localStorage.removeItem("token");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    window.location.href = "/login.html";
  }

  async function loadDashboard() {
    try {
      const usersRes = await fetch(userAPI);
      const users = usersRes.ok ? await usersRes.json() : [];

      const reqRes = await fetch(requestAPI);
      const requests = reqRes.ok ? await reqRes.json() : [];

      const inquiries = JSON.parse(
        localStorage.getItem("haven_inquiries") || "[]",
      );

      document.getElementById("totalUsers").innerText = users.length;
      document.getElementById("totalRequests").innerText = requests.length;
      document.getElementById("totalInquiries").innerText = inquiries.length;

      const ctx = document.getElementById("dashboardChart");
      if (chart) chart.destroy();

      chart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Users", "Agent Requests", "Inquiries"],
          datasets: [
            {
              label: "System Data",
              data: [users.length, requests.length, inquiries.length],
              backgroundColor: ["#534AB7", "#1D9E75", "#D85A30"],
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
        },
      });
    } catch {
      const inquiries = JSON.parse(
        localStorage.getItem("haven_inquiries") || "[]",
      );
      document.getElementById("totalInquiries").innerText = inquiries.length;
    }
  }

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

      data.forEach((r) => {
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

  function loadInquiries() {
    const data = JSON.parse(localStorage.getItem("haven_inquiries") || "[]");
    const table = document.getElementById("inquireTable");
    table.innerHTML = "";

    if (data.length === 0) {
      table.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:1.5rem;color:#888">No inquiries submitted yet.</td></tr>`;
      return;
    }

    const sorted = [...data].sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );

    sorted.forEach((r) => {
      const shortMsg =
        r.message && r.message.length > 40
          ? r.message.slice(0, 40) + "…"
          : r.message || "—";

      const dateStr = new Date(r.date).toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      table.innerHTML += `
        <tr>
          <td><strong>${r.firstname} ${r.lastname}</strong></td>
          <td>${r.email}</td>
          <td>${r.phone}</td>
          <td>${r.subject}</td>
          <td>${r.address}</td>
          <td title="${r.message || ""}">${shortMsg}</td>
          <td style="white-space:nowrap">${dateStr}</td>
          <td style="white-space:nowrap">
            <button class="edit" onclick="viewInquiry(${r.id})">View</button>
            <button class="delete" onclick="deleteInquiry(${r.id})">Delete</button>
          </td>
        </tr>`;
    });
  }

  window.viewInquiry = function (id) {
    const data = JSON.parse(localStorage.getItem("haven_inquiries") || "[]");
    const r = data.find((x) => x.id === id);
    if (!r) return;

    document.getElementById("inquiryModalContent").innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#888;width:120px">Name</td><td><strong>${r.firstname} ${r.lastname}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#888">Email</td><td>${r.email}</td></tr>
        <tr><td style="padding:6px 0;color:#888">Phone</td><td>${r.phone}</td></tr>
        <tr><td style="padding:6px 0;color:#888">Subject</td><td>${r.subject}</td></tr>
        <tr><td style="padding:6px 0;color:#888">Address</td><td>${r.address}</td></tr>
        <tr><td style="padding:6px 0;color:#888">Date</td><td>${new Date(r.date).toLocaleString()}</td></tr>
        <tr><td style="padding:6px 0;color:#888;vertical-align:top">Message</td><td style="white-space:pre-wrap">${r.message || "—"}</td></tr>
      </table>`;

    openModal("inquiryModal");
  };

  window.deleteInquiry = async function (id) {
    const ok = await showConfirm("Delete this inquiry?");
    if (!ok) return;

    let data = JSON.parse(localStorage.getItem("haven_inquiries") || "[]");
    data = data.filter((r) => r.id !== id);
    localStorage.setItem("haven_inquiries", JSON.stringify(data));
    showToast("Inquiry deleted", "success");
    loadInquiries();
    loadDashboard();
  };

  function getFilteredProducts() {
    const categoryValue = adminCategoryFilter.value;
    const sortValue = adminSortOrder.value;

    let filtered = [...adminProducts];

    if (categoryValue) {
      filtered = filtered.filter(
        (item) => (item.category || "").toLowerCase() === categoryValue,
      );
    }

    switch (sortValue) {
      case "priceAsc":
        filtered.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "priceDesc":
        filtered.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "titleAsc":
        filtered.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        break;
      case "titleDesc":
        filtered.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
        break;
      case "latest":
      default:
        filtered.sort((a, b) => Number(b.productId) - Number(a.productId));
        break;
    }

    return filtered;
  }

  function renderPagination(container, currentPage, totalPages, onChange) {
    const safeTotalPages = Math.max(1, totalPages);

    let html = `
      <button class="pagination-btn" ${currentPage === 1 ? "disabled" : ""} data-page="${Math.max(1, currentPage - 1)}">←</button>
    `;

    for (let i = 1; i <= safeTotalPages; i++) {
      html += `
        <button class="pagination-page ${i === currentPage ? "active" : ""}" data-page="${i}">${i}</button>
      `;
    }

    html += `
      <button class="pagination-btn" ${currentPage === safeTotalPages ? "disabled" : ""} data-page="${Math.min(safeTotalPages, currentPage + 1)}">→</button>
    `;

    container.innerHTML = html;

    container.querySelectorAll("button[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        onChange(Number(btn.dataset.page));
      });
    });
  }

  function renderAdminListings() {
    const filtered = getFilteredProducts();
    const totalPages = Math.max(
      1,
      Math.ceil(filtered.length / ADMIN_ITEMS_PER_PAGE),
    );

    if (adminListingsPage > totalPages) adminListingsPage = totalPages;

    const start = (adminListingsPage - 1) * ADMIN_ITEMS_PER_PAGE;
    const visible = filtered.slice(start, start + ADMIN_ITEMS_PER_PAGE);

    if (!visible.length) {
      adminPropertyGrid.innerHTML = `<div class="empty-state">No listings found.</div>`;
    } else {
      adminPropertyGrid.innerHTML = visible
        .map((product) => {
          const isRent = product.category === "rent";
          const imageSrc =
            product.thumbnailUrl && product.thumbnailUrl.trim() !== ""
              ? product.thumbnailUrl
              : getFallbackImage();

          return `
            <div class="listing-card">
              <div class="listing-image">
                <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(product.title || "Property image")}">
                <div class="listing-badge ${isRent ? "rent" : "sale"}">
                  ${isRent ? "RENT" : "SALE"}
                </div>
              </div>
              <div class="listing-info">
                <div class="listing-title">${escapeHtml(product.title)}</div>
                <div class="listing-price">
                  ₱${Number(product.price).toLocaleString()}${product.frequency ? ` / ${escapeHtml(product.frequency)}` : ""}
                </div>
                <div class="listing-meta">${escapeHtml(product.address || "")}</div>
                <button type="button" class="edit-btn admin-edit-btn" data-id="${product.productId}">Edit</button>
              </div>
            </div>
          `;
        })
        .join("");

      adminPropertyGrid.querySelectorAll(".admin-edit-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          openAdminPropertyModalForEdit(Number(btn.dataset.id));
        });
      });
    }

    renderPagination(
      adminListingPagination,
      adminListingsPage,
      totalPages,
      (page) => {
        adminListingsPage = page;
        renderAdminListings();
      },
    );
  }

  async function loadAdminListings() {
    adminPropertyGrid.innerHTML = `<div class="loading">Loading listings...</div>`;

    try {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to load listings.");

      adminProducts = await response.json();
      renderAdminListings();
    } catch (error) {
      console.error(error);
      adminPropertyGrid.innerHTML = `<div class="error-state">Failed to load listings.</div>`;
      renderPagination(adminListingPagination, 1, 1, () => {});
    }
  }

  function updateCounter(input, output) {
    if (!input || !output) return;
    output.textContent = String(input.value.length);
  }

  function updateModalTitleFromInput() {
    const value = adminTitleInput.value.trim();
    adminPropertyModalTitleDisplay.textContent =
      value !== "" ? value : "New Listing";
  }

  function wireCounters() {
    const pairs = [
      [adminTitleInput, adminTitleCounter],
      [adminAddressInput, adminAddressCounter],
      [adminAgentNameInput, adminAgentCounter],
      [adminOverviewInput, adminOverviewCounter],
      [adminMapLinkInput, adminMapLinkCounter],
      [adminAmenityInput, adminAmenityInputCounter],
    ];

    pairs.forEach(([input, output]) => {
      if (!input || !output) return;
      input.oninput = () => updateCounter(input, output);
      updateCounter(input, output);
    });

    adminTitleInput.oninput = () => {
      updateCounter(adminTitleInput, adminTitleCounter);
      updateModalTitleFromInput();
    };
  }

  function updateAmenityCount() {
    adminAmenityCount.textContent = String(adminAmenitiesState.length);
  }

  function renderAmenityChips() {
    updateAmenityCount();

    if (adminAmenitiesState.length === 0) {
      adminAmenityChipList.innerHTML = "";
      return;
    }

    adminAmenityChipList.innerHTML = adminAmenitiesState
      .map(
        (item, index) => `
          <div class="amenity-chip-editor">
            <span>${escapeHtml(item)}</span>
            <button type="button" class="amenity-chip-remove" data-index="${index}">×</button>
          </div>
        `,
      )
      .join("");

    adminAmenityChipList
      .querySelectorAll(".amenity-chip-remove")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const index = Number(button.dataset.index);
          removeAmenity(index);
        });
      });
  }

  function showAmenityInput() {
    if (adminAmenitiesState.length >= 10) return;
    adminAmenityInputRow.classList.remove("hidden");
    adminAmenityInput.focus();
  }

  function hideAmenityInput() {
    adminAmenityInputRow.classList.add("hidden");
    adminAmenityInput.value = "";
    updateCounter(adminAmenityInput, adminAmenityInputCounter);
  }

  function addAmenity() {
    const value = adminAmenityInput.value.trim();
    if (!value) return;
    if (adminAmenitiesState.length >= 10) return;
    if (adminAmenitiesState.includes(value)) {
      hideAmenityInput();
      return;
    }

    adminAmenitiesState.push(value);
    renderAmenityChips();
    hideAmenityInput();
  }

  function removeAmenity(index) {
    adminAmenitiesState.splice(index, 1);
    renderAmenityChips();
  }

  function resetImageItems() {
    adminImageItems.forEach((item) => {
      if (item.type === "new" && item.url) {
        URL.revokeObjectURL(item.url);
      }
    });

    adminImageItems = [];
    adminTempImageCounter = 0;
    renderImagePreviews();
  }

  function addFilesToImageItems(fileList) {
    const files = Array.from(fileList || []);

    for (const file of files) {
      if (adminImageItems.length >= 5) break;
      if (!file.type.startsWith("image/")) continue;

      const id = `new_${Date.now()}_${adminTempImageCounter++}`;
      const url = URL.createObjectURL(file);

      adminImageItems.push({
        id,
        type: "new",
        file,
        url,
        name: file.name,
      });
    }

    renderImagePreviews();
  }

  function removeImageItem(id) {
    const item = adminImageItems.find((x) => x.id === id);
    if (item && item.type === "new" && item.url) {
      URL.revokeObjectURL(item.url);
    }

    adminImageItems = adminImageItems.filter((x) => x.id !== id);
    renderImagePreviews();
  }

  function reorderImageItems(fromId, toId) {
    const fromIndex = adminImageItems.findIndex((x) => x.id === fromId);
    const toIndex = adminImageItems.findIndex((x) => x.id === toId);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const [movedItem] = adminImageItems.splice(fromIndex, 1);
    adminImageItems.splice(toIndex, 0, movedItem);
    renderImagePreviews();
  }

  function renderImagePreviews() {
    if (adminImageItems.length === 0) {
      adminImagePreviews.innerHTML = "";
      return;
    }

    adminImagePreviews.innerHTML = adminImageItems
      .map(
        (item, index) => `
          <div class="image-item ${index === 0 ? "thumbnail" : ""}" data-id="${item.id}" draggable="true">
            <button type="button" class="remove-image-btn" data-id="${item.id}">×</button>
            <div class="image-thumb">
              <img src="${escapeHtml(item.url)}" alt="Preview ${index + 1}">
            </div>
            <div class="thumbnail-label">${index === 0 ? "Thumbnail" : ""}</div>
            <div class="image-meta">
              <div>${escapeHtml(item.name || "Image")}</div>
              <div>#${index + 1}</div>
            </div>
          </div>
        `,
      )
      .join("");

    adminImagePreviews
      .querySelectorAll(".remove-image-btn")
      .forEach((button) => {
        button.addEventListener("click", () => {
          removeImageItem(button.dataset.id);
        });
      });

    adminImagePreviews.querySelectorAll(".image-item").forEach((itemEl) => {
      itemEl.addEventListener("dragstart", () => {
        adminDraggedImageId = itemEl.dataset.id;
      });

      itemEl.addEventListener("dragover", (event) => {
        event.preventDefault();
      });

      itemEl.addEventListener("drop", (event) => {
        event.preventDefault();
        const targetId = itemEl.dataset.id;
        if (adminDraggedImageId && targetId) {
          reorderImageItems(adminDraggedImageId, targetId);
        }
      });

      itemEl.addEventListener("dragend", () => {
        adminDraggedImageId = null;
      });
    });
  }

  function buildMetadata() {
    return {
      title: adminTitleInput.value.trim(),
      address: adminAddressInput.value.trim(),
      price: Number(adminPriceInput.value || 0),
      frequency: adminFrequencyInput.value || null,
      category: adminCategoryInput.value,
      agentName: adminAgentNameInput.value.trim() || null,
      bedrooms: adminBedroomsInput.value
        ? Number(adminBedroomsInput.value)
        : null,
      bathrooms: adminBathroomsInput.value
        ? Number(adminBathroomsInput.value)
        : null,
      overview: adminOverviewInput.value.trim() || null,
      amenities: [...adminAmenitiesState],
      mapLink: adminMapLinkInput.value.trim() || null,
      imageOrder: adminImageItems.map((item) => ({
        type: item.type,
        value: item.type === "existing" ? item.existingFileName : item.id,
      })),
    };
  }

  function openAdminPropertyModalForCreate() {
    adminIsEditMode = false;
    adminCurrentEditId = null;

    adminSellForm.reset();
    adminPropertyModalTitleDisplay.textContent = "New Listing";
    adminSellerNameDisplay.value = adminCurrentUser?.username || "admin";
    adminDeleteListingBtn.style.display = "none";

    resetImageItems();
    adminAmenitiesState = [];
    renderAmenityChips();
    hideAmenityInput();
    wireCounters();
    updateModalTitleFromInput();

    adminPropertyModal.classList.remove("hidden");
  }

  async function openAdminPropertyModalForEdit(productId) {
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) throw new Error("Failed to load listing.");

      const product = await response.json();

      adminIsEditMode = true;
      adminCurrentEditId = productId;
      adminDeleteListingBtn.style.display = "inline-block";

      adminTitleInput.value = product.title ?? "";
      adminAddressInput.value = product.address ?? "";
      adminPriceInput.value = product.price ?? "";
      adminFrequencyInput.value = product.frequency ?? "";
      adminCategoryInput.value = product.category ?? "sale";
      adminSellerNameDisplay.value =
        product.sellerName || adminCurrentUser?.username || "admin";
      adminAgentNameInput.value = product.agentName ?? "";
      adminBedroomsInput.value = product.bedrooms ?? "";
      adminBathroomsInput.value = product.bathrooms ?? "";
      adminOverviewInput.value = product.overview ?? "";
      adminMapLinkInput.value = product.mapLink ?? "";

      adminAmenitiesState = Array.isArray(product.amenities)
        ? [...product.amenities].slice(0, 10)
        : [];
      renderAmenityChips();
      hideAmenityInput();

      adminImageItems.forEach((item) => {
        if (item.type === "new" && item.url) {
          URL.revokeObjectURL(item.url);
        }
      });

      adminImageItems = (Array.isArray(product.images) ? product.images : [])
        .filter(
          (img) =>
            img && img !== "no_image.png" && !img.endsWith("/no_image.png"),
        )
        .slice(0, 5)
        .map((img, idx) => {
          const fileName = img.includes("/") ? img.split("/").pop() : img;

          return {
            id: `existing_${idx}_${Date.now()}`,
            type: "existing",
            name: fileName,
            url: img.includes("/") ? img : `/images/products/${img}`,
            existingFileName: fileName,
          };
        });

      renderImagePreviews();
      wireCounters();
      updateModalTitleFromInput();
      adminPropertyModal.classList.remove("hidden");
    } catch (error) {
      console.error(error);
      alert("Could not load listing.");
    }
  }

  function closeAdminPropertyModal() {
    adminPropertyModal.classList.add("hidden");
  }

  async function deleteCurrentListing() {
    if (!adminIsEditMode || adminCurrentEditId === null) return;

    try {
      const response = await fetch(`/api/products/${adminCurrentEditId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete listing.");
      }

      closeAdminPropertyModal();
      showAdminSellToast("Listing deleted");
      await loadAdminListings();
    } catch (error) {
      console.error(error);
      alert("Could not delete listing.");
    }
  }

  function setupAdminPropertyControls() {
    adminAddListingBtn.addEventListener(
      "click",
      openAdminPropertyModalForCreate,
    );

    adminSortToggleBtn.addEventListener("click", () => {
      adminFilterPanel.classList.toggle("hidden");
    });

    adminCategoryFilter.addEventListener("change", () => {
      adminListingsPage = 1;
      renderAdminListings();
    });

    adminSortOrder.addEventListener("change", () => {
      adminListingsPage = 1;
      renderAdminListings();
    });

    adminShowAmenityInputBtn.addEventListener("click", showAmenityInput);
    adminAddAmenityBtn.addEventListener("click", addAmenity);
    adminCancelAmenityBtn.addEventListener("click", hideAmenityInput);
    adminDeleteListingBtn.addEventListener("click", deleteCurrentListing);

    adminAmenityInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addAmenity();
      }
    });

    adminImageDropzone.addEventListener("click", () => {
      adminImageFileInput.click();
    });

    adminImageFileInput.addEventListener("change", (event) => {
      addFilesToImageItems(event.target.files);
      adminImageFileInput.value = "";
    });

    adminImageDropzone.addEventListener("dragover", (event) => {
      event.preventDefault();
      adminImageDropzone.classList.add("dragover");
    });

    adminImageDropzone.addEventListener("dragleave", () => {
      adminImageDropzone.classList.remove("dragover");
    });

    adminImageDropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      adminImageDropzone.classList.remove("dragover");
      addFilesToImageItems(event.dataTransfer.files);
    });

    closeAdminPropertyModalBtn.addEventListener(
      "click",
      closeAdminPropertyModal,
    );

    adminPropertyModal.addEventListener("click", (event) => {
      if (event.target === adminPropertyModal) {
        closeAdminPropertyModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        !adminPropertyModal.classList.contains("hidden")
      ) {
        closeAdminPropertyModal();
      }
    });

    adminSellForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const metadata = buildMetadata();
      const formData = new FormData();
      formData.append("metadata", JSON.stringify(metadata));

      for (const item of adminImageItems) {
        if (item.type === "new" && item.file) {
          formData.append(item.id, item.file);
        }
      }

      try {
        let response;

        if (adminIsEditMode && adminCurrentEditId !== null) {
          response = await fetch(`/api/products/${adminCurrentEditId}`, {
            method: "PUT",
            body: formData,
          });
        } else {
          response = await fetch("/api/products", {
            method: "POST",
            body: formData,
          });
        }

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Failed to save listing.");
        }

        closeAdminPropertyModal();
        showAdminSellToast("Saved successfully");
        await loadAdminListings();
        loadDashboard();
      } catch (error) {
        console.error(error);
        alert("Could not save listing.");
      }
    });
  }

  function showSection(section) {
    document
      .querySelectorAll(".section")
      .forEach((s) => (s.style.display = "none"));
    document.getElementById(section).style.display = "block";

    sidebarItems.forEach((item) => item.classList.remove("active"));
    const active = document.querySelector(
      `.sidebar li[data-section="${section}"]`,
    );
    if (active) active.classList.add("active");

    const titles = {
      dashboard: "Admin Dashboard",
      requests: "Agent Requests",
      properties: "Manage Properties",
      inquire: "Inquiry Submissions",
    };

    const titleEl = document.getElementById("pageTitle");
    if (titleEl) titleEl.innerText = titles[section] || "Admin Dashboard";

    if (section === "dashboard") loadDashboard();
    if (section === "requests") loadRequests();
    if (section === "properties") loadAdminListings();
    if (section === "inquire") loadInquiries();
  }

  sidebarItems.forEach((li) => {
    li.addEventListener("click", () => {
      showSection(li.dataset.section);
    });
  });

  document.getElementById("logoutBtn").addEventListener("click", logout);

  ensureAdminSession().then((ok) => {
    if (!ok) return;

    setupAdminPropertyControls();
    loadDashboard();
    loadRequests();
    loadInquiries();
  });

  setInterval(loadDashboard, 10000);
});
