const propertyContainer = document.getElementById("propertyContainer");
const searchInput = document.getElementById("search");
const searchBtn = document.getElementById("searchBtn");
const sidebar = document.getElementById("sidebar");
const pageContent = document.getElementById("pageContent");

const sortToggleBtn = document.getElementById("sortToggleBtn");
const filterPanel = document.getElementById("filterPanel");
const categoryFilter = document.getElementById("categoryFilter");
const frequencyFilter = document.getElementById("frequencyFilter");
const minPriceInput = document.getElementById("minPrice");
const maxPriceInput = document.getElementById("maxPrice");
const sortOrder = document.getElementById("sortOrder");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const applyFiltersBtn = document.getElementById("applyFiltersBtn");
const buyPagination = document.getElementById("buyPagination");

const modal = document.getElementById("propertyModal");
const modalMainImage = document.getElementById("modalMainImage");
const modalThumbnails = document.getElementById("modalThumbnails");

const popupCategory = document.getElementById("popupCategory");
const popupTitle = document.getElementById("popupTitle");
const popupPrice = document.getElementById("popupPrice");
const popupStats = document.getElementById("popupStats");
const popupSeller = document.getElementById("popupSeller");
const popupAgent = document.getElementById("popupAgent");
const popupOverview = document.getElementById("popupOverview");
const popupAddress = document.getElementById("popupAddress");
const popupCategoryText = document.getElementById("popupCategoryText");
const popupFrequency = document.getElementById("popupFrequency");
const popupMapLink = document.getElementById("popupMapLink");
const popupMapFrame = document.getElementById("popupMapFrame");
const popupProductIdFaint = document.getElementById("popupProductIdFaint");
const popupAmenities = document.getElementById("popupAmenities");
const amenitiesSection = document.getElementById("amenitiesSection");
const contactAgentBtn = document.getElementById("contactAgentBtn");
const toastNotification = document.getElementById("toastNotification");

let allProducts = [];
let toastTimer = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 8;

let currentUser = null;

async function fetchCurrentUser() {
  try {
    const response = await fetch("/api/auth/me");
    if (!response.ok) {
      return { isLoggedIn: false };
    }

    return await response.json();
  } catch (error) {
    console.error(error);
    return { isLoggedIn: false };
  }
}

function toggleMenu() {
  sidebar.classList.toggle("open");
}

function getFallbackImage() {
  return "/images/products/no_image.png";
}

function normalizeImages(images) {
  const fallback = getFallbackImage();

  if (!Array.isArray(images) || images.length === 0) {
    return [fallback];
  }

  return images
    .slice(0, 5)
    .map((img) => (img && String(img).trim() !== "" ? img : fallback));
}

function showToast(message) {
  toastNotification.textContent = message;
  toastNotification.classList.remove("hidden");

  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  toastTimer = setTimeout(() => {
    toastNotification.classList.add("hidden");
  }, 2200);
}

function formatStatLabel(label, value) {
  return `${value} ${label}`;
}

function buildStats(product) {
  const stats = [];

  const bedrooms = Number(product.bedrooms);
  const bathrooms = Number(product.bathrooms);

  if (!Number.isNaN(bedrooms) && bedrooms > 0) {
    stats.push(
      formatStatLabel("bedroom" + (bedrooms === 1 ? "" : "s"), bedrooms),
    );
  }

  if (!Number.isNaN(bathrooms) && bathrooms > 0) {
    stats.push(
      formatStatLabel("toilet" + (bathrooms === 1 ? "" : "s"), bathrooms),
    );
  }

  return stats;
}

async function loadProducts() {
  propertyContainer.innerHTML = `<div class="loading">Loading properties...</div>`;

  try {
    const response = await fetch("/api/products");
    if (!response.ok) {
      throw new Error("Failed to load products.");
    }

    allProducts = await response.json();
    renderProducts();
  } catch (error) {
    console.error(error);
    propertyContainer.innerHTML = `<div class="error-state">Failed to load properties.</div>`;
    renderPagination(1, 1);
  }
}

function getFilteredProducts() {
  const searchValue = searchInput.value.trim().toLowerCase();
  const categoryValue = categoryFilter.value;
  const frequencyValue = frequencyFilter.value.toLowerCase();
  const minPrice = minPriceInput.value ? Number(minPriceInput.value) : null;
  const maxPrice = maxPriceInput.value ? Number(maxPriceInput.value) : null;
  const sortValue = sortOrder.value;

  let filtered = [...allProducts].filter((product) => {
    const title = (product.title || "").toLowerCase();
    const address = (product.address || "").toLowerCase();
    const category = (product.category || "").toLowerCase();
    const frequency = (product.frequency || "").toLowerCase();
    const price = Number(product.price || 0);

    const matchesSearch =
      title.includes(searchValue) || address.includes(searchValue);

    const matchesCategory = !categoryValue || category === categoryValue;

    const matchesFrequency = !frequencyValue || frequency === frequencyValue;

    const matchesMin = minPrice === null || price >= minPrice;

    const matchesMax = maxPrice === null || price <= maxPrice;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesFrequency &&
      matchesMin &&
      matchesMax
    );
  });

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

function renderPagination(current, total) {
  const safeTotal = Math.max(1, total);

  let html = `
    <button class="pagination-btn" ${current <= 1 ? "disabled" : ""} data-page="${Math.max(1, current - 1)}">←</button>
  `;

  for (let i = 1; i <= safeTotal; i++) {
    html += `
      <button class="pagination-page ${i === current ? "active" : ""}" data-page="${i}">${i}</button>
    `;
  }

  html += `
    <button class="pagination-btn" ${current >= safeTotal ? "disabled" : ""} data-page="${Math.min(safeTotal, current + 1)}">→</button>
  `;

  buyPagination.innerHTML = html;

  buyPagination.querySelectorAll("button[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      currentPage = Number(btn.dataset.page);
      renderProducts();
    });
  });
}

function renderProducts() {
  const filtered = getFilteredProducts();
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const visible = filtered.slice(start, start + ITEMS_PER_PAGE);

  if (!visible.length) {
    propertyContainer.innerHTML = `<div class="empty-state">No properties found.</div>`;
  } else {
    propertyContainer.innerHTML = visible
      .map((product) => {
        const isRent = product.category === "rent";
        const badgeText = isRent ? "RENT" : "SALE";
        const badgeClass = isRent ? "rent" : "sale";
        const frequencyText = product.frequency
          ? ` / ${escapeHtml(product.frequency)}`
          : "";
        const imageSrc =
          product.thumbnailUrl && product.thumbnailUrl.trim() !== ""
            ? product.thumbnailUrl
            : getFallbackImage();

        return `
        <div class="property-tile" onclick="openPropertyModal(${product.productId})">
          <div class="tile-image">
            <span class="tile-badge ${badgeClass}">${badgeText}</span>
            <img src="${imageSrc}" alt="${escapeHtml(product.title)}" onerror="this.src='${getFallbackImage()}'">
          </div>
          <div class="tile-info">
            <div class="tile-title">${escapeHtml(product.title)}</div>
            <div class="tile-price">₱${Number(product.price).toLocaleString()}${frequencyText}</div>
            <div class="tile-address">${escapeHtml(product.address || "")}</div>
          </div>
        </div>
      `;
      })
      .join("");
  }

  renderPagination(currentPage, totalPages);
}

function applyFilters() {
  currentPage = 1;
  renderProducts();
}

function clearFilters() {
  searchInput.value = "";
  categoryFilter.value = "";
  frequencyFilter.value = "";
  minPriceInput.value = "";
  maxPriceInput.value = "";
  sortOrder.value = "latest";
  currentPage = 1;
  renderProducts();
}

function buildGoogleMapsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function buildGoogleEmbedUrl(address) {
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed`;
}

function renderAmenities(amenities) {
  if (!Array.isArray(amenities) || amenities.length === 0) {
    popupAmenities.innerHTML = "";
    amenitiesSection.classList.add("hidden");
    return;
  }

  amenitiesSection.classList.remove("hidden");
  popupAmenities.innerHTML = amenities
    .filter((item) => item && String(item).trim() !== "")
    .map((item) => `<span class="amenity-chip">${escapeHtml(item)}</span>`)
    .join("");
}

async function updateContactButtonState(productId) {
  currentUser = await fetchCurrentUser();

  if (!currentUser || !currentUser.isLoggedIn) {
    contactAgentBtn.classList.remove("sent");
    contactAgentBtn.textContent = "Contact Agent";
    contactAgentBtn.disabled = false;
    return;
  }

  try {
    const response = await fetch(
      `/api/contact-requests/by-product/${productId}`,
    );

    if (response.status === 401) {
      contactAgentBtn.classList.remove("sent");
      contactAgentBtn.textContent = "Contact Agent";
      contactAgentBtn.disabled = false;
      return;
    }

    if (!response.ok) {
      contactAgentBtn.classList.remove("sent");
      contactAgentBtn.textContent = "Contact Agent";
      contactAgentBtn.disabled = false;
      return;
    }

    const existing = await response.json();

    if (existing && existing.status === "confirmation pending") {
      contactAgentBtn.classList.add("sent");
      contactAgentBtn.textContent = "Contact request sent";
      contactAgentBtn.disabled = true;
    } else {
      contactAgentBtn.classList.remove("sent");
      contactAgentBtn.textContent = "Contact Agent";
      contactAgentBtn.disabled = false;
    }
  } catch (error) {
    console.error(error);
    contactAgentBtn.classList.remove("sent");
    contactAgentBtn.textContent = "Contact Agent";
    contactAgentBtn.disabled = false;
  }
}

async function openPropertyModal(productId) {
  try {
    const response = await fetch(`/api/products/${productId}`);
    if (!response.ok) {
      throw new Error("Failed to load product details.");
    }

    const product = await response.json();
    const images = normalizeImages(product.images);
    const isRent = (product.category || "").toLowerCase() === "rent";
    const frequencyText = product.frequency ? ` / ${product.frequency}` : "";
    const address = product.address || "";
    const stats = buildStats(product);

    popupCategory.textContent = isRent ? "RENT" : "SALE";
    popupCategory.className = `popup-badge ${isRent ? "rent" : "sale"}`;

    popupTitle.textContent = product.title || "Untitled Property";
    popupPrice.textContent = `₱${Number(product.price || 0).toLocaleString()}${frequencyText}`;

    if (stats.length > 0) {
      popupStats.innerHTML = stats
        .map((stat) => `<span>${escapeHtml(stat)}</span>`)
        .join("");
      popupStats.classList.remove("hidden");
    } else {
      popupStats.innerHTML = "";
      popupStats.classList.add("hidden");
    }

    popupSeller.textContent = product.sellerName || "No seller name";
    popupAgent.textContent = `Agent: ${product.agentName || "None"}`;
    popupOverview.textContent = product.overview || "No overview available.";
    popupAddress.textContent = address || "-";
    popupCategoryText.textContent = product.category || "-";
    popupFrequency.textContent = product.frequency || "N/A";
    popupProductIdFaint.textContent = `Product ID: ${product.productId ?? "-"}`;

    renderAmenities(product.amenities);

    await updateContactButtonState(product.productId);

    contactAgentBtn.onclick = async () => {
      if (contactAgentBtn.disabled) return;

          contactAgentBtn.onclick = async () => {
      if (contactAgentBtn.disabled) return;

      currentUser = await fetchCurrentUser();

      if (!currentUser || !currentUser.isLoggedIn) {
        window.location.href = "login.html";
        return;
      }

      try {
        const res = await fetch("/api/contact-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.productId,
          }),
        });

        if (res.status === 401) {
          window.location.href = "login.html";
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to create contact request.");
        }

        contactAgentBtn.classList.add("sent");
        contactAgentBtn.textContent = "Contact request sent";
        contactAgentBtn.disabled = true;
        showToast("Contact request sent");
      } catch (err) {
        console.error(err);
        alert("Could not send contact request.");
      }
    }
    };

    const hasMapLink = product.mapLink && String(product.mapLink).trim() !== "";
    const mapSection =
      popupMapFrame.closest(".popup-section") || popupMapFrame.parentElement;

    if (hasMapLink) {
      popupMapLink.href = product.mapLink;
      popupMapLink.classList.remove("hidden");

      popupMapFrame.src = product.mapLink;
      popupMapFrame.classList.remove("hidden");

      if (mapSection) {
        mapSection.classList.remove("hidden");
      }
    } else {
      popupMapLink.removeAttribute("href");
      popupMapLink.classList.add("hidden");

      popupMapFrame.src = "";
      popupMapFrame.classList.add("hidden");

      if (mapSection) {
        mapSection.classList.add("hidden");
      }
    }

    setMainModalImage(images[0]);
    renderModalThumbnails(images);

    modal.classList.remove("hidden");
    pageContent.classList.add("blurred");
    document.body.style.overflow = "hidden";
  } catch (error) {
    console.error(error);
    alert("Could not load property details.");
  }
}

function setMainModalImage(src) {
  modalMainImage.src = src || getFallbackImage();
  modalMainImage.onerror = function () {
    this.src = getFallbackImage();
  };
}

function renderModalThumbnails(images) {
  if (!Array.isArray(images) || images.length <= 1) {
    modalThumbnails.innerHTML = "";
    modalThumbnails.classList.add("hidden");
    return;
  }

  modalThumbnails.classList.remove("hidden");

  modalThumbnails.innerHTML = images
    .map((image, index) => {
      const safeImage =
        image && String(image).trim() !== "" ? image : getFallbackImage();

      return `
      <button class="modal-thumb ${index === 0 ? "active" : ""}" type="button" onclick="selectModalImage('${escapeJs(safeImage)}', this)">
        <img src="${safeImage}" alt="Property thumbnail ${index + 1}" onerror="this.src='${getFallbackImage()}'">
      </button>
    `;
    })
    .join("");
}

function selectModalImage(src, element) {
  setMainModalImage(src);

  document.querySelectorAll(".modal-thumb").forEach((btn) => {
    btn.classList.remove("active");
  });

  element.classList.add("active");
}

function closeModal() {
  modal.classList.add("hidden");
  pageContent.classList.remove("blurred");
  document.body.style.overflow = "";
  modalMainImage.src = getFallbackImage();
  modalThumbnails.innerHTML = "";
  modalThumbnails.classList.add("hidden");
  popupMapFrame.src = "";
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeJs(text) {
  return String(text)
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
    .replaceAll('"', '\\"');
}

searchInput.addEventListener("input", applyFilters);
searchBtn.addEventListener("click", applyFilters);
applyFiltersBtn.addEventListener("click", applyFilters);
clearFiltersBtn.addEventListener("click", clearFilters);

sortToggleBtn.addEventListener("click", () => {
  filterPanel.classList.toggle("hidden");
});

modal.addEventListener("click", function (event) {
  if (event.target === modal) {
    closeModal();
  }
});

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && !modal.classList.contains("hidden")) {
    closeModal();
  }
});

loadProducts();
