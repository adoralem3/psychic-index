import {
  getSession,
  deleteSession,
  verifyPassword,
  createSession,
  sessionCookie,
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
if (
  url.pathname === "/admin/login" &&
  request.method === "GET"
) {
  return env.ASSETS.fetch(
    new Request(
      new URL("/admin-login.html", request.url)
    )
  );
}
    // Admin login submission
    if (
      url.pathname === "/admin/login" &&
      request.method === "POST"
    ) {
      const formData = await request.formData();

      const email = String(
        formData.get("email") || ""
      ).trim().toLowerCase();

      const password = String(
        formData.get("password") || ""
      );

      if (!email || !password) {
        return Response.redirect(
          `${url.origin}/admin/login?error=1`,
          303
        );
      }

      const admin = await env.DB.prepare(
        `SELECT id, email, password_hash
         FROM admins
         WHERE email = ?
         LIMIT 1`
      )
        .bind(email)
        .first();

      if (
        !admin ||
        !(await verifyPassword(
          password,
          admin.password_hash
        ))
      ) {
        return Response.redirect(
          `${url.origin}/admin/login?error=1`,
          303
        );
      }

      const session = await createSession(
        env,
        admin.id
      );

      return new Response(null, {
        status: 303,
        headers: {
          Location: "/admin",
          "Set-Cookie": sessionCookie(
            session.token,
            session.expiresAt
          )
        }
      });
    }

    // Admin dashboard
    if (url.pathname === "/admin") {
      const session = await getSession(
        request,
        env
      );

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
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          >
          <title>Psychic Index Admin</title>
        </head>

        <body>

          <h1>Psychic Index Admin</h1>

          <p>
            Welcome,
            ${escapeHtml(session.email)}
          </p>

          <p>
            You are successfully logged in.
          </p>

          <form
            method="POST"
            action="/admin/logout"
          >
            <button type="submit">
              Log out
            </button>
          </form>

        </body>
        </html>`,
        {
          headers: {
            "Content-Type":
              "text/html; charset=UTF-8"
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
        status: 303,
        headers: {
          Location: "/admin/login",
          "Set-Cookie":
            clearSessionCookie()
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
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}
