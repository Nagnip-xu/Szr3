const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [
  ...scope.querySelectorAll(selector),
];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let motionPaused = reducedMotion.matches;
try {
  if (localStorage.getItem("xinggui-motion") === "paused") motionPaused = true;
} catch {
  /* Preferences are optional. */
}

const heroVideo = $("#hero-video");
const previewVideo = $("#preview-video");
const mediaState = {
  hero: { visible: false, manualPlay: false, manualPause: false },
  preview: { visible: false, wantsPlay: false },
};

function setPlayIcon(button, playing, label) {
  $("use", button).setAttribute("href", playing ? "#i-pause" : "#i-play");
  button.setAttribute("aria-label", `${playing ? "暂停" : "播放"}${label}`);
}

function synchronizeControls() {
  setPlayIcon($("#hero-play"), !heroVideo.paused, "参考片段");
  for (const button of [$("#preview-play"), $("#timeline-play")])
    setPlayIcon(button, !previewVideo.paused, "参考片段");
  $("#preview-monitor").classList.toggle("is-playing", !previewVideo.paused);
}

function tryPlay(video) {
  if (!video.paused) return;
  video.play().catch(() => {
    synchronizeControls();
  });
}

function reconcilePlayback() {
  const visible = !document.hidden;
  document.documentElement.dataset.pageVisible = String(visible);
  const wantsPreview =
    visible && mediaState.preview.visible && mediaState.preview.wantsPlay;
  const wantsHero =
    visible &&
    mediaState.hero.visible &&
    !wantsPreview &&
    (mediaState.hero.manualPlay ||
      (!motionPaused && !mediaState.hero.manualPause));
  if (wantsPreview) tryPlay(previewVideo);
  else previewVideo.pause();
  if (wantsHero) tryPlay(heroVideo);
  else heroVideo.pause();
  synchronizeControls();
}

function setMotion(paused, persist = false) {
  motionPaused = paused;
  document.documentElement.dataset.motion = paused ? "paused" : "running";
  const toggle = $("#motion-toggle");
  toggle.setAttribute("aria-pressed", String(paused));
  toggle.setAttribute(
    "aria-label",
    paused ? "开启页面自动动效" : "暂停页面自动动效",
  );
  $("span", toggle).textContent = paused ? "开启动效" : "暂停动效";
  $("use", toggle).setAttribute("href", paused ? "#i-play" : "#i-pause");
  if (paused) {
    mediaState.hero.manualPlay = false;
    mediaState.preview.wantsPlay = false;
  }
  if (persist) {
    try {
      localStorage.setItem("xinggui-motion", paused ? "paused" : "running");
    } catch {
      /* Optional preference. */
    }
  }
  reconcilePlayback();
}

$("#motion-toggle").addEventListener("click", () =>
  setMotion(!motionPaused, true),
);
reducedMotion.addEventListener("change", (event) => setMotion(event.matches));
setMotion(motionPaused);
document.addEventListener("visibilitychange", reconcilePlayback);

const mediaObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries)
      mediaState[entry.target === heroVideo ? "hero" : "preview"].visible =
        entry.isIntersecting;
    reconcilePlayback();
  },
  { threshold: 0.15 },
);
mediaObserver.observe(heroVideo);
mediaObserver.observe(previewVideo);

for (const video of [heroVideo, previewVideo]) {
  video.addEventListener("play", synchronizeControls);
  video.addEventListener("pause", synchronizeControls);
  video.addEventListener("canplay", () => video.classList.add("is-ready"));
}

$("#hero-play").addEventListener("click", () => {
  if (heroVideo.error) heroVideo.load();
  if (heroVideo.paused) {
    mediaState.hero.manualPlay = true;
    mediaState.hero.manualPause = false;
    mediaState.preview.wantsPlay = false;
  } else {
    mediaState.hero.manualPause = true;
    mediaState.hero.manualPlay = false;
  }
  reconcilePlayback();
});

function togglePreview() {
  mediaState.preview.wantsPlay = previewVideo.paused;
  reconcilePlayback();
}
$("#preview-play").addEventListener("click", togglePreview);
$("#timeline-play").addEventListener("click", togglePreview);

previewVideo.addEventListener("error", () => {
  previewVideo.classList.remove("is-ready");
  mediaState.preview.wantsPlay = false;
  $("#preview-error").hidden = false;
  synchronizeControls();
});
heroVideo.addEventListener("error", () => {
  heroVideo.classList.remove("is-ready");
  $("#hero-play").setAttribute("aria-label", "重新加载参考片段");
});
$("#retry-video").addEventListener("click", () => {
  $("#preview-error").hidden = true;
  previewVideo.load();
  mediaState.preview.wantsPlay = true;
  reconcilePlayback();
});

function transitionElement(element, keyframes) {
  if (!element.animate) return;
  for (const animation of element.getAnimations()) animation.cancel();
  element.animate(
    motionPaused ? [{ opacity: 0.92 }, { opacity: 1 }] : keyframes,
    { duration: motionPaused ? 100 : 340, easing: "cubic-bezier(.16,1,.3,1)" },
  );
}

let avatarRequest = 0;
let previewHandoff = null;

function holdPreviewFrame() {
  const canvas = document.createElement("canvas");
  canvas.width = 540;
  canvas.height = 960;
  const context = canvas.getContext("2d");
  const poster = $("#preview-poster");
  let source = poster.currentSrc || poster.src;
  try {
    context.drawImage(
      previewVideo.readyState >= 2 &&
        previewVideo.classList.contains("is-ready")
        ? previewVideo
        : poster,
      0,
      0,
      540,
      960,
    );
    if (previewHandoff) {
      context.globalAlpha = Number(getComputedStyle(previewHandoff).opacity);
      context.drawImage(previewHandoff, 0, 0, 540, 960);
    }
    source = canvas.toDataURL();
  } catch {
    /* The existing poster also keeps a complete frame on screen. */
  }
  const frame = new Image(540, 960);
  frame.src = source;
  frame.alt = "";
  frame.className = "preview-handoff";
  frame.setAttribute("aria-hidden", "true");
  return frame;
}

for (const button of $$("[data-avatar]")) {
  button.addEventListener("click", async () => {
    if (button.getAttribute("aria-pressed") === "true") return;
    const request = ++avatarRequest;
    for (const option of $$("[data-avatar]")) {
      const selected = option === button;
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-pressed", String(selected));
    }
    const base = `./assets/avatar-${button.dataset.avatar}`;
    const incoming = new Image();
    incoming.src = `${base}.webp`;
    try {
      await incoming.decode();
    } catch {
      if (request === avatarRequest) $("#preview-error").hidden = false;
      return;
    }
    if (request !== avatarRequest) return;
    previewVideo.pause();
    const outgoing = holdPreviewFrame();
    try {
      await outgoing.decode();
    } catch {
      /* The cached poster is still available underneath. */
    }
    if (request !== avatarRequest) return;
    previewHandoff?.remove();
    previewHandoff = outgoing;
    previewVideo.after(outgoing);
    previewVideo.classList.remove("is-ready");
    previewVideo.src = `${base}.mp4`;
    previewVideo.poster = `${base}.webp`;
    $("#preview-poster").src = incoming.src;
    $("#preview-error").hidden = true;
    $("#playback-progress").value = 0;
    $("#playback-time").textContent = "00:00";
    previewVideo.load();
    if (outgoing.animate) {
      const handoff = outgoing.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: motionPaused ? 100 : 340,
        easing: "cubic-bezier(.16,1,.3,1)",
        fill: "forwards",
      });
      handoff.finished.then(() => {
        outgoing.remove();
        if (previewHandoff === outgoing) previewHandoff = null;
      });
    } else {
      outgoing.remove();
      previewHandoff = null;
    }
    reconcilePlayback();
  });
}

for (const button of $$("[data-subtitle]")) {
  button.addEventListener("click", () => {
    for (const option of $$("[data-subtitle]")) {
      const selected = option === button;
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-pressed", String(selected));
    }
    $("#preview-monitor").dataset.style = button.dataset.subtitle;
  });
}

const captionInput = $("#caption-input");
function updateCaption() {
  const text = captionInput.value;
  $("#caption-count").textContent = `${Array.from(text).length} / 48`;
  $("#preview-caption").textContent = text.trim() || "你的下一句，写在这里。";
}
captionInput.addEventListener("input", updateCaption);
updateCaption();

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(total / 60)
    .toString()
    .padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}
previewVideo.addEventListener("loadedmetadata", () => {
  $("#playback-progress").max = previewVideo.duration;
  $("#playback-duration").textContent = formatTime(previewVideo.duration);
});
previewVideo.addEventListener("timeupdate", () => {
  $("#playback-progress").value = previewVideo.currentTime;
  $("#playback-time").textContent = formatTime(previewVideo.currentTime);
});
$("#playback-progress").addEventListener("input", (event) => {
  if (Number.isFinite(previewVideo.duration)) {
    previewVideo.currentTime = Number(event.target.value);
    $("#playback-time").textContent = formatTime(previewVideo.currentTime);
  } else {
    previewVideo.load();
    $("#playback-progress").value = 0;
  }
});

let currentStep = 0;
const stepTabs = $$("[data-step]");
function setStep(index, animate = true) {
  const changed = index !== currentStep;
  currentStep = index;
  for (const [i, tab] of stepTabs.entries()) {
    const active = index === i;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    $(`#step-panel-${i}`).hidden = !active;
  }
  $("#next-step").firstChild.textContent =
    index === 3 ? "回到第一步" : "看看下一步";
  if (animate && changed)
    transitionElement($(`#step-panel-${index}`), [
      { opacity: 0.75, transform: "translateY(7px)", filter: "blur(1px)" },
      { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
    ]);
}
for (const [index, tab] of stepTabs.entries()) {
  tab.addEventListener("click", () => setStep(index));
  tab.addEventListener("keydown", (event) => {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % stepTabs.length;
    if (event.key === "ArrowLeft")
      next = (index + stepTabs.length - 1) % stepTabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = stepTabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    setStep(next);
    stepTabs[next].focus();
  });
}
$("#next-step").addEventListener("click", () => setStep((currentStep + 1) % 4));
for (const link of $$("[data-jump-step]"))
  link.addEventListener("click", () =>
    setStep(Number(link.dataset.jumpStep), false),
  );

const wave = $(".voice-wave");
for (let i = 0; i < 41; i++) {
  const bar = document.createElement("i");
  bar.style.setProperty(
    "--bar-height",
    `${20 + Math.abs(Math.sin(i * 1.3) * Math.cos(i * 0.18)) * 90}px`,
  );
  bar.style.setProperty("--bar-delay", `${-i * 0.07}s`);
  wave.append(bar);
}
new IntersectionObserver(
  (entries) => {
    for (const entry of entries)
      entry.target.classList.toggle("is-visible", entry.isIntersecting);
  },
  { threshold: 0.1 },
).observe($("#workflow"));

const hero = $(".hero");
const assembly = $("#film-assembly");
let pointerFrame = 0;
if (matchMedia("(pointer:fine)").matches) {
  hero.addEventListener("pointermove", (event) => {
    if (motionPaused) return;
    cancelAnimationFrame(pointerFrame);
    pointerFrame = requestAnimationFrame(() => {
      const box = hero.getBoundingClientRect();
      assembly.style.setProperty(
        "--drift-x",
        `${((event.clientX - box.left) / box.width - 0.5) * 14}px`,
      );
      assembly.style.setProperty(
        "--drift-y",
        `${((event.clientY - box.top) / box.height - 0.5) * 9}px`,
      );
    });
  });
  hero.addEventListener("pointerleave", () => {
    cancelAnimationFrame(pointerFrame);
    assembly.style.setProperty("--drift-x", "0px");
    assembly.style.setProperty("--drift-y", "0px");
  });
}

const menu = $("#mobile-menu");
const menuToggle = $("#menu-toggle");
function closeMenu() {
  menu.hidden = true;
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "打开导航");
  $("use", menuToggle).setAttribute("href", "#i-menu");
}
menuToggle.addEventListener("click", () => {
  const open = menu.hidden;
  menu.hidden = !open;
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
  $("use", menuToggle).setAttribute("href", open ? "#i-close" : "#i-menu");
});
for (const link of $$("a", menu)) link.addEventListener("click", closeMenu);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !menu.hidden) {
    closeMenu();
    menuToggle.focus();
  }
});
document.addEventListener("click", (event) => {
  if (!menu.hidden && !event.target.closest(".header")) closeMenu();
});
matchMedia("(min-width:720px)").addEventListener("change", (event) => {
  if (event.matches) closeMenu();
});
