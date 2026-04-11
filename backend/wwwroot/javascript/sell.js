const sidebar = document.getElementById("sidebar");
const listingGrid = document.getElementById("listingGrid");
const ordersList = document.getElementById("ordersList");
const addListingBtn = document.getElementById("addListingBtn");
const sortToggleBtn = document.getElementById("sortToggleBtn");
const sellFilterPanel = document.getElementById("sellFilterPanel");
const sellCategoryFilter = document.getElementById("sellCategoryFilter");
const sellSortOrder = document.getElementById("sellSortOrder");
const listingPagination = document.getElementById("listingPagination");
const ordersPagination = document.getElementById("ordersPagination");
const sellModal = document.getElementById("sellModal");
const sellModalTitleDisplay = document.getElementById("sellModalTitleDisplay");
const sellForm = document.getElementById("sellForm");
const sellToast = document.getElementById("sellToast");

const productIdInput = document.getElementById("productIdInput");
const titleInput = document.getElementById("titleInput");
const addressInput = document.getElementById("addressInput");
const priceInput = document.getElementById("priceInput");
const frequencyInput = document.getElementById("frequencyInput");
const categoryInput = document.getElementById("categoryInput");
const sellerNameDisplay = document.getElementById("sellerNameDisplay");
const agentNameInput = document.getElementById("agentNameInput");
const bedroomsInput = document.getElementById("bedroomsInput");
const bathroomsInput = document.getElementById("bathroomsInput");
const overviewInput = document.getElementById("overviewInput");
const mapLinkInput = document.getElementById("mapLinkInput");
const deleteListingBtn = document.getElementById("deleteListingBtn");

const titleCounter = document.getElementById("titleCounter");
const addressCounter = document.getElementById("addressCounter");
const agentCounter = document.getElementById("agentCounter");
const overviewCounter = document.getElementById("overviewCounter");
const mapLinkCounter = document.getElementById("mapLinkCounter");

const showAmenityInputBtn = document.getElementById("showAmenityInputBtn");
const amenityInputRow = document.getElementById("amenityInputRow");
const amenityInput = document.getElementById("amenityInput");
const amenityInputCounter = document.getElementById("amenityInputCounter");
const addAmenityBtn = document.getElementById("addAmenityBtn");
const cancelAmenityBtn = document.getElementById("cancelAmenityBtn");
const amenityChipList = document.getElementById("amenityChipList");
const amenityCount = document.getElementById("amenityCount");

const imageDropzone = document.getElementById("imageDropzone");
const imageFileInput = document.getElementById("imageFileInput");
const imagePreviews = document.getElementById("imagePreviews");

let currentUser = null;
let isEditMode = false;
let currentEditId = null;
let toastTimer = null;
let imageItems = [];
let amenitiesState = [];
let tempImageCounter = 0;
let draggedImageId = null;
let allListings = [];
let allOrders = [];
let listingsPage = 1;
let ordersPage = 1;

const LISTINGS_PER_PAGE = 8;
const ORDERS_PER_PAGE = 5;

function toggleMenu() {
  sidebar.classList.toggle("open");
}

function showToast(message) {
  sellToast.textContent = message;
  sellToast.classList.remove("hidden");

  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  toastTimer = setTimeout(() => {
    sellToast.classList.add("hidden");
  }, 2200);
}

function getFallbackImage() {
  return "/images/products/no_image.png";
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function updateCounter(input, output) {
  if (!input || !output) return;
  output.textContent = String(input.value.length);
}

function updateModalTitleFromInput() {
  const value = titleInput.value.trim();
  sellModalTitleDisplay.textContent = value !== "" ? value : "New Listing";
}

function wireCounters() {
  const pairs = [
    [titleInput, titleCounter],
    [addressInput, addressCounter],
    [agentNameInput, agentCounter],
    [overviewInput, overviewCounter],
    [mapLinkInput, mapLinkCounter],
    [amenityInput, amenityInputCounter],
  ];

  pairs.forEach(([input, output]) => {
    if (!input || !output) return;
    input.oninput = () => updateCounter(input, output);
    updateCounter(input, output);
  });

  titleInput.oninput = () => {
    updateCounter(titleInput, titleCounter);
    updateModalTitleFromInput();
  };
}

function updateAmenityCount() {
  amenityCount.textContent = String(amenitiesState.length);
}

async function deleteCurrentListing() {
  if (!isEditMode || currentEditId === null) return;

  try {
    const response = await fetch(`/api/products/${currentEditId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete listing.");
    }

    closeSellModal();
    showToast("Listing deleted");
    await loadListings();
    await loadOrders();
  } catch (error) {
    console.error(error);
    alert("Could not delete listing.");
  }
}

function renderAmenityChips() {
  updateAmenityCount();

  if (amenitiesState.length === 0) {
    amenityChipList.innerHTML = "";
    return;
  }

  amenityChipList.innerHTML = amenitiesState
    .map(
      (item, index) => `
        <div class="amenity-chip-editor">
          <span>${escapeHtml(item)}</span>
          <button type="button" class="amenity-chip-remove" data-index="${index}">×</button>
        </div>
      `,
    )
    .join("");

  amenityChipList.querySelectorAll(".amenity-chip-remove").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      removeAmenity(index);
    });
  });
}

function showAmenityInput() {
  if (amenitiesState.length >= 10) return;
  amenityInputRow.classList.remove("hidden");
  amenityInput.focus();
}

function hideAmenityInput() {
  amenityInputRow.classList.add("hidden");
  amenityInput.value = "";
  updateCounter(amenityInput, amenityInputCounter);
}

function addAmenity() {
  const value = amenityInput.value.trim();
  if (!value) return;
  if (amenitiesState.length >= 10) return;
  if (amenitiesState.includes(value)) {
    hideAmenityInput();
    return;
  }

  amenitiesState.push(value);
  renderAmenityChips();
  hideAmenityInput();
}

function removeAmenity(index) {
  amenitiesState.splice(index, 1);
  renderAmenityChips();
}

function resetImageItems() {
  imageItems.forEach((item) => {
    if (item.type === "new" && item.url) {
      URL.revokeObjectURL(item.url);
    }
  });

  imageItems = [];
  tempImageCounter = 0;
  renderImagePreviews();
}

function addFilesToImageItems(fileList) {
  const files = Array.from(fileList || []);

  for (const file of files) {
    if (imageItems.length >= 5) break;
    if (!file.type.startsWith("image/")) continue;

    const id = `new_${Date.now()}_${tempImageCounter++}`;
    const url = URL.createObjectURL(file);

    imageItems.push({
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
  const item = imageItems.find((x) => x.id === id);
  if (item && item.type === "new" && item.url) {
    URL.revokeObjectURL(item.url);
  }

  imageItems = imageItems.filter((x) => x.id !== id);
  renderImagePreviews();
}

function reorderImageItems(fromId, toId) {
  const fromIndex = imageItems.findIndex((x) => x.id === fromId);
  const toIndex = imageItems.findIndex((x) => x.id === toId);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

  const [movedItem] = imageItems.splice(fromIndex, 1);
  imageItems.splice(toIndex, 0, movedItem);
  renderImagePreviews();
}

function renderImagePreviews() {
  if (imageItems.length === 0) {
    imagePreviews.innerHTML = "";
    return;
  }

  imagePreviews.innerHTML = imageItems
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

  imagePreviews.querySelectorAll(".remove-image-btn").forEach((button) => {
    button.addEventListener("click", () => {
      removeImageItem(button.dataset.id);
    });
  });

  imagePreviews.querySelectorAll(".image-item").forEach((itemEl) => {
    itemEl.addEventListener("dragstart", () => {
      draggedImageId = itemEl.dataset.id;
      itemEl.classList.add("dragging");
    });

    itemEl.addEventListener("dragend", () => {
      draggedImageId = null;
      itemEl.classList.remove("dragging");
    });

    itemEl.addEventListener("dragover", (event) => {
      event.preventDefault();
    });

    itemEl.addEventListener("drop", (event) => {
      event.preventDefault();
      const targetId = itemEl.dataset.id;
      if (draggedImageId && targetId) {
        reorderImageItems(draggedImageId, targetId);
      }
    });
  });
}

function getFilteredListings() {
  const categoryValue = sellCategoryFilter.value;
  const sortValue = sellSortOrder.value;

  let filtered = [...allListings];

  if (categoryValue) {
    filtered = filtered.filter(
      (item) => (item.category || "").toLowerCase() === categoryValue,
    );
  }

  if (currentUser && currentUser.role !== "admin") {
    const ownedIds = currentUser.ownedProductIds || [];
    filtered = filtered.filter((item) => ownedIds.includes(item.productId));
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

function renderListings() {
  const filtered = getFilteredListings();
  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / LISTINGS_PER_PAGE),
  );

  if (listingsPage > totalPages) listingsPage = totalPages;

  const start = (listingsPage - 1) * LISTINGS_PER_PAGE;
  const visible = filtered.slice(start, start + LISTINGS_PER_PAGE);

  if (!visible.length) {
    listingGrid.innerHTML = `<div class="empty-state">No listings yet.</div>`;
  } else {
    listingGrid.innerHTML = visible
      .map((product) => {
        const isRent = product.category === "rent";
        const imageSrc =
          product.thumbnailUrl && product.thumbnailUrl.trim() !== ""
            ? product.thumbnailUrl
            : product.images && product.images[0]
              ? `/images/products/${product.images[0]}`
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
              <button type="button" class="edit-btn" data-id="${product.productId}">Edit</button>
            </div>
          </div>
        `;
      })
      .join("");

    listingGrid.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        editListing(Number(btn.dataset.id));
      });
    });
  }

  renderPagination(listingPagination, listingsPage, totalPages, (page) => {
    listingsPage = page;
    renderListings();
  });
}

function renderOrders() {
  const totalPages = Math.max(1, Math.ceil(allOrders.length / ORDERS_PER_PAGE));

  if (ordersPage > totalPages) ordersPage = totalPages;

  const start = (ordersPage - 1) * ORDERS_PER_PAGE;
  const visible = allOrders.slice(start, start + ORDERS_PER_PAGE);

  if (!visible.length) {
    ordersList.innerHTML = `<div class="empty-state">No pending orders yet.</div>`;
  } else {
    ordersList.innerHTML = visible
      .map(
        (order) => `
          <div class="order-card">
            <div class="order-title">${escapeHtml(order.productTitle)}</div>
            <div class="order-meta">Seller: ${escapeHtml(order.sellerName || "")}</div>
            <div class="order-meta">Agent: ${escapeHtml(order.agentName || "N/A")}</div>
            <div class="order-meta">Requested: ${escapeHtml(order.requestedAt || "")}</div>
            <div class="status-pill">${escapeHtml(order.status || "")}</div>
            <button type="button" class="edit-btn remove-order-btn" data-id="${order.requestId}">Remove Request</button>
          </div>
        `,
      )
      .join("");

    ordersList.querySelectorAll(".remove-order-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        removeContactRequest(Number(btn.dataset.id));
      });
    });
  }

  renderPagination(ordersPagination, ordersPage, totalPages, (page) => {
    ordersPage = page;
    renderOrders();
  });
}

async function loadListings() {
  listingGrid.innerHTML = `<div class="loading">Loading listings...</div>`;

  try {
    const response = await fetch("/api/products");
    if (!response.ok) throw new Error("Failed to load listings.");
    allListings = await response.json();
    renderListings();
  } catch (error) {
    console.error(error);
    listingGrid.innerHTML = `<div class="error-state">Failed to load listings.</div>`;
    renderPagination(listingPagination, 1, 1, () => {});
  }
}

async function loadOrders() {
  ordersList.innerHTML = `<div class="loading">Loading pending orders...</div>`;

  try {
    const response = await fetch("/api/contact-requests");
    if (!response.ok) throw new Error("Failed to load pending orders.");
    allOrders = await response.json();
    renderOrders();
  } catch (error) {
    console.error(error);
    ordersList.innerHTML = `<div class="error-state">Failed to load pending orders.</div>`;
    renderPagination(ordersPagination, 1, 1, () => {});
  }
}

async function fetchCurrentUser() {
  const response = await fetch("/api/auth/me");
  return await response.json();
}

function openSellModalForCreate() {
  if (!currentUser || !currentUser.isLoggedIn) {
    window.location.href = "login.html";
    return;
  }

  isEditMode = false;
  currentEditId = null;

  sellForm.reset();
  sellModalTitleDisplay.textContent = "New Listing";
  productIdInput.value = "";
  sellerNameDisplay.value = currentUser.username || "user";

  if (deleteListingBtn) {
    deleteListingBtn.style.display = "none";
  }

  resetImageItems();
  amenitiesState = [];
  renderAmenityChips();
  hideAmenityInput();
  wireCounters();
  updateModalTitleFromInput();

  sellModal.classList.remove("hidden");
}

async function editListing(productId) {
  if (!currentUser || !currentUser.isLoggedIn) {
    window.location.href = "login.html";
    return;
  }

  try {
    const response = await fetch(`/api/products/${productId}`);
    if (!response.ok) throw new Error("Failed to load listing.");

    const product = await response.json();

    isEditMode = true;
    currentEditId = productId;

    if (deleteListingBtn) {
      deleteListingBtn.style.display = "inline-block";
    } //I am going to perish

    productIdInput.value = product.productId ?? "";
    titleInput.value = product.title ?? "";
    addressInput.value = product.address ?? "";
    priceInput.value = product.price ?? "";
    frequencyInput.value = product.frequency ?? "";
    categoryInput.value = product.category ?? "sale";
    sellerNameDisplay.value = currentUser.username || "user";
    agentNameInput.value = product.agentName ?? "";
    bedroomsInput.value = product.bedrooms ?? "";
    bathroomsInput.value = product.bathrooms ?? "";
    overviewInput.value = product.overview ?? "";
    mapLinkInput.value = product.mapLink ?? "";

    amenitiesState = Array.isArray(product.amenities)
      ? [...product.amenities].slice(0, 10)
      : [];
    renderAmenityChips();
    hideAmenityInput();

    imageItems.forEach((item) => {
      if (item.type === "new" && item.url) {
        URL.revokeObjectURL(item.url);
      }
    });

    imageItems = (Array.isArray(product.images) ? product.images : [])
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
    sellModal.classList.remove("hidden");
  } catch (error) {
    console.error(error);
    alert("Could not load listing.");
  }
}

function closeSellModal() {
  sellModal.classList.add("hidden");
}

function buildMetadata() {
  return {
    title: titleInput.value.trim(),
    address: addressInput.value.trim(),
    price: Number(priceInput.value || 0),
    frequency: frequencyInput.value || null,
    category: categoryInput.value,
    agentName: agentNameInput.value.trim() || null,
    bedrooms: bedroomsInput.value ? Number(bedroomsInput.value) : null,
    bathrooms: bathroomsInput.value ? Number(bathroomsInput.value) : null,
    overview: overviewInput.value.trim() || null,
    amenities: [...amenitiesState],
    mapLink: mapLinkInput.value.trim() || null,
    imageOrder: imageItems.map((item) => ({
      type: item.type,
      value: item.type === "existing" ? item.existingFileName : item.id,
    })),
  };
}

sellForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  if (!currentUser || !currentUser.isLoggedIn) {
    window.location.href = "login.html";
    return;
  }

  const metadata = buildMetadata();
  const formData = new FormData();
  formData.append("metadata", JSON.stringify(metadata));

  for (const item of imageItems) {
    if (item.type === "new" && item.file) {
      formData.append(item.id, item.file);
    }
  }

  try {
    let response;

    if (isEditMode && currentEditId !== null) {
      response = await fetch(`/api/products/${currentEditId}`, {
        method: "PUT",
        body: formData,
      });
    } else {
      response = await fetch("/api/products", {
        method: "POST",
        body: formData,
      });
    }

    if (response.status === 401) {
      window.location.href = "login.html";
      return;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Failed to save listing.");
    }

    closeSellModal();
    showToast("Saved successfully");
    currentUser = await fetchCurrentUser();
    await loadListings();
    await loadOrders();
  } catch (error) {
    console.error(error);
    alert("Could not save listing.");
  }
});

async function removeContactRequest(requestId) {
  try {
    const response = await fetch(`/api/contact-requests/${requestId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to remove contact request.");
    }

    showToast("Contact request removed");
    await loadOrders();
  } catch (error) {
    console.error(error);
    alert("Could not remove contact request.");
  }
}

function setupImageControls() {
  imageDropzone.addEventListener("click", () => {
    imageFileInput.click();
  });

  imageFileInput.addEventListener("change", (event) => {
    addFilesToImageItems(event.target.files);
    imageFileInput.value = "";
  });

  imageDropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    imageDropzone.classList.add("dragover");
  });

  imageDropzone.addEventListener("dragleave", () => {
    imageDropzone.classList.remove("dragover");
  });

  imageDropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    imageDropzone.classList.remove("dragover");
    addFilesToImageItems(event.dataTransfer.files);
  });
}

function setupFormControls() {
  showAmenityInputBtn.addEventListener("click", showAmenityInput);
  addAmenityBtn.addEventListener("click", addAmenity);
  cancelAmenityBtn.addEventListener("click", hideAmenityInput);

  if (deleteListingBtn) {
    deleteListingBtn.addEventListener("click", deleteCurrentListing);
  }

  amenityInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addAmenity();
    }
  });

  addListingBtn.addEventListener("click", openSellModalForCreate);

  sortToggleBtn.addEventListener("click", () => {
    sellFilterPanel.classList.toggle("hidden");
  });

  sellCategoryFilter.addEventListener("change", () => {
    listingsPage = 1;
    renderListings();
  });

  sellSortOrder.addEventListener("change", () => {
    listingsPage = 1;
    renderListings();
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      document
        .querySelectorAll(".tab-btn")
        .forEach((x) => x.classList.remove("active"));
      document
        .querySelectorAll(".tab-panel")
        .forEach((x) => x.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");

      if (btn.dataset.tab === "ordersTab") {
        await loadOrders();
      } else {
        renderListings();
      }
    });
  });
}

function setupModalClosing() {
  document
    .getElementById("closeSellModalBtn")
    ?.addEventListener("click", closeSellModal);

  sellModal.addEventListener("click", function (event) {
    if (event.target === sellModal) {
      closeSellModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !sellModal.classList.contains("hidden")) {
      closeSellModal();
    }
  });
}

async function initialize() {
  wireCounters();
  updateModalTitleFromInput();
  setupImageControls();
  setupFormControls();
  setupModalClosing();

  currentUser = await fetchCurrentUser();

  if (currentUser?.isLoggedIn) {
    sellerNameDisplay.value = currentUser.username || "user";
  } else {
    sellerNameDisplay.value = "Not logged in";
  }

  await loadListings();
  await loadOrders();
}

document.addEventListener("DOMContentLoaded", initialize);

window.editListing = editListing;
window.toggleMenu = toggleMenu;
window.closeSellModal = closeSellModal;
window.removeImageItem = removeImageItem;
window.removeContactRequest = removeContactRequest;
window.removeAmenity = removeAmenity;
