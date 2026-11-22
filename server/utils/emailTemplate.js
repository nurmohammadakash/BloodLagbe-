const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

const brandEmail = ({ heading, name, paragraphs = [], reason = null }) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;background:#ffffff;border:1px solid #eeeeee;border-radius:12px">
  <h2 style="color:#e50914;margin-top:0">🩸 Blood-Lagbe</h2>
  <h3 style="margin-bottom:6px">${esc(heading)}</h3>
  <p>Hello ${esc(name)},</p>
  ${paragraphs.map((p) => `<p style="line-height:1.6">${esc(p)}</p>`).join("")}
  ${reason ? `<div style="background:#fff5f5;border-left:4px solid #e50914;padding:12px 16px;margin:16px 0"><strong>Reason:</strong> ${esc(reason)}</div>` : ""}
  <p style="color:#777777;font-size:13px">If you think this was a mistake, please reply to this email.</p>
</div>`;

module.exports = { brandEmail };