const ADMIN_KEY = "PX9-vQ72-Lm4!zK81-Rt6";

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
    // SIMPLE ADMIN AREA
    // ==========================================

    const adminPrefix = "/admin/";
    const adminPath = adminPrefix + ADMIN_KEY;

    if (url.pathname === adminPath) {
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
      box-shadow: 0 5px 25px rgba(0,0,0,0.06);
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
      ✓ You are inside the Psychic Index administration area.
    </div>

    <p>
      Your private admin access is working.
    </p>

    <p>
      This is where we'll build your content management system.
    </p>

    <h2>Coming next</h2>

    <ul>
      <li>Article editor</li>
      <li>Image uploads</li>
      <li>Psychic website listings</li>
      <li>Ratings and reviews</li>
      <li>Categories</li>
      <li>SEO fields</li>
    </ul>

  </div>

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

    // ==========================================
    // EVERYTHING ELSE
    // ==========================================

    return env.ASSETS.fetch(request);
  }
};
