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

    // Temporary admin test page
    if (url.pathname === "/admin-test") {
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

  <p>✓ Admin area is working.</p>

  <p>The next step will be to protect this area with your secret.</p>

</body>
</html>`,
        {
          headers: {
            "Content-Type": "text/html; charset=UTF-8"
          }
        }
      );
    }

    // Public website
    return env.ASSETS.fetch(request);
  }
};
