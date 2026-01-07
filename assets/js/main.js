// Shared interactions for AK Bridals

document.addEventListener("DOMContentLoaded", () => {
  const nav = document.getElementById("mainNav");
  const navToggle = document.getElementById("navToggle");
  const yearSpan = document.getElementById("year");

  // Current year in footer
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear().toString();
  }

  // Mobile navigation toggle
  if (nav && navToggle) {
    navToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  // Simple lightbox for gallery
  const galleryGrid = document.getElementById("galleryGrid");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxBackdrop = document.getElementById("lightboxBackdrop");
  const lightboxClose = document.getElementById("lightboxClose");

  if (galleryGrid && lightbox && lightboxImg && lightboxCaption) {
    galleryGrid.addEventListener("click", (event) => {
      const figure = event.target.closest(".gallery-item");
      if (!figure) return;

      const caption = figure.querySelector("figcaption");
      const imageEl = figure.querySelector("img");

      // Update lightbox image
      if (imageEl && imageEl.src) {
        lightboxImg.style.backgroundImage = `url('${imageEl.src}')`;
        lightboxImg.classList.remove("placeholder-img");
      } else {
        // Fallback to placeholder gradient if no image is present
        lightboxImg.style.backgroundImage = "";
        lightboxImg.classList.add("placeholder-img");
      }

      lightbox.classList.add("show");
      lightboxCaption.textContent = caption ? caption.textContent : "";
    });
  }

  const closeLightbox = () => {
    if (lightbox) {
      lightbox.classList.remove("show");
    }
  };

  if (lightboxBackdrop) {
    lightboxBackdrop.addEventListener("click", closeLightbox);
  }
  if (lightboxClose) {
    lightboxClose.addEventListener("click", closeLightbox);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLightbox();
    }
  });

  // Contact form validation and WhatsApp helper
  const contactForm = document.getElementById("contactForm");
  const formStatus = document.getElementById("formStatus");
  const whatsappBtn = document.getElementById("whatsappBtn");

  if (contactForm && formStatus) {
    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = new FormData(contactForm);
      const name = formData.get("name")?.toString().trim() || "";
      const phone = formData.get("phone")?.toString().trim() || "";
      const email = formData.get("email")?.toString().trim() || "";
      const date = formData.get("date")?.toString().trim() || "";
      const service = formData.get("service")?.toString().trim() || "";
      const message = formData.get("message")?.toString().trim() || "";

      let hasError = false;

      const setError = (fieldId, msg) => {
        const errorP = contactForm.querySelector(
          `.field-error[data-error-for="${fieldId}"]`
        );
        if (errorP) {
          errorP.textContent = msg;
        }
      };

      ["name", "phone", "email", "date", "service", "message"].forEach(
        (id) => setError(id, "")
      );

      if (!name) {
        setError("name", "Please enter your full name.");
        hasError = true;
      }

      if (!phone || phone.length < 8) {
        setError("phone", "Please enter a valid phone number.");
        hasError = true;
      }

      if (!email) {
        setError("email", "Please enter your email address.");
        hasError = true;
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          setError("email", "Please enter a valid email address (1508apiramanayagam@gmail.com).");
          hasError = true;
        }
      }

      if (!date) {
        setError("date", "Please choose your preferred date.");
        hasError = true;
      }

      if (!service) {
        setError("service", "Please select a service.");
        hasError = true;
      }

      if (!message || message.length < 10) {
        setError("message", "Please share a few details about your event.");
        hasError = true;
      }

      if (hasError) {
        formStatus.textContent =
          "Please fix the highlighted fields and try again.";
        formStatus.classList.remove("success");
        formStatus.classList.add("error");
        return;
      }

      // Disable submit button to prevent double submission
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";

      // Send data to backend API
      fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          phone,
          email,
          date,
          service,
          message
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          formStatus.textContent = data.message || 
            "Thank you for your enquiry! We will contact you shortly.";
          formStatus.classList.remove("error");
          formStatus.classList.add("success");
          contactForm.reset();
        } else {
          formStatus.textContent = data.message || 
            "Something went wrong. Please try again or contact us directly.";
          formStatus.classList.remove("success");
          formStatus.classList.add("error");
        }
      })
      .catch(error => {
        console.error('Error:', error);
        formStatus.textContent = 
          "Network error. Please check your connection and try again, or contact us directly.";
        formStatus.classList.remove("success");
        formStatus.classList.add("error");
      })
      .finally(() => {
        // Re-enable submit button
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
      const service = formData.get("service")?.toString().trim() || "";
      const msg = formData.get("message")?.toString().trim() || "";

      const textLines = [
        "Hello AK Bridals, I would like to enquire:",
        name && `Name: ${name}`,
        phone && `Phone: ${phone}`,
        date && `Preferred Date: ${date}`,
        service && `Service: ${service}`,
        msg && `Details: ${msg}`,
      ].filter(Boolean);

      const text = encodeURIComponent(textLines.join("\n"));
      const phoneNumber = "919363475796"; // Replace with your WhatsApp number (without +)
      const waUrl = `https://wa.me/${phoneNumber}?text=${text}`;
      window.open(waUrl, "_blank");
    });
  }
});


