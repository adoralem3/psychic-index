export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /*
     * PUBLIC ARTICLE API
     *
     * GET /api/articles
     *
     * Returns published articles from D1.
     */

    if (url.pathname === "/api/articles") {
      try {
        const result = await env.DB
          .prepare(`
            SELECT
              id,
              title,
              slug,
              excerpt,
              content,
              featured_image,
              category,
              seo_title,
              seo_description,
              status,
              created_at,
              updated_at,
              published_at
            FROM articles
            WHERE status = 'published'
            ORDER BY
              COALESCE(published_at, created_at) DESC
            LIMIT 20
          `)
          .all();

        return new Response(
          JSON.stringify({
            status: "ok",
            articles: result.results || []
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=UTF-8",
              "Cache-Control": "public, max-age=60"
            }
          }
        );

      } catch (error) {

        console.error(
          "ARTICLE API ERROR:",
          error
        );

        return new Response(
          JSON.stringify({
            status: "error",
            message: "Could not load articles."
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json; charset=UTF-8"
            }
          }
        );
      }
    }


    /*
     * PUBLIC SINGLE ARTICLE API
     *
     * GET /api/articles/:slug
     */

    if (
      url.pathname.startsWith("/api/articles/")
    ) {

      const slug =
        decodeURIComponent(
          url.pathname.substring(
            "/api/articles/".length
          )
        );

      if (!slug) {
        return new Response(
          JSON.stringify({
            status: "error",
            message: "Article slug is missing."
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
      }

      try {

        const article =
          await env.DB
            .prepare(`
              SELECT
                id,
                title,
                slug,
                excerpt,
                content,
                featured_image,
                category,
                seo_title,
                seo_description,
                status,
                created_at,
                updated_at,
                published_at
              FROM articles
              WHERE slug = ?
                AND status = 'published'
              LIMIT 1
            `)
            .bind(slug)
            .first();

        if (!article) {

          return new Response(
            JSON.stringify({
              status: "error",
              message: "Article not found."
            }),
            {
              status: 404,
              headers: {
                "Content-Type":
                  "application/json"
              }
            }
          );
        }

        return new Response(
          JSON.stringify({
            status: "ok",
            article
          }),
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/json; charset=UTF-8",
              "Cache-Control":
                "public, max-age=60"
            }
          }
        );

      } catch (error) {

        console.error(
          "SINGLE ARTICLE API ERROR:",
          error
        );

        return new Response(
          JSON.stringify({
            status: "error",
            message: "Could not load article."
          }),
          {
            status: 500,
            headers: {
              "Content-Type":
                "application/json; charset=UTF-8"
            }
          }
        );
      }
    }


    /*
     * EVERYTHING ELSE
     *
     * Send normal website requests to
     * the files inside /public.
     */

    return env.ASSETS.fetch(request);
  }
};
