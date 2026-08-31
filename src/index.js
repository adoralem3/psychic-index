export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({
        status: "ok",
        site: "Psychic Index"
      });
    }

    return env.ASSETS.fetch(request);
  }
};
