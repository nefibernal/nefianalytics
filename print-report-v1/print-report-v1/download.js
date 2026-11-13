(function () {
  "use strict";
  const pending = new Map();
  function filename(title, createdAt = new Date()) {
    let name = String(title || "Report")
      .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, "_")
      .trim()
      .replace(/[. ]+$/g, "")
      .slice(0, 120)
      .replace(/[. ]+$/g, "");
    if (!name) name = "Report";
    if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name))
      name = "Report_" + name;
    // Use local time and filename-safe separators (Windows disallows colons).
    const pad = (value) => String(value).padStart(2, "0");
    const stamp =
      createdAt.getFullYear() +
      "-" +
      pad(createdAt.getMonth() + 1) +
      "-" +
      pad(createdAt.getDate()) +
      "_" +
      pad(createdAt.getHours()) +
      "-" +
      pad(createdAt.getMinutes()) +
      "-" +
      pad(createdAt.getSeconds());
    return name + "." + stamp + ".pdf";
  }
  function release(url) {
    if (!pending.has(url)) return;
    clearTimeout(pending.get(url));
    pending.delete(url);
    URL.revokeObjectURL(url);
  }
  function request(report) {
    const doc = PrintPDF.build(report),
      blob = doc.output("blob");
    const url = URL.createObjectURL(blob),
      link = document.createElement("a");
    // Keep the PDF alive while the host starts its download/save operation.
    pending.set(
      url,
      setTimeout(() => release(url), 1800000),
    );
    link.href = url;
    link.download = filename(report.title);
    link.hidden = true;
    document.body.appendChild(link);
    try {
      link.click();
    } catch (error) {
      release(url);
      throw error;
    } finally {
      link.remove();
    }
    // A click requests a download. It does not confirm a save or launch a desktop app.
    return link.download;
  }
  window.addEventListener("beforeunload", () => {
    for (const url of pending.keys()) release(url);
  });
  window.ReportDownload = { request, filename };
})();
