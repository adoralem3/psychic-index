const ADMIN_KEY = "PX9-vQ72-Lm4!zK81-Rt6";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const adminPath = "/admin/" + ADMIN_KEY;

    // ==================================================
    // DATABASE HEALTH
    // ==================================================

    if (url.pathname === "/api/health") {
      try {
        await env.DB.prepare("SELECT 1").run();

        return json({
          status: "ok",
          site: "Psychic Index",
          database: "connected"
        });
      } catch (error) {
        return json(
          {
            status: "error",
            site: "Psychic Index",
            database: "error",
            message: errorMessage(error)
          },
          500
        );
      }
    }

    // ==================================================
    // ADMIN
    // ==================================================

    if (url.pathname === adminPath) {
      return adminDashboard(env, adminPath);
    }

    if (url.pathname === adminPath + "/articles") {
      return articlesPage(env, adminPath);
    }

    if (url.pathname === adminPath + "/articles/new") {
      return newArticlePage(adminPath);
    }

    if (
      url.pathname === adminPath + "/articles/create" &&
      request.method === "POST"
    ) {
      return createArticle(request, env, adminPath);
    }

    if (url.pathname === adminPath + "/articles/edit") {
      const id = url.searchParams.get("id");

      if (!id) {
        return text("Article ID is missing.", 400);
      }

      return editArticlePage(env, adminPath, id);
    }

    if (
      url.pathname === adminPath + "/articles/update" &&
      request.method === "POST"
    ) {
      return updateArticle(request, env, adminPath);
    }

    if (
      url.pathname === adminPath + "/articles/delete" &&
      request.method === "POST"
    ) {
      return deleteArticle(request, env, adminPath);
    }

    // ==================================================
    // PSYCHICS
    // ==================================================

    if (url.pathname === adminPath + "/psychics") {
      return psychicsPage(env, adminPath);
    }

    if (url.pathname === adminPath + "/psychics/new") {
      return newPsychicPage(adminPath);
    }

    if (
      url.pathname === adminPath + "/psychics/create" &&
      request.method === "POST"
    ) {
      return createPsychic(request, env, adminPath);
    }

    if (url.pathname === adminPath + "/psychics/edit") {
      const id = url.searchParams.get("id");

      if (!id) {
        return text("Psychic ID is missing.", 400);
      }

      return editPsychicPage(env, adminPath, id);
    }

    if (
      url.pathname === adminPath + "/psychics/update" &&
      request.method === "POST"
    ) {
      return updatePsychic(request, env, adminPath);
    }

    if (
      url.pathname === adminPath + "/psychics/delete" &&
      request.method === "POST"
    ) {
      return deletePsychic(request, env, adminPath);
    }

    // ==================================================
    // REVIEWS
    // ==================================================

    if (url.pathname === adminPath + "/reviews") {
      return reviewsPage(env, adminPath);
    }

    if (url.pathname === adminPath + "/reviews/new") {
      return newReviewPage(env, adminPath);
    }

    if (
      url.pathname === adminPath + "/reviews/create" &&
      request.method === "POST"
    ) {
      return createReview(request, env, adminPath);
    }

    if (url.pathname === adminPath + "/reviews/edit") {
      const id = url.searchParams.get("id");

      if (!id) {
        return text("Review ID is missing.", 400);
      }

      return editReviewPage(env, adminPath, id);
    }

    if (
      url.pathname === adminPath + "/reviews/update" &&
      request.method === "POST"
    ) {
      return updateReview(request, env, adminPath);
    }

    if (
      url.pathname === adminPath + "/reviews/delete" &&
      request.method === "POST"
    ) {
      return deleteReview(request, env, adminPath);
    }

    // ==================================================
    // CATEGORIES
    // ==================================================

    if (url.pathname === adminPath + "/categories") {
      return categoriesPage(env, adminPath);
    }

    if (
      url.pathname === adminPath + "/categories/create" &&
      request.method === "POST"
    ) {
      return createCategory(request, env, adminPath);
    }

    if (
      url.pathname === adminPath + "/categories/delete" &&
      request.method === "POST"
    ) {
      return deleteCategory(request, env, adminPath);
    }

    // ==================================================
    // MEDIA
    // ==================================================

    if (url.pathname === adminPath + "/media") {
      return mediaPage(env, adminPath);
    }

    if (
      url.pathname === adminPath + "/media/create" &&
      request.method === "POST"
    ) {
      return createMedia(request, env, adminPath);
    }

    if (
      url.pathname === adminPath + "/media/delete" &&
      request.method === "POST"
    ) {
      return deleteMedia(request, env, adminPath);
    }

    // ==================================================
    // SEO
    // ==================================================

    if (url.pathname === adminPath + "/seo") {
      return seoPage(env, adminPath);
    }

    if (
      url.pathname === adminPath + "/seo/update" &&
      request.method === "POST"
    ) {
      return updateSeo(request, env, adminPath);
    }

    // ==================================================
    // WEBSITE SETTINGS
    // ==================================================

    if (url.pathname === adminPath + "/settings") {
      return settingsPage(env, adminPath);
    }

    if (
      url.pathname === adminPath + "/settings/update" &&
      request.method === "POST"
    ) {
      return updateSettings(request, env, adminPath);
    }

    // ==================================================
    // PUBLIC ARTICLE
    // ==================================================

    if (url.pathname.startsWith("/articles/")) {
      const slug = decodeURIComponent(
        url.pathname
          .substring("/articles/".length)
          .replace(/\/$/, "")
      );

      if (!slug) {
        return text("Article not found.", 404);
      }

      try {
        const article = await env.DB.prepare(
          `SELECT *
           FROM articles
           WHERE slug = ?
           AND status = 'published'
           LIMIT 1`
        )
          .bind(slug)
          .first();

        if (!article) {
          return text("Article not found.", 404);
        }

        return articlePage(article);
      } catch (error) {
        return text(
          "Could not load article.\n\n" +
          errorMessage(error),
          500
        );
      }
    }

    // ==================================================
    // PUBLIC ARTICLE API
    // ==================================================

    if (url.pathname === "/api/articles") {
      try {
        const result = await env.DB.prepare(
          `SELECT id, title, slug, excerpt, content,
                  featured_image, category,
                  seo_title, seo_description,
                  status, created_at, updated_at,
                  published_at
           FROM articles
           WHERE status = 'published'
           ORDER BY COALESCE(published_at, created_at) DESC
           LIMIT 50`
        ).all();

        return json({
          status: "ok",
          articles: result.results || []
        });
      } catch (error) {
        return json(
          {
            status: "error",
            message: "Could not load articles."
          },
          500
        );
      }
    }

    // ==================================================
    // PUBLIC SINGLE ARTICLE API
    // ==================================================

    if (url.pathname.startsWith("/api/articles/")) {
      const slug = decodeURIComponent(
        url.pathname.substring("/api/articles/".length)
      );

      if (!slug) {
        return json(
          {
            status: "error",
            message: "Article slug is missing."
          },
          400
        );
      }

      try {
        const article = await env.DB.prepare(
          `SELECT id, title, slug, excerpt, content,
                  featured_image, category,
                  seo_title, seo_description,
                  status, created_at, updated_at,
                  published_at
           FROM articles
           WHERE slug = ?
           AND status = 'published'
           LIMIT 1`
        )
          .bind(slug)
          .first();

        if (!article) {
          return json(
            {
              status: "error",
              message: "Article not found."
            },
            404
          );
        }

        return json({
          status: "ok",
          article
        });
      } catch (error) {
        return json(
          {
            status: "error",
            message: "Could not load article."
          },
          500
        );
      }
    }

    // ==================================================
    // PUBLIC DIRECTORY API
    // ==================================================

    if (url.pathname === "/api/psychics") {
      try {
        const result = await env.DB.prepare(
          `SELECT *
           FROM psychics
           WHERE status = 'published'
           ORDER BY name ASC`
        ).all();

        return json({
          status: "ok",
          psychics: result.results || []
        });
      } catch (error) {
        return json(
          {
            status: "error",
            message: "Could not load psychics."
          },
          500
        );
      }
    }

    // ==================================================
    // PUBLIC PSYCHIC PAGE
    // ==================================================

    if (url.pathname.startsWith("/psychics/")) {
      const slug = decodeURIComponent(
        url.pathname
          .substring("/psychics/".length)
          .replace(/\/$/, "")
      );

      if (!slug) {
        return text("Psychic not found.", 404);
      }

      try {
        const psychic = await env.DB.prepare(
          `SELECT *
           FROM psychics
           WHERE slug = ?
           AND status = 'published'
           LIMIT 1`
        )
          .bind(slug)
          .first();

        if (!psychic) {
          return text("Psychic not found.", 404);
        }

        return psychicPage(psychic);
      } catch (error) {
        return text(
          "Could not load psychic.\n\n" +
          errorMessage(error),
          500
        );
      }
    }

    // ==================================================
    // SITEMAP
    // ==================================================

    if (url.pathname === "/sitemap.xml") {
      return sitemap(env, request);
    }

    // ==================================================
    // EVERYTHING ELSE
    // ==================================================

    return env.ASSETS.fetch(request);
  }
};


// ==================================================
// RESPONSE HELPERS
// ==================================================

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "Cache-Control": "no-store"
      }
    }
  );
}


function text(data, status = 200) {
  return new Response(
    data,
    {
      status,
      headers: {
        "Content-Type": "text/plain; charset=UTF-8"
      }
    }
  );
}


// ==================================================
// DASHBOARD
// ==================================================

async function adminDashboard(env, adminPath) {
  try {
    const articleStats = await env.DB.prepare(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts
       FROM articles`
    ).first();

    const psychicStats = await env.DB.prepare(
      `SELECT COUNT(*) AS total
       FROM psychics`
    ).first();

    const reviewStats = await env.DB.prepare(
      `SELECT COUNT(*) AS total
       FROM reviews`
    ).first();

    const recent = await env.DB.prepare(
      `SELECT id, title, category, status, updated_at
       FROM articles
       ORDER BY updated_at DESC
       LIMIT 8`
    ).all();

    let rows = "";

    for (const article of recent.results || []) {
      rows += `
        <tr>
          <td>
            <a class="article-link"
               href="${adminPath}/articles/edit?id=${encodeURIComponent(article.id)}">
              ${escapeHtml(article.title)}
            </a>
          </td>
          <td>${escapeHtml(article.category || "Uncategorized")}</td>
          <td>${statusBadge(article.status)}</td>
          <td>${escapeHtml(formatDate(article.updated_at))}</td>
        </tr>
      `;
    }

    if (!rows) {
      rows = `
        <tr>
          <td colspan="4" class="empty">
            No articles yet.
          </td>
        </tr>
      `;
    }

    const html = `
      <div class="page-title-row">
        <div>
          <div class="eyebrow">ADMINISTRATION</div>
          <h1>Dashboard</h1>
          <p>Manage the Psychic Index website.</p>
        </div>

        <a class="primary-button"
           href="${adminPath}/articles/new">
          + New Article
        </a>
      </div>

      <div class="stats-grid">

        ${statCard(
          "✎",
          articleStats?.total || 0,
          "Total Articles",
          "purple"
        )}

        ${statCard(
          "✓",
          articleStats?.published || 0,
          "Published",
          "green"
        )}

        ${statCard(
          "◷",
          articleStats?.drafts || 0,
          "Draft Articles",
          "amber"
        )}

        ${statCard(
          "♢",
          psychicStats?.total || 0,
          "Psychic Listings",
          "purple"
        )}

        ${statCard(
          "★",
          reviewStats?.total || 0,
          "Reviews",
          "green"
        )}

      </div>

      <div class="content-grid">

        <section class="panel large-panel">

          <div class="panel-header">
            <div>
              <h2>Recent Articles</h2>
              <p>Your latest content activity.</p>
            </div>

            <a class="text-link"
               href="${adminPath}/articles">
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
                ${rows}
              </tbody>
            </table>
          </div>

        </section>

        <section class="panel">

          <div class="panel-header">
            <div>
              <h2>Quick Actions</h2>
              <p>Manage your website.</p>
            </div>
          </div>

          <div class="quick-actions">

            ${quickAction(
              adminPath + "/articles/new",
              "✎",
              "Write an article",
              "Create new content"
            )}

            ${quickAction(
              adminPath + "/psychics/new",
              "♢",
              "Add a psychic",
              "Create directory listing"
            )}

            ${quickAction(
              adminPath + "/reviews/new",
              "★",
              "Add a review",
              "Create a review"
            )}

            ${quickAction(
              adminPath + "/categories",
              "◈",
              "Manage categories",
              "Organise website content"
            )}

            ${quickAction(
              adminPath + "/media",
              "◫",
              "Media library",
              "Manage image URLs"
            )}

            ${quickAction(
              adminPath + "/seo",
              "◌",
              "SEO settings",
              "Control site SEO"
            )}

          </div>

        </section>

      </div>
    `;

    return htmlResponse(
      adminLayout(
        "Dashboard",
        "dashboard",
        adminPath,
        html
      )
    );
  } catch (error) {
    return text(
      "Dashboard database error:\n\n" +
      errorMessage(error),
      500
    );
  }
}


function statCard(icon, number, label, color) {
  return `
    <div class="stat-card">
      <div class="stat-icon ${color}">
        ${icon}
      </div>

      <div>
        <div class="stat-number">
          ${escapeHtml(number)}
        </div>

        <div class="stat-label">
          ${escapeHtml(label)}
        </div>
      </div>
    </div>
  `;
}


function quickAction(href, icon, title, description) {
  return `
    <a href="${href}" class="quick-action">
      <div class="quick-icon">${icon}</div>

      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(description)}</span>
      </div>

      <span class="arrow">→</span>
    </a>
  `;
}


// ==================================================
// ARTICLES
// ==================================================

async function articlesPage(env, adminPath) {
  try {
    const result = await env.DB.prepare(
      `SELECT id, title, slug, featured_image,
              category, status, created_at, updated_at
       FROM articles
       ORDER BY updated_at DESC`
    ).all();

    let rows = "";

    for (const article of result.results || []) {
      const thumbnail = article.featured_image
        ? `<img src="${escapeHtml(article.featured_image)}" alt="">`
        : "✦";

      rows += `
        <tr>

          <td>
            <div class="article-title-cell">

              <div class="article-thumbnail">
                ${thumbnail}
              </div>

              <div>
                <a class="article-link"
                   href="${adminPath}/articles/edit?id=${encodeURIComponent(article.id)}">
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

              <a class="icon-button"
                 href="${adminPath}/articles/edit?id=${encodeURIComponent(article.id)}"
                 title="Edit">
                ✎
              </a>

              <form method="POST"
                    action="${adminPath}/articles/delete"
                    onsubmit="return confirm('Delete this article?');">

                <input type="hidden"
                       name="id"
                       value="${escapeHtml(article.id)}">

                <button class="icon-button danger"
                        type="submit">
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
              <div class="empty-icon">✦</div>
              <h3>No articles yet</h3>
              <p>Start building your Psychic Index content.</p>

              <a class="primary-button"
                 href="${adminPath}/articles/new">
                Create your first article
              </a>
            </div>
          </td>
        </tr>
      `;
    }

    const html = `
      <div class="page-title-row">

        <div>
          <div class="eyebrow">CONTENT</div>
          <h1>Articles</h1>
          <p>Create and manage your Psychic Index content.</p>
        </div>

        <a class="primary-button"
           href="${adminPath}/articles/new">
          + New Article
        </a>

      </div>

      <section class="panel">

        <div class="article-toolbar">

          <div class="search-box">
            <span>⌕</span>
            <input id="articleSearch"
                   type="search"
                   placeholder="Search articles..."
                   oninput="filterArticles()">
          </div>

          <select id="statusFilter"
                  onchange="filterArticles()">

            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>

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

          document
            .querySelectorAll("#articlesTable tbody tr")
            .forEach(function(row) {

              const text =
                row.innerText.toLowerCase();

              const matchesSearch =
                !search || text.includes(search);

              const matchesStatus =
                !status || text.includes(status);

              row.style.display =
                matchesSearch && matchesStatus
                  ? ""
                  : "none";
            });
        }
      </script>
    `;

    return htmlResponse(
      adminLayout(
        "Articles",
        "articles",
        adminPath,
        html
      )
    );
  } catch (error) {
    return text(
      "Articles database error:\n\n" +
      errorMessage(error),
      500
    );
  }
}


function newArticlePage(adminPath) {
  return htmlResponse(
    adminLayout(
      "New Article",
      "articles",
      adminPath,

      pageHeader(
        "CONTENT",
        "New Article",
        "Create a new article for Psychic Index.",
        adminPath + "/articles",
        "← Back to Articles"
      ) +

      articleForm(
        adminPath + "/articles/create",
        null
      )
    )
  );
}


async function createArticle(request, env, adminPath) {
  try {
    const form = await request.formData();

    const title = field(form, "title");
    const rawSlug = field(form, "slug");
    const slug = createSlug(rawSlug || title);
    const excerpt = field(form, "excerpt");
    const content = sanitizeRichText(field(form, "content"));
    const category = field(form, "category");
    const featuredImage = field(form, "featured_image");
    const seoTitle = field(form, "seo_title");
    const seoDescription = field(form, "seo_description");

    const status =
      form.get("status") === "published"
        ? "published"
        : "draft";

    if (!title) {
      return text("Article title is required.", 400);
    }

    if (!slug) {
      return text("A valid URL slug is required.", 400);
    }

    const existing = await env.DB.prepare(
      "SELECT id FROM articles WHERE slug = ? LIMIT 1"
    )
      .bind(slug)
      .first();

    if (existing) {
      return text(
        "An article with this slug already exists.",
        409
      );
    }

    const publishedAt =
      status === "published"
        ? new Date().toISOString()
        : null;

    await env.DB.prepare(
      `INSERT INTO articles
       (title, slug, excerpt, content,
        featured_image, category,
        seo_title, seo_description,
        status, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
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

    return redirect(
      request,
      adminPath + "/articles"
    );
  } catch (error) {
    return text(
      "Could not save article.\n\n" +
      errorMessage(error),
      500
    );
  }
}


async function editArticlePage(env, adminPath, id) {
  try {
    const article = await env.DB.prepare(
      "SELECT * FROM articles WHERE id = ? LIMIT 1"
    )
      .bind(id)
      .first();

    if (!article) {
      return text("Article not found.", 404);
    }

    return htmlResponse(
      adminLayout(
        "Edit Article",
        "articles",
        adminPath,

        pageHeader(
          "CONTENT",
          "Edit Article",
          "Update your article and SEO information.",
          adminPath + "/articles",
          "← Back to Articles"
        ) +

        articleForm(
          adminPath + "/articles/update",
          article
        )
      )
    );
  } catch (error) {
    return text(
      "Could not load article.\n\n" +
      errorMessage(error),
      500
    );
  }
}


async function updateArticle(request, env, adminPath) {
  try {
    const form = await request.formData();

    const id = field(form, "id");
    const title = field(form, "title");
    const rawSlug = field(form, "slug");
    const slug = createSlug(rawSlug || title);
    const excerpt = field(form, "excerpt");
    const content = sanitizeRichText(field(form, "content"));
    const category = field(form, "category");
    const featuredImage = field(form, "featured_image");
    const seoTitle = field(form, "seo_title");
    const seoDescription = field(form, "seo_description");

    const status =
      form.get("status") === "published"
        ? "published"
        : "draft";

    if (!id || !title || !slug) {
      return text(
        "Article ID, title and slug are required.",
        400
      );
    }

    const existing = await env.DB.prepare(
      `SELECT id, published_at
       FROM articles
       WHERE id = ?
       LIMIT 1`
    )
      .bind(id)
      .first();

    if (!existing) {
      return text("Article not found.", 404);
    }

    const duplicate = await env.DB.prepare(
      `SELECT id
       FROM articles
       WHERE slug = ?
       AND id != ?
       LIMIT 1`
    )
      .bind(slug, id)
      .first();

    if (duplicate) {
      return text(
        "Another article already uses this slug.",
        409
      );
    }

    let publishedAt =
      existing.published_at || null;

    if (status === "published" && !publishedAt) {
      publishedAt = new Date().toISOString();
    }

    if (status === "draft") {
      publishedAt = null;
    }

    await env.DB.prepare(
      `UPDATE articles
       SET title = ?,
           slug = ?,
           excerpt = ?,
           content = ?,
           featured_image = ?,
           category = ?,
           seo_title = ?,
           seo_description = ?,
           status = ?,
           published_at = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
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

    return redirect(
      request,
      adminPath + "/articles"
    );
  } catch (error) {
    return text(
      "Could not update article.\n\n" +
      errorMessage(error),
      500
    );
  }
}


async function deleteArticle(request, env, adminPath) {
  try {
    const form = await request.formData();
    const id = field(form, "id");

    if (!id) {
      return text("Article ID is missing.", 400);
    }

    await env.DB.prepare(
      "DELETE FROM articles WHERE id = ?"
    )
      .bind(id)
      .run();

    return redirect(
      request,
      adminPath + "/articles"
    );
  } catch (error) {
    return text(
      "Could not delete article.\n\n" +
      errorMessage(error),
      500
    );
  }
}


// ==================================================
// RICH ARTICLE EDITOR
// ==================================================

function articleForm(action, article) {
  const value = (fieldName) =>
    escapeHtml(
      article && article[fieldName]
        ? article[fieldName]
        : ""
    );

  const status =
    article?.status === "published"
      ? "published"
      : "draft";

  const category =
    article?.category || "";

  const content =
    article?.content || "";

  return `
    <form method="POST"
          action="${action}"
          class="editor-layout">

      ${article
        ? `
          <input type="hidden"
                 name="id"
                 value="${escapeHtml(article.id)}">
        `
        : ""}

      <div class="editor-main">

        <section class="panel">

          <div class="panel-header">
            <div>
              <h2>Article Content</h2>
              <p>Write and format your article.</p>
            </div>
          </div>

          <label for="title">Title</label>

          <input id="title"
                 name="title"
                 type="text"
                 value="${value("title")}"
                 class="title-input"
                 placeholder="Enter your article title"
                 required>

          <label for="slug">URL Slug</label>

          <div class="slug-input">
            <span>/articles/</span>

            <input id="slug"
                   name="slug"
                   type="text"
                   value="${value("slug")}"
                   placeholder="your-article-title">
          </div>

          <label for="excerpt">Excerpt</label>

          <textarea id="excerpt"
                    name="excerpt"
                    class="excerpt-input"
                    placeholder="Write a short introduction to your article...">${value("excerpt")}</textarea>

          <label>Content</label>

          <div class="rich-editor">

            <div class="editor-toolbar">

              <button type="button"
                      onclick="formatDoc('bold')"
                      title="Bold">
                <strong>B</strong>
              </button>

              <button type="button"
                      onclick="formatDoc('italic')"
                      title="Italic">
                <em>I</em>
              </button>

              <button type="button"
                      onclick="formatDoc('underline')"
                      title="Underline">
                <u>U</u>
              </button>

              <span class="toolbar-divider"></span>

              <button type="button"
                      onclick="formatBlock('h2')">
                H2
              </button>

              <button type="button"
                      onclick="formatBlock('h3')">
                H3
              </button>

              <button type="button"
                      onclick="formatBlock('p')">
                ¶
              </button>

              <span class="toolbar-divider"></span>

              <button type="button"
                      onclick="formatDoc('insertUnorderedList')">
                • List
              </button>

              <button type="button"
                      onclick="formatDoc('insertOrderedList')">
                1. List
              </button>

              <button type="button"
                      onclick="formatBlock('blockquote')">
                ❝
              </button>

              <span class="toolbar-divider"></span>

              <button type="button"
                      onclick="insertLink()">
                🔗 Link
              </button>

              <button type="button"
                      onclick="insertImage()">
                🖼 Image
              </button>

              <button type="button"
                      onclick="formatDoc('removeFormat')">
                Clear
              </button>

            </div>

            <div id="richEditor"
                 class="rich-editor-area"
                 contenteditable="true"
                 spellcheck="true">${content}</div>

            <textarea id="content"
                      name="content"
                      class="hidden-content">${escapeHtml(content)}</textarea>

          </div>

        </section>

        <section class="panel">

          <div class="panel-header">

            <div>
              <h2>Search Engine Optimization</h2>
              <p>Control how this article appears in search engines.</p>
            </div>

            <div class="seo-badge">SEO</div>

          </div>

          <label for="seo_title">
            SEO Title
          </label>

          <input id="seo_title"
                 name="seo_title"
                 type="text"
                 value="${value("seo_title")}"
                 maxlength="70"
                 placeholder="SEO title">

          <div class="field-hint">
            Recommended: around 50–60 characters.
          </div>

          <label for="seo_description">
            SEO Description
          </label>

          <textarea id="seo_description"
                    name="seo_description"
                    maxlength="170"
                    placeholder="Write a compelling search description...">${value("seo_description")}</textarea>

          <div class="field-hint">
            Recommended: around 140–160 characters.
          </div>

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

          <select id="status"
                  name="status">

            <option value="draft"
              ${status === "draft" ? "selected" : ""}>
              Draft
            </option>

            <option value="published"
              ${status === "published" ? "selected" : ""}>
              Published
            </option>

          </select>

          <button type="submit"
                  class="publish-button">
            ${article
              ? "Update Article"
              : "Save Article"}
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

          <select id="category"
                  name="category">

            <option value=""
              ${category === "" ? "selected" : ""}>
              Uncategorized
            </option>

            <option value="Psychic Readings"
              ${category === "Psychic Readings" ? "selected" : ""}>
              Psychic Readings
            </option>

            <option value="Psychic Websites"
              ${category === "Psychic Websites" ? "selected" : ""}>
              Psychic Websites
            </option>

            <option value="Astrology"
              ${category === "Astrology" ? "selected" : ""}>
              Astrology
            </option>

            <option value="Horoscopes"
              ${category === "Horoscopes" ? "selected" : ""}>
              Horoscopes
            </option>

            <option value="Spirituality"
              ${category === "Spirituality" ? "selected" : ""}>
              Spirituality
            </option>

            <option value="Reviews"
              ${category === "Reviews" ? "selected" : ""}>
              Reviews
            </option>

          </select>

        </section>

        <section class="panel">

          <div class="panel-header">
            <div>
              <h2>Featured Image</h2>
              <p>Use an image URL.</p>
            </div>
          </div>

          <label for="featured_image">
            Image URL
          </label>

          <input id="featured_image"
                 name="featured_image"
                 type="url"
                 value="${value("featured_image")}"
                 placeholder="https://example.com/image.jpg"
                 oninput="previewFeaturedImage()">

          <div id="featuredPreview"
               class="image-preview"
               style="${article?.featured_image ? "" : "display:none"}">

            ${article?.featured_image
              ? `
                <img src="${escapeHtml(article.featured_image)}"
                     alt="">
              `
              : ""}
          </div>

        </section>

      </aside>

    </form>

    <script>
      const editor =
        document.getElementById("richEditor");

      const contentField =
        document.getElementById("content");

      function syncEditor() {
        contentField.value =
          editor.innerHTML;
      }

      editor.addEventListener(
        "input",
        syncEditor
      );

      editor.addEventListener(
        "blur",
        syncEditor
      );

      function formatDoc(command, value) {
        editor.focus();

        document.execCommand(
          command,
          false,
          value || null
        );

        syncEditor();
      }

      function formatBlock(tag) {
        editor.focus();

        document.execCommand(
          "formatBlock",
          false,
          tag
        );

        syncEditor();
      }

      function insertLink() {
        editor.focus();

        const url =
          prompt(
            "Enter the URL:",
            "https://"
          );

        if (!url) {
          return;
        }

        document.execCommand(
          "createLink",
          false,
          url
        );

        syncEditor();
      }

      function insertImage() {
        editor.focus();

        const url =
          prompt(
            "Enter the image URL:",
            "https://"
          );

        if (!url) {
          return;
        }

        document.execCommand(
          "insertImage",
          false,
          url
        );

        syncEditor();
      }

      function previewFeaturedImage() {
        const input =
          document.getElementById(
            "featured_image"
          );

        const preview =
          document.getElementById(
            "featuredPreview"
          );

        if (!input.value.trim()) {
          preview.style.display = "none";
          preview.innerHTML = "";
          return;
        }

        preview.style.display = "block";

        preview.innerHTML =
          '<img src="' +
          escapeAttribute(input.value) +
          '" alt="">';
      }

      function escapeAttribute(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll('"', "&quot;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;");
      }

      document
        .querySelectorAll(".editor-toolbar button")
        .forEach(function(button) {
          button.addEventListener(
            "mousedown",
            function(event) {
              event.preventDefault();
            }
          );
        });

      document
        .querySelector("form.editor-layout")
        .addEventListener(
          "submit",
          syncEditor
        );
    </script>
  `;
}


// ==================================================
// PSYCHICS
// ==================================================

async function psychicsPage(env, adminPath) {
  const result = await env.DB.prepare(
    `SELECT *
     FROM psychics
     ORDER BY updated_at DESC`
  ).all();

  let rows = "";

  for (const psychic of result.results || []) {
    rows += `
      <tr>

        <td>
          <div class="article-title-cell">

            <div class="article-thumbnail">
              ${
                psychic.photo
                  ? `<img src="${escapeHtml(psychic.photo)}" alt="">`
                  : "♢"
              }
            </div>

            <div>
              <a class="article-link"
                 href="${adminPath}/psychics/edit?id=${encodeURIComponent(psychic.id)}">
                ${escapeHtml(psychic.name)}
              </a>

              <div class="slug">
                /psychics/${escapeHtml(psychic.slug)}
              </div>
            </div>

          </div>
        </td>

        <td>
          ${escapeHtml(psychic.location || "—")}
        </td>

        <td>
          ${escapeHtml(psychic.specialties || "—")}
        </td>

        <td>
          ${statusBadge(psychic.status)}
        </td>

        <td>
          <div class="table-actions">

            <a class="icon-button"
               href="${adminPath}/psychics/edit?id=${encodeURIComponent(psychic.id)}">
              ✎
            </a>

            <form method="POST"
                  action="${adminPath}/psychics/delete"
                  onsubmit="return confirm('Delete this psychic listing?');">

              <input type="hidden"
                     name="id"
                     value="${escapeHtml(psychic.id)}">

              <button class="icon-button danger"
                      type="submit">
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
          No psychic listings yet.
        </td>
      </tr>
    `;
  }

  return htmlResponse(
    adminLayout(
      "Psychics",
      "psychics",
      adminPath,

      pageHeader(
        "DIRECTORY",
        "Psychics",
        "Create and manage your psychic directory.",
        adminPath + "/psychics/new",
        "+ Add Psychic"
      ) +

      `
        <section class="panel">

          <div class="table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>Psychic</th>
                  <th>Location</th>
                  <th>Specialties</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                ${rows}
              </tbody>

            </table>

          </div>

        </section>
      `
    )
  );
}


function newPsychicPage(adminPath) {
  return htmlResponse(
    adminLayout(
      "New Psychic",
      "psychics",
      adminPath,

      pageHeader(
        "DIRECTORY",
        "Add Psychic",
        "Create a new directory listing.",
        adminPath + "/psychics",
        "← Back"
      ) +

      psychicForm(
        adminPath + "/psychics/create",
        null
      )
    )
  );
}


async function createPsychic(request, env, adminPath) {
  try {
    const form = await request.formData();

    const name = field(form, "name");
    const slug = createSlug(
      field(form, "slug") || name
    );

    if (!name || !slug) {
      return text(
        "Name and slug are required.",
        400
      );
    }

    const duplicate = await env.DB.prepare(
      "SELECT id FROM psychics WHERE slug = ? LIMIT 1"
    )
      .bind(slug)
      .first();

    if (duplicate) {
      return text(
        "A psychic with this slug already exists.",
        409
      );
    }

    await env.DB.prepare(
      `INSERT INTO psychics
       (name, slug, photo, location,
        specialties, website, phone,
        email, description,
        seo_title, seo_description,
        status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        name,
        slug,
        field(form, "photo"),
        field(form, "location"),
        field(form, "specialties"),
        field(form, "website"),
        field(form, "phone"),
        field(form, "email"),
        sanitizeRichText(field(form, "description")),
        field(form, "seo_title"),
        field(form, "seo_description"),
        form.get("status") === "published"
          ? "published"
          : "draft"
      )
      .run();

    return redirect(
      request,
      adminPath + "/psychics"
    );
  } catch (error) {
    return text(
      "Could not create psychic.\n\n" +
      errorMessage(error),
      500
    );
  }
}


async function editPsychicPage(env, adminPath, id) {
  const psychic = await env.DB.prepare(
    "SELECT * FROM psychics WHERE id = ? LIMIT 1"
  )
    .bind(id)
    .first();

  if (!psychic) {
    return text("Psychic not found.", 404);
  }

  return htmlResponse(
    adminLayout(
      "Edit Psychic",
      "psychics",
      adminPath,

      pageHeader(
        "DIRECTORY",
        "Edit Psychic",
        "Update this directory listing.",
        adminPath + "/psychics",
        "← Back"
      ) +

      psychicForm(
        adminPath + "/psychics/update",
        psychic
      )
    )
  );
}


async function updatePsychic(request, env, adminPath) {
  try {
    const form = await request.formData();

    const id = field(form, "id");
    const name = field(form, "name");
    const slug = createSlug(
      field(form, "slug") || name
    );

    if (!id || !name || !slug) {
      return text(
        "ID, name and slug are required.",
        400
      );
    }

    const duplicate = await env.DB.prepare(
      `SELECT id
       FROM psychics
       WHERE slug = ?
       AND id != ?
       LIMIT 1`
    )
      .bind(slug, id)
      .first();

    if (duplicate) {
      return text(
        "Another psychic already uses this slug.",
        409
      );
    }

    await env.DB.prepare(
      `UPDATE psychics
       SET name = ?,
           slug = ?,
           photo = ?,
           location = ?,
           specialties = ?,
           website = ?,
           phone = ?,
           email = ?,
           description = ?,
           seo_title = ?,
           seo_description = ?,
           status = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(
        name,
        slug,
        field(form, "photo"),
        field(form, "location"),
        field(form, "specialties"),
        field(form, "website"),
        field(form, "phone"),
        field(form, "email"),
        sanitizeRichText(field(form, "description")),
        field(form, "seo_title"),
        field(form, "seo_description"),
        form.get("status") === "published"
          ? "published"
          : "draft",
        id
      )
      .run();

    return redirect(
      request,
      adminPath + "/psychics"
    );
  } catch (error) {
    return text(
      "Could not update psychic.\n\n" +
      errorMessage(error),
      500
    );
  }
}


async function deletePsychic(request, env, adminPath) {
  const form = await request.formData();
  const id = field(form, "id");

  if (!id) {
    return text("Psychic ID is missing.", 400);
  }

  await env.DB.prepare(
    "DELETE FROM psychics WHERE id = ?"
  )
    .bind(id)
    .run();

  return redirect(
    request,
    adminPath + "/psychics"
  );
}


function psychicForm(action, psychic) {
  const value = (name) =>
    escapeHtml(
      psychic && psychic[name]
        ? psychic[name]
        : ""
    );

  const status =
    psychic?.status === "published"
      ? "published"
      : "draft";

  return `
    <form method="POST"
          action="${action}"
          class="form-grid">

      ${psychic
        ? `
          <input type="hidden"
                 name="id"
                 value="${escapeHtml(psychic.id)}">
        `
        : ""}

      <section class="panel">

        <div class="panel-header">
          <div>
            <h2>Profile</h2>
            <p>Basic directory information.</p>
          </div>
        </div>

        <label>Name</label>
        <input name="name"
               value="${value("name")}"
               required
               placeholder="Psychic name">

        <label>URL Slug</label>

        <div class="slug-input">
          <span>/psychics/</span>

          <input name="slug"
                 value="${value("slug")}"
                 placeholder="psychic-name">
        </div>

        <label>Photo URL</label>

        <input name="photo"
               type="url"
               value="${value("photo")}"
               placeholder="https://...">

        <label>Location</label>

        <input name="location"
               value="${value("location")}"
               placeholder="City, Country">

        <label>Specialties</label>

        <input name="specialties"
               value="${value("specialties")}"
               placeholder="Tarot, Love, Astrology...">

        <label>Website</label>

        <input name="website"
               type="url"
               value="${value("website")}"
               placeholder="https://...">

        <label>Phone</label>

        <input name="phone"
               value="${value("phone")}"
               placeholder="+...">

        <label>Email</label>

        <input name="email"
               type="email"
               value="${value("email")}"
               placeholder="email@example.com">

        <label>Description</label>

        <textarea name="description"
                  class="large-textarea"
                  placeholder="Describe this psychic...">${value("description")}</textarea>

      </section>

      <aside>

        <section class="panel">

          <div class="panel-header">
            <h2>Publish</h2>
          </div>

          <label>Status</label>

          <select name="status">

            <option value="draft"
              ${status === "draft" ? "selected" : ""}>
              Draft
            </option>

            <option value="published"
              ${status === "published" ? "selected" : ""}>
              Published
            </option>

          </select>

          <button class="publish-button"
                  type="submit">
            ${psychic
              ? "Update Psychic"
              : "Create Psychic"}
          </button>

        </section>

        <section class="panel">

          <div class="panel-header">
            <h2>SEO</h2>
          </div>

          <label>SEO Title</label>

          <input name="seo_title"
                 value="${value("seo_title")}"
                 maxlength="70">

          <label>SEO Description</label>

          <textarea name="seo_description"
                    maxlength="170">${value("seo_description")}</textarea>

        </section>

      </aside>

    </form>
  `;
}


// ==================================================
// REVIEWS
// ==================================================

async function reviewsPage(env, adminPath) {
  const result = await env.DB.prepare(
    `SELECT reviews.*,
            psychics.name AS psychic_name
     FROM reviews
     LEFT JOIN psychics
       ON psychics.id = reviews.psychic_id
     ORDER BY reviews.updated_at DESC`
  ).all();

  let rows = "";

  for (const review of result.results || []) {
    rows += `
      <tr>

        <td>
          <strong>
            ${escapeHtml(review.reviewer_name)}
          </strong>
        </td>

        <td>
          ${escapeHtml(review.psychic_name || "—")}
        </td>

        <td>
          ${"★".repeat(
            Math.max(
              0,
              Math.min(5, Number(review.rating) || 0)
            )
          )}
        </td>

        <td>
          ${statusBadge(review.status)}
        </td>

        <td>
          <div class="table-actions">

            <a class="icon-button"
               href="${adminPath}/reviews/edit?id=${encodeURIComponent(review.id)}">
              ✎
            </a>

            <form method="POST"
                  action="${adminPath}/reviews/delete"
                  onsubmit="return confirm('Delete this review?');">

              <input type="hidden"
                     name="id"
                     value="${escapeHtml(review.id)}">

              <button class="icon-button danger"
                      type="submit">
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
          No reviews yet.
        </td>
      </tr>
    `;
  }

  return htmlResponse(
    adminLayout(
      "Reviews",
      "reviews",
      adminPath,

      pageHeader(
        "DIRECTORY",
        "Reviews",
        "Manage reviews for listed psychics.",
        adminPath + "/reviews/new",
        "+ Add Review"
      ) +

      `
        <section class="panel">

          <div class="table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>Reviewer</th>
                  <th>Psychic</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                ${rows}
              </tbody>

            </table>

          </div>

        </section>
      `
    )
  );
}


async function newReviewPage(env, adminPath) {
  return htmlResponse(
    adminLayout(
      "New Review",
      "reviews",
      adminPath,

      pageHeader(
        "DIRECTORY",
        "Add Review",
        "Create a new psychic review.",
        adminPath + "/reviews",
        "← Back"
      ) +

      await reviewForm(
        env,
        adminPath + "/reviews/create",
        null
      )
    )
  );
}


async function createReview(request, env, adminPath) {
  const form = await request.formData();

  const reviewer = field(
    form,
    "reviewer_name"
  );

  const psychicId = field(
    form,
    "psychic_id"
  );

  const rating = Math.max(
    1,
    Math.min(
      5,
      Number(form.get("rating")) || 5
    )
  );

  if (!reviewer || !psychicId) {
    return text(
      "Reviewer and psychic are required.",
      400
    );
  }

  await env.DB.prepare(
    `INSERT INTO reviews
     (psychic_id, reviewer_name,
      rating, review_text, status)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(
      psychicId,
      reviewer,
      rating,
      sanitizeRichText(
        field(form, "review_text")
      ),
      form.get("status") === "published"
        ? "published"
        : "draft"
    )
    .run();

  return redirect(
    request,
    adminPath + "/reviews"
  );
}


async function editReviewPage(env, adminPath, id) {
  const review = await env.DB.prepare(
    "SELECT * FROM reviews WHERE id = ? LIMIT 1"
  )
    .bind(id)
    .first();

  if (!review) {
    return text("Review not found.", 404);
  }

  return htmlResponse(
    adminLayout(
      "Edit Review",
      "reviews",
      adminPath,

      pageHeader(
        "DIRECTORY",
        "Edit Review",
        "Update this review.",
        adminPath + "/reviews",
        "← Back"
      ) +

      await reviewForm(
        env,
        adminPath + "/reviews/update",
        review
      )
    )
  );
}


async function updateReview(request, env, adminPath) {
  const form = await request.formData();

  const id = field(form, "id");

  if (!id) {
    return text("Review ID is missing.", 400);
  }

  await env.DB.prepare(
    `UPDATE reviews
     SET psychic_id = ?,
         reviewer_name = ?,
         rating = ?,
         review_text = ?,
         status = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(
      field(form, "psychic_id"),
      field(form, "reviewer_name"),
      Math.max(
        1,
        Math.min(
          5,
          Number(form.get("rating")) || 5
        )
      ),
      sanitizeRichText(
        field(form, "review_text")
      ),
      form.get("status") === "published"
        ? "published"
        : "draft",
      id
    )
    .run();

  return redirect(
    request,
    adminPath + "/reviews"
  );
}


async function deleteReview(request, env, adminPath) {
  const form = await request.formData();
  const id = field(form, "id");

  if (!id) {
    return text("Review ID is missing.", 400);
  }

  await env.DB.prepare(
    "DELETE FROM reviews WHERE id = ?"
  )
    .bind(id)
    .run();

  return redirect(
    request,
    adminPath + "/reviews"
  );
}


async function reviewForm(env, action, review) {
  const psychics = await env.DB.prepare(
    `SELECT id, name
     FROM psychics
     ORDER BY name ASC`
  ).all();

  const selectedPsychic =
    review?.psychic_id || "";

  let options = "";

  for (const psychic of psychics.results || []) {
    options += `
      <option value="${escapeHtml(psychic.id)}"
        ${String(psychic.id) === String(selectedPsychic)
          ? "selected"
          : ""}>
        ${escapeHtml(psychic.name)}
      </option>
    `;
  }

  return `
    <form method="POST"
          action="${action}"
          class="form-grid">

      ${review
        ? `
          <input type="hidden"
                 name="id"
                 value="${escapeHtml(review.id)}">
        `
        : ""}

      <section class="panel">

        <div class="panel-header">
          <h2>Review</h2>
        </div>

        <label>Reviewer Name</label>

        <input name="reviewer_name"
               value="${escapeHtml(review?.reviewer_name || "")}"
               required>

        <label>Psychic</label>

        <select name="psychic_id"
                required>

          <option value="">
            Select psychic
          </option>

          ${options}

        </select>

        <label>Rating</label>

        <select name="rating">

          ${[1, 2, 3, 4, 5]
            .map(
              n => `
                <option value="${n}"
                  ${Number(review?.rating || 5) === n
                    ? "selected"
                    : ""}>
                  ${n} / 5
                </option>
              `
            )
            .join("")}

        </select>

        <label>Review</label>

        <textarea name="review_text"
                  class="large-textarea"
                  required>${escapeHtml(review?.review_text || "")}</textarea>

      </section>

      <aside>

        <section class="panel">

          <div class="panel-header">
            <h2>Publish</h2>
          </div>

          <select name="status">

            <option value="draft"
              ${review?.status !== "published"
                ? "selected"
                : ""}>
              Draft
            </option>

            <option value="published"
              ${review?.status === "published"
                ? "selected"
                : ""}>
              Published
            </option>

          </select>

          <button class="publish-button"
                  type="submit">
            ${review
              ? "Update Review"
              : "Create Review"}
          </button>

        </section>

      </aside>

    </form>
  `;
}


// ==================================================
// CATEGORIES
// ==================================================

async function categoriesPage(env, adminPath) {
  const result = await env.DB.prepare(
    `SELECT *
     FROM categories
     ORDER BY name ASC`
  ).all();

  let rows = "";

  for (const category of result.results || []) {
    rows += `
      <tr>

        <td>
          <strong>
            ${escapeHtml(category.name)}
          </strong>
        </td>

        <td>
          ${escapeHtml(category.slug)}
        </td>

        <td>
          ${escapeHtml(category.description || "—")}
        </td>

        <td>

          <form method="POST"
                action="${adminPath}/categories/delete"
                onsubmit="return confirm('Delete this category?');">

            <input type="hidden"
                   name="id"
                   value="${escapeHtml(category.id)}">

            <button class="icon-button danger"
                    type="submit">
              ×
            </button>

          </form>

        </td>

      </tr>
    `;
  }

  return htmlResponse(
    adminLayout(
      "Categories",
      "categories",
      adminPath,

      pageHeader(
        "WEBSITE",
        "Categories",
        "Organise your articles and website content.",
        adminPath,
        "← Dashboard"
      ) +

      `
        <div class="two-column">

          <section class="panel">

            <div class="panel-header">
              <h2>Categories</h2>
            </div>

            <div class="table-wrapper">

              <table>

                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Description</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  ${rows || `
                    <tr>
                      <td colspan="4"
                          class="empty">
                        No categories yet.
                      </td>
                    </tr>
                  `}
                </tbody>

              </table>

            </div>

          </section>

          <section class="panel">

            <div class="panel-header">
              <h2>Add Category</h2>
            </div>

            <form method="POST"
                  action="${adminPath}/categories/create"
                  class="simple-form">

              <label>Name</label>

              <input name="name"
                     required
                     placeholder="Psychic Readings">

              <label>Slug</label>

              <input name="slug"
                     placeholder="psychic-readings">

              <label>Description</label>

              <textarea name="description"
                        placeholder="Category description"></textarea>

              <button class="publish-button"
                      type="submit">
                Add Category
              </button>

            </form>

          </section>

        </div>
      `
    )
  );
}


async function createCategory(request, env, adminPath) {
  const form = await request.formData();

  const name = field(form, "name");
  const slug = createSlug(
    field(form, "slug") || name
  );

  if (!name || !slug) {
    return text(
      "Category name is required.",
      400
    );
  }

  try {
    await env.DB.prepare(
      `INSERT INTO categories
       (name, slug, description)
       VALUES (?, ?, ?)`
    )
      .bind(
        name,
        slug,
        field(form, "description")
      )
      .run();
  } catch (error) {
    return text(
      "Could not create category.\n\n" +
      errorMessage(error),
      500
    );
  }

  return redirect(
    request,
    adminPath + "/categories"
  );
}


async function deleteCategory(request, env, adminPath) {
  const form = await request.formData();
  const id = field(form, "id");

  if (!id) {
    return text("Category ID is missing.", 400);
  }

  await env.DB.prepare(
    "DELETE FROM categories WHERE id = ?"
  )
    .bind(id)
    .run();

  return redirect(
    request,
    adminPath + "/categories"
  );
}


// ==================================================
// MEDIA LIBRARY
// ==================================================

async function mediaPage(env, adminPath) {
  const result = await env.DB.prepare(
    `SELECT *
     FROM media
     ORDER BY created_at DESC`
  ).all();

  let cards = "";

  for (const item of result.results || []) {
    cards += `
      <div class="media-card">

        <div class="media-image">
          <img src="${escapeHtml(item.url)}"
               alt="${escapeHtml(item.alt_text || "")}">
        </div>

        <div class="media-info">

          <strong>
            ${escapeHtml(item.title || "Untitled")}
          </strong>

          <small>
            ${escapeHtml(item.url)}
          </small>

          <form method="POST"
                action="${adminPath}/media/delete"
                onsubmit="return confirm('Delete this media record?');">

            <input type="hidden"
                   name="id"
                   value="${escapeHtml(item.id)}">

            <button class="danger-link"
                    type="submit">
              Delete
            </button>

          </form>

        </div>

      </div>
    `;
  }

  return htmlResponse(
    adminLayout(
      "Media",
      "media",
      adminPath,

      pageHeader(
        "WEBSITE",
        "Media Library",
        "Manage images and other media URLs.",
        adminPath,
        "← Dashboard"
      ) +

      `
        <div class="two-column">

          <section class="panel">

            <div class="panel-header">
              <div>
                <h2>Add Media</h2>
                <p>
                  This version stores external image URLs.
                  R2 can be added later for actual uploads.
                </p>
              </div>
            </div>

            <form method="POST"
                  action="${adminPath}/media/create"
                  class="simple-form">

              <label>Title</label>

              <input name="title"
                     placeholder="Image title">

              <label>Image URL</label>

              <input name="url"
                     type="url"
                     required
                     placeholder="https://...">

              <label>Alt Text</label>

              <input name="alt_text"
                     placeholder="Describe the image">

              <button class="publish-button"
                      type="submit">
                Add Media
              </button>

            </form>

          </section>

          <section class="media-grid">

            ${cards || `
              <div class="panel empty">
                No media yet.
              </div>
            `}

          </section>

        </div>
      `
    )
  );
}


async function createMedia(request, env, adminPath) {
  const form = await request.formData();

  const url = field(form, "url");

  if (!url) {
    return text(
      "Image URL is required.",
      400
    );
  }

  await env.DB.prepare(
    `INSERT INTO media
     (title, url, alt_text)
     VALUES (?, ?, ?)`
  )
    .bind(
      field(form, "title"),
      url,
      field(form, "alt_text")
    )
    .run();

  return redirect(
    request,
    adminPath + "/media"
  );
}


async function deleteMedia(request, env, adminPath) {
  const form = await request.formData();
  const id = field(form, "id");

  if (!id) {
    return text("Media ID is missing.", 400);
  }

  await env.DB.prepare(
    "DELETE FROM media WHERE id = ?"
  )
    .bind(id)
    .run();

  return redirect(
    request,
    adminPath + "/media"
  );
}


// ==================================================
// SEO
// ==================================================

async function seoPage(env, adminPath) {
  const settings = await getSettings(env);

  return htmlResponse(
    adminLayout(
      "SEO",
      "seo",
      adminPath,

      pageHeader(
        "SEO",
        "Search Engine Optimization",
        "Control the site's default search metadata.",
        adminPath,
        "← Dashboard"
      ) +

      `
        <form method="POST"
              action="${adminPath}/seo/update"
              class="single-form">

          <section class="panel">

            <div class="panel-header">
              <div>
                <h2>Site SEO</h2>
                <p>
                  These values are used as defaults
                  when individual pages don't provide
                  their own SEO metadata.
                </p>
              </div>
            </div>

            <label>Site Title</label>

            <input name="site_title"
                   value="${escapeHtml(settings.site_title || "")}"
                   maxlength="70">

            <label>Site Description</label>

            <textarea name="site_description"
                      maxlength="170">${escapeHtml(settings.site_description || "")}</textarea>

            <label>Canonical Site URL</label>

            <input name="site_url"
                   type="url"
                   value="${escapeHtml(settings.site_url || "")}"
                   placeholder="https://example.com">

            <label>Default Social Image URL</label>

            <input name="default_social_image"
                   type="url"
                   value="${escapeHtml(settings.default_social_image || "")}"
                   placeholder="https://...">

            <label>Google / Search Verification</label>

            <input name="google_verification"
                   value="${escapeHtml(settings.google_verification || "")}"
                   placeholder="Verification code">

            <button class="publish-button"
                    type="submit">
              Save SEO Settings
            </button>

          </section>

        </form>
      `
    )
  );
}


async function updateSeo(request, env, adminPath) {
  const form = await request.formData();

  await saveSetting(
    env,
    "site_title",
    field(form, "site_title")
  );

  await saveSetting(
    env,
    "site_description",
    field(form, "site_description")
  );

  await saveSetting(
    env,
    "site_url",
    field(form, "site_url")
  );

  await saveSetting(
    env,
    "default_social_image",
    field(form, "default_social_image")
  );

  await saveSetting(
    env,
    "google_verification",
    field(form, "google_verification")
  );

  return redirect(
    request,
    adminPath + "/seo"
  );
}


// ==================================================
// SETTINGS
// ==================================================

async function settingsPage(env, adminPath) {
  const settings = await getSettings(env);

  return htmlResponse(
    adminLayout(
      "Website Settings",
      "settings",
      adminPath,

      pageHeader(
        "WEBSITE",
        "Website Settings",
        "Configure the basic identity of Psychic Index.",
        adminPath,
        "← Dashboard"
      ) +

      `
        <form method="POST"
              action="${adminPath}/settings/update"
              class="single-form">

          <section class="panel">

            <div class="panel-header">
              <h2>General Website Information</h2>
            </div>

            <label>Website Name</label>

            <input name="site_name"
                   value="${escapeHtml(settings.site_name || "Psychic Index")}">

            <label>Tagline</label>

            <input name="tagline"
                   value="${escapeHtml(settings.tagline || "")}"
                   placeholder="Your psychic directory and resource">

            <label>Contact Email</label>

            <input name="contact_email"
                   type="email"
                   value="${escapeHtml(settings.contact_email || "")}">

            <label>Footer Text</label>

            <textarea name="footer_text">${escapeHtml(settings.footer_text || "")}</textarea>

            <button class="publish-button"
                    type="submit">
              Save Website Settings
            </button>

          </section>

        </form>
      `
    )
  );
}


async function updateSettings(request, env, adminPath) {
  const form = await request.formData();

  await saveSetting(
    env,
    "site_name",
    field(form, "site_name")
  );

  await saveSetting(
    env,
    "tagline",
    field(form, "tagline")
  );

  await saveSetting(
    env,
    "contact_email",
    field(form, "contact_email")
  );

  await saveSetting(
    env,
    "footer_text",
    field(form, "footer_text")
  );

  return redirect(
    request,
    adminPath + "/settings"
  );
}


// ==================================================
// PUBLIC ARTICLE
// ==================================================

function articlePage(article) {
  const seoTitle =
    article.seo_title ||
    article.title ||
    "Psychic Index";

  const description =
    article.seo_description ||
    article.excerpt ||
    "";

  const content =
    sanitizeRichText(
      article.content || ""
    );

  return new Response(
    `
      <!DOCTYPE html>

      <html lang="en">

      <head>

        <meta charset="UTF-8">

        <meta name="viewport"
              content="width=device-width, initial-scale=1.0">

        <title>
          ${escapeHtml(seoTitle)}
        </title>

        <meta name="description"
              content="${escapeHtml(description)}">

        <link rel="canonical"
              href="/articles/${encodeURIComponent(article.slug)}">

        <style>

          * {
            box-sizing: border-box;
          }

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
            padding: 60px 22px;
          }

          article {
            background: white;
            border-radius: 18px;
            padding: 48px;
            box-shadow:
              0 12px 40px rgba(30,20,50,.05);
          }

          h1 {
            margin: 0 0 18px;
            font-size: 44px;
            line-height: 1.12;
            letter-spacing: -1.4px;
          }

          .category {
            color: #6f4bb8;
            font-weight: 700;
            margin-bottom: 25px;
          }

          .excerpt {
            color: #777181;
            font-size: 19px;
            line-height: 1.7;
            margin-bottom: 30px;
          }

          .featured {
            width: 100%;
            display: block;
            border-radius: 14px;
            margin-bottom: 35px;
          }

          .content {
            font-size: 17px;
            line-height: 1.85;
          }

          .content h2 {
            margin-top: 38px;
            font-size: 28px;
          }

          .content h3 {
            margin-top: 30px;
            font-size: 22px;
          }

          .content a {
            color: #6f4bb8;
          }

          .content img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 25px auto;
            border-radius: 12px;
          }

          .content blockquote {
            margin: 25px 0;
            padding: 18px 22px;
            border-left: 4px solid #6f4bb8;
            background: #f6f1fb;
            color: #5f5869;
          }

          @media(max-width:650px) {

            main {
              padding: 20px 12px;
            }

            article {
              padding: 25px;
            }

            h1 {
              font-size: 33px;
            }

          }

        </style>

      </head>

      <body>

        <main>

          <article>

            ${
              article.category
                ? `
                  <div class="category">
                    ${escapeHtml(article.category)}
                  </div>
                `
                : ""
            }

            <h1>
              ${escapeHtml(article.title)}
            </h1>

            ${
              article.featured_image
                ? `
                  <img class="featured"
                       src="${escapeHtml(article.featured_image)}"
                       alt="${escapeHtml(article.title)}">
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

            <div class="content">
              ${content}
            </div>

          </article>

        </main>

      </body>

      </html>
    `,
    {
      headers: {
        "Content-Type":
          "text/html; charset=UTF-8"
      }
    }
  );
}


// ==================================================
// PUBLIC PSYCHIC PAGE
// ==================================================

function psychicPage(psychic) {
  const title =
    psychic.seo_title ||
    psychic.name ||
    "Psychic";

  const description =
    psychic.seo_description ||
    psychic.description ||
    "";

  return new Response(
    `
      <!DOCTYPE html>

      <html lang="en">

      <head>

        <meta charset="UTF-8">

        <meta name="viewport"
              content="width=device-width, initial-scale=1.0">

        <title>
          ${escapeHtml(title)}
        </title>

        <meta name="description"
              content="${escapeHtml(description)}">

        <style>

          body {
            margin: 0;
            background: #f7f6fa;
            color: #211c2b;
            font-family:
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
          }

          main {
            max-width: 900px;
            margin: auto;
            padding: 60px 22px;
          }

          .profile {
            background: white;
            border-radius: 18px;
            padding: 45px;
          }

          .photo {
            width: 180px;
            height: 180px;
            object-fit: cover;
            border-radius: 50%;
            display: block;
            margin-bottom: 25px;
          }

          h1 {
            font-size: 42px;
            margin: 0 0 12px;
          }

          .meta {
            color: #6f4bb8;
            font-weight: 650;
            margin-bottom: 25px;
          }

          .description {
            line-height: 1.8;
            font-size: 17px;
          }

          a {
            color: #6f4bb8;
          }

        </style>

      </head>

      <body>

        <main>

          <div class="profile">

            ${
              psychic.photo
                ? `
                  <img class="photo"
                       src="${escapeHtml(psychic.photo)}"
                       alt="${escapeHtml(psychic.name)}">
                `
                : ""
            }

            <h1>
              ${escapeHtml(psychic.name)}
            </h1>

            ${
              psychic.location
                ? `
                  <div class="meta">
                    ${escapeHtml(psychic.location)}
                  </div>
                `
                : ""
            }

            ${
              psychic.specialties
                ? `
                  <p>
                    <strong>Specialties:</strong>
                    ${escapeHtml(psychic.specialties)}
                  </p>
                `
                : ""
            }

            <div class="description">
              ${sanitizeRichText(psychic.description || "")}
            </div>

            ${
              psychic.website
                ? `
                  <p>
                    <a href="${escapeHtml(psychic.website)}"
                       rel="noopener noreferrer">
                      Visit website
                    </a>
                  </p>
                `
                : ""
            }

          </div>

        </main>

      </body>

      </html>
    `,
    {
      headers: {
        "Content-Type":
          "text/html; charset=UTF-8"
      }
    }
  );
}


// ==================================================
// SITEMAP
// ==================================================

async function sitemap(env, request) {
  const origin =
    new URL(request.url).origin;

  const articles = await env.DB.prepare(
    `SELECT slug
     FROM articles
     WHERE status = 'published'
     ORDER BY published_at DESC`
  ).all();

  const psychics = await env.DB.prepare(
    `SELECT slug
     FROM psychics
     WHERE status = 'published'
     ORDER BY updated_at DESC`
  ).all();

  let urls = `
    <url>
      <loc>${escapeXml(origin + "/")}</loc>
    </url>
  `;

  for (const article of articles.results || []) {
    urls += `
      <url>
        <loc>${escapeXml(
          origin +
          "/articles/" +
          article.slug
        )}</loc>
      </url>
    `;
  }

  for (const psychic of psychics.results || []) {
    urls += `
      <url>
        <loc>${escapeXml(
          origin +
          "/psychics/" +
          psychic.slug
        )}</loc>
      </url>
    `;
  }

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
    <urlset
      xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls}
    </urlset>`,
    {
      headers: {
        "Content-Type":
          "application/xml; charset=UTF-8"
      }
    }
  );
}


// ==================================================
// ADMIN LAYOUT
// ==================================================

function adminLayout(
  title,
  active,
  adminPath,
  content
) {
  return `
    <!DOCTYPE html>

    <html lang="en">

    <head>

      <meta charset="UTF-8">

      <meta name="viewport"
            content="width=device-width, initial-scale=1.0">

      <title>
        ${escapeHtml(title)}
        — Psychic Index Admin
      </title>

      <style>

        * {
          box-sizing: border-box;
        }

        :root {
          --bg:#f7f6fa;
          --panel:#ffffff;
          --border:#e8e5ed;
          --text:#211c2b;
          --muted:#777181;
          --purple:#6f4bb8;
          --purple-dark:#573595;
          --purple-light:#f1ecfa;
          --green:#32845c;
          --green-light:#eaf6ef;
          --amber:#a36a20;
          --amber-light:#fff4e4;
          --sidebar:#211c2b;
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
          border-bottom:
            1px solid rgba(255,255,255,.08);
          text-decoration: none;
        }

        .brand-symbol {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            linear-gradient(
              135deg,
              #8b67d0,
              #6542a6
            );
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
          opacity: .5;
          margin-top: 2px;
        }

        .nav {
          padding: 22px 14px;
          overflow-y: auto;
        }

        .nav-label {
          padding: 0 11px;
          margin: 18px 0 9px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: rgba(255,255,255,.4);
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 12px;
          margin-bottom: 3px;
          border-radius: 9px;
          text-decoration: none;
          color: rgba(255,255,255,.68);
          font-size: 14px;
        }

        .nav-link:hover {
          color: white;
          background: rgba(255,255,255,.07);
        }

        .nav-link.active {
          color: white;
          background:
            rgba(123,91,190,.32);
        }

        .nav-icon {
          width: 21px;
          text-align: center;
          font-size: 16px;
        }

        .sidebar-bottom {
          margin-top: auto;
          padding: 16px 14px 20px;
          border-top:
            1px solid rgba(255,255,255,.08);
        }

        .site-link {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,.65);
          text-decoration: none;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 13px;
        }

        .site-link:hover {
          color: white;
          background:
            rgba(255,255,255,.06);
        }

        .main-area {
          margin-left: 245px;
          width: calc(100% - 245px);
          min-width: 0;
        }

        .topbar {
          height: 82px;
          background: white;
          border-bottom:
            1px solid var(--border);
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

        label {
          display: block;
          margin: 18px 23px 7px;
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
          box-shadow:
            0 0 0 3px
            rgba(111,75,184,.08);
        }

        textarea {
          min-height: 120px;
          resize: vertical;
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

        .page-title-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 30px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns:
            repeat(5, minmax(0,1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .stat-card {
          background: white;
          border: 1px solid var(--border);
          border-radius: 13px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .stat-icon {
          width: 43px;
          height: 43px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          flex-shrink: 0;
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
          font-size: 25px;
          font-weight: 750;
        }

        .stat-label {
          color: var(--muted);
          font-size: 11px;
          margin-top: 3px;
        }

        .content-grid {
          display: grid;
          grid-template-columns:
            minmax(0,1.65fr)
            minmax(280px,.75fr);
          gap: 22px;
        }

        .two-column {
          display: grid;
          grid-template-columns:
            minmax(0,1.5fr)
            minmax(280px,.7fr);
          gap: 22px;
          align-items: start;
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
          border-bottom:
            1px solid var(--border);
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
          font-weight: 650;
          background: #fcfbfd;
          white-space: nowrap;
        }

        td {
          padding: 15px 22px;
          border-top:
            1px solid #f0edf3;
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

        .status:before {
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
          border-bottom:
            1px solid var(--border);
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

        .editor-layout {
          display: grid;
          grid-template-columns:
            minmax(0,1fr)
            320px;
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

        .editor-layout .panel > input,
        .editor-layout .panel > textarea,
        .editor-layout .panel > select,
        .editor-layout .panel > .slug-input,
        .editor-layout .panel > .rich-editor {
          margin-left: 23px;
          margin-right: 23px;
          width: calc(100% - 46px);
        }

        .editor-layout .panel > label {
          margin-top: 19px;
        }

        .title-input {
          font-size: 21px;
          font-weight: 600;
          padding: 15px;
        }

        .excerpt-input {
          min-height: 110px;
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
          letter-spacing: .7px;
        }

        .field-hint {
          margin: 6px 23px 0;
          color: #9a94a2;
          font-size: 10px;
        }

        .rich-editor {
          border: 1px solid #ddd8e3;
          border-radius: 9px;
          overflow: hidden;
          background: white;
        }

        .editor-toolbar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px;
          padding: 8px;
          background: #faf9fb;
          border-bottom: 1px solid #e6e2ea;
        }

        .editor-toolbar button {
          min-width: 32px;
          height: 31px;
          padding: 0 8px;
          border: 1px solid transparent;
          border-radius: 6px;
          background: white;
          color: #514b59;
          cursor: pointer;
          font-size: 12px;
        }

        .editor-toolbar button:hover {
          background: var(--purple-light);
          color: var(--purple);
          border-color: #e0d7ef;
        }

        .toolbar-divider {
          width: 1px;
          height: 22px;
          background: #ddd8e3;
          margin: 0 4px;
        }

        .rich-editor-area {
          min-height: 520px;
          padding: 20px;
          outline: none;
          font-size: 15px;
          line-height: 1.8;
        }

        .rich-editor-area h2 {
          font-size: 28px;
          margin-top: 28px;
        }

        .rich-editor-area h3 {
          font-size: 21px;
          margin-top: 24px;
        }

        .rich-editor-area img {
          max-width: 100%;
          height: auto;
          border-radius: 10px;
        }

        .rich-editor-area blockquote {
          border-left: 4px solid var(--purple);
          margin-left: 0;
          padding-left: 18px;
          color: var(--muted);
        }

        .hidden-content {
          display: none !important;
        }

        .form-grid {
          display: grid;
          grid-template-columns:
            minmax(0,1fr)
            320px;
          gap: 22px;
          align-items: start;
        }

        .form-grid aside {
          display: flex;
          flex-direction: column;
          gap: 22px;
          position: sticky;
          top: 25px;
        }

        .large-textarea {
          min-height: 300px;
        }

        .single-form {
          max-width: 900px;
        }

        .simple-form {
          padding: 0 23px 23px;
        }

        .simple-form label,
        .single-form label,
        .form-grid label {
          margin-left: 0;
          margin-right: 0;
        }

        .simple-form input,
        .simple-form textarea,
        .simple-form select,
        .single-form input,
        .single-form textarea,
        .single-form select,
        .form-grid input,
        .form-grid textarea,
        .form-grid select {
          margin-bottom: 10px;
        }

        .simple-form .publish-button,
        .single-form .publish-button {
          width: 100%;
          margin: 18px 0 0;
        }

        .media-grid {
          display: grid;
          grid-template-columns:
            repeat(2,minmax(0,1fr));
          gap: 14px;
        }

        .media-card {
          background: white;
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }

        .media-image {
          aspect-ratio: 16 / 10;
          background: #f0edf3;
          overflow: hidden;
        }

        .media-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .media-info {
          padding: 13px;
        }

        .media-info strong {
          display: block;
          font-size: 12px;
        }

        .media-info small {
          display: block;
          margin-top: 6px;
          color: var(--muted);
          overflow-wrap: anywhere;
          font-size: 10px;
        }

        .danger-link {
          margin-top: 9px;
          padding: 0;
          border: 0;
          background: none;
          color: #b44;
          cursor: pointer;
          font-size: 11px;
        }

        @media(max-width:1100px) {

          .stats-grid {
            grid-template-columns:
              repeat(3,minmax(0,1fr));
          }

          .content-grid,
          .two-column,
          .editor-layout,
          .form-grid {
            grid-template-columns: 1fr;
          }

          .editor-sidebar,
          .form-grid aside {
            position: static;
            display: grid;
            grid-template-columns:
              repeat(2,minmax(0,1fr));
          }

        }

        @media(max-width:800px) {

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
          .site-link span:last-child {
            display: none;
          }

          .nav-link {
            justify-content: center;
            padding: 12px;
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

        @media(max-width:650px) {

          .page-title-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .editor-sidebar,
          .form-grid aside {
            grid-template-columns: 1fr;
          }

          .article-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .search-box {
            max-width: none;
          }

          .admin-info {
            display: none;
          }

          .media-grid {
            grid-template-columns: 1fr;
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

          <a class="brand"
             href="${adminPath}">

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

            ${navLink(
              adminPath,
              "dashboard",
              active,
              "⌂",
              "Dashboard"
            )}

            ${navLink(
              adminPath + "/articles",
              "articles",
              active,
              "✎",
              "Articles"
            )}

            <div class="nav-label">
              Directory
            </div>

            ${navLink(
              adminPath + "/psychics",
              "psychics",
              active,
              "♢",
              "Psychics"
            )}

            ${navLink(
              adminPath + "/reviews",
              "reviews",
              active,
              "★",
              "Reviews"
            )}

            <div class="nav-label">
              Website
            </div>

            ${navLink(
              adminPath + "/categories",
              "categories",
              active,
              "◈",
              "Categories"
            )}

            ${navLink(
              adminPath + "/media",
              "media",
              active,
              "◫",
              "Media"
            )}

            ${navLink(
              adminPath + "/settings",
              "settings",
              active,
              "⚙",
              "Settings"
            )}

            <div class="nav-label">
              SEO
            </div>

            ${navLink(
              adminPath + "/seo",
              "seo",
              active,
              "◌",
              "SEO"
            )}

          </nav>

          <div class="sidebar-bottom">

            <a class="site-link"
               href="/">

              <span>↗</span>
              <span>View Website</span>

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


function navLink(
  href,
  name,
  active,
  icon,
  label
) {
  return `
    <a class="nav-link ${active === name ? "active" : ""}"
       href="${href}">

      <span class="nav-icon">
        ${icon}
      </span>

      <span>
        ${escapeHtml(label)}
      </span>

    </a>
  `;
}


function pageHeader(
  eyebrow,
  title,
  description,
  href,
  linkText
) {
  return `
    <div class="page-title-row">

      <div>

        <div class="eyebrow">
          ${escapeHtml(eyebrow)}
        </div>

        <h1>
          ${escapeHtml(title)}
        </h1>

        <p>
          ${escapeHtml(description)}
        </p>

      </div>

      <a class="secondary-button"
         href="${href}">
        ${escapeHtml(linkText)}
      </a>

    </div>
  `;
}


// ==================================================
// SETTINGS HELPERS
// ==================================================

async function getSettings(env) {
  const result = await env.DB.prepare(
    "SELECT setting_key, setting_value FROM settings"
  ).all();

  const settings = {};

  for (const row of result.results || []) {
    settings[row.setting_key] =
      row.setting_value;
  }

  return settings;
}


async function saveSetting(
  env,
  key,
  value
) {
  await env.DB.prepare(
    `INSERT INTO settings
     (setting_key, setting_value)
     VALUES (?, ?)
     ON CONFLICT(setting_key)
     DO UPDATE SET
       setting_value = excluded.setting_value,
       updated_at = CURRENT_TIMESTAMP`
  )
    .bind(key, value || "")
    .run();
}


// ==================================================
// GENERAL HELPERS
// ==================================================

function field(form, name) {
  return String(
    form.get(name) || ""
  ).trim();
}


function redirect(request, path) {
  return Response.redirect(
    new URL(
      path,
      request.url
    ).toString(),
    303
  );
}


function htmlResponse(html) {
  return new Response(
    html,
    {
      headers: {
        "Content-Type":
          "text/html; charset=UTF-8"
      }
    }
  );
}


function createSlug(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
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


function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}


// ==================================================
// RICH TEXT SANITIZER
// ==================================================

function sanitizeRichText(html) {
  if (!html) {
    return "";
  }

  let clean = String(html);

  // Remove scripts and dangerous containers.
  clean = clean.replace(
    /<\s*(script|style|iframe|object|embed|form|textarea)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    ""
  );

  clean = clean.replace(
    /<\s*(script|style|iframe|object|embed|form|textarea)[^>]*\/?\s*>/gi,
    ""
  );

  // Remove inline event handlers.
  clean = clean.replace(
    /\s+on[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi,
    ""
  );

  // Remove javascript: URLs.
  clean = clean.replace(
    /\s+(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi,
    ""
  );

  // Only allow the tags we actually use.
  const allowedTags = [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "h2",
    "h3",
    "ul",
    "ol",
    "li",
    "blockquote",
    "a",
    "img"
  ];

  clean = clean.replace(
    /<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi,
    function(match, tagName) {
      const tag =
        String(tagName).toLowerCase();

      if (!allowedTags.includes(tag)) {
        return "";
      }

      const closing =
        /^<\s*\//.test(match);

      if (closing) {
        return `</${tag}>`;
      }

      if (tag === "a") {
        const href =
          match.match(
            /\bhref\s*=\s*["']([^"']*)["']/i
          );

        if (!href) {
          return "<a>";
        }

        const safeHref =
          safeUrl(href[1]);

        if (!safeHref) {
          return "<a>";
        }

        return `
          <a href="${escapeHtml(safeHref)}"
             rel="noopener noreferrer">
        `;
      }

      if (tag === "img") {
        const src =
          match.match(
            /\bsrc\s*=\s*["']([^"']*)["']/i
          );

        if (!src) {
          return "";
        }

        const safeSrc =
          safeUrl(src[1]);

        if (!safeSrc) {
          return "";
        }

        const alt =
          match.match(
            /\balt\s*=\s*["']([^"']*)["']/i
          );

        return `
          <img src="${escapeHtml(safeSrc)}"
               alt="${escapeHtml(alt ? alt[1] : "")}">
        `;
      }

      return `<${tag}>`;
    }
  );

  return clean;
}


function safeUrl(value) {
  try {
    const url =
      new URL(
        String(value),
        "https://psychic-index.invalid"
      );

    if (
      url.protocol === "http:" ||
      url.protocol === "https:"
    ) {
      return url.href;
    }

    return "";
  } catch {
    return "";
  }
}
