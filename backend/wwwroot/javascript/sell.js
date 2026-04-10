const sidebar = document.getElementById("sidebar");
const listingGrid = document.getElementById("listingGrid");
const ordersList = document.getElementById("ordersList");
const addListingBtn = document.getElementById("addListingBtn");
const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

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

let isEditMode = false;
let currentEditId = null;
let toastTimer = null;
let imageItems = [];
let amenitiesState = [];
let tempImageCounter = 0;
let dragSourceId = null;

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

function updateCounter(input, output) {
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
    input.addEventListener("input", () => updateCounter(input, output));
    updateCounter(input, output);
  });
}

function updateAmenityCount() {
  amenityCount.textContent = String(amenitiesState.length);
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
      <button type="button" class="amenity-chip-remove" onclick="removeAmenity(${index})">×</button>
    </div>
  `,
    )
    .join("");
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

function moveImageItem(fromId, toId) {
  const fromIndex = imageItems.findIndex((x) => x.id === fromId);
  const toIndex = imageItems.findIndex((x) => x.id === toId);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

  const [moved] = imageItems.splice(fromIndex, 1);
  imageItems.splice(toIndex, 0, moved);
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
    <div
      class="image-item ${index === 0 ? "thumbnail" : ""}"
      draggable="true"
      data-id="${item.id}">
      <button type="button" class="remove-image-btn" onclick="removeImageItem('${item.id}')">×</button>
      <div class="image-thumb">
        <img src="${item.url || getFallbackImage()}" alt="Preview" onerror="this.src='${getFallbackImage()}'">
      </div>
      <div class="thumbnail-label">Thumbnail</div>
      <div class="image-meta">${escapeHtml(item.name || "Image")}</div>
    </div>
  `,
    )
    .join("");

  document.querySelectorAll(".image-item").forEach((el) => {
    el.addEventListener("dragstart", () => {
      dragSourceId = el.dataset.id;
    });

    el.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    el.addEventListener("drop", (e) => {
      e.preventDefault();
      const targetId = el.dataset.id;
      if (dragSourceId && targetId) {
        moveImageItem(dragSourceId, targetId);
      }
      dragSourceId = null;
    });

    el.addEventListener("dragend", () => {
      dragSourceId = null;
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
    <button class="pagination-btn" ${currentPage <= 1 ? "disabled" : ""} data-page="${Math.max(1, currentPage - 1)}">←</button>
  `;

  for (let i = 1; i <= safeTotalPages; i++) {
    html += `
      <button class="pagination-page ${i === currentPage ? "active" : ""}" data-page="${i}">${i}</button>
    `;
  }

  html += `
    <button class="pagination-btn" ${currentPage >= safeTotalPages ? "disabled" : ""} data-page="${Math.min(safeTotalPages, currentPage + 1)}">→</button>
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
            : getFallbackImage();

        return `
        <div class="listing-card">
          <div class="listing-image">
            <span class="listing-badge ${isRent ? "rent" : "sale"}">${isRent ? "RENT" : "SALE"}</span>
            <img src="${imageSrc}" alt="${escapeHtml(product.title)}" onerror="this.src='${getFallbackImage()}'">
          </div>
          <div class="listing-info">
            <div class="listing-title">${escapeHtml(product.title)}</div>
            <div class="listing-price">₱${Number(product.price).toLocaleString()}${product.frequency ? ` / ${escapeHtml(product.frequency)}` : ""}</div>
            <div class="listing-meta">${escapeHtml(product.address || "")}</div>
            <button class="edit-btn" onclick="editListing(${product.productId})">Edit</button>
          </div>
        </div>
      `;
      })
      .join("");
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
        <div class="order-meta"><strong>Seller:</strong> ${escapeHtml(order.sellerName || "")}</div>
        <div class="order-meta"><strong>Agent:</strong> ${escapeHtml(order.agentName || "N/A")}</div>
        <div class="order-meta"><strong>Requested:</strong> ${escapeHtml(order.requestedAt || "")}</div>
        <span class="status-pill">${escapeHtml(order.status || "")}</span>
        <div style="margin-top: 12px;">
          <button class="edit-btn" onclick="removeContactRequest(${order.requestId})">Remove Request</button>
        </div>
      </div>
    `,
      )
      .join("");
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

async function removeContactRequest(requestId) {
  if (!confirm("Remove this contact request?")) return;

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

function openSellModalForCreate() {
  isEditMode = false;
  currentEditId = null;
  sellForm.reset();
  sellModalTitleDisplay.textContent = "New Listing";
  productIdInput.disabled = false;
  sellerNameDisplay.value = "User";
  resetImageItems();
  amenitiesState = [];
  renderAmenityChips();
  hideAmenityInput();
  wireCounters();
  updateModalTitleFromInput();
  sellModal.classList.remove("hidden");
}

async function editListing(productId) {
  try {
    const response = await fetch(`/api/products/${productId}`);
    if (!response.ok) throw new Error("Failed to load listing.");

    const product = await response.json();

    isEditMode = true;
    currentEditId = productId;

    productIdInput.value = product.productId ?? "";
    productIdInput.disabled = true;
    titleInput.value = product.title ?? "";
    addressInput.value = product.address ?? "";
    priceInput.value = product.price ?? "";
    frequencyInput.value = product.frequency ?? "";
    categoryInput.value = product.category ?? "sale";
    sellerNameDisplay.value = "User";
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

    imageItems = (Array.isArray(product.images) ? product.images : [])
      .filter((img) => img && !img.endsWith("/no_image.png"))
      .slice(0, 5)
      .map((img, idx) => {
        const fileName = img.split("/").pop() || `existing_${idx + 1}`;
        return {
          id: `existing_${idx}_${Date.now()}`,
          type: "existing",
          name: fileName,
          url: img,
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
    productId: Number(productIdInput.value),
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

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Failed to save listing.");
    }

    closeSellModal();
    showToast("Saved successfully");
    await loadListings();
    await loadOrders();
  } catch (error) {
    console.error(error);
    alert("Could not save listing.");
  }
});

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

showAmenityInputBtn.addEventListener("click", showAmenityInput);
addAmenityBtn.addEventListener("click", addAmenity);
cancelAmenityBtn.addEventListener("click", hideAmenityInput);

amenityInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addAmenity();
  }
});

titleInput.addEventListener("input", updateModalTitleFromInput);

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

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

wireCounters();
updateModalTitleFromInput();
loadListings();
loadOrders();

window.editListing = editListing;
window.toggleMenu = toggleMenu;
window.closeSellModal = closeSellModal;
window.removeImageItem = removeImageItem;
window.removeContactRequest = removeContactRequest;
window.removeAmenity = removeAmenity;
