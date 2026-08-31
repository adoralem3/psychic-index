import {
  getSession,
  deleteSession,
  clearSessionCookie
} from "./auth.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Database health check
    if (url.pathname === "/api/health") {
      let database = "connected";

      try {
        await env.DB.prepare("SELECT 1").run();
      } catch (error) {
        database = "error";
      }

      return Response.json({
        status: "ok",
        site: "Psychic Index",
        database
      });
    }

    // Admin area
    if (url.pathname === "/admin") {
      const session = await getSession(request, env);

      if (!session) {
        return Response.redirect(
          `${url.origin}/admin/login`,
          302
        );
      }

      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Psychic Index Admin</title>
        </head>
        <body>
          <h1>Psychic Index Admin</h1>
          <p>Welcome, ${escapeHtml(session.email)}</p>
          <p>You are successfully logged in.</p>

          <form method="POST" action="/admin/logout">
            <button type="submit">Log out</button>
          </form>
        </body>
        </html>`,
        {
          headers: {
            "Content-Type": "text/html; charset=UTF-8"
          }
        }
      );
    }

    // Admin logout
    if (
      url.pathname === "/admin/logout" &&
      request.method === "POST"
    ) {
      await deleteSession(request, env);

      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/admin/login",
          "Set-Cookie": clearSessionCookie()
        }
      });
    }

    return env.ASSETS.fetch(request);
  }
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
