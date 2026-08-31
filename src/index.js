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
    // SIMPLE ADMIN ACCESS
    // ==========================================

    const adminPath = "/admin/" + env.ADMIN_SECRET;

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
      padding: 25px;
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

    .status {
      padding: 15px;
      background: #f0f7f1;
      border-radius: 10px;
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

    <div class="status">
      ✓ You have successfully accessed the
      Psychic Index administration area.
    </div>

    <p>
      This is the beginning of your website
      administration system.
    </p>

    <p>
      From here we'll eventually be able to
      create articles, manage psychic websites,
      upload images, edit ratings and manage
      the entire Psychic Index website.
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
