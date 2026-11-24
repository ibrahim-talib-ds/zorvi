"use strict";

const PYODIDE_BASE = new URL("/pyodide/", self.location.origin).href;

let runtimePromise = null;

async function getPyodide() {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const { loadPyodide } = await import(
        PYODIDE_BASE + "pyodide.mjs"
      );

      const pyodide = await loadPyodide({
        indexURL: PYODIDE_BASE,
      });

      pyodide.setStdout({
        batched: (text) => self.postMessage({ type: "stdout", text }),
      });

      pyodide.setStderr({
        batched: (text) => self.postMessage({ type: "stderr", text }),
      });

      pyodide.setStdin({ error: true });

      return pyodide;
    })();
  }

  try {
    return await runtimePromise;
  } catch (error) {
    runtimePromise = null;
    throw error;
  }
}

self.onmessage = async (event) => {
  const code = event.data?.code;
  if (typeof code !== "string") return;

  try {
    const pyodide = await getPyodide();
    const result = await pyodide.runPythonAsync(code);

    if (result !== undefined && result !== null) {
      try {
        const output = String(result);
        if (output) {
          self.postMessage({ type: "result", text: output });
        }
      } finally {
        if (typeof result.destroy === "function") {
          result.destroy();
        }
      }
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      text: error?.message || String(error),
    });
  }

  self.postMessage({ type: "complete" });
};
