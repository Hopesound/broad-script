const searchForm = document.querySelector(".search-form");
const searchInput = document.querySelector("#script-search");
const clearSearchButton = document.querySelector("#clear-search");
const copyButton = document.querySelector("#copy-script");
const printButton = document.querySelector("#print-page");
const episodeMenuToggle = document.querySelector("#episode-menu-toggle");
const episodeMenuClose = document.querySelector("#episode-menu-close");
const episodePanel = document.querySelector("#episode-panel");
const panelBackdrop = document.querySelector("#panel-backdrop");
const content = document.querySelector(".content");

function getEpisodeFile(pathname) {
  const file = pathname.split("/").filter(Boolean).pop();
  return file || "index.html";
}

function getViewButtons() {
  return document.querySelectorAll("[data-view]");
}

function getViews() {
  return document.querySelectorAll(".view");
}

function getScriptBlocks() {
  return document.querySelectorAll(".script-block");
}

function showView(viewId, updateHash = true) {
  const targetView = document.getElementById(viewId) ? viewId : "script-view";

  getViewButtons().forEach((button) => {
    button.classList.toggle("active", button.dataset.view === targetView);
  });

  getViews().forEach((view) => {
    const active = view.id === targetView;
    view.classList.toggle("active", active);
    view.hidden = !active;
  });

  if (updateHash) {
    history.replaceState(history.state, "", `#${targetView}`);
  }
}

function filterScript(keyword) {
  getScriptBlocks().forEach((block) => {
    const text = block.textContent.toLowerCase();
    block.classList.toggle("is-hidden-by-search", Boolean(keyword) && !text.includes(keyword));
  });
}

function updateClearSearchButton() {
  clearSearchButton.hidden = searchInput.value.trim() === "";
}

function setEpisodePanelOpen(open) {
  episodePanel.classList.toggle("is-open", open);
  panelBackdrop.classList.toggle("is-visible", open);
  panelBackdrop.hidden = !open;
  episodeMenuToggle.setAttribute("aria-expanded", String(open));
}

function setCurrentEpisode(episodeKey) {
  episodePanel.querySelectorAll(".episode-switch").forEach((link) => {
    const active = link.dataset.episodeKey === episodeKey;
    link.classList.toggle("current", active);
    if (active) {
      link.setAttribute("aria-current", "page");
      searchInput.placeholder = link.dataset.searchPlaceholder || searchInput.placeholder;
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

async function loadEpisode(link, options = {}) {
  const targetUrl = new URL(link.href, window.location.href);
  const targetView = options.viewId || targetUrl.hash.replace("#", "") || "script-view";
  const targetFile = getEpisodeFile(targetUrl.pathname);
  // On popstate the URL has already changed, but the rendered episode has not.
  const renderedLink = episodePanel.querySelector('[aria-current="page"]');
  const currentFile = getEpisodeFile(new URL(renderedLink?.href || window.location.href).pathname);

  try {
    if (targetFile !== currentFile) {
      const response = await fetch(`${targetUrl.pathname}${targetUrl.search}`);
      if (!response.ok) {
        throw new Error("Episode page could not be loaded.");
      }

      const html = await response.text();
      const nextDocument = new DOMParser().parseFromString(html, "text/html");
      const nextContent = nextDocument.querySelector(".content");

      if (!nextContent) {
        throw new Error("Episode content was not found.");
      }

      content.innerHTML = nextContent.innerHTML;
      document.title = nextDocument.title || document.title;
    }

    initializeImageGallery();
    setCurrentEpisode(link.dataset.episodeKey);
    searchInput.value = "";
    updateClearSearchButton();
    filterScript("");
    showView(targetView, false);
    setEpisodePanelOpen(false);

    if (options.updateHistory !== false) {
      history.pushState({ episodeKey: link.dataset.episodeKey }, "", `${targetUrl.pathname}${targetUrl.search}#${targetView}`);
    }
  } catch {
    window.location.href = link.href;
  }
}

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    event.preventDefault();
    showView(viewButton.dataset.view);
    return;
  }

  const episodeLink = event.target.closest(".episode-switch");
  if (episodeLink) {
    event.preventDefault();
    loadEpisode(episodeLink);
  }
});

searchInput.addEventListener("input", () => {
  updateClearSearchButton();
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const keyword = searchInput.value.trim().toLowerCase();
  filterScript(keyword);
  if (keyword) {
    showView("script-view");
  }
});

clearSearchButton.addEventListener("click", () => {
  searchInput.value = "";
  updateClearSearchButton();
  filterScript("");
  showView("script-view");
  searchInput.focus();
});

episodeMenuToggle.addEventListener("click", () => {
  setEpisodePanelOpen(!episodePanel.classList.contains("is-open"));
});

episodeMenuClose.addEventListener("click", () => {
  setEpisodePanelOpen(false);
  episodeMenuToggle.focus();
});

panelBackdrop.addEventListener("click", () => {
  setEpisodePanelOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && episodePanel.classList.contains("is-open")) {
    setEpisodePanelOpen(false);
    episodeMenuToggle.focus();
  }
});

copyButton.addEventListener("click", async () => {
  const source = document.querySelector("#script-copy-source")?.innerText.trim() || "";

  try {
    await navigator.clipboard.writeText(source);
    copyButton.textContent = "복사 완료";
    window.setTimeout(() => {
      copyButton.textContent = "대본 복사";
    }, 1400);
  } catch {
    copyButton.textContent = "복사 실패";
    window.setTimeout(() => {
      copyButton.textContent = "대본 복사";
    }, 1400);
  }
});

printButton.addEventListener("click", () => {
  window.print();
});

window.addEventListener("hashchange", () => {
  const requestedView = window.location.hash.replace("#", "");
  if (requestedView && document.getElementById(requestedView)) {
    showView(requestedView, false);
  }
});

window.addEventListener("popstate", () => {
  const currentFile = getEpisodeFile(window.location.pathname);
  const matchingEpisode = [...episodePanel.querySelectorAll(".episode-switch")].find((link) => {
    return getEpisodeFile(new URL(link.href, window.location.href).pathname) === currentFile;
  });

  if (matchingEpisode) {
    loadEpisode(matchingEpisode, {
      updateHistory: false,
      viewId: window.location.hash.replace("#", ""),
    });
  }
});

const requestedView = window.location.hash.replace("#", "");
if (requestedView && document.getElementById(requestedView)) {
  showView(requestedView, false);
}

const currentFile = getEpisodeFile(window.location.pathname);
const currentEpisode = [...episodePanel.querySelectorAll(".episode-switch")].find((link) => {
  return getEpisodeFile(new URL(link.href, window.location.href).pathname) === currentFile;
});

if (currentEpisode) {
  setCurrentEpisode(currentEpisode.dataset.episodeKey);
}

initializeImageGallery();
updateClearSearchButton();

function initializeImageGallery() {
  const gallery = document.querySelector(".image-gallery");
  if (!gallery || gallery.dataset.initialized) return;
  gallery.dataset.initialized = "true";

  const slides = [...gallery.querySelectorAll("[data-gallery-slide]")];
  const thumbnails = [...gallery.querySelectorAll("[data-gallery-index]")];
  const dialog = gallery.querySelector(".gallery-dialog");
  const enlarged = gallery.querySelector("[data-gallery-enlarged]");
  const zoomButton = gallery.querySelector('[data-gallery-action="zoom"]');
  let selected = 0;
  let opener = null;

  function setZoom(zoomed) {
    dialog.classList.toggle("is-zoomed", zoomed);
    zoomButton.setAttribute("aria-pressed", String(zoomed));
    const label = zoomed ? "화면에 맞추기" : "원본 크기로 보기";
    zoomButton.setAttribute("aria-label", label);
    zoomButton.title = label;
    zoomButton.querySelector("img").src = `assets/icons/zoom-${zoomed ? "out" : "in"}.svg`;
    gallery.querySelector(".gallery-dialog-stage").scrollTo?.(0, 0);
  }

  function updateExpandedImage() {
    const source = slides[selected].querySelector(".gallery-image");
    enlarged.src = source.getAttribute("src");
    enlarged.alt = source.alt;
    gallery.querySelector("#gallery-dialog-title").textContent = slides[selected].querySelector("h3").textContent;
  }

  function selectImage(index, revealThumbnail = false) {
    selected = Math.max(0, Math.min(slides.length - 1, index));
    slides.forEach((slide, i) => { slide.hidden = i !== selected; });
    thumbnails.forEach((thumbnail, i) => {
      if (i === selected) thumbnail.setAttribute("aria-current", "true");
      else thumbnail.removeAttribute("aria-current");
    });
    gallery.querySelector("[data-gallery-counter]").textContent = `${selected + 1} / ${slides.length}`;
    gallery.querySelectorAll("[data-gallery-step]").forEach((button) => {
      button.disabled = Number(button.dataset.galleryStep) < 0 ? selected === 0 : selected === slides.length - 1;
    });
    gallery.querySelectorAll("[data-gallery-download]").forEach((link) => {
      link.href = slides[selected].querySelector(".gallery-image").getAttribute("src");
      link.download = `라이딩스타_${String(selected + 1).padStart(2, "0")}.png`;
    });
    if (dialog.open) {
      updateExpandedImage();
      setZoom(false);
    }
    // Scroll only the thumbnail strip, keeping the reading position unchanged.
    if (revealThumbnail && !dialog.open) {
      const strip = gallery.querySelector(".gallery-thumbnails");
      const buttonRect = thumbnails[selected].getBoundingClientRect();
      const stripRect = strip.getBoundingClientRect();
      if (buttonRect.left < stripRect.left) strip.scrollLeft += buttonRect.left - stripRect.left;
      else if (buttonRect.right > stripRect.right) strip.scrollLeft += buttonRect.right - stripRect.right;
    }
  }

  gallery.querySelectorAll("[data-gallery-memo]").forEach((field) => {
    const key = `riding-star:students-2026-10-19:image-${field.dataset.galleryMemo}:memo:v1`;
    const status = document.getElementById(field.getAttribute("aria-describedby"));
    try {
      field.value = localStorage.getItem(key) || "";
      status.textContent = field.value ? "이 브라우저에 저장됨" : "저장된 메모 없음";
    } catch {
      status.textContent = "자동 저장 불가 · 현재 화면에서만 유지됩니다";
    }
    field.addEventListener("input", () => {
      try {
        if (field.value) localStorage.setItem(key, field.value);
        else localStorage.removeItem(key);
        status.textContent = field.value ? "이 브라우저에 저장됨" : "메모 비움";
      } catch {
        status.textContent = "저장 실패 · 현재 화면에서만 유지됩니다";
      }
    });
  });

  gallery.addEventListener("click", (event) => {
    const thumbnail = event.target.closest("[data-gallery-index]");
    const step = event.target.closest("[data-gallery-step]");
    const action = event.target.closest("[data-gallery-action]");
    if (thumbnail) selectImage(Number(thumbnail.dataset.galleryIndex), true);
    if (step && !step.disabled) {
      const next = selected + Number(step.dataset.galleryStep);
      selectImage(next, true);
      // Keep keyboard focus usable when reaching either end.
      if (step.disabled) step.parentElement.querySelector("[data-gallery-step]:not(:disabled)")?.focus();
    }
    if (action?.dataset.galleryAction === "expand") {
      opener = action;
      updateExpandedImage();
      setZoom(false);
      dialog.showModal();
      document.body.classList.add("gallery-modal-open");
      gallery.querySelector('[data-gallery-action="close"]').focus();
    }
    if (action?.dataset.galleryAction === "close") dialog.close();
    if (action?.dataset.galleryAction === "zoom") setZoom(!dialog.classList.contains("is-zoomed"));
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }
  });

  gallery.addEventListener("keydown", (event) => {
    if (event.target.matches("textarea, input, select") || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!dialog.open && !event.target.closest("[data-gallery-navigation], .gallery-image-open")) return;
    const next = { ArrowLeft: selected - 1, ArrowRight: selected + 1, Home: 0, End: slides.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    selectImage(next, true);
    if (!dialog.open) thumbnails[selected].focus({ preventScroll: true });
  });

  dialog.addEventListener("close", () => {
    document.body.classList.remove("gallery-modal-open");
    setZoom(false);
    const target = opener?.closest("[hidden]") ? slides[selected].querySelector(".gallery-image-open") : opener;
    target?.focus({ preventScroll: true });
  });
  selectImage(0);
}
