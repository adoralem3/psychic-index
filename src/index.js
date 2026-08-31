import {
  getSession,
  deleteSession,
  clearSessionCookie
} from "./auth.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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

    if (url.pathname === "/admin") {
      let session;

      try {
        session = await getSession(request, env);
      } catch (error) {
        return Response.json(
          {
            error: "Authentication system error"
          },
          { status: 500 }
        );
      }

      if (!session) {
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
            <p>You are not logged in.</p>
            <p>The login page will be added next.</p>
          </body>
          </html>`,
          {
            status: 401,
            headers: {
              "Content-Type": "text/html; charset=UTF-8"
            }
          }
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

    if (
      url.pathname === "/admin/logout" &&
      request.method === "POST"
    ) {
      await deleteSession(request, env);

      return new Response(null, {
        status: 302,
        headers: {
          Location: "/admin/login",
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
