const API_BASE = "/api";

export async function uploadHeadshot(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/upload-headshot`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new Error("Failed to upload headshot");
  }
  return res.json();
}

export async function createJob({ prompt, numThumbnails, headshotUrl }) {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      num_thumbnails: numThumbnails,
      headshot_url: headshotUrl,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Failed to create job");
  }
  return res.json();
}

function dispatchStreamEvent(eventType, data, handlers) {
  try {
    const parsed = JSON.parse(data);
    if (eventType === "thumbnail_ready") {
      handlers.onThumbnailReady?.(parsed);
    } else if (eventType === "thumbnail_failed") {
      handlers.onThumbnailFailed?.(parsed);
    } else if (eventType === "job_completed") {
      handlers.onJobComplete?.(parsed);
      return true;
    } else if (eventType === "error") {
      handlers.onError?.(parsed);
      return true;
    }
  } catch {
    handlers.onError?.(new Error("Invalid stream data"));
    return true;
  }
  return false;
}

export function subscribeToJob(jobId, { onThumbnailReady, onThumbnailFailed, onJobComplete, onError }) {
  const controller = new AbortController();
  const handlers = { onThumbnailReady, onThumbnailFailed, onJobComplete, onError };

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}/stream`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error("Failed to connect to job stream");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let eventType = "";
      let dataLines = [];

      const flush = () => {
        if (!dataLines.length) {
          eventType = "";
          return false;
        }
        const data = dataLines.join("\n");
        const done = dispatchStreamEvent(eventType, data, handlers);
        eventType = "";
        dataLines = [];
        return done;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line === "") {
            if (flush()) return;
            continue;
          }

          const eventMatch = line.match(/^event\s*:\s*(.*)$/i);
          const dataMatch = line.match(/^data\s*:\s*(.*)$/i);

          if (eventMatch) {
            if (dataLines.length && flush()) return;
            eventType = eventMatch[1].trim();
          } else if (dataMatch) {
            dataLines.push(dataMatch[1].trim());
          }
        }
      }

      flush();
    } catch (err) {
      if (err.name !== "AbortError") {
        onError?.(err);
      }
    }
  })();

  return {
    close: () => controller.abort(),
  };
}
