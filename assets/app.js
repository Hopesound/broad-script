const viewButtons = document.querySelectorAll("[data-view]");
const views = document.querySelectorAll(".view");
const searchForm = document.querySelector(".search-form");
const searchInput = document.querySelector("#script-search");
const clearSearchButton = document.querySelector("#clear-search");
const copyButton = document.querySelector("#copy-script");
const printButton = document.querySelector("#print-page");
const scriptBlocks = document.querySelectorAll(".script-block");
const episodeMenuToggle = document.querySelector("#episode-menu-toggle");
const episodeMenuClose = document.querySelector("#episode-menu-close");
const episodePanel = document.querySelector("#episode-panel");
const panelBackdrop = document.querySelector("#panel-backdrop");

function showView(viewId, updateHash = true) {
  viewButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });

  views.forEach((view) => {
    const active = view.id === viewId;
    view.classList.toggle("active", active);
    view.hidden = !active;
  });

  if (updateHash) {
    history.replaceState(null, "", `#${viewId}`);
  }
}

viewButtons.forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

function filterScript(keyword) {
  scriptBlocks.forEach((block) => {
    const text = block.textContent.toLowerCase();
    block.classList.toggle("is-hidden-by-search", Boolean(keyword) && !text.includes(keyword));
  });
}

function updateClearSearchButton() {
  clearSearchButton.hidden = searchInput.value.trim() === "";
}

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

function setEpisodePanelOpen(open) {
  episodePanel.classList.toggle("is-open", open);
  panelBackdrop.classList.toggle("is-visible", open);
  panelBackdrop.hidden = !open;
  episodeMenuToggle.setAttribute("aria-expanded", String(open));
}

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

episodePanel.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setEpisodePanelOpen(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && episodePanel.classList.contains("is-open")) {
    setEpisodePanelOpen(false);
    episodeMenuToggle.focus();
  }
});

copyButton.addEventListener("click", async () => {
  const source = document.querySelector("#script-copy-source").innerText.trim();

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

const requestedView = window.location.hash.replace("#", "");
if (requestedView && document.getElementById(requestedView)) {
  showView(requestedView, false);
}

window.addEventListener("hashchange", () => {
  const requestedView = window.location.hash.replace("#", "");
  if (requestedView && document.getElementById(requestedView)) {
    showView(requestedView, false);
  }
});

updateClearSearchButton();
