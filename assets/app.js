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
  const targetView = targetUrl.hash.replace("#", "") || "script-view";
  const targetFile = getEpisodeFile(targetUrl.pathname);
  const currentFile = getEpisodeFile(window.location.pathname);

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
    loadEpisode(matchingEpisode, { updateHistory: false });
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

updateClearSearchButton();
