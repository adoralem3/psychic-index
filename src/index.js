export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ==========================================
    // DATABASE HEALTH CHECK
    // ==========================================

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

    // ==========================================
    // ADMIN AREA
    // ==========================================

    if (url.pathname.startsWith("/admin/")) {

      // Check that the secret exists
      if (!env.ADMIN_SECRET) {
        return new Response(
          "Admin configuration error: ADMIN_SECRET is not available.",
          {
            status: 500,
            headers: {
              "Content-Type": "text/plain"
            }
          }
        );
      }

      // Remove "/admin/" from the URL
      const suppliedSecret =
        url.pathname.substring(7);

      // Check secret
      if (
        suppliedSecret !==
        String(env.ADMIN_SECRET)
      ) {
        return new Response(
          "Not found.",
          {
            status: 404,
            headers: {
              "Content-Type": "text/plain"
            }
          }
        );
      }

      // ========================================
      // ADMIN DASHBOARD
      // ========================================

      return new Response(
        `<!DOCTYPE html>
<html lang="en">

<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>Psychic Index Admin</title>

  <style>

    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #f5f3f8;
      color: #222;
    }

    header {
      background: white;
      padding: 24px 30px;
      border-bottom: 1px solid #ddd;
    }

    main {
      max-width: 1000px;
      margin: 40px auto;
      padding: 20px;
    }

    .card {
      background: white;
      padding: 35px;
      border-radius: 16px;
      box-shadow:
        0 5px 25px rgba(0,0,0,0.06);
    }

    h1 {
      margin-top: 0;
    }

    .success {
      padding: 15px;
      border-radius: 10px;
      background: #eef8f0;
      margin: 20px 0;
    }

  </style>

</head>

<body>

<header>
  <strong>Psychic Index</strong>
</header>

<main>

  <div class="card">

    <h1>Admin Dashboard</h1>

    <div class="success">
      ✓ You are inside the Psychic Index
      administration area.
    </div>

    <p>
      Your private admin access is working.
    </p>

    <p>
      Next we'll build the actual content
      management system.
    </p>

  </div>

</main>

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

    // ==========================================
    // PUBLIC WEBSITE
    // ==========================================

    return env.ASSETS.fetch(request);
  }
};
