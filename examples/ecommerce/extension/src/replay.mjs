export function createReplay(stage, locale) {
  const $ = id => document.getElementById(id);
  const video = $("replay");
  const seek = $("replay-seek");
  const play = $("replay-play");
  let url = null;
  let seconds = 0;
  let extension = "webm";
  const clock = value => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
  function render() {
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : seconds;
    seek.max = duration || 1;
    seek.value = Math.min(video.currentTime || 0, duration);
    $("replay-time").textContent = clock(video.ended ? Math.round(duration) : video.currentTime || 0) + " / " + clock(Math.round(duration));
    const key = video.ended ? "重新播放" : video.paused ? "播放回放" : "暂停回放";
    for (const attribute of ["title", "aria-label"]) {
      play.setAttribute("data-i18n-" + attribute, key);
      play.setAttribute(attribute, locale.t(key));
    }
    play.dataset.playing = String(!video.paused);
    stage.classList.toggle("replay-paused", Boolean(url && video.paused));
  }
  function clear() {
    const previous = url;
    url = null;
    video.pause();
    video.removeAttribute("src");
    video.load();
    if (previous) URL.revokeObjectURL(previous);
    $("replay-controls").hidden = true;
    $("replay-badge").hidden = true;
    stage.classList.remove("replaying", "replay-paused");
  }
  function resume() {
    if (!url) return;
    if (video.ended) video.currentTime = 0;
    void video.play().catch(() => render());
  }
  play.addEventListener("click", () => { if (video.paused) resume(); else video.pause(); });
  $("replay-stop").addEventListener("click", () => {
    video.pause();
    video.currentTime = 0;
    render();
  });
  $("replay-close").addEventListener("click", clear);
  $("replay-download").addEventListener("click", () => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = `bling-tryon-${new Date().toISOString().replace(/[:.]/g, "-")}.${extension}`;
    document.body.append(link);
    link.click();
    link.remove();
  });
  seek.addEventListener("input", () => {
    if (!url) return;
    video.currentTime = Number(seek.value);
    render();
  });
  for (const event of ["play", "pause", "ended", "timeupdate", "loadedmetadata", "durationchange"]) video.addEventListener(event, render);
  return {
    clear,
    show(blob, duration) {
      clear();
      seconds = duration;
      extension = blob.type.includes("mp4") ? "mp4" : "webm";
      url = URL.createObjectURL(blob);
      video.src = url;
      video.loop = false;
      $("replay-controls").hidden = false;
      $("replay-badge").hidden = false;
      stage.classList.add("replaying");
      render();
      resume();
    },
  };
}
