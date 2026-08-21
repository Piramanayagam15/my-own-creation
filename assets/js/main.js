// Shared interactions, Levitating Touch Animations & Dynamic Gallery Media Uploads for AK Bridals

// ========================================================
// IndexedDB Media Storage for User Uploaded Photos & Videos
// ========================================================
const GalleryDB = {
  dbName: "AKBridalsGalleryDB",
  storeName: "ak_media_store",
  dbVersion: 3,

  open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAll() {
    try {
      const db = await this.open();
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch (e) {
      console.warn("IndexedDB unavailable, fallback to memory", e);
      return [];
    }
  },

  async save(item) {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        const req = store.put(item);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error("Failed to save to IndexedDB", e);
    }
  },

  async add(item) {
    return this.save(item);
  },

  async delete(id) {
    try {
      const db = await this.open();
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch (e) {
      console.error("Failed to delete from IndexedDB", e);
      return false;
    }
  },
};

// Client-side lightweight image compression for Mobile Android Devices
const compressImage = (dataUrl, maxWidth = 1600, quality = 0.85) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

document.addEventListener("DOMContentLoaded", async () => {
  // ========================================================
  // Header Navigation & Mobile Menu
  // ========================================================
  const nav = document.getElementById("mainNav");
  const navToggle = document.getElementById("navToggle");
  const yearSpan = document.getElementById("year");

  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear().toString();
  }

  if (nav && navToggle) {
    const toggleNav = (e) => {
      e.stopPropagation();
      const isOpen = nav.classList.toggle("open");
      navToggle.classList.toggle("open", isOpen);
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    };

    navToggle.addEventListener("click", toggleNav);

    // Close mobile nav when clicking on any link inside the navigation
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        navToggle.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });

    // Close when tapping outside the navigation menu
    document.addEventListener("click", (e) => {
      if (!nav.contains(e.target) && !navToggle.contains(e.target)) {
        nav.classList.remove("open");
        navToggle.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // ========================================================
  // 3D Parallax for Levitating Bridal Products (Home Page)
  // ========================================================
  const heroSection = document.getElementById("heroSection");
  const floatingStage = document.getElementById("floatingStage");

  if (heroSection && floatingStage) {
    const floatingWrappers = floatingStage.querySelectorAll(".floating-item-wrapper[data-depth]");
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    heroSection.addEventListener("mousemove", (e) => {
      const rect = heroSection.getBoundingClientRect();
      targetX = e.clientX - rect.left - rect.width / 2;
      targetY = e.clientY - rect.top - rect.height / 2;
    });

    heroSection.addEventListener("mouseleave", () => {
      targetX = 0;
      targetY = 0;
    });

    heroSection.addEventListener(
      "touchmove",
      (e) => {
        if (e.touches.length > 0) {
          const touch = e.touches[0];
          const rect = heroSection.getBoundingClientRect();
          targetX = (touch.clientX - rect.left - rect.width / 2) * 1.2;
          targetY = (touch.clientY - rect.top - rect.height / 2) * 1.2;
        }
      },
      { passive: true }
    );

    heroSection.addEventListener("touchend", () => {
      targetX = 0;
      targetY = 0;
    });

    const animateParallax = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      floatingWrappers.forEach((wrapper) => {
        const depth = parseFloat(wrapper.getAttribute("data-depth")) || 0.05;
        const moveX = (currentX * depth).toFixed(2);
        const moveY = (currentY * depth).toFixed(2);
        wrapper.style.transform = `translate3d(${moveX}px, ${moveY}px, 0px)`;
      });

      requestAnimationFrame(animateParallax);
    };

    requestAnimationFrame(animateParallax);
  }

  // ========================================================
  // Interactive Home Page Product Modal & Touch Burst
  // ========================================================
  const serviceData = {
    "bridal-makeup": {
      title: "HD & Airbrush Bridal Makeup",
      icon: "💄",
      tag: "Signature Service",
      desc: "HD, airbrush, and traditional bridal makeup tailored to your skin tone, outfit, and event lighting for a long-lasting, camera-ready glow.",
      features: [
        "✨ 24hr Waterproof & Sweat-proof Glow",
        "🌿 Skin-Prep for a Smooth Radiant Finish",
        "📸 Flawless HD & Studio Camera Finish",
        "🕊️ On-Location Wedding & Reception Services",
      ],
      targetCard: "card-bridal-makeup",
    },
    mehndi: {
      title: "Organic Herbal Bridal Mehndi",
      icon: "🌿",
      tag: "Art & Tradition",
      desc: "Intricate bridal and guest henna designs with deep natural maroon stains, traditional motifs, and modern stylish patterns.",
      features: [
        "🌿 100% Chemical-Free Organic Henna",
        "✨ Deep, Long-Lasting Natural Maroon Stain",
        "🎨 Custom Motifs, Portraits & Figures",
        "👥 Family & Guest Mehndi Packages",
      ],
      targetCard: "card-mehndi",
    },
    "aari-embroidery": {
      title: "Aari & Zardozi Silk Embroidery",
      icon: "🪡",
      tag: "Handcrafted Luxury",
      desc: "Elevate your bridal blouses and lehengas with rich hand-embroidered aari, cutwork, stone, and gold zari detailing.",
      features: [
        "🧵 Custom Silk & Gold Zari Handwork",
        "💎 Kundan, Bead & Stone Embellishments",
        "👗 Coordinated to Match Bridal Jewellery",
        "📐 Precision Tailored Fit & Styling",
      ],
      targetCard: "card-aari-embroidery",
    },
    "blouse-designing": {
      title: "Royal Jewels & Blouse Designing",
      icon: "💎",
      tag: "Couture Styling",
      desc: "Custom blouse patterns and jewellery coordination to complete your bridal silhouette with unmatched elegance.",
      features: [
        "👑 Royal Kundan & Antique Jewellery Matching",
        "✂️ Flawless Fit, Comfort & Neck Detailing",
        "🥻 Saree & Lehenga Coordination",
        "✨ Exclusive Designer Finish",
      ],
      targetCard: "card-blouse-designing",
    },
  };

  const productModal = document.getElementById("productModal");
  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalIcon = document.getElementById("modalIcon");
  const modalTag = document.getElementById("modalTag");
  const modalTitle = document.getElementById("modalTitle");
  const modalDesc = document.getElementById("modalDesc");
  const modalFeatures = document.getElementById("modalFeatures");
  const modalExploreBtn = document.getElementById("modalExploreBtn");

  const triggerTouchBurst = (x, y) => {
    const burst = document.createElement("div");
    burst.className = "touch-burst";
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;
    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), 600);
  };

  const openProductModal = (serviceKey) => {
    const data = serviceData[serviceKey];
    if (!data || !productModal) return;

    if (modalIcon) modalIcon.textContent = data.icon;
    if (modalTag) modalTag.textContent = data.tag;
    if (modalTitle) modalTitle.textContent = data.title;
    if (modalDesc) modalDesc.textContent = data.desc;

    if (modalFeatures) {
      modalFeatures.innerHTML = data.features.map((f) => `<span>${f}</span>`).join("");
    }

    if (modalExploreBtn) {
      modalExploreBtn.onclick = (e) => {
        e.preventDefault();
        closeModal();
        const targetEl = document.getElementById(data.targetCard);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
          targetEl.classList.add("highlight-pulse");
          setTimeout(() => targetEl.classList.remove("highlight-pulse"), 2500);
        } else {
          window.location.href = `services.html#${serviceKey}`;
        }
      };
    }

    productModal.classList.add("show");
    productModal.setAttribute("aria-hidden", "false");
  };

  const closeModal = () => {
    if (productModal) {
      productModal.classList.remove("show");
      productModal.setAttribute("aria-hidden", "true");
    }
  };

  if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);
  if (modalBackdrop) modalBackdrop.addEventListener("click", closeModal);

  const floatingItems = document.querySelectorAll(".floating-item-wrapper[data-service]");
  floatingItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      const x = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : window.innerWidth / 2);
      const y = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : window.innerHeight / 2);
      triggerTouchBurst(x, y);
      const serviceKey = item.getAttribute("data-service");
      if (serviceKey) openProductModal(serviceKey);
    });
  });

  const serviceCards = document.querySelectorAll(".card-hover-float");
  serviceCards.forEach((card) => {
    card.addEventListener("click", (e) => {
      const cardId = card.id;
      const serviceKey = cardId ? cardId.replace("card-", "") : "";
      if (serviceData[serviceKey]) {
        triggerTouchBurst(e.clientX, e.clientY);
        openProductModal(serviceKey);
      }
    });
  });

  // ========================================================
  // DYNAMIC GALLERY WITH USER PHOTO/VIDEO UPLOADS & 2-LINE EVENT DETAILS
  // ========================================================
  const galleryGrid = document.getElementById("galleryGrid");
  const galleryFilterTabs = document.getElementById("galleryFilterTabs");
  const galleryEmptyState = document.getElementById("galleryEmptyState");

  const openUploadModalBtn = document.getElementById("openUploadModalBtn");
  const mobileUploadFab = document.getElementById("mobileUploadFab");
  const uploadModal = document.getElementById("uploadModal");
  const uploadModalBackdrop = document.getElementById("uploadModalBackdrop");
  const closeUploadModalBtn = document.getElementById("closeUploadModalBtn");

  const galleryUploadForm = document.getElementById("galleryUploadForm");
  const typeImageOption = document.getElementById("typeImageOption");
  const typeVideoOption = document.getElementById("typeVideoOption");
  const btnCapturePhoto = document.getElementById("btnCapturePhoto");
  const btnCaptureVideo = document.getElementById("btnCaptureVideo");
  const cameraPhotoInput = document.getElementById("cameraPhotoInput");
  const cameraVideoInput = document.getElementById("cameraVideoInput");
  const mediaFileInput = document.getElementById("mediaFileInput");
  const fileDropZone = document.getElementById("fileDropZone");
  const dropZoneContent = document.getElementById("dropZoneContent");
  const mediaPreviewBox = document.getElementById("mediaPreviewBox");
  const imagePreviewEl = document.getElementById("imagePreviewEl");
  const videoPreviewEl = document.getElementById("videoPreviewEl");
  const removePreviewBtn = document.getElementById("removePreviewBtn");
  const mediaUrlInput = document.getElementById("mediaUrlInput");
  const mediaTitleInput = document.getElementById("mediaTitleInput");
  const mediaDescInput = document.getElementById("mediaDescInput");
  const mediaCategorySelect = document.getElementById("mediaCategorySelect");
  const uploadStatusMsg = document.getElementById("uploadStatusMsg");
  const activeCategoryPill = document.getElementById("activeCategoryPill");
  const categoryCountBadge = document.getElementById("categoryCountBadge");
  const uploadBtnText = document.getElementById("uploadBtnText");
  const modalServiceIcon = document.getElementById("modalServiceIcon");
  const modalServiceTitle = document.getElementById("modalServiceTitle");
  const modalServiceSubtitle = document.getElementById("modalServiceSubtitle");
  const modalCategoryPillGrid = document.getElementById("modalCategoryPillGrid");
  const multiPreviewContainer = document.getElementById("multiPreviewContainer");
  const previewCountBadge = document.getElementById("previewCountBadge");
  const emptyStateUploadBtn = document.getElementById("emptyStateUploadBtn");

  let currentMediaType = "image";
  let currentFilesBase64 = []; // Supports single and multiple image uploads
  let activeFilter = "all";

  // Category Names & Icons Map
  const categoryLabels = {
    "bridal-makeup": "Bridal Makeup",
    reception: "Reception Glam",
    mehndi: "Mehndi (Henna)",
    aari: "Aari Embroidery",
    hair: "Hair & Draping",
    "before-after": "Before & After",
    video: "Video Highlight",
  };

  const categoryIcons = {
    "bridal-makeup": "💄",
    reception: "✨",
    mehndi: "🌿",
    aari: "🪡",
    hair: "💇‍♀️",
    "before-after": "🌟",
    video: "🎥",
  };

  const defaultGalleryMedia = [];

  // Render all gallery media (Loads dynamically from Server API and Admin LocalStorage)
  const renderGallery = async () => {
    if (!galleryGrid) return;

    // Check URL parameters on first load (e.g. gallery.html?category=mehndi)
    const urlParams = new URLSearchParams(window.location.search);
    let urlCat = urlParams.get("category") || urlParams.get("filter");
    if (urlCat) {
      urlCat = urlCat.toLowerCase().trim();
      if (urlCat === "aari-work" || urlCat === "aariwork") urlCat = "aari";
      if (urlCat === "hair-styling" || urlCat === "hairstyling" || urlCat === "hair-draping") urlCat = "hair";
      if (urlCat === "videos" || urlCat === "reels" || urlCat === "reel") urlCat = "video";
      if (urlCat === "before-after" || urlCat === "beforeafter") urlCat = "before-after";

      activeFilter = urlCat;
      if (galleryFilterTabs) {
        galleryFilterTabs.querySelectorAll(".filter-btn").forEach((b) => {
          if (b.getAttribute("data-filter") === urlCat) {
            b.classList.add("active");
          } else {
            b.classList.remove("active");
          }
        });
      }
    }

    let deletedIds = [];
    try {
      deletedIds = JSON.parse(localStorage.getItem("ak_deleted_gallery_ids") || "[]");
    } catch (e) {}

    let apiItems = [];
    try {
      const res = await fetch("/api/gallery");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          apiItems = data.data;
        }
      }
    } catch (e) {}

    let localItems = [];
    try {
      const stored = localStorage.getItem("ak_offline_gallery");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) localItems = parsed;
      }
    } catch (e) {}

    let idbMedia = [];
    try {
      idbMedia = await GalleryDB.getAll();
    } catch (e) {}

    const gMap = new Map();
    apiItems.forEach(item => {
      if (!deletedIds.includes(String(item.id))) gMap.set(String(item.id), item);
    });
    localItems.forEach(item => {
      if (!deletedIds.includes(String(item.id))) {
        const existing = gMap.get(String(item.id));
        gMap.set(String(item.id), existing ? { ...existing, ...item } : item);
      }
    });
    idbMedia.forEach(item => {
      if (!deletedIds.includes(String(item.id))) {
        const existing = gMap.get(String(item.id));
        gMap.set(String(item.id), existing ? { ...existing, ...item } : item);
      }
    });

    const mediaList = Array.from(gMap.values()).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    try {
      localStorage.setItem("ak_offline_gallery", JSON.stringify(mediaList));
    } catch (e) {}

    // Filter items based on activeFilter
    const filteredItems = mediaList.filter((item) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "video") return item.type === "video" || item.category === "video";
      return item.category === activeFilter;
    });

    // Update Category Quick Bar Pill & Count
    if (activeCategoryPill) {
      if (activeFilter === "all") {
        activeCategoryPill.innerHTML = "✨ All Media Showcase";
      } else {
        activeCategoryPill.innerHTML = `${categoryIcons[activeFilter] || "✨"} ${categoryLabels[activeFilter]} Gallery`;
      }
    }

    if (categoryCountBadge) {
      categoryCountBadge.textContent = `${filteredItems.length} Item${filteredItems.length === 1 ? "" : "s"}`;
    }

    galleryGrid.innerHTML = "";

    if (filteredItems.length === 0) {
      if (galleryEmptyState) galleryEmptyState.style.display = "block";
    } else {
      if (galleryEmptyState) galleryEmptyState.style.display = "none";

      filteredItems.forEach((item) => {
        const figure = document.createElement("figure");
        figure.className = "gallery-item reveal-on-scroll revealed";
        const isVideo = item.type === "video";
        const thumbSrc = item.thumbnail || (item.src && !isVideo ? item.src : "");
        const hasThumb = Boolean(thumbSrc && thumbSrc.trim().length > 0);
        const bgStyle = hasThumb ? `background-image: url('${thumbSrc}');` : "";

        figure.setAttribute("data-category", item.category);
        figure.setAttribute("data-type", item.type);
        figure.setAttribute("data-src", item.src);
        figure.setAttribute("data-embed", item.embedUrl || "");
        figure.setAttribute("data-title", item.title);
        figure.setAttribute("data-desc", item.desc || "");
        figure.setAttribute("data-id", item.id);

        figure.innerHTML = `
          <div class="gallery-thumb ${!hasThumb ? "placeholder-img" : ""}" style="${bgStyle}">
            <span class="media-type-badge">${isVideo ? "🎥 Video" : "📸 Photo"}</span>
            ${isVideo ? `<div class="video-play-overlay"><span class="play-circle">▶</span></div>` : ""}
          </div>
          <figcaption>
            <h4>${item.title}</h4>
            <span>${categoryLabels[item.category] || "Bridal Artistry"}</span>
            <p class="gallery-event-desc">${item.desc || "Custom bridal styling crafted by AK Bridals."}</p>
          </figcaption>
        `;

        galleryGrid.appendChild(figure);
      });
    }
  };

  // Filter Tabs Event Listeners
  if (galleryFilterTabs) {
    galleryFilterTabs.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;

      galleryFilterTabs.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      activeFilter = btn.getAttribute("data-filter") || "all";
      renderGallery();
    });
  }

  // Modal Category Pill Buttons (Instant Category Switching inside modal)
  if (modalCategoryPillGrid) {
    modalCategoryPillGrid.addEventListener("click", (e) => {
      const pillBtn = e.target.closest(".category-pill-btn");
      if (!pillBtn) return;
      const cat = pillBtn.getAttribute("data-cat");
      if (cat) {
        setTargetCategory(cat);
      }
    });
  }

  // Upload Modal Open & Close Handlers (Mobile Bottom-Sheet)
  const openUploadModal = () => {
    if (uploadModal) {
      if (activeFilter !== "all" && mediaCategorySelect) {
        setTargetCategory(activeFilter);
      }
      uploadModal.classList.add("show");
      uploadModal.setAttribute("aria-hidden", "false");
      if (uploadStatusMsg) uploadStatusMsg.textContent = "";
      document.body.style.overflow = "hidden"; // Prevent background scroll on Android
    }
  };

  const closeUploadModal = () => {
    if (uploadModal) {
      uploadModal.classList.remove("show");
      uploadModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      resetPreview();
      if (galleryUploadForm) galleryUploadForm.reset();
      if (uploadStatusMsg) uploadStatusMsg.textContent = "";
    }
  };

  const modalCancelBtn = document.getElementById("modalCancelBtn");
  if (modalCancelBtn) modalCancelBtn.addEventListener("click", closeUploadModal);
  if (openUploadModalBtn) openUploadModalBtn.addEventListener("click", openUploadModal);
  if (emptyStateUploadBtn) emptyStateUploadBtn.addEventListener("click", openUploadModal);
  if (mobileUploadFab) mobileUploadFab.addEventListener("click", openUploadModal);
  if (closeUploadModalBtn) closeUploadModalBtn.addEventListener("click", closeUploadModal);
  if (uploadModalBackdrop) uploadModalBackdrop.addEventListener("click", closeUploadModal);

  // Android Mobile Quick Action Button Triggers
  if (btnCapturePhoto) {
    btnCapturePhoto.addEventListener("click", () => {
      currentMediaType = "image";
      typeImageOption?.classList.add("active");
      typeVideoOption?.classList.remove("active");
      if (cameraPhotoInput) cameraPhotoInput.click();
      else if (mediaFileInput) {
        mediaFileInput.accept = "image/*";
        mediaFileInput.click();
      }
    });
  }

  if (btnCaptureVideo) {
    btnCaptureVideo.addEventListener("click", () => {
      currentMediaType = "video";
      typeVideoOption?.classList.add("active");
      typeImageOption?.classList.remove("active");
      setTargetCategory("video");
      if (cameraVideoInput) cameraVideoInput.click();
      else if (mediaFileInput) {
        mediaFileInput.accept = "video/*";
        mediaFileInput.click();
      }
    });
  }

  // Toggle Media Type (Photo / Video)
  if (typeImageOption && typeVideoOption) {
    typeImageOption.addEventListener("click", () => {
      currentMediaType = "image";
      typeImageOption.classList.add("active");
      typeVideoOption.classList.remove("active");
      if (mediaFileInput) mediaFileInput.accept = "image/*";
      resetPreview();
    });

    typeVideoOption.addEventListener("click", () => {
      currentMediaType = "video";
      typeVideoOption.classList.add("active");
      typeImageOption.classList.remove("active");
      if (mediaFileInput) mediaFileInput.accept = "video/*";
      setTargetCategory("video");
      resetPreview();
    });
  }

  // Reset File Preview
  const resetPreview = () => {
    currentFilesBase64 = [];
    if (mediaFileInput) mediaFileInput.value = "";
    if (cameraPhotoInput) cameraPhotoInput.value = "";
    if (cameraVideoInput) cameraVideoInput.value = "";
    if (mediaPreviewBox) mediaPreviewBox.style.display = "none";
    if (dropZoneContent) dropZoneContent.style.display = "block";
    if (multiPreviewContainer) multiPreviewContainer.innerHTML = "";
    if (previewCountBadge) previewCountBadge.textContent = "";
    if (imagePreviewEl) {
      imagePreviewEl.src = "";
      imagePreviewEl.style.display = "none";
    }
    if (videoPreviewEl) {
      videoPreviewEl.src = "";
      videoPreviewEl.style.display = "none";
    }
  };

  if (removePreviewBtn) {
    removePreviewBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      resetPreview();
    });
  }

  // Multiple File Selection & Compression Handling
  const handleFilesSelect = async (filesList) => {
    if (!filesList || filesList.length === 0) return;

    const files = Array.from(filesList);
    const hasVideo = files.some((f) => f.type.startsWith("video/"));

    if (hasVideo) {
      currentMediaType = "video";
      typeVideoOption?.classList.add("active");
      typeImageOption?.classList.remove("active");
      setTargetCategory("video");
    } else {
      currentMediaType = "image";
      typeImageOption?.classList.add("active");
      typeVideoOption?.classList.remove("active");
    }

    if (uploadStatusMsg) {
      uploadStatusMsg.textContent = `Processing ${files.length} file(s)...`;
      uploadStatusMsg.className = "upload-status-msg";
    }

    currentFilesBase64 = [];
    if (multiPreviewContainer) multiPreviewContainer.innerHTML = "";

    for (const file of files) {
      const isImg = file.type.startsWith("image/");
      const isVid = file.type.startsWith("video/");

      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          if (isImg) {
            const compressed = await compressImage(e.target.result, 1600, 0.85);
            resolve(compressed);
          } else {
            resolve(e.target.result);
          }
        };
        reader.readAsDataURL(file);
      });

      currentFilesBase64.push({
        base64: base64,
        type: isVid ? "video" : "image",
        name: file.name
      });
    }

    if (uploadStatusMsg) uploadStatusMsg.textContent = "";

    if (dropZoneContent) dropZoneContent.style.display = "none";
    if (mediaPreviewBox) mediaPreviewBox.style.display = "block";

    if (currentFilesBase64.length === 1 && currentFilesBase64[0].type === "video") {
      if (videoPreviewEl) {
        videoPreviewEl.src = currentFilesBase64[0].base64;
        videoPreviewEl.style.display = "block";
      }
      if (imagePreviewEl) imagePreviewEl.style.display = "none";
    } else {
      if (videoPreviewEl) videoPreviewEl.style.display = "none";
      if (imagePreviewEl) imagePreviewEl.style.display = "none";

      if (multiPreviewContainer) {
        multiPreviewContainer.innerHTML = currentFilesBase64.map((item) => `
          <img src="${item.base64}" class="multi-preview-thumb" alt="Preview">
        `).join("");
      }
    }

    if (previewCountBadge) {
      previewCountBadge.textContent = `${currentFilesBase64.length} photo${currentFilesBase64.length === 1 ? "" : "s"} ready to add`;
    }
  };

  [mediaFileInput, cameraPhotoInput, cameraVideoInput].forEach((input) => {
    if (input) {
      input.addEventListener("change", (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleFilesSelect(e.target.files);
        }
      });
    }
  });

  if (fileDropZone) {
    fileDropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      fileDropZone.classList.add("dragover");
    });
    fileDropZone.addEventListener("dragleave", () => {
      fileDropZone.classList.remove("dragover");
    });
    fileDropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      fileDropZone.classList.remove("dragover");
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFilesSelect(e.dataTransfer.files);
      }
    });
  }

  // Upload Form Submission with Multi-Photo support into Selected Service
  if (galleryUploadForm) {
    galleryUploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const baseTitle = mediaTitleInput?.value.trim() || "Bridal Showcase Look";
      const desc = mediaDescInput?.value.trim() || "Exclusive bridal styling and customized artistry by AK Bridals.";
      const category = mediaCategorySelect?.value || "bridal-makeup";
      const urlSrc = mediaUrlInput?.value.trim() || "";

      if (currentFilesBase64.length === 0 && !urlSrc) {
        if (uploadStatusMsg) {
          uploadStatusMsg.textContent = "Please select at least one photo/video or enter a URL.";
          uploadStatusMsg.className = "upload-status-msg error";
        }
        return;
      }

      const submitBtn = document.getElementById("uploadSubmitBtn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving to Service...";
      }

      try {
        if (currentFilesBase64.length > 0) {
          for (let i = 0; i < currentFilesBase64.length; i++) {
            const item = currentFilesBase64[i];
            const title = currentFilesBase64.length > 1 ? `${baseTitle} (${i + 1})` : baseTitle;
            
            const newMediaItem = {
              id: "media_" + Date.now() + "_" + i + "_" + Math.random().toString(36).substr(2, 5),
              type: item.type,
              src: item.base64,
              title: title,
              desc: desc,
              category: category,
              createdAt: new Date().toISOString(),
              isDefault: false,
            };
            await GalleryDB.add(newMediaItem);
          }
        } else if (urlSrc) {
          const newMediaItem = {
            id: "media_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
            type: currentMediaType,
            src: urlSrc,
            title: baseTitle,
            desc: desc,
            category: category,
            createdAt: new Date().toISOString(),
            isDefault: false,
          };
          await GalleryDB.add(newMediaItem);
        }

        if (uploadStatusMsg) {
          uploadStatusMsg.textContent = `🎉 Added successfully to ${categoryLabels[category]}!`;
          uploadStatusMsg.className = "upload-status-msg success";
        }

        setTimeout(() => {
          closeUploadModal();
          galleryUploadForm.reset();
          resetPreview();
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = `✨ Add Photos to Service`;
          }
          // Automatically switch filter to the category just added to so user sees them immediately!
          activeFilter = category;
          if (galleryFilterTabs) {
            galleryFilterTabs.querySelectorAll(".filter-btn").forEach((b) => {
              if (b.getAttribute("data-filter") === category) b.classList.add("active");
              else b.classList.remove("active");
            });
          }
          renderGallery();
        }, 700);
      } catch (err) {
        console.error("Save error:", err);
        if (uploadStatusMsg) {
          uploadStatusMsg.textContent = "Could not save media. Please try again.";
          uploadStatusMsg.className = "upload-status-msg error";
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = `✨ Add Photos to Service`;
        }
      }
    });
  }

  // Delete Media Click Handler
  if (galleryGrid) {
    galleryGrid.addEventListener("click", async (e) => {
      const deleteBtn = e.target.closest(".delete-media-btn");
      if (deleteBtn) {
        e.stopPropagation();
        const deleteId = deleteBtn.getAttribute("data-delete-id");
        if (deleteId && confirm("Are you sure you want to delete this media from your gallery?")) {
          await GalleryDB.delete(deleteId);
          renderGallery();
        }
      }
    });
  }

  // Initial Gallery Render
  if (galleryGrid) {
    await renderGallery();
  }

  // ========================================================
  // Enhanced Lightbox (Photos & Video Playback with 2-Line Event Details)
  // ========================================================
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxVideo = document.getElementById("lightboxVideo");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxCategoryTag = document.getElementById("lightboxCategoryTag");
  const lightboxDesc = document.getElementById("lightboxDesc");
  const lightboxBackdrop = document.getElementById("lightboxBackdrop");
  const lightboxClose = document.getElementById("lightboxClose");
  const lightboxDeleteBtn = document.getElementById("lightboxDeleteBtn");

  let currentLightboxItemId = null;

  if (galleryGrid && lightbox) {
    galleryGrid.addEventListener("click", (e) => {
      const figure = e.target.closest(".gallery-item");
      if (!figure || e.target.closest(".delete-media-btn")) return;

      currentLightboxItemId = figure.getAttribute("data-id") || null;
      const type = figure.getAttribute("data-type") || "image";
      const src = figure.getAttribute("data-src") || "";
      const title = figure.getAttribute("data-title") || figure.querySelector("figcaption h4")?.textContent || "";
      const category = figure.getAttribute("data-category") || "";
      const desc = figure.getAttribute("data-desc") || figure.querySelector(".gallery-event-desc")?.textContent || "";

      if (lightboxCaption) lightboxCaption.textContent = title;
      if (lightboxCategoryTag) lightboxCategoryTag.textContent = categoryLabels[category] || "Showcase";
      if (lightboxDesc) {
        lightboxDesc.textContent = desc;
        lightboxDesc.style.display = desc ? "block" : "none";
      }

      const lightboxIframe = document.getElementById("lightboxIframe");
      const embedUrl = figure.getAttribute("data-embed") || "";

      if (type === "video") {
        if (lightboxImg) lightboxImg.style.display = "none";
        
        const isEmbedLink = Boolean(embedUrl || (src && (src.includes("youtube.com") || src.includes("youtu.be") || src.includes("vimeo.com"))));
        
        if (isEmbedLink) {
          const finalEmbed = embedUrl || src;
          if (lightboxVideo) {
            lightboxVideo.pause();
            lightboxVideo.style.display = "none";
            lightboxVideo.src = "";
          }
          if (lightboxIframe) {
            lightboxIframe.style.display = "block";
            lightboxIframe.src = finalEmbed;
          }
        } else {
          if (lightboxIframe) {
            lightboxIframe.style.display = "none";
            lightboxIframe.src = "";
          }
          if (lightboxVideo) {
            lightboxVideo.style.display = "block";
            lightboxVideo.src = src;
            lightboxVideo.play().catch(() => {});
          }
        }
      } else {
        if (lightboxIframe) {
          lightboxIframe.style.display = "none";
          lightboxIframe.src = "";
        }
        if (lightboxVideo) {
          lightboxVideo.pause();
          lightboxVideo.src = "";
          lightboxVideo.style.display = "none";
        }
        if (lightboxImg) {
          lightboxImg.style.display = "block";
          if (src) {
            lightboxImg.style.backgroundImage = `url('${src}')`;
            lightboxImg.classList.remove("placeholder-img");
          } else {
            lightboxImg.style.removeProperty("background-image");
            lightboxImg.classList.add("placeholder-img");
          }
        }
      }

      lightbox.classList.add("show");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    });
  }

  const closeLightbox = () => {
    if (lightbox) {
      lightbox.classList.remove("show");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lightboxVideo) {
        lightboxVideo.pause();
        lightboxVideo.src = "";
      }
      const lightboxIframe = document.getElementById("lightboxIframe");
      if (lightboxIframe) {
        lightboxIframe.src = "";
        lightboxIframe.style.display = "none";
      }
    }
  };

  if (lightboxBackdrop) lightboxBackdrop.addEventListener("click", closeLightbox);
  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLightbox();
      closeModal();
      closeUploadModal();
    }
  });

  // ========================================================
  // Scroll Reveal Animations
  // ========================================================
  const revealElements = document.querySelectorAll(".reveal-on-scroll");
  if ("IntersectionObserver" in window && revealElements.length > 0) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -30px 0px",
      }
    );

    revealElements.forEach((el) => revealObserver.observe(el));
  } else {
    revealElements.forEach((el) => el.classList.add("revealed"));
  }

  // ========================================================
  // Contact & Bridal Booking Form with Live Date Availability Check
  // ========================================================
  const contactForm = document.getElementById("contactForm");
  const formStatus = document.getElementById("formStatus");
  const whatsappBtn = document.getElementById("whatsappBtn");
  const dateInput = document.getElementById("date");
  const dateAvailabilityBadge = document.getElementById("dateAvailabilityBadge");
  const dateAvailabilityStatus = document.getElementById("dateAvailabilityStatus");

  // Booking Confirmation Modal elements
  const bookingSuccessModal = document.getElementById("bookingSuccessModal");
  const bookingSuccessBackdrop = document.getElementById("bookingSuccessBackdrop");
  const closeBookingSuccessBtn = document.getElementById("closeBookingSuccessBtn");
  const dismissBookingSuccessBtn = document.getElementById("dismissBookingSuccessBtn");
  const sendConfirmWhatsAppBtn = document.getElementById("sendConfirmWhatsAppBtn");
  const confirmBookingId = document.getElementById("confirmBookingId");
  const confirmCustomerName = document.getElementById("confirmCustomerName");
  const confirmEventDate = document.getElementById("confirmEventDate");
  const confirmService = document.getElementById("confirmService");

  let lastBookingData = null;

  // Set min date to today on date input
  if (dateInput) {
    const todayStr = new Date().toISOString().split("T")[0];
    dateInput.min = todayStr;

    // Real-time Date Availability Checker (Server API + Resilient LocalStorage Sync)
    const checkAvailability = async (selectedDate) => {
      if (!selectedDate) {
        if (dateAvailabilityBadge) dateAvailabilityBadge.style.display = "none";
        if (dateAvailabilityStatus) dateAvailabilityStatus.style.display = "none";
        return;
      }

      let isBooked = false;
      let serviceName = "Bridal Service";

      // 1. Check Server API
      try {
        const response = await fetch(`/api/check-availability?date=${encodeURIComponent(selectedDate)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.isBooked) {
            isBooked = true;
            if (data.service) serviceName = data.service;
          }
        }
      } catch (err) {}

      // 2. Check Local Blocked Dates & Confirmed Bookings (offline-resilient fallback)
      if (!isBooked) {
        try {
          const storedBlocked = JSON.parse(localStorage.getItem("ak_offline_blocked_dates") || "[]");
          const unblockedDates = JSON.parse(localStorage.getItem("ak_unblocked_dates") || "[]");
          if (storedBlocked.includes(selectedDate) && !unblockedDates.includes(selectedDate)) {
            isBooked = true;
          }
          const storedBookings = JSON.parse(localStorage.getItem("ak_offline_bookings") || "[]");
          const matched = storedBookings.find(b => b.status === "confirmed" && b.preferred_date === selectedDate);
          if (matched && !unblockedDates.includes(selectedDate)) {
            isBooked = true;
            if (matched.service) serviceName = matched.service;
          }
        } catch (e) {}
      }

      if (isBooked) {
        if (dateAvailabilityBadge) {
          dateAvailabilityBadge.textContent = "🔴 Date Booked";
          dateAvailabilityBadge.className = "date-availability-badge booked";
          dateAvailabilityBadge.style.display = "inline-flex";
        }
        if (dateAvailabilityStatus) {
          dateAvailabilityStatus.innerHTML = `⚠️ <strong>Note:</strong> This date already has a booking recorded (${serviceName}). You can still submit a booking request or reach us on WhatsApp for emergency slot queries.`;
          dateAvailabilityStatus.className = "date-availability-status booked";
          dateAvailabilityStatus.style.display = "block";
        }
        dateInput.style.borderColor = "#ef4444";
      } else {
        if (dateAvailabilityBadge) {
          dateAvailabilityBadge.textContent = "🟢 Slot Available";
          dateAvailabilityBadge.className = "date-availability-badge available";
          dateAvailabilityBadge.style.display = "inline-flex";
        }
        if (dateAvailabilityStatus) {
          dateAvailabilityStatus.innerHTML = `✅ <strong>Great news!</strong> This date is currently available for your bridal makeover.`;
          dateAvailabilityStatus.className = "date-availability-status available";
          dateAvailabilityStatus.style.display = "block";
        }
        dateInput.style.borderColor = "#10b981";
      }
    };

  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.setAttribute("min", today);
    dateInput.addEventListener("change", (e) => checkAvailability(e.target.value));
    dateInput.addEventListener("input", (e) => checkAvailability(e.target.value));
  }

  // Booking Modal handlers
  const closeBookingModal = () => {
    if (bookingSuccessModal) {
      bookingSuccessModal.classList.remove("show");
      bookingSuccessModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  };

  if (closeBookingSuccessBtn) closeBookingSuccessBtn.addEventListener("click", closeBookingModal);
  if (dismissBookingSuccessBtn) dismissBookingSuccessBtn.addEventListener("click", closeBookingModal);
  if (bookingSuccessBackdrop) bookingSuccessBackdrop.addEventListener("click", closeBookingModal);

  if (sendConfirmWhatsAppBtn) {
    sendConfirmWhatsAppBtn.addEventListener("click", () => {
      if (!lastBookingData) return;
      const { name, phone, email, date, eventType, service, location, message, bookingId } = lastBookingData;
      const textLines = [
        "👑 *AK Bridals - New Booking Request*",
        `📋 *Booking Ref:* ${bookingId}`,
        `👰 *Bride Name:* ${name}`,
        `📞 *Phone / WhatsApp:* ${phone}`,
        email && `✉️ *Email:* ${email}`,
        `📅 *Event Date:* ${date}`,
        eventType && `💍 *Event Type:* ${eventType}`,
        `💄 *Service Requested:* ${service}`,
        location && `📍 *Location / City:* ${location}`,
        message && `💬 *Special Notes:* ${message}`,
        "",
        "Please confirm my bridal appointment slot. Thank you!",
      ].filter(Boolean);

      const text = encodeURIComponent(textLines.join("\n"));
      const phoneNumber = "918190913110";
      const waUrl = `https://wa.me/${phoneNumber}?text=${text}`;
      window.open(waUrl, "_blank");
    });
  }

  if (contactForm && formStatus) {
    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = new FormData(contactForm);
      const name = formData.get("name")?.toString().trim() || "";
      const phone = formData.get("phone")?.toString().trim() || "";
      const email = formData.get("email")?.toString().trim() || "";
      const date = formData.get("date")?.toString().trim() || "";
      const eventType = formData.get("eventType")?.toString().trim() || "Wedding / Muhurtham";
      const service = formData.get("service")?.toString().trim() || "";
      const location = formData.get("location")?.toString().trim() || "";
      const message = formData.get("message")?.toString().trim() || "";

      let hasError = false;

      const setError = (fieldId, msg) => {
        const errorP = contactForm.querySelector(`.field-error[data-error-for="${fieldId}"]`);
        if (errorP) errorP.textContent = msg;
      };

      ["name", "phone", "email", "date", "eventType", "service", "location", "message"].forEach((id) => setError(id, ""));

      const phoneDigits = phone.replace(/[^0-9]/g, "");
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!name) { setError("name", "Please enter your full name."); hasError = true; }
      if (!phone || phoneDigits.length < 10) { setError("phone", "Please enter a valid 10-digit phone number."); hasError = true; }
      if (!email || !emailRegex.test(email)) { setError("email", "Please enter a valid email address."); hasError = true; }
      if (!date) { setError("date", "Please choose your preferred event date."); hasError = true; }
      if (!service) { setError("service", "Please select a service."); hasError = true; }
      if (!location) { setError("location", "Please enter your event city/location."); hasError = true; }
      if (!message || message.length < 3) { setError("message", "Please share details about your event."); hasError = true; }

      if (hasError) {
        formStatus.textContent = "Please fix the highlighted fields and try again.";
        formStatus.classList.remove("success");
        formStatus.classList.add("error");
        return;
      }

      const submitBtn = document.getElementById("bookNowSubmitBtn") || contactForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Processing Booking...";

      fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, date, eventType, service, location, message }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            const bId = data.booking?.booking_ref || `#AKB-${Math.floor(1000 + Math.random() * 9000)}`;
            lastBookingData = { name, phone, email, date, eventType, service, location, message, bookingId: bId };

            if (confirmBookingId) confirmBookingId.textContent = bId;
            if (confirmCustomerName) confirmCustomerName.textContent = name;
            if (confirmEventDate) confirmEventDate.textContent = `${date} (${eventType})`;
            if (confirmService) confirmService.textContent = service;

            if (bookingSuccessModal) {
              bookingSuccessModal.classList.add("show");
              bookingSuccessModal.setAttribute("aria-hidden", "false");
              document.body.style.overflow = "hidden";
            }

            formStatus.textContent = "🎉 Booking placed successfully!";
            formStatus.classList.remove("error");
            formStatus.classList.add("success");
            contactForm.reset();
            if (dateAvailabilityBadge) dateAvailabilityBadge.style.display = "none";
            if (dateAvailabilityStatus) dateAvailabilityStatus.style.display = "none";
            if (dateInput) dateInput.style.removeProperty("border-color");
          } else {
            formStatus.textContent = data.message || "Something went wrong. Please try again or contact us directly on WhatsApp.";
            formStatus.classList.remove("success");
            formStatus.classList.add("error");
          }
        })
        .catch((error) => {
          console.warn("API offline fallback, creating local booking record:", error);

          const fallbackId = Math.floor(1000 + Math.random() * 9000);
          const bId = `#AKB-${fallbackId}`;
          lastBookingData = { name, phone, email, date, eventType, service, location, message, bookingId: bId };

          if (confirmBookingId) confirmBookingId.textContent = bId;
          if (confirmCustomerName) confirmCustomerName.textContent = name;
          if (confirmEventDate) confirmEventDate.textContent = `${date} (${eventType})`;
          if (confirmService) confirmService.textContent = service;

          if (bookingSuccessModal) {
            bookingSuccessModal.classList.add("show");
            bookingSuccessModal.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";
          }

          formStatus.textContent = "🎉 Booking request placed successfully!";
          formStatus.classList.remove("error");
          formStatus.classList.add("success");
          contactForm.reset();
          if (dateAvailabilityBadge) dateAvailabilityBadge.style.display = "none";
          if (dateAvailabilityStatus) dateAvailabilityStatus.style.display = "none";
          if (dateInput) dateInput.style.removeProperty("border-color");
        })
        .finally(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        });
    });
  }

  if (whatsappBtn && contactForm) {
    whatsappBtn.addEventListener("click", () => {
      const formData = new FormData(contactForm);
      const name = formData.get("name")?.toString().trim() || "";
      const phone = formData.get("phone")?.toString().trim() || "";
      const date = formData.get("date")?.toString().trim() || "";
      const eventType = formData.get("eventType")?.toString().trim() || "";
      const service = formData.get("service")?.toString().trim() || "";
      const location = formData.get("location")?.toString().trim() || "";
      const msg = formData.get("message")?.toString().trim() || "";

      const textLines = [
        "👑 *Hello AK Bridals, I would like to enquire:*",
        name && `👰 *Name:* ${name}`,
        phone && `📞 *Phone:* ${phone}`,
        date && `📅 *Preferred Date:* ${date}`,
        eventType && `💍 *Event Type:* ${eventType}`,
        service && `💄 *Service:* ${service}`,
        location && `📍 *Location:* ${location}`,
        msg && `💬 *Details:* ${msg}`,
      ].filter(Boolean);

      const text = encodeURIComponent(textLines.join("\n"));
      const phoneNumber = "918190913110";
      const waUrl = `https://wa.me/${phoneNumber}?text=${text}`;
      window.open(waUrl, "_blank");
    });
  }

  // ========================================================
  // ========================================================
  // CUSTOMER RATINGS & BRIDE REVIEWS MODULE (BULLETPROOF ACCESS & REAL-TIME RATINGS)
  // ========================================================
  const reviewsGrid = document.getElementById("reviewsGrid");
  const openReviewModalBtn = document.getElementById("openReviewModalBtn");
  const reviewModal = document.getElementById("reviewModal");
  const reviewModalBackdrop = document.getElementById("reviewModalBackdrop");
  const closeReviewModalBtn = document.getElementById("closeReviewModalBtn");
  const cancelReviewModalBtn = document.getElementById("cancelReviewModalBtn");
  const reviewSubmitForm = document.getElementById("reviewSubmitForm");
  const starRatingSelector = document.getElementById("starRatingSelector");
  const reviewRatingInput = document.getElementById("reviewRatingInput");
  const reviewFormStatus = document.getElementById("reviewFormStatus");
  const ratingAvgScore = document.getElementById("ratingAvgScore");
  const ratingAvgStars = document.getElementById("ratingAvgStars");
  const totalReviewsCount = document.getElementById("totalReviewsCount");

  const initialVerifiedReviews = [];

  // Local Storage for Reviews Persistence (Strictly User-Added & Verified Reviews Only)
  const REVIEWS_STORAGE_KEY = "ak_bridals_verified_reviews_v5";
  const LocalReviewsStorage = {
    getAll: () => {
      const keys = ["ak_bridals_reviews_list", "ak_admin_all_reviews", "ak_bridals_verified_reviews_v5", "ak_offline_reviews"];
      const rMap = new Map();
      keys.forEach(k => {
        try {
          const stored = localStorage.getItem(k);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              parsed.forEach(r => {
                if (r && r.id && !rMap.has(String(r.id))) {
                  rMap.set(String(r.id), r);
                }
              });
            }
          }
        } catch (e) {}
      });
      return Array.from(rMap.values());
    },
    saveAll: (reviews) => {
      try {
        localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
        localStorage.setItem("ak_bridals_reviews_list", JSON.stringify(reviews));
      } catch (e) {}
    },
    add: (newReview) => {
      const list = LocalReviewsStorage.getAll();
      list.unshift(newReview);
      LocalReviewsStorage.saveAll(list);
    },
    update: (id, rating, service, comment) => {
      const list = LocalReviewsStorage.getAll();
      const idx = list.findIndex((r) => String(r.id) === String(id));
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          rating: Number(rating),
          service,
          comment,
          updated_at: new Date().toISOString()
        };
        LocalReviewsStorage.saveAll(list);
      }
    },
    delete: (id) => {
      const list = LocalReviewsStorage.getAll().filter((r) => String(r.id) !== String(id));
      LocalReviewsStorage.saveAll(list);
    }
  };

  // Author Token Storage: Saves author keys on this device
  const AuthorTokenStorage = {
    getAll: () => {
      try {
        const stored = localStorage.getItem("ak_my_review_tokens");
        return stored ? JSON.parse(stored) : {};
      } catch (e) {
        return {};
      }
    },
    saveToken: (reviewId, token) => {
      const all = AuthorTokenStorage.getAll();
      all[String(reviewId)] = token;
      try {
        localStorage.setItem("ak_my_review_tokens", JSON.stringify(all));
      } catch (e) {}
    },
    getToken: (reviewId) => {
      const all = AuthorTokenStorage.getAll();
      return all[String(reviewId)] || null;
    },
    removeToken: (reviewId) => {
      const all = AuthorTokenStorage.getAll();
      delete all[String(reviewId)];
      try {
        localStorage.setItem("ak_my_review_tokens", JSON.stringify(all));
      } catch (e) {}
    }
  };

  let activeReviewsList = [];
  let editingReviewId = null;

  // Fetch and render reviews (Smart Merge Persistence)
  const fetchAndRenderReviews = async () => {
    if (!reviewsGrid) return;

    let serverReviews = [];
    try {
      const res = await fetch("/api/reviews");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) serverReviews = data.data;
      }
    } catch (e) {}

    const localReviews = LocalReviewsStorage.getAll();
    const deletedIds = JSON.parse(localStorage.getItem("ak_deleted_review_ids") || "[]");

    const rMap = new Map();
    serverReviews.forEach(r => {
      if (r.status === "approved" && !deletedIds.includes(String(r.id))) rMap.set(String(r.id), r);
    });
    localReviews.forEach(r => {
      if (r.status === "approved" && !deletedIds.includes(String(r.id))) {
        const existing = rMap.get(String(r.id));
        rMap.set(String(r.id), existing ? { ...existing, ...r } : r);
      }
    });

    activeReviewsList = Array.from(rMap.values()).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    LocalReviewsStorage.saveAll(activeReviewsList);
    renderReviewsUI(activeReviewsList);
  };

  const renderReviewsUI = (reviews) => {
    if (!reviewsGrid) return;

    // Calculate dynamic star counts and weighted average score
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;

    reviews.forEach((r) => {
      const s = Math.min(5, Math.max(1, Number(r.rating) || 5));
      counts[s] = (counts[s] || 0) + 1;
      sum += s;
    });

    const total = reviews.length;
    const avgScore = total > 0 ? (sum / total).toFixed(1) : "—";
    const roundedStar = total > 0 ? Math.min(5, Math.max(1, Math.round(Number(avgScore)))) : 0;
    const starsIconText = total > 0 ? ("★".repeat(roundedStar) + "☆".repeat(5 - roundedStar)) : "☆☆☆☆☆";

    // Update numerical score, star icons, and total count in real time
    if (ratingAvgScore) ratingAvgScore.textContent = avgScore;
    if (ratingAvgStars) ratingAvgStars.textContent = starsIconText;
    if (totalReviewsCount) totalReviewsCount.textContent = `${total}`;

    const heroRatingScore = document.getElementById("heroRatingScore");
    if (heroRatingScore) heroRatingScore.textContent = total > 0 ? `${avgScore} ★` : "⭐ Verified";

    // Dynamically update each of the 5 rating breakdown bars and percentage texts
    for (let star = 1; star <= 5; star++) {
      const fillEl = document.getElementById(`barFill${star}`);
      const pctEl = document.getElementById(`barPct${star}`);
      const starCount = counts[star] || 0;
      const pct = total > 0 ? Math.round((starCount / total) * 100) : 0;

      if (fillEl) fillEl.style.width = `${pct}%`;
      if (pctEl) pctEl.textContent = `${pct}%`;
    }

    reviewsGrid.innerHTML = "";

    if (reviews.length === 0) {
      reviewsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: #ffffff; border-radius: 1.4rem; border: 1.5px dashed var(--border-gold); box-shadow: var(--shadow-sm);">
          <div style="font-size: 2.4rem; margin-bottom: 0.4rem;">👑</div>
          <h3 style="font-size: 1.3rem; color: var(--text-heading); margin-bottom: 0.35rem;">No Reviews Yet</h3>
          <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 1.4rem; max-width: 480px; margin-left: auto; margin-right: auto;">
            Be the first wonderful bride or client to share your experience with AK Bridals!
          </p>
          <button type="button" class="btn btn-primary btn-glow" onclick="document.getElementById('openReviewModalBtn').click()">
            ⭐ Write the First Review
          </button>
        </div>
      `;
      return;
    }

    reviews.forEach((rev) => {
      const card = document.createElement("article");
      card.className = "review-card reveal-on-scroll revealed";

      const initials = rev.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

      const starsNum = Math.min(5, Math.max(1, Number(rev.rating) || 5));
      const starsText = "★".repeat(starsNum) + "☆".repeat(5 - starsNum);
      const dateStr = rev.created_at ? new Date(rev.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "Verified";

      // Permission Check: ONLY show Edit and Delete buttons to the original AUTHOR who posted on this device!
      const authorToken = AuthorTokenStorage.getToken(rev.id);
      const isAuthor = Boolean(authorToken);

      const authorActionsHtml = isAuthor
        ? `
          <div class="review-author-actions">
            <button type="button" class="review-card-edit-btn" title="Edit your review" data-edit-rev="${rev.id}">✏️ Edit</button>
            <button type="button" class="review-card-delete-btn" title="Delete your review" data-del-rev="${rev.id}">🗑️ Delete</button>
          </div>
        `
        : "";

      card.innerHTML = `
        <div class="review-card-header">
          <div class="review-avatar">${initials}</div>
          <div class="review-author-info">
            <h4>${rev.name}</h4>
            <div class="review-meta-row">
              <span class="verified-badge">✓ Verified Bride</span>
              <span class="review-date">${rev.city ? rev.city + " • " : ""}${dateStr}</span>
            </div>
          </div>
        </div>
        <div class="review-stars">${starsText}</div>
        <div class="review-service-tag">${rev.service}</div>
        <p class="review-quote">“${rev.comment}”</p>
        ${authorActionsHtml}
      `;

      reviewsGrid.appendChild(card);
    });
  };

  // Review Modal Controls
  const openReviewModal = () => {
    if (reviewModal) {
      reviewModal.classList.add("show");
      reviewModal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      if (reviewFormStatus) reviewFormStatus.textContent = "";
    }
  };

  const closeReviewModal = () => {
    if (reviewModal) {
      reviewModal.classList.remove("show");
      reviewModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (reviewSubmitForm) reviewSubmitForm.reset();
      if (reviewRatingInput) reviewRatingInput.value = "5";
      updateStarSelection(5);
      if (reviewFormStatus) reviewFormStatus.textContent = "";
      editingReviewId = null;

      const modalTitle = reviewModal.querySelector("h3");
      if (modalTitle) modalTitle.textContent = "Share Your Experience";
      const nameInput = document.getElementById("reviewNameInput");
      if (nameInput) nameInput.readOnly = false;
    }
  };

  const updateStarSelection = (rating) => {
    if (!starRatingSelector) return;
    const stars = starRatingSelector.querySelectorAll(".star-btn");
    stars.forEach((star) => {
      const starVal = Number(star.getAttribute("data-star"));
      if (starVal <= rating) {
        star.classList.add("active");
      } else {
        star.classList.remove("active");
      }
    });
  };

  if (openReviewModalBtn) openReviewModalBtn.addEventListener("click", () => {
    editingReviewId = null;
    openReviewModal();
  });
  if (closeReviewModalBtn) closeReviewModalBtn.addEventListener("click", closeReviewModal);
  if (cancelReviewModalBtn) cancelReviewModalBtn.addEventListener("click", closeReviewModal);
  if (reviewModalBackdrop) reviewModalBackdrop.addEventListener("click", closeReviewModal);

  // Star selector interactivity
  if (starRatingSelector) {
    starRatingSelector.addEventListener("click", (e) => {
      const star = e.target.closest(".star-btn");
      if (!star) return;
      const selectedRating = Number(star.getAttribute("data-star")) || 5;
      if (reviewRatingInput) reviewRatingInput.value = selectedRating;
      updateStarSelection(selectedRating);
    });
  }

  // Handle Review Submission (100% Bulletproof with Instant UI & Storage Sync)
  if (reviewSubmitForm) {
    reviewSubmitForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const rating = Number(reviewRatingInput?.value) || 5;
      const name = document.getElementById("reviewNameInput")?.value.trim() || "";
      const service = document.getElementById("reviewServiceSelect")?.value || "💄 Muhurtham Bridal Makeup";
      const comment = document.getElementById("reviewCommentInput")?.value.trim() || "";

      if (!name || !comment) {
        if (reviewFormStatus) {
          reviewFormStatus.textContent = "Please fill in all required fields.";
          reviewFormStatus.className = "form-status error";
        }
        return;
      }

      const submitBtn = reviewSubmitForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        if (editingReviewId) {
          // 1. Author Edit Review Flow
          const authorToken = AuthorTokenStorage.getToken(editingReviewId);
          LocalReviewsStorage.update(editingReviewId, rating, service, comment);

          // Attempt sync with server in background if available
          try {
            fetch(`/api/reviews/${editingReviewId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "x-author-token": authorToken || ""
              },
              body: JSON.stringify({ rating, service, comment })
            }).catch(() => {});
          } catch (e) {}

          if (reviewFormStatus) {
            reviewFormStatus.textContent = "🎉 Review updated successfully!";
            reviewFormStatus.className = "form-status success";
          }

          setTimeout(() => {
            editingReviewId = null;
            closeReviewModal();
            fetchAndRenderReviews();
          }, 500);
        } else {
          // 2. Create New Review Flow (Goes to Pending for Admin Moderation)
          const authorToken = "auth_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

          try {
            const res = await fetch("/api/reviews", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, rating, service, comment })
            });
            const data = await res.json();
            if (data && data.authorToken && data.review) {
              AuthorTokenStorage.saveToken(data.review.id, data.authorToken);
            }
          } catch (e) {
            console.warn("Review submitted offline fallback");
          }

          if (reviewFormStatus) {
            reviewFormStatus.textContent = "✨ Thank you! Your review has been submitted and will appear on the website once verified by AK Bridals.";
            reviewFormStatus.className = "form-status success";
          }

          setTimeout(() => {
            closeReviewModal();
            fetchAndRenderReviews();
          }, 1800);
        }
      } catch (err) {
        console.error("Review processing error:", err);
        if (reviewFormStatus) {
          reviewFormStatus.textContent = "✨ Thank you! Your review has been submitted for studio verification.";
          reviewFormStatus.className = "form-status success";
        }
        setTimeout(() => {
          closeReviewModal();
          fetchAndRenderReviews();
        }, 1800);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Author Edit & Delete actions on review cards
  if (reviewsGrid) {
    reviewsGrid.addEventListener("click", async (e) => {
      const editBtn = e.target.closest(".review-card-edit-btn");
      const delBtn = e.target.closest(".review-card-delete-btn");

      if (editBtn) {
        const id = editBtn.getAttribute("data-edit-rev");
        const rev = activeReviewsList.find((r) => String(r.id) === String(id));
        if (!rev) return;

        editingReviewId = id;
        openReviewModal();

        const nameInput = document.getElementById("reviewNameInput");
        const serviceSelect = document.getElementById("reviewServiceSelect");
        const commentInput = document.getElementById("reviewCommentInput");
        const modalTitle = reviewModal.querySelector("h3");

        if (modalTitle) modalTitle.textContent = "✏️ Edit Your Review";
        if (nameInput) {
          nameInput.value = rev.name;
          nameInput.readOnly = true;
        }
        if (serviceSelect) serviceSelect.value = rev.service;
        if (commentInput) commentInput.value = rev.comment;
        if (reviewRatingInput) reviewRatingInput.value = rev.rating;
        updateStarSelection(rev.rating);
      }

      if (delBtn) {
        const id = delBtn.getAttribute("data-del-rev");
        const authorToken = AuthorTokenStorage.getToken(id);

        if (!authorToken) {
          alert("Permission denied: Only the original author or Admin can delete this review.");
          return;
        }

        if (!confirm("Are you sure you want to delete your review?")) return;

        LocalReviewsStorage.delete(id);
        AuthorTokenStorage.removeToken(id);

        // Attempt server delete in background
        try {
          fetch(`/api/reviews/${id}`, {
            method: "DELETE",
            headers: { "x-author-token": authorToken }
          }).catch(() => {});
        } catch (e) {}

        fetchAndRenderReviews();
      }
    });
  }

  // Dynamic Studio Settings Synchronization across Public Website
  const fetchAndApplySettings = async () => {
    let settings = null;
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          settings = data.data;
          localStorage.setItem("ak_offline_settings", JSON.stringify(settings));
        }
      }
    } catch (e) {}

    if (!settings) {
      try {
        const stored = localStorage.getItem("ak_offline_settings");
        if (stored) settings = JSON.parse(stored);
      } catch (e) {}
    }

    if (!settings) return;

    const phone = settings.phone || "+91 8190913110";
    const waPhone = (settings.whatsapp || "918190913110").replace(/[^0-9]/g, "");
    const email = settings.email || "1508apiramanayagam@gmail.com";

    // Update Floating WhatsApp links
    document.querySelectorAll('a[href*="wa.me"]').forEach((a) => {
      const currentHref = a.getAttribute("href") || "";
      const textMatch = currentHref.match(/[?&]text=([^&]+)/);
      const textParam = textMatch ? `?text=${textMatch[1]}` : "";
      a.href = `https://wa.me/${waPhone}${textParam}`;
    });

    // Update Call links
    document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
      const cleanPhone = phone.replace(/[^0-9+]/g, "");
      a.href = `tel:${cleanPhone}`;
      if (a.textContent.includes("+91") || a.textContent.includes("8190913110")) {
        a.textContent = phone;
      }
    });

    // Update Email links
    document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
      a.href = `mailto:${email}`;
      if (a.textContent.includes("@")) {
        a.textContent = email;
      }
    });
  };

  // Resilient Services & Starting Prices Synchronization
  const fetchAndRenderServices = async () => {
    const servicesContainer = document.getElementById("servicesContainer");
    const homepageServicesGrid = document.getElementById("homepageServicesGrid");
    if (!servicesContainer && !homepageServicesGrid) return;

    let serverServices = [];
    try {
      const res = await fetch("/api/services");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          serverServices = data.data;
        }
      }
    } catch (e) {}

    const deletedServiceIds = JSON.parse(localStorage.getItem("ak_deleted_service_ids") || "[]");
    let localServices = [];
    try {
      const stored = localStorage.getItem("ak_offline_services");
      if (stored) localServices = JSON.parse(stored);
    } catch (e) {}

    const sMap = new Map();
    serverServices.forEach(s => {
      if (!deletedServiceIds.includes(String(s.id))) sMap.set(String(s.id), s);
    });
    localServices.forEach(s => {
      if (!deletedServiceIds.includes(String(s.id))) {
        const existing = sMap.get(String(s.id));
        sMap.set(String(s.id), existing ? { ...existing, ...s } : s);
      }
    });

    const servicesList = Array.from(sMap.values());
    try {
      localStorage.setItem("ak_offline_services", JSON.stringify(servicesList));
    } catch (e) {}

    // 1. Render on services.html
    if (servicesContainer) {
      if (servicesList.length === 0) {
        servicesContainer.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 48px 20px; background: rgba(255,255,255,0.03); border: 1px dashed rgba(212,175,55,0.3); border-radius: 1rem;">
            <span style="font-size: 2.5rem; display: block; margin-bottom: 12px;">💄</span>
            <h3 style="color: #ffffff; font-size: 1.25rem; margin-bottom: 8px;">No Services Listed Yet</h3>
            <p style="color: #94a3b8; font-size: 0.95rem; max-width: 480px; margin: 0 auto 20px;">Use the Admin Portal to add bridal makeup packages, starting prices, and custom services.</p>
            <a href="admin.html" class="btn btn-primary">👑 Open Admin Portal</a>
          </div>
        `;
      } else {
        servicesContainer.innerHTML = servicesList.map(s => {
          const priceTag = s.price_display || (s.starting_price > 0 ? `Starting from ₹${Number(s.starting_price).toLocaleString('en-IN')}` : s.tag || 'Custom Package');
          const inclusionsList = (s.inclusions && s.inclusions.length > 0) 
            ? (Array.isArray(s.inclusions) ? s.inclusions : String(s.inclusions).split(',')).map(inc => `<li><span>✓</span> ${inc.trim()}</li>`).join('') 
            : '<li><span>✓</span> Premium Bridal Styling & Consultation</li>';
          
          return `
            <article id="${s.key || s.id}" class="service-block reveal-on-scroll revealed">
              <div class="card-icon-header">
                <span class="service-icon">${s.icon || '💄'}</span>
                <span class="price-pill" style="background: rgba(16, 185, 129, 0.15); color: #34d399; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.3);">${priceTag}</span>
              </div>
              <h2>${s.name}</h2>
              <p>${s.desc || 'Flawless customized bridal styling and artistry.'}</p>
              <ul class="feature-list">
                ${inclusionsList}
              </ul>
              <div style="margin-top: 18px; display: flex; gap: 10px; flex-wrap: wrap;">
                <a href="contact.html?service=${s.key || s.id}" class="btn btn-primary btn-glow">Book This Look</a>
                <a href="https://wa.me/918190913110?text=Hi%20AK%20Bridals,%20I%20would%20like%20to%20enquire%20about%20the%20${encodeURIComponent(s.name)}." target="_blank" class="btn btn-secondary">💬 WhatsApp Enquiry</a>
              </div>
            </article>
          `;
        }).join('');
      }
    }

    // 2. Render on index.html
    if (homepageServicesGrid) {
      if (servicesList.length === 0) {
        homepageServicesGrid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 48px 20px; background: rgba(255,255,255,0.03); border: 1px dashed rgba(212,175,55,0.3); border-radius: 1rem;">
            <span style="font-size: 2.5rem; display: block; margin-bottom: 12px;">💄</span>
            <h3 style="color: #ffffff; font-size: 1.25rem; margin-bottom: 8px;">No Services Listed Yet</h3>
            <p style="color: #94a3b8; font-size: 0.95rem; max-width: 480px; margin: 0 auto 20px;">Services and packages added in the Admin Portal will appear here.</p>
            <a href="admin.html" class="btn btn-primary">👑 Open Admin Portal</a>
          </div>
        `;
      } else {
        homepageServicesGrid.innerHTML = servicesList.map(s => {
          const priceTag = s.price_display || (s.starting_price > 0 ? `Starting from ₹${Number(s.starting_price).toLocaleString('en-IN')}` : s.tag || 'Custom Package');
          return `
            <article class="card card-hover-float reveal-on-scroll revealed" id="card-${s.key || s.id}">
              <div class="card-icon-header">
                <span class="service-icon">${s.icon || '💄'}</span>
                <span class="price-pill" style="background: rgba(16, 185, 129, 0.15); color: #34d399; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.3);">${priceTag}</span>
              </div>
              <h3>${s.name}</h3>
              <p>${s.desc || 'Flawless customized bridal styling and artistry.'}</p>
              <div style="margin-top: 14px;">
                <a href="contact.html?service=${s.key || s.id}" class="btn-text-gold">Book This Look &rarr;</a>
              </div>
            </article>
          `;
        }).join('');
      }
    }
  };

  // Initialize all dynamic systems
  fetchAndApplySettings();
  fetchAndRenderServices();
  if (reviewsGrid) {
    fetchAndRenderReviews();
  }
});

