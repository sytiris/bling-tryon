export function createTrialTimer(seconds, onExpire) {
  if (seconds !== 10 && seconds !== 20) throw new Error("仅支持 10 秒或 20 秒");
  let started = false;
  let finished = false;
  let deadline = null;
  let id;
  function expire() {
    if (finished) return;
    finished = true;
    clearTimeout(id);
    onExpire();
  }
  return {
    startFromFirstFrame() {
      if (started) return;
      started = true;
      deadline = Date.now() + seconds * 1000;
      id = setTimeout(expire, seconds * 1000);
    },
    checkDeadline() {
      if (deadline !== null && Date.now() >= deadline) expire();
    },
    cancel() {
      started = true;
      finished = true;
      clearTimeout(id);
    },
  };
}
