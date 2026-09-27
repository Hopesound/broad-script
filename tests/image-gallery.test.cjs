const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const root = path.resolve(__dirname, "..");

function start(file = "index.html", options = {}) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, file), "utf8"), {
    url: `https://riding-star.test/${file}#images-view`,
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const window = dom.window;
  // jsdom has no native modal or layout engine; test state, not rendering.
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new window.Event("close"));
  };
  window.fetch = async (url) => ({
    ok: true,
    text: async () => fs.readFileSync(path.join(root, decodeURIComponent(url).split("#")[0]), "utf8"),
  });
  if (options.blockStorage) {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("Storage blocked"); } });
  } else {
    for (const [key, value] of Object.entries(options.saved || {})) window.localStorage.setItem(key, value);
  }
  window.eval(fs.readFileSync(path.join(root, "assets/app.js"), "utf8"));
  return dom;
}

function key(window, target, value) {
  target.dispatchEvent(new window.KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true }));
}
function memoKey(number) {
  return `riding-star:students-2026-10-19:image-${number}:memo:v1`;
}

test("six tabs, numeric ordering, complete originals, and existing script", () => {
  const dom = start();
  const d = dom.window.document;
  assert.deepEqual([...d.querySelectorAll(".tabs button")].map(b => b.dataset.view),
    ["cue-view", "script-view", "questions-view", "run-view", "check-view", "images-view"]);
  assert.equal(d.querySelector("#images-view").hidden, false);
  assert.equal(d.querySelectorAll("[data-gallery-slide]").length, 10);
  assert.equal(d.querySelectorAll(".gallery-questions li").length, 32);
  assert.equal(d.querySelectorAll("#script-copy-source .script-block").length, 9);
  for (let i = 1; i <= 10; i++) {
    const image = d.querySelector(`[data-gallery-slide="${i - 1}"] .gallery-image`);
    assert.equal(image.getAttribute("src"), `assets/student-bike-app/${i}.png`);
    const file = fs.readFileSync(path.join(root, image.getAttribute("src")));
    assert.equal(file.subarray(1, 4).toString(), "PNG");
    assert.equal(file.readUInt32BE(16), Number(image.width));
    assert.equal(file.readUInt32BE(20), Number(image.height));
  }
  for (const image of d.querySelectorAll(".image-gallery img[src]")) {
    assert.ok(fs.existsSync(path.join(root, image.getAttribute("src"))), image.getAttribute("src"));
  }
  dom.window.close();
});

test("all thumbnails select the matching image, questions, and download", () => {
  const dom = start();
  const d = dom.window.document;
  for (let i = 0; i < 10; i++) {
    d.querySelector(`[data-gallery-index="${i}"]`).click();
    assert.equal(d.querySelectorAll("[data-gallery-slide]:not([hidden])").length, 1);
    assert.equal(d.querySelector("[data-gallery-slide]:not([hidden])").dataset.gallerySlide, String(i));
    assert.equal(d.querySelectorAll('[data-gallery-index][aria-current="true"]').length, 1);
    assert.equal(d.querySelector("[data-gallery-counter]").textContent, `${i + 1} / 10`);
    assert.ok(d.querySelector("[data-gallery-download]").href.endsWith(`/${i + 1}.png`));
  }
  assert.ok(d.querySelector('[data-gallery-step="1"]').disabled);
  d.querySelector('[data-gallery-step="-1"]').click();
  assert.equal(d.querySelector("[data-gallery-counter]").textContent, "9 / 10");
  key(dom.window, d.querySelector('[data-gallery-index="8"]'), "Home");
  assert.equal(d.querySelector("[data-gallery-counter]").textContent, "1 / 10");
  assert.ok(d.querySelector('[data-gallery-step="-1"]').disabled);
  dom.window.close();
});

test("memo persistence, separation, clearing, and typing do not change slides", () => {
  const dom = start("index.html", { saved: { [memoKey(1)]: "기존 질문" } });
  const { window } = dom;
  const d = window.document;
  const first = d.querySelector("#gallery-memo-1");
  assert.equal(first.value, "기존 질문");
  first.value = "첫 이미지 질문 <script>실행하지 않음</script>";
  first.dispatchEvent(new window.Event("input", { bubbles: true }));
  key(window, first, "ArrowRight");
  assert.equal(d.querySelector("[data-gallery-counter]").textContent, "1 / 10");
  d.querySelector('[data-gallery-index="1"]').click();
  const second = d.querySelector("#gallery-memo-2");
  assert.equal(second.value, "");
  second.value = "두 번째 질문";
  second.dispatchEvent(new window.Event("input", { bubbles: true }));
  assert.equal(window.localStorage.getItem(memoKey(1)), first.value);
  assert.equal(window.localStorage.getItem(memoKey(2)), second.value);
  const restored = start("index.html", { saved: { [memoKey(2)]: window.localStorage.getItem(memoKey(2)) } });
  assert.equal(restored.window.document.querySelector("#gallery-memo-2").value, second.value);
  restored.window.close();
  first.value = "";
  first.dispatchEvent(new window.Event("input", { bubbles: true }));
  assert.equal(window.localStorage.getItem(memoKey(1)), null);
  window.close();
});

test("storage failure is reported while image navigation remains usable", () => {
  const dom = start("index.html", { blockStorage: true });
  const d = dom.window.document;
  assert.match(d.querySelector("#gallery-save-1").textContent, /자동 저장 불가/);
  const field = d.querySelector("#gallery-memo-1");
  field.value = "임시 질문";
  field.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  assert.match(d.querySelector("#gallery-save-1").textContent, /저장 실패/);
  d.querySelector('[data-gallery-step="1"]').click();
  assert.equal(d.querySelector("[data-gallery-counter]").textContent, "2 / 10");
  dom.window.close();
});

test("modal selection, original-size zoom, keyboard boundaries, and close state", () => {
  const dom = start();
  const d = dom.window.document;
  d.querySelector('[data-gallery-action="expand"]').click();
  const dialog = d.querySelector("dialog");
  assert.ok(dialog.open);
  assert.ok(d.body.classList.contains("gallery-modal-open"));
  d.querySelector('[data-gallery-action="zoom"]').click();
  assert.ok(dialog.classList.contains("is-zoomed"));
  key(dom.window, d.querySelector('[data-gallery-action="close"]'), "End");
  assert.equal(d.querySelector("[data-gallery-counter]").textContent, "10 / 10");
  assert.ok(d.querySelector("[data-gallery-enlarged]").src.endsWith("/10.png"));
  assert.equal(dialog.classList.contains("is-zoomed"), false);
  key(dom.window, dialog, "ArrowRight");
  assert.equal(d.querySelector("[data-gallery-counter]").textContent, "10 / 10");
  d.querySelector('[data-gallery-action="close"]').click();
  assert.equal(dialog.open, false);
  assert.equal(d.body.classList.contains("gallery-modal-open"), false);
  dom.window.close();
});

test("archive pages keep five tabs and can load and initialize the student gallery", async () => {
  for (const file of ["velo-hyeoksin.html", "dubase.html", "kim-mikyung.html", "tangamja.html"]) {
    const dom = start(file);
    const d = dom.window.document;
    assert.equal(d.querySelectorAll(".tabs button").length, 5);
    assert.equal(d.querySelector(".image-gallery"), null);
    await dom.window.loadEpisode(d.querySelector('[data-episode-key="students"]'));
    d.querySelector('[data-view="images-view"]').click();
    d.querySelector('[data-gallery-index="9"]').click();
    assert.equal(d.querySelector("[data-gallery-counter]").textContent, "10 / 10");
    await dom.window.loadEpisode(d.querySelector('[data-episode-key="velo"]'));
    assert.equal(d.querySelector(".image-gallery"), null);
    dom.window.close();
  }
});

test("browser back restores the rendered episode and image tab", async () => {
  const dom = start();
  const { window } = dom;
  const d = window.document;
  await window.loadEpisode(d.querySelector('[data-episode-key="velo"]'));
  assert.equal(d.querySelector(".image-gallery"), null);
  window.history.back();
  await new Promise(resolve => window.setTimeout(resolve, 50));
  assert.ok(d.querySelector(".image-gallery"));
  assert.equal(d.querySelector("#images-view").hidden, false);
  window.close();
});
