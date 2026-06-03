const viewButtons = document.querySelectorAll("[data-view]");
const views = document.querySelectorAll(".view");
const searchInput = document.querySelector("#script-search");
const clearSearchButton = document.querySelector("#clear-search");
const copyButton = document.querySelector("#copy-script");
const printButton = document.querySelector("#print-page");
const scriptBlocks = document.querySelectorAll(".script-block");

function showView(viewId) {
  viewButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });

  views.forEach((view) => {
    const active = view.id === viewId;
    view.classList.toggle("active", active);
    view.hidden = !active;
  });
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

searchInput.addEventListener("input", () => {
  const keyword = searchInput.value.trim().toLowerCase();

  filterScript(keyword);

  if (keyword) {
    showView("script-view");
  }
});

clearSearchButton.addEventListener("click", () => {
  searchInput.value = "";
  filterScript("");
  showView("script-view");
  searchInput.focus();
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
