const ADMIN_KEY = "PX9-vQ72-Lm4!zK81-Rt6";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const adminPath = "/admin/" + ADMIN_KEY;

    // ==========================================
    // DATABASE HEALTH
    // ==========================================

    if (url.pathname === "/api/health") {
      try {
        await env.DB.prepare("SELECT 1").run();

        return Response.json({
          status: "ok",
          site: "Psychic Index",
          database: "connected"
        });
      } catch (error) {
        return Response.json(
          {
            status: "error",
            site: "Psychic Index",
            database: "error",
            message: errorMessage(error)
          },
          { status: 500 }
        );
      }
    }

    // ==========================================
    // PUBLIC ARTICLE API
    // ==========================================

    if (url.pathname === "/api/articles") {
      try {
        const result = await env.DB.prepare(`
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
          ORDER BY COALESCE(published_at, created_at) DESC
          LIMIT 20
        `).all();

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

    // ==========================================
    // PUBLIC SINGLE ARTICLE API
    // ==========================================

    if (url.pathname.startsWith("/api/articles/")) {
      const slug = decodeURIComponent(
        url.pathname.substring("/api/articles/".length)
      ).replace(/\/$/, "");

      if (!slug) {
        return Response.json(
          {
            status: "error",
            message: "Article slug is missing."
          },
          { status: 400 }
        );
      }

      try {
        const article = await env.DB.prepare(`
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
          return Response.json(
            {
              status: "error",
              message: "Article not found."
            },
            { status: 404 }
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
              "Content-Type": "application/json; charset=UTF-8",
              "Cache-Control": "public, max-age=60"
            }
          }
        );
      } catch (error) {
        return Response.json(
          {
            status: "error",
            message: "Could not load article."
          },
          { status: 500 }
        );
      }
    }

    // ==========================================
    // ADMIN DASHBOARD
    // ==========================================

    if (url.pathname === adminPath) {
      return await adminDashboard(env, adminPath);
    }

    // ==========================================
    // ADMIN ARTICLES
    // ==========================================

    if (url.pathname === adminPath + "/articles") {
      return await articlesPage(env, adminPath);
    }

    // ==========================================
    // NEW ARTICLE
    // ==========================================

    if (url.pathname === adminPath + "/articles/new") {
      return newArticlePage(adminPath);
    }

    // ==========================================
    // CREATE ARTICLE
    // ==========================================

    if (
      url.pathname === adminPath + "/articles/create" &&
      request.method === "POST"
    ) {
      return await createArticle(request, env, adminPath);
    }

    // ==========================================
    // EDIT ARTICLE
    // ==========================================

    if (url.pathname === adminPath + "/articles/edit") {
      const id = url.searchParams.get("id");

      if (!id) {
        return new Response("Article ID is missing.", {
          status: 400
        });
      }

      return await editArticlePage(env, adminPath, id);
    }

    // ==========================================
    // UPDATE ARTICLE
    // ==========================================

    if (
      url.pathname === adminPath + "/articles/update" &&
      request.method === "POST"
    ) {
      return await updateArticle(request, env, adminPath);
    }

    // ==========================================
    // DELETE ARTICLE
    // ==========================================

    if (
      url.pathname === adminPath + "/articles/delete" &&
      request.method === "POST"
    ) {
      return await deleteArticle(request, env, adminPath);
    }

    // ==========================================
    // PUBLIC ARTICLE PAGE
    // ==========================================

    if (url.pathname.startsWith("/articles/")) {
      const slug = url.pathname
        .substring("/articles/".length)
        .replace(/\/$/, "");

      if (!slug) {
        return env.ASSETS.fetch(request);
      }

      try {
        const article = await env.DB.prepare(`
          SELECT *
          FROM articles
          WHERE slug = ?
            AND status = 'published'
          LIMIT 1
        `)
          .bind(slug)
          .first();

        if (!article) {
          return new Response("Article not found.", {
            status: 404
          });
        }

        return articlePage(article);
      } catch (error) {
        return new Response(
          "Could not load article.\n\n" +
            errorMessage(error),
          {
            status: 500,
            headers: {
              "Content-Type": "text/plain; charset=UTF-8"
            }
          }
        );
      }
    }

    // ==========================================
    // EVERYTHING ELSE
    // ==========================================

    return env.ASSETS.fetch(request);
  }
};


// ==========================================
// ADMIN DASHBOARD
// ==========================================

async function adminDashboard(env, adminPath) {
  try {
    const stats = await env.DB.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(
          CASE
            WHEN status = 'published' THEN 1
            ELSE 0
          END
        ) AS published,
        SUM(
          CASE
            WHEN status = 'draft' THEN 1
            ELSE 0
          END
        ) AS drafts
      FROM articles
    `).first();

    const recent = await env.DB.prepare(`
      SELECT
        id,
        title,
        category,
        status,
        updated_at
      FROM articles
      ORDER BY updated_at DESC
      LIMIT 6
    `).all();

    let recentRows = "";

    for (const article of recent.results || []) {
      recentRows += `
        <tr>
          <td>
            <a
              class="article-link"
              href="${adminPath}/articles/edit?id=${article.id}"
            >
              ${escapeHtml(article.title)}
            </a>
          </td>

          <td>
            ${escapeHtml(article.category || "Uncategorized")}
          </td>

          <td>
            ${statusBadge(article.status)}
          </td>

          <td>
            ${escapeHtml(formatDate(article.updated_at))}
          </td>
        </tr>
      `;
    }

    if (!recentRows) {
      recentRows = `
        <tr>
          <td colspan="4" class="empty">
            No articles yet.
          </td>
        </tr>
      `;
    }

    return new Response(
      adminLayout(
        "Dashboard",
        "dashboard",
        adminPath,
        `
          <div class="welcome-row">
            <div>
              <div class="eyebrow">ADMINISTRATION</div>

              <h1>Good afternoon</h1>

              <p>
                Welcome back to your Psychic Index dashboard.
              </p>
            </div>

            <a
              class="primary-button"
              href="${adminPath}/articles/new"
            >
              <span>+</span>
              New Article
            </a>
          </div>

          <div class="stats-grid">

            <div class="stat-card">
              <div class="stat-icon purple">✦</div>

              <div>
                <div class="stat-number">
                  ${stats?.total || 0}
                </div>

                <div class="stat-label">
                  Total Articles
                </div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon green">✓</div>

              <div>
                <div class="stat-number">
                  ${stats?.published || 0}
                </div>

                <div class="stat-label">
                  Published
                </div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon amber">◷</div>

              <div>
                <div class="stat-number">
                  ${stats?.drafts || 0}
                </div>

                <div class="stat-label">
                  Draft Articles
                </div>
              </div>
            </div>

          </div>

          <div class="content-grid">

            <section class="panel large-panel">

              <div class="panel-header">
                <div>
                  <h2>Recent Articles</h2>

                  <p>
                    Your latest content activity
                  </p>
                </div>

                <a
                  class="text-link"
                  href="${adminPath}/articles"
                >
                  View all
                </a>
              </div>

              <div class="table-wrapper">

                <table>

                  <thead>
                    <tr>
                      <th>Article</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Updated</th>
                    </tr>
                  </thead>

                  <tbody>
                    ${recentRows}
                  </tbody>

                </table>

              </div>

            </section>

            <section class="panel">

              <div class="panel-header">
                <div>
                  <h2>Quick Actions</h2>

                  <p>
                    Manage your website
                  </p>
                </div>
              </div>

              <div class="quick-actions">

                <a
                  href="${adminPath}/articles/new"
                  class="quick-action"
                >
                  <div class="quick-icon">✎</div>

                  <div>
                    <strong>Write an article</strong>
                    <span>Create new content</span>
                  </div>

                  <span class="arrow">→</span>
                </a>

                <a
                  href="${adminPath}/articles"
                  class="quick-action"
                >
                  <div class="quick-icon">☰</div>

                  <div>
                    <strong>Manage articles</strong>
                    <span>Edit existing content</span>
                  </div>

                  <span class="arrow">→</span>
                </a>

                <div class="quick-action disabled">
                  <div class="quick-icon">♢</div>

                  <div>
                    <strong>Psychic listings</strong>
                    <span>Coming soon</span>
                  </div>
                </div>

                <div class="quick-action disabled">
                  <div class="quick-icon">★</div>

                  <div>
                    <strong>Reviews</strong>
                    <span>Coming soon</span>
                  </div>
                </div>

              </div>

            </section>

          </div>
        `
      ),
      {
        headers: {
          "Content-Type": "text/html; charset=UTF-8"
        }
      }
    );
  } catch (error) {
    return new Response(
      "Dashboard database error:\n\n" +
        errorMessage(error),
      {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=UTF-8"
        }
      }
    );
  }
}


// ==========================================
// ARTICLES PAGE
// ==========================================

async function articlesPage(env, adminPath) {
  try {
    const result = await env.DB.prepare(`
      SELECT
        id,
        title,
        slug,
        featured_image,
        category,
        status,
        created_at,
        updated_at
      FROM articles
      ORDER BY updated_at DESC
    `).all();

    let rows = "";

    for (const article of result.results || []) {
      rows += `
        <tr>

          <td>

            <div class="article-title-cell">

              <div class="article-thumbnail">

                ${
                  article.featured_image
                    ? `
                      <img
                        src="${escapeHtml(article.featured_image)}"
                        alt=""
                      >
                    `
                    : "✦"
                }

              </div>

              <div>

                <a
                  class="article-link"
                  href="${adminPath}/articles/edit?id=${article.id}"
                >
                  ${escapeHtml(article.title)}
                </a>

                <div class="slug">
                  /articles/${escapeHtml(article.slug)}
                </div>

              </div>

            </div>

          </td>

          <td>
            ${escapeHtml(article.category || "Uncategorized")}
          </td>

          <td>
            ${statusBadge(article.status)}
          </td>

          <td>
            ${escapeHtml(formatDate(article.updated_at))}
          </td>

          <td>

            <div class="table-actions">

              <a
                class="icon-button"
                href="${adminPath}/articles/edit?id=${article.id}"
                title="Edit"
              >
                ✎
              </a>

              <form
                method="POST"
                action="${adminPath}/articles/delete"
                onsubmit="return confirm('Are you sure you want to delete this article?');"
              >

                <input
                  type="hidden"
                  name="id"
                  value="${escapeHtml(article.id)}"
                >

                <button
                  class="icon-button danger"
                  type="submit"
                  title="Delete"
                >
                  ×
                </button>

              </form>

            </div>

          </td>

        </tr>
      `;
    }

    if (!rows) {
      rows = `
        <tr>
          <td colspan="5" class="empty">

            <div class="empty-state">

              <div class="empty-icon">
                ✦
              </div>

              <h3>
                No articles yet
              </h3>

              <p>
                Start building your Psychic Index content.
              </p>

              <a
                class="primary-button"
                href="${adminPath}/articles/new"
              >
                Create your first article
              </a>

            </div>

          </td>
        </tr>
      `;
    }

    return new Response(
      adminLayout(
        "Articles",
        "articles",
        adminPath,
        `
          <div class="page-title-row">

            <div>
              <div class="eyebrow">
                CONTENT
              </div>

              <h1>Articles</h1>

              <p>
                Create and manage your Psychic Index content.
              </p>
            </div>

            <a
              class="primary-button"
              href="${adminPath}/articles/new"
            >
              <span>+</span>
              New Article
            </a>

          </div>

          <section class="panel">

            <div class="article-toolbar">

              <div class="search-box">

                <span>⌕</span>

                <input
                  id="articleSearch"
                  type="search"
                  placeholder="Search articles..."
                  oninput="filterArticles()"
                >

              </div>

              <select
                id="statusFilter"
                onchange="filterArticles()"
              >
                <option value="">
                  All statuses
                </option>

                <option value="published">
                  Published
                </option>

                <option value="draft">
                  Draft
                </option>
              </select>

            </div>

            <div class="table-wrapper">

              <table id="articlesTable">

                <thead>

                  <tr>
                    <th>Article</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th></th>
                  </tr>

                </thead>

                <tbody>
                  ${rows}
                </tbody>

              </table>

            </div>

          </section>

          <script>
            function filterArticles() {
              const search =
                document
                  .getElementById("articleSearch")
                  .value
                  .toLowerCase();

              const status =
                document
                  .getElementById("statusFilter")
                  .value
                  .toLowerCase();

              const rows =
                document.querySelectorAll(
                  "#articlesTable tbody tr"
                );

              rows.forEach(function(row) {
                const text =
                  row.innerText.toLowerCase();

                const matchesSearch =
                  !search ||
                  text.includes(search);

                const matchesStatus =
                  !status ||
                  text.includes(status);

                row.style.display =
                  matchesSearch &&
                  matchesStatus
                    ? ""
                    : "none";
              });
            }
          </script>
        `
      ),
      {
        headers: {
          "Content-Type": "text/html; charset=UTF-8"
        }
      }
    );
  } catch (error) {
    return new Response(
      "Articles database error:\n\n" +
        errorMessage(error),
      {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=UTF-8"
        }
      }
    );
  }
}


// ==========================================
// NEW ARTICLE PAGE
// ==========================================

function newArticlePage(adminPath) {
  return new Response(
    adminLayout(
      "New Article",
      "articles",
      adminPath,
      `
        <div class="page-title-row">

          <div>
            <div class="eyebrow">
              CONTENT
            </div>

            <h1>New Article</h1>

            <p>
              Create a new article for Psychic Index.
            </p>
          </div>

          <a
            class="secondary-button"
            href="${adminPath}/articles"
          >
            ← Back to Articles
          </a>

        </div>

        ${articleForm(
          adminPath + "/articles/create",
          null
        )}
      `
    ),
    {
      headers: {
        "Content-Type": "text/html; charset=UTF-8"
      }
    }
  );
}


// ==========================================
// CREATE ARTICLE
// ==========================================

async function createArticle(request, env, adminPath) {
  try {
    const form = await request.formData();

    const title =
      String(form.get("title") || "").trim();

    const slug =
      createSlug(
        String(form.get("slug") || title)
      );

    const excerpt =
      String(form.get("excerpt") || "").trim();

    const content =
      String(form.get("content") || "");

    const category =
      String(form.get("category") || "").trim();

    const featuredImage =
      String(
        form.get("featured_image") || ""
      ).trim();

    const seoTitle =
      String(form.get("seo_title") || "").trim();

    const seoDescription =
      String(
        form.get("seo_description") || ""
      ).trim();

    const status =
      form.get("status") === "published"
        ? "published"
        : "draft";

    if (!title) {
      return new Response(
        "Article title is required.",
        { status: 400 }
      );
    }

    if (!slug) {
      return new Response(
        "A valid URL slug is required.",
        { status: 400 }
      );
    }

    const duplicate =
      await env.DB.prepare(`
        SELECT id
        FROM articles
        WHERE slug = ?
        LIMIT 1
      `)
        .bind(slug)
        .first();

    if (duplicate) {
      return new Response(
        "An article already uses this slug.",
        { status: 409 }
      );
    }

    const publishedAt =
      status === "published"
        ? new Date().toISOString()
        : null;

    await env.DB.prepare(`
      INSERT INTO articles
      (
        title,
        slug,
        excerpt,
        content,
        featured_image,
        category,
        seo_title,
        seo_description,
        status,
        published_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        title,
        slug,
        excerpt,
        content,
        featuredImage,
        category,
        seoTitle,
        seoDescription,
        status,
        publishedAt
      )
      .run();

    return Response.redirect(
      new URL(
        adminPath + "/articles",
        request.url
      ).toString(),
      303
    );
  } catch (error) {
    return new Response(
      "Could not save article.\n\n" +
        "DATABASE ERROR:\n\n" +
        errorMessage(error),
      {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=UTF-8"
        }
      }
    );
  }
}


// ==========================================
// EDIT ARTICLE PAGE
// ==========================================

async function editArticlePage(env, adminPath, id) {
  try {
    const article =
      await env.DB.prepare(`
        SELECT *
        FROM articles
        WHERE id = ?
        LIMIT 1
      `)
        .bind(id)
        .first();

    if (!article) {
      return new Response(
        "Article not found.",
        { status: 404 }
      );
    }

    return new Response(
      adminLayout(
        "Edit Article",
        "articles",
        adminPath,
        `
          <div class="page-title-row">

            <div>
              <div class="eyebrow">
                CONTENT
              </div>

              <h1>Edit Article</h1>

              <p>
                Update your article and SEO information.
              </p>
            </div>

            <a
              class="secondary-button"
              href="${adminPath}/articles"
            >
              ← Back to Articles
            </a>

          </div>

          ${articleForm(
            adminPath + "/articles/update",
            article
          )}
        `
      ),
      {
        headers: {
          "Content-Type": "text/html; charset=UTF-8"
        }
      }
    );
  } catch (error) {
    return new Response(
      "Could not load article.\n\n" +
        "DATABASE ERROR:\n\n" +
        errorMessage(error),
      {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=UTF-8"
        }
      }
    );
  }
}


// ==========================================
// UPDATE ARTICLE
// ==========================================

async function updateArticle(request, env, adminPath) {
  try {
    const form = await request.formData();

    const id =
      String(form.get("id") || "").trim();

    const title =
      String(form.get("title") || "").trim();

    const slug =
      createSlug(
        String(form.get("slug") || title)
      );

    const excerpt =
      String(form.get("excerpt") || "").trim();

    const content =
      String(form.get("content") || "");

    const category =
      String(form.get("category") || "").trim();

    const featuredImage =
      String(
        form.get("featured_image") || ""
      ).trim();

    const seoTitle =
      String(form.get("seo_title") || "").trim();

    const seoDescription =
      String(
        form.get("seo_description") || ""
      ).trim();

    const status =
      form.get("status") === "published"
        ? "published"
        : "draft";

    if (!id) {
      return new Response(
        "Update error: Article ID is missing.",
        { status: 400 }
      );
    }

    if (!title) {
      return new Response(
        "Update error: Article title is missing.",
        { status: 400 }
      );
    }

    if (!slug) {
      return new Response(
        "Update error: Article slug is missing.",
        { status: 400 }
      );
    }

    const existing =
      await env.DB.prepare(`
        SELECT
          id,
          slug,
          published_at
        FROM articles
        WHERE id = ?
        LIMIT 1
      `)
        .bind(id)
        .first();

    if (!existing) {
      return new Response(
        "Update error: Article was not found.",
        { status: 404 }
      );
    }

    const duplicate =
      await env.DB.prepare(`
        SELECT id
        FROM articles
        WHERE slug = ?
          AND id != ?
        LIMIT 1
      `)
        .bind(slug, id)
        .first();

    if (duplicate) {
      return new Response(
        "Update error: Another article already uses the slug '" +
          slug +
          "'.",
        { status: 409 }
      );
    }

    let publishedAt =
      existing.published_at || null;

    if (status === "published" && !publishedAt) {
      publishedAt =
        new Date().toISOString();
    }

    if (status === "draft") {
      publishedAt = null;
    }

    const result =
      await env.DB.prepare(`
        UPDATE articles
        SET
          title = ?,
          slug = ?,
          excerpt = ?,
          content = ?,
          featured_image = ?,
          category = ?,
          seo_title = ?,
          seo_description = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP,
          published_at = ?
        WHERE id = ?
      `)
        .bind(
          title,
          slug,
          excerpt,
          content,
          featuredImage,
          category,
          seoTitle,
          seoDescription,
          status,
          publishedAt,
          id
        )
        .run();

    if (
      result.meta &&
      result.meta.changes === 0
    ) {
      return new Response(
        "Update ran but no database row was changed.",
        { status: 500 }
      );
    }

    return Response.redirect(
      new URL(
        adminPath + "/articles",
        request.url
      ).toString(),
      303
    );
  } catch (error) {
    return new Response(
      "COULD NOT UPDATE ARTICLE.\n\n" +
        "REAL DATABASE ERROR:\n\n" +
        errorMessage(error),
      {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=UTF-8"
        }
      }
    );
  }
}


// ==========================================
// DELETE ARTICLE
// ==========================================

async function deleteArticle(request, env, adminPath) {
  try {
    const form =
      await request.formData();

    const id =
      String(form.get("id") || "").trim();

    if (!id) {
      return new Response(
        "Article ID is missing.",
        { status: 400 }
      );
    }

    await env.DB.prepare(`
      DELETE FROM articles
      WHERE id = ?
    `)
      .bind(id)
      .run();

    return Response.redirect(
      new URL(
        adminPath + "/articles",
        request.url
      ).toString(),
      303
    );
  } catch (error) {
    return new Response(
      "Could not delete article.\n\n" +
        errorMessage(error),
      {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=UTF-8"
        }
      }
    );
  }
}


// ==========================================
// ARTICLE FORM
// ==========================================

function articleForm(action, article) {
  const value = (field) =>
    escapeHtml(article?.[field] || "");

  const selected = (status) =>
    article?.status === status
      ? "selected"
      : "";

  return `
    <form
      method="POST"
      action="${action}"
      class="editor-layout"
    >

      <div class="editor-main">

        <section class="panel">

          <div class="panel-header">

            <div>
              <h2>Article Content</h2>

              <p>
                Write the main content of your article.
              </p>
            </div>

          </div>

          ${
            article
              ? `
                <input
                  type="hidden"
                  name="id"
                  value="${escapeHtml(article.id)}"
                >
              `
              : ""
          }

          <label for="title">
            Title
          </label>

          <input
            id="title"
            name="title"
            type="text"
            value="${value("title")}"
            placeholder="Enter your article title"
            class="title-input"
            required
          >

          <label for="slug">
            URL Slug
          </label>

          <div class="slug-input">

            <span>
              /articles/
            </span>

            <input
              id="slug"
              name="slug"
              type="text"
              value="${value("slug")}"
              placeholder="your-article-title"
            >

          </div>

          <label for="excerpt">
            Excerpt
          </label>

          <textarea
            id="excerpt"
            name="excerpt"
            class="excerpt-input"
            placeholder="Write a short introduction to your article..."
          >${value("excerpt")}</textarea>

          <label for="content">
            Content
          </label>

          <textarea
            id="content"
            name="content"
            class="content-editor"
            placeholder="Start writing your article..."
          >${value("content")}</textarea>

        </section>


        <section class="panel">

          <div class="panel-header">

            <div>
              <h2>Search Engine Optimization</h2>

              <p>
                Help search engines understand your article.
              </p>
            </div>

            <div class="seo-badge">
              SEO
            </div>

          </div>

          <label for="seo_title">
            SEO Title
          </label>

          <input
            id="seo_title"
            name="seo_title"
            type="text"
            value="${value("seo_title")}"
            placeholder="SEO title"
          >

          <label for="seo_description">
            SEO Description
          </label>

          <textarea
            id="seo_description"
            name="seo_description"
            placeholder="Write a compelling description for search engines..."
          >${value("seo_description")}</textarea>

        </section>

      </div>


      <aside class="editor-sidebar">

        <section class="panel">

          <div class="panel-header">

            <div>
              <h2>Publish</h2>
            </div>

          </div>

          <label for="status">
            Status
          </label>

          <select
            id="status"
            name="status"
          >

            <option
              value="draft"
              ${selected("draft")}
            >
              Draft
            </option>

            <option
              value="published"
              ${selected("published")}
            >
              Published
            </option>

          </select>

          <button
            type="submit"
            class="publish-button"
          >
            ${
              article
                ? "Update Article"
                : "Save Article"
            }
          </button>

        </section>


        <section class="panel">

          <div class="panel-header">

            <div>
              <h2>Category</h2>
            </div>

          </div>

          <label for="category">
            Category
          </label>

          <select
            id="category"
            name="category"
          >

            <option value="">
              Uncategorized
            </option>

            <option
              value="Psychic Readings"
              ${
                article?.category === "Psychic Readings"
                  ? "selected"
                  : ""
              }
            >
              Psychic Readings
            </option>

            <option
              value="Psychic Websites"
              ${
                article?.category === "Psychic Websites"
                  ? "selected"
                  : ""
              }
            >
              Psychic Websites
            </option>

            <option
              value="Astrology"
              ${
                article?.category === "Astrology"
                  ? "selected"
                  : ""
              }
            >
              Astrology
            </option>

            <option
              value="Horoscopes"
              ${
                article?.category === "Horoscopes"
                  ? "selected"
                  : ""
              }
            >
              Horoscopes
            </option>

            <option
              value="Spirituality"
              ${
                article?.category === "Spirituality"
                  ? "selected"
                  : ""
              }
            >
              Spirituality
            </option>

            <option
              value="Reviews"
              ${
                article?.category === "Reviews"
                  ? "selected"
                  : ""
              }
            >
              Reviews
            </option>

          </select>

        </section>


        <section class="panel">

          <div class="panel-header">

            <div>
              <h2>Featured Image</h2>

              <p>
                Add an image URL for now.
              </p>
            </div>

          </div>

          <label for="featured_image">
            Image URL
          </label>

          <input
            id="featured_image"
            name="featured_image"
            type="text"
            value="${value("featured_image")}"
            placeholder="https://..."
          >

          ${
            article?.featured_image
              ? `
                <div class="image-preview">

                  <img
                    src="${escapeHtml(article.featured_image)}"
                    alt=""
                  >

                </div>
              `
              : ""
          }

        </section>

      </aside>

    </form>
  `;
}


// ==========================================
// ADMIN LAYOUT
// ==========================================

function adminLayout(title, active, adminPath, content) {
  return `
<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>
${escapeHtml(title)} — Psychic Index Admin
</title>

<style>

* {
  box-sizing: border-box;
}

:root {
  --bg: #f7f6fa;
  --panel: #ffffff;
  --border: #e8e5ed;
  --text: #211c2b;
  --muted: #777181;
  --purple: #6f4bb8;
  --purple-dark: #573595;
  --purple-light: #f1ecfa;
  --green: #32845c;
  --green-light: #eaf6ef;
  --amber: #a36a20;
  --amber-light: #fff4e4;
  --sidebar: #211c2b;
}

body {
  margin: 0;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  background: var(--bg);
  color: var(--text);
}

a {
  color: inherit;
}

.admin-shell {
  min-height: 100vh;
  display: flex;
}

.sidebar {
  width: 245px;
  flex-shrink: 0;
  background: var(--sidebar);
  color: white;
  min-height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  z-index: 10;
}

.brand {
  height: 82px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 24px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  text-decoration: none;
}

.brand-symbol {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg,#8b67d0,#6542a6);
  font-size: 20px;
}

.brand-name {
  font-size: 17px;
  font-weight: 700;
}

.brand-subtitle {
  display: block;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1.3px;
  opacity: 0.5;
  margin-top: 2px;
}

.nav {
  padding: 22px 14px;
}

.nav-label {
  padding: 0 11px;
  margin-bottom: 9px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: rgba(255,255,255,0.4);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  margin-bottom: 3px;
  border-radius: 9px;
  text-decoration: none;
  color: rgba(255,255,255,0.68);
  font-size: 14px;
}

.nav-link:hover {
  color: white;
  background: rgba(255,255,255,0.07);
}

.nav-link.active {
  color: white;
  background: rgba(123,91,190,0.32);
}

.nav-icon {
  width: 21px;
  text-align: center;
  font-size: 16px;
}

.nav-link.disabled {
  opacity: 0.42;
  cursor: default;
}

.nav-link .coming {
  margin-left: auto;
  font-size: 9px;
  text-transform: uppercase;
  opacity: 0.55;
}

.sidebar-bottom {
  margin-top: auto;
  padding: 16px 14px 20px;
  border-top: 1px solid rgba(255,255,255,0.08);
}

.site-link {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255,255,255,0.65);
  text-decoration: none;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
}

.site-link:hover {
  color: white;
  background: rgba(255,255,255,0.06);
}

.main-area {
  margin-left: 245px;
  width: calc(100% - 245px);
  min-width: 0;
}

.topbar {
  height: 82px;
  background: white;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 34px;
}

.admin-profile {
  display: flex;
  align-items: center;
  gap: 11px;
}

.admin-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--purple-light);
  color: var(--purple);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.admin-info strong {
  display: block;
  font-size: 13px;
}

.admin-info span {
  display: block;
  color: var(--muted);
  font-size: 11px;
  margin-top: 2px;
}

.content {
  max-width: 1450px;
  margin: 0 auto;
  padding: 38px 40px 70px;
}

.eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.8px;
  color: var(--purple);
  margin-bottom: 8px;
}

h1 {
  margin: 0;
  font-size: 31px;
  line-height: 1.15;
  letter-spacing: -1px;
}

h2 {
  margin: 0;
  font-size: 16px;
}

h3 {
  margin: 0;
}

p {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 9px;
  background: var(--purple);
  color: white;
  padding: 11px 17px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.primary-button:hover {
  background: var(--purple-dark);
}

.secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: white;
  color: var(--text);
  padding: 10px 15px;
  font-size: 13px;
  text-decoration: none;
}

.text-link {
  color: var(--purple);
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
}

.welcome-row,
.page-title-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 30px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 18px;
  margin-bottom: 22px;
}

.stat-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 13px;
  padding: 22px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  width: 45px;
  height: 45px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.stat-icon.purple {
  background: var(--purple-light);
  color: var(--purple);
}

.stat-icon.green {
  background: var(--green-light);
  color: var(--green);
}

.stat-icon.amber {
  background: var(--amber-light);
  color: var(--amber);
}

.stat-number {
  font-size: 27px;
  font-weight: 750;
}

.stat-label {
  color: var(--muted);
  font-size: 12px;
  margin-top: 3px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0,1.65fr) minmax(280px,0.75fr);
  gap: 22px;
}

.panel {
  background: white;
  border: 1px solid var(--border);
  border-radius: 13px;
  overflow: hidden;
}

.panel-header {
  padding: 21px 23px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  border-bottom: 1px solid var(--border);
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  padding: 12px 22px;
  text-align: left;
  color: var(--muted);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  background: #fcfbfd;
}

td {
  padding: 15px 22px;
  border-top: 1px solid #f0edf3;
  font-size: 12px;
  color: #4e4858;
}

.article-link {
  color: var(--text);
  text-decoration: none;
  font-weight: 600;
}

.article-link:hover {
  color: var(--purple);
}

.slug {
  color: #9a94a2;
  font-size: 10px;
  margin-top: 4px;
}

.article-title-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 250px;
}

.article-thumbnail {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--purple-light);
  color: var(--purple);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.article-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 20px;
  padding: 5px 9px;
  font-size: 10px;
  font-weight: 650;
  text-transform: capitalize;
}

.status::before {
  content: "";
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.status.published {
  color: var(--green);
  background: var(--green-light);
}

.status.draft {
  color: var(--amber);
  background: var(--amber-light);
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 5px;
}

.table-actions form {
  margin: 0;
}

.icon-button {
  width: 31px;
  height: 31px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: white;
  color: #66606f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  cursor: pointer;
  font-size: 13px;
}

.icon-button:hover {
  background: var(--purple-light);
  color: var(--purple);
}

.icon-button.danger:hover {
  background: #fff0f0;
  color: #b44;
}

.empty {
  text-align: center;
  padding: 45px 20px;
  color: var(--muted);
}

.quick-actions {
  padding: 8px 12px 12px;
}

.quick-action {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 10px;
  border-radius: 9px;
  text-decoration: none;
}

.quick-action:hover {
  background: #faf8fc;
}

.quick-action.disabled {
  opacity: 0.45;
}

.quick-icon {
  width: 35px;
  height: 35px;
  border-radius: 9px;
  background: var(--purple-light);
  color: var(--purple);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.quick-action strong {
  display: block;
  font-size: 12px;
}

.quick-action span {
  display: block;
  color: var(--muted);
  font-size: 10px;
  margin-top: 2px;
}

.quick-action .arrow {
  margin-left: auto;
  font-size: 15px;
  color: #aaa;
}

.article-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 17px 20px;
  border-bottom: 1px solid var(--border);
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 380px;
}

.search-box span {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #aaa;
  font-size: 18px;
}

.search-box input {
  padding-left: 35px;
}

.article-toolbar select {
  width: auto;
  min-width: 140px;
}

.editor-layout {
  display: grid;
  grid-template-columns: minmax(0,1fr) 320px;
  gap: 22px;
  align-items: start;
}

.editor-main {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.editor-sidebar {
  display: flex;
  flex-direction: column;
  gap: 22px;
  position: sticky;
  top: 25px;
}

.editor-layout .panel {
  padding: 0;
}

.editor-layout .panel > label,
.editor-layout .panel > input,
.editor-layout .panel > textarea,
.editor-layout .panel > select,
.editor-layout .panel > .slug-input,
.editor-layout .panel > .image-preview {
  margin-left: 23px;
  margin-right: 23px;
  width: calc(100% - 46px);
}

.editor-layout .panel > label {
  margin-top: 19px;
  margin-bottom: 7px;
}

label {
  display: block;
  color: #423b4c;
  font-size: 12px;
  font-weight: 650;
}

input,
textarea,
select {
  width: 100%;
  border: 1px solid #ddd8e3;
  border-radius: 8px;
  background: white;
  color: var(--text);
  padding: 11px 12px;
  font-family: inherit;
  font-size: 13px;
  outline: none;
}

input:focus,
textarea:focus,
select:focus {
  border-color: #9a7acb;
  box-shadow: 0 0 0 3px rgba(111,75,184,0.08);
}

.title-input {
  font-size: 21px;
  font-weight: 600;
  padding: 15px;
}

.excerpt-input {
  min-height: 110px;
  resize: vertical;
}

.content-editor {
  min-height: 500px;
  resize: vertical;
  line-height: 1.7;
}

.slug-input {
  display: flex;
  align-items: center;
  border: 1px solid #ddd8e3;
  border-radius: 8px;
  overflow: hidden;
}

.slug-input span {
  padding: 11px 0 11px 12px;
  color: #99929f;
  font-size: 12px;
  background: #faf9fb;
  white-space: nowrap;
}

.slug-input input {
  border: 0;
  border-radius: 0;
  box-shadow: none !important;
  padding-left: 7px;
}

.publish-button {
  width: calc(100% - 46px);
  margin: 20px 23px 23px;
  border: 0;
  border-radius: 8px;
  background: var(--purple);
  color: white;
  padding: 12px;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}

.publish-button:hover {
  background: var(--purple-dark);
}

.seo-badge {
  border-radius: 6px;
  background: var(--purple-light);
  color: var(--purple);
  padding: 5px 7px;
  font-size: 9px;
  font-weight: 700;
}

.image-preview {
  margin-top: 12px !important;
  border-radius: 9px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.image-preview img {
  width: 100%;
  display: block;
  max-height: 190px;
  object-fit: cover;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 25px;
}

.empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 13px;
  background: var(--purple-light);
  color: var(--purple);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 21px;
  margin-bottom: 12px;
}

.empty-state h3 {
  font-size: 15px;
}

.empty-state p {
  margin-bottom: 17px;
}

@media (max-width: 1050px) {

  .content-grid {
    grid-template-columns: 1fr;
  }

  .editor-layout {
    grid-template-columns: 1fr;
  }

  .editor-sidebar {
    position: static;
    display: grid;
    grid-template-columns: repeat(2,minmax(0,1fr));
  }

}

@media (max-width: 800px) {

  .sidebar {
    width: 68px;
  }

  .brand {
    justify-content: center;
    padding: 0;
  }

  .brand-name,
  .brand-subtitle,
  .nav-label,
  .nav-link span:not(.nav-icon),
  .site-link span {
    display: none;
  }

  .nav-link {
    justify-content: center;
    padding: 12px;
  }

  .nav-icon {
    width: auto;
  }

  .main-area {
    margin-left: 68px;
    width: calc(100% - 68px);
  }

  .topbar {
    padding: 0 20px;
  }

  .content {
    padding: 28px 20px 50px;
  }

}

@media (max-width: 650px) {

  .welcome-row,
  .page-title-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .editor-sidebar {
    grid-template-columns: 1fr;
  }

  .article-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    max-width: none;
  }

  .article-toolbar select {
    width: 100%;
  }

  .admin-info {
    display: none;
  }

  h1 {
    font-size: 27px;
  }

}

</style>

</head>

<body>

<div class="admin-shell">

  <aside class="sidebar">

    <a
      class="brand"
      href="${adminPath}"
    >

      <div class="brand-symbol">
        ✦
      </div>

      <div>

        <div class="brand-name">
          Psychic Index
        </div>

        <span class="brand-subtitle">
          Administration
        </span>

      </div>

    </a>

    <nav class="nav">

      <div class="nav-label">
        Workspace
      </div>

      <a
        class="nav-link ${active === "dashboard" ? "active" : ""}"
        href="${adminPath}"
      >

        <span class="nav-icon">
          ⌂
        </span>

        <span>
          Dashboard
        </span>

      </a>

      <a
        class="nav-link ${active === "articles" ? "active" : ""}"
        href="${adminPath}/articles"
      >

        <span class="nav-icon">
          ✎
        </span>

        <span>
          Articles
        </span>

      </a>

      <div class="nav-label" style="margin-top:24px;">
        Directory
      </div>

      <div class="nav-link disabled">

        <span class="nav-icon">
          ♢
        </span>

        <span>
          Psychics
        </span>

        <span class="coming">
          Soon
        </span>

      </div>

      <div class="nav-link disabled">

        <span class="nav-icon">
          ★
        </span>

        <span>
          Reviews
        </span>

        <span class="coming">
          Soon
        </span>

      </div>

      <div class="nav-label" style="margin-top:24px;">
        Website
      </div>

      <div class="nav-link disabled">

        <span class="nav-icon">
          ◈
        </span>

        <span>
          Categories
        </span>

        <span class="coming">
          Soon
        </span>

      </div>

      <div class="nav-link disabled">

        <span class="nav-icon">
          ◫
        </span>

        <span>
          Media
        </span>

        <span class="coming">
          Soon
        </span>

      </div>

      <div class="nav-link disabled">

        <span class="nav-icon">
          ◌
        </span>

        <span>
          SEO
        </span>

        <span class="coming">
          Soon
        </span>

      </div>

    </nav>

    <div class="sidebar-bottom">

      <a
        class="site-link"
        href="/"
      >

        <span>
          ↗
        </span>

        <span>
          View Website
        </span>

      </a>

    </div>

  </aside>

  <div class="main-area">

    <header class="topbar">

      <div class="admin-profile">

        <div class="admin-avatar">
          A
        </div>

        <div class="admin-info">

          <strong>
            Administrator
          </strong>

          <span>
            Psychic Index
          </span>

        </div>

      </div>

    </header>

    <main class="content">

      ${content}

    </main>

  </div>

</div>

</body>

</html>
  `;
}


// ==========================================
// PUBLIC ARTICLE PAGE
// ==========================================

function articlePage(article) {
  const title =
    escapeHtml(article.title);

  const description =
    escapeHtml(
      article.seo_description ||
        article.excerpt ||
        ""
    );

  const seoTitle =
    escapeHtml(
      article.seo_title ||
        article.title
    );

  const content =
    escapeHtml(article.content || "")
      .replace(/\n/g, "<br>");

  return new Response(
    `<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>${seoTitle}</title>

<meta
  name="description"
  content="${description}"
>

<style>

body {
  margin: 0;
  background: #f7f6fa;
  color: #211c2b;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

main {
  max-width: 900px;
  margin: 0 auto;
  padding: 60px 24px;
}

article {
  background: white;
  padding: 45px;
  border-radius: 18px;
  border: 1px solid #e8e5ed;
}

h1 {
  font-size: 42px;
  line-height: 1.15;
  margin: 0 0 15px;
}

.category {
  color: #6f4bb8;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 25px;
}

.featured-image {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 12px;
  margin: 25px 0;
}

.excerpt {
  font-size: 18px;
  line-height: 1.6;
  color: #66606f;
  margin-bottom: 30px;
}

.article-content {
  font-size: 16px;
  line-height: 1.8;
}

@media (max-width: 600px) {

  main {
    padding: 20px 12px;
  }

  article {
    padding: 25px 20px;
  }

  h1 {
    font-size: 31px;
  }

}

</style>

</head>

<body>

<main>

<article>

<h1>
${title}
</h1>

${
  article.category
    ? `
      <div class="category">
        ${escapeHtml(article.category)}
      </div>
    `
    : ""
}

${
  article.featured_image
    ? `
      <img
        class="featured-image"
        src="${escapeHtml(article.featured_image)}"
        alt="${title}"
      >
    `
    : ""
}

${
  article.excerpt
    ? `
      <div class="excerpt">
        ${escapeHtml(article.excerpt)}
      </div>
    `
    : ""
}

<div class="article-content">
${content}
</div>

</article>

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
// HELPERS
// ==========================================

function createSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric"
    }
  );
}


function statusBadge(status) {
  const safeStatus =
    status === "published"
      ? "published"
      : "draft";

  return `
    <span class="status ${safeStatus}">
      ${safeStatus}
    </span>
  `;
}


function errorMessage(error) {
  if (!error) {
    return "Unknown error";
  }

  if (error.message) {
    return error.message;
  }

  return String(error);
}


function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
