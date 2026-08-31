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

    // ================================
    // DATABASE HEALTH CHECK
    // ================================

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

    // ================================
    // TEMPORARY AUTH DIAGNOSTIC
    // ================================

    if (
      url.pathname === "/api/auth-test" &&
      request.method === "POST"
    ) {
      try {
        const formData = await request.formData();

        const email = String(
          formData.get("email") || ""
        )
          .trim()
          .toLowerCase();

        const password = String(
          formData.get("password") || ""
        );

        if (!email || !password) {
          return Response.json(
            {
              status: "error",
              message: "Email and password are required."
            },
            { status: 400 }
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

        if (!admin) {
          return Response.json({
            status: "error",
            account_found: false,
            password_verified: false
          });
        }

        const verified = await verifyPassword(
          password,
          admin.password_hash
        );

        return Response.json({
          status: "ok",
          account_found: true,
          password_verified: verified
        });

      } catch (error) {
        return Response.json(
          {
            status: "error",
            message: "Authentication diagnostic failed."
          },
          { status: 500 }
        );
      }
    }

    // ================================
    // ADMIN LOGIN PAGE
    // ================================

    if (
      url.pathname === "/admin/login" &&
      request.method === "GET"
    ) {
      return new Response(
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>Psychic Index — Admin Login</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: Arial, sans-serif;
      background: #f5f3f8;
    }

    .login-card {
      width: min(420px, calc(100% - 40px));
      background: white;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.08);
    }

    h1 {
      margin: 0 0 8px;
    }

    h2 {
      margin: 0 0 30px;
      font-size: 18px;
      font-weight: normal;
      color: #666;
    }

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: bold;
    }

    input {
      width: 100%;
      padding: 13px;
      margin-bottom: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 16px;
    }

    button {
      width: 100%;
      padding: 14px;
      border: 0;
      border-radius: 8px;
      background: #222;
      color: white;
      font-size: 16px;
      cursor: pointer;
    }
  </style>
</head>

<body>

  <main class="login-card">

    <h1>Psychic Index</h1>

    <h2>Administrator Login</h2>

    <form method="POST" action="/admin/login">

      <label for="email">Email</label>

      <input
        id="email"
        name="email"
        type="email"
        autocomplete="username"
        required
      >

      <label for="password">Password</label>

      <input
        id="password"
        name="password"
        type="password"
        autocomplete="current-password"
        required
      >

      <button type="submit">
        Log in
      </button>

    </form>

  </main>

</body>
</html>`,
        {
          headers: {
            "Content-Type": "text/html; charset=UTF-8"
          }
        }
      );
    }

    // ================================
    // ADMIN LOGIN
    // ================================

    if (
      url.pathname === "/admin/login" &&
      request.method === "POST"
    ) {
      try {
        const formData = await request.formData();

        const email = String(
          formData.get("email") || ""
        )
          .trim()
          .toLowerCase();

        const password = String(
          formData.get("password") || ""
        );

        const admin = await env.DB.prepare(
          `SELECT id, email, password_hash
           FROM admins
           WHERE email = ?
           LIMIT 1`
        )
          .bind(email)
          .first();

        if (!admin) {
          return new Response(
            "Invalid email or password.",
            { status: 401 }
          );
        }

        const valid = await verifyPassword(
          password,
          admin.password_hash
        );

        if (!valid) {
          return new Response(
            "Invalid email or password.",
            { status: 401 }
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

      } catch (error) {
        return new Response(
          "Login system error.",
          { status: 500 }
        );
      }
    }

    // ================================
    // ADMIN DASHBOARD
    // ================================

    if (url.pathname === "/admin") {
      try {
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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Psychic Index Admin</title>
</head>

<body>

  <h1>Psychic Index Admin</h1>

  <p>
    Welcome,
    ${escapeHtml(session.email)}
  </p>

  <p>
    Your administrator account is working.
  </p>

  <form method="POST" action="/admin/logout">
    <button type="submit">Log out</button>
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

      } catch (error) {
        return new Response(
          "Admin system error.",
          { status: 500 }
        );
      }
    }

    // ================================
    // LOGOUT
    // ================================

    if (
      url.pathname === "/admin/logout" &&
      request.method === "POST"
    ) {
      try {
        await deleteSession(request, env);
      } catch (error) {
        // Ignore expired/missing sessions.
      }

      return new Response(null, {
        status: 303,
        headers: {
          Location: "/admin/login",
          "Set-Cookie": clearSessionCookie()
        }
      });
    }

    // ================================
    // PUBLIC WEBSITE
    // ================================

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
