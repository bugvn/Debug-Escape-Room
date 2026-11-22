// Shared Python runner. Real Python (Pyodide) lives in a Web Worker, so an
// infinite loop in player code can never freeze the page.
// Used by lesson.html and game-room.html.
//
//   const py = createPyRunner({ onChange: () => updateButtons() });
//   const d = await py.run(code);   // { out, err } | { sys }
//   py.ready / py.failed / py.error / py.startedAt / py.restart()

const PY_VERSION = '0.26.4';
const PY_INDEX = 'https://cdn.jsdelivr.net/pyodide/v' + PY_VERSION + '/full/';
const PY_TIMEOUT_MS = 5000;

const PY_WORKER_SRC = `importScripts('${PY_INDEX}pyodide.js');
const ready = loadPyodide({ indexURL: '${PY_INDEX}' });
ready.then(() => postMessage({ ready: true }), e => postMessage({ fatal: String(e) }));
onmessage = async e => {
  const { id, code } = e.data; let out = '', g;
  try {
    const py = await ready;
    py.setStdout({ batched: s => out += s + '\\n' });
    py.setStderr({ batched: s => out += s + '\\n' });
    g = py.globals.get('dict')();
    await py.runPythonAsync(code, { globals: g });
    postMessage({ id, out });
  } catch (err) { postMessage({ id, out, err: String(err.message || err) }); }
  finally { if (g) g.destroy(); }
};`;

function createPyRunner(hooks) {
  let worker = null, pending = null, ready = false, failed = false, error = '';
  let reqId = 0, chain = Promise.resolve(), startedAt = Date.now();
  // async on purpose: start() runs while createPyRunner() is still returning, so the caller's
  // `const py = ...` is not ready yet. Calling onChange right away would crash the page.
  const changed = () => setTimeout(() => { if (hooks && hooks.onChange) hooks.onChange(); }, 0);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function start() {
    ready = false; failed = false; error = ''; startedAt = Date.now(); changed();
    try {
      worker = new Worker(URL.createObjectURL(new Blob([PY_WORKER_SRC], { type: 'text/javascript' })));
      worker.onmessage = (e) => {
        const d = e.data;
        if (d.ready) { ready = true; changed(); }
        else if (d.fatal) { failed = true; error = d.fatal; changed(); }
        else if (pending && d.id === pending.id) pending.done(d);
      };
      worker.onerror = (e) => {
        failed = true; error = e.message || 'worker error'; changed();
        if (pending) pending.done({ sys: 'Python crashed: ' + error });
      };
    } catch (e) { worker = null; failed = true; error = String(e); changed(); }
  }

  async function runOnce(code) {
    while (!ready && !failed) await wait(200);
    if (failed || !worker) return { sys: 'Python is not available: ' + error };
    return new Promise((res) => {
      const id = ++reqId;
      const timer = setTimeout(() => {
        pending = null; worker.terminate(); start();
        res({ err: 'TimeoutError: the code ran for more than ' + (PY_TIMEOUT_MS / 1000) + ' seconds. Check for an infinite loop.' });
      }, PY_TIMEOUT_MS);
      pending = { id, done: (d) => { clearTimeout(timer); pending = null; res(d); } };
      worker.postMessage({ id, code });
    });
  }

  start();
  return {
    get ready() { return ready; },
    get failed() { return failed; },
    get error() { return error; },
    get startedAt() { return startedAt; },
    restart() { if (worker) worker.terminate(); pending = null; start(); },
    // one run at a time, so two clicks can never swallow each other's result
    run(code) { const p = chain.then(() => runOnce(code)); chain = p.catch(() => {}); return p; }
  };
}