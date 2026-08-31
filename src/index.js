const ADMIN_KEY = "PX9-vQ72-Lm4!zK81-Rt6";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const adminPath = "/admin/" + ADMIN_KEY;

    // ==========================================
    // DATABASE HEALTH
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
    // ADMIN DASHBOARD
    // ==========================================

    if (url.pathname === adminPath) {
      return await adminDashboard(env, adminPath);
    }

    // ==========================================
    // ARTICLES
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
    // PUBLIC ARTICLE
    // ==========================================

    if (url.pathname.startsWith("/articles/")) {
      const slug = url.pathname
        .replace("/articles/", "")
        .replace(/\/$/, "");

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
        return new Response("Article not found.", {
          status: 404
        });
      }

      return articlePage(article);
    }

    // ==========================================
    // PUBLIC WEBSITE
    // ==========================================

    return env.ASSETS.fetch(request);
  }
};


// ==========================================
// ADMIN DASHBOARD
// ==========================================

async function adminDashboard(env, adminPath) {
  try {
    const result = await env.DB.prepare(
      `SELECT
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
      FROM articles`
    ).first();

    return new Response(
      adminLayout(
        "Admin Dashboard",
        `
        <h1>Admin Dashboard</h1>

        <p>
          Welcome to Psychic Index.
        </p>

        <div class="stats">

          <div class="stat">
            <strong>${result.total || 0}</strong>
            <span>Total Articles</span>
          </div>

          <div class="stat">
            <strong>${result.published || 0}</strong>
            <span>Published</span>
          </div>

          <div class="stat">
            <strong>${result.drafts || 0}</strong>
            <span>Drafts</span>
          </div>

        </div>

        <div class="grid">

          <div class="card">
            <h2>📝 Articles</h2>

            <p>
              Write, edit and manage your articles.
            </p>

            <a
              class="button"
              href="${adminPath}/articles"
            >
              Manage Articles
            </a>
          </div>

          <div class="card">
            <h2>🔮 Psychic Websites</h2>
            <p>Coming next.</p>
          </div>

          <div class="card">
            <h2>⭐ Reviews & Ratings</h2>
            <p>Coming next.</p>
          </div>

          <div class="card">
            <h2>🖼️ Media</h2>
            <p>Coming next.</p>
          </div>

          <div class="card">
            <h2>🏷️ Categories</h2>
            <p>Coming next.</p>
          </div>

          <div class="card">
            <h2>⚙️ SEO</h2>
            <p>Coming next.</p>
          </div>

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
      "Dashboard database error: " +
      errorMessage(error),
      { status: 500 }
    );
  }
}


// ==========================================
// ARTICLES LIST
// ==========================================

async function articlesPage(env, adminPath) {
  try {
    const result = await env.DB.prepare(
      `SELECT
        id,
        title,
        slug,
        category,
        status,
        created_at,
        published_at
      FROM articles
      ORDER BY created_at DESC`
    ).all();

    let rows = "";

    for (const article of result.results) {
      const statusClass =
        article.status === "published"
          ? "published"
          : "draft";

      const date =
        article.published_at ||
        article.created_at ||
        "";

      rows += `
        <tr>

          <td>
            <strong>
              ${escapeHtml(article.title)}
            </strong>
          </td>

          <td>
            ${escapeHtml(article.category || "—")}
          </td>

          <td>
            <span class="status ${statusClass}">
              ${escapeHtml(article.status)}
            </span>
          </td>

          <td>
            ${escapeHtml(formatDate(date))}
          </td>

          <td class="actions">

            <a
              class="small-button"
              href="${adminPath}/articles/edit?id=${article.id}"
            >
              Edit
            </a>

            <form
              method="POST"
              action="${adminPath}/articles/delete"
              onsubmit="return confirm('Delete this article?');"
            >

              <input
                type="hidden"
                name="id"
                value="${article.id}"
              >

              <button
                class="delete-button"
                type="submit"
              >
                Delete
              </button>

            </form>

          </td>

        </tr>
      `;
    }

    if (!rows) {
      rows = `
        <tr>
          <td colspan="5">
            No articles yet.
          </td>
        </tr>
      `;
    }

    return new Response(
      adminLayout(
        "Articles",
        `
        <div class="page-header">

          <div>
            <h1>Articles</h1>

            <p>
              Manage your Psychic Index articles.
            </p>
          </div>

          <a
            class="button"
            href="${adminPath}/articles/new"
          >
            + New Article
          </a>

        </div>

        <div class="table-card">

          <table>

            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              ${rows}
            </tbody>

          </table>

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
      "Articles database error: " +
      errorMessage(error),
      { status: 500 }
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
      `
      <div class="page-header">

        <div>
          <h1>New Article</h1>

          <p>
            Create a new Psychic Index article.
          </p>
        </div>

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

async function createArticle(
  request,
  env,
  adminPath
) {
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

    const publishedAt =
      status === "published"
        ? new Date().toISOString()
        : null;

    await env.DB.prepare(
      `INSERT INTO articles
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

    return Response.redirect(
      adminPath + "/articles",
      303
    );

  } catch (error) {
    return new Response(
      "Could not save article.\n\n" +
      "DATABASE ERROR:\n" +
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

async function editArticlePage(
  env,
  adminPath,
  id
) {
  try {
    const article =
      await env.DB.prepare(
        `SELECT *
         FROM articles
         WHERE id = ?
         LIMIT 1`
      )
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
        `
        <div class="page-header">

          <div>
            <h1>Edit Article</h1>

            <p>
              Update your article.
            </p>
          </div>

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
      "DATABASE ERROR:\n" +
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

async function updateArticle(
  request,
  env,
  adminPath
) {
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

    // ------------------------------------------
    // BASIC VALIDATION
    // ------------------------------------------

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

    // ------------------------------------------
    // FIND EXISTING ARTICLE
    // ------------------------------------------

    const existing =
      await env.DB.prepare(
        `SELECT
          id,
          slug,
          published_at
         FROM articles
         WHERE id = ?
         LIMIT 1`
      )
        .bind(id)
        .first();

    if (!existing) {
      return new Response(
        "Update error: Article ID " +
        id +
        " was not found in the database.",
        { status: 404 }
      );
    }

    // ------------------------------------------
    // CHECK SLUG
    // ------------------------------------------

    const duplicate =
      await env.DB.prepare(
        `SELECT id
         FROM articles
         WHERE slug = ?
         AND id != ?
         LIMIT 1`
      )
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

    // ------------------------------------------
    // PUBLISHED DATE
    // ------------------------------------------

    let publishedAt =
      existing.published_at || null;

    if (
      status === "published" &&
      !publishedAt
    ) {
      publishedAt =
        new Date().toISOString();
    }

    if (status === "draft") {
      publishedAt = null;
    }

    // ------------------------------------------
    // UPDATE
    // ------------------------------------------

    const result =
      await env.DB.prepare(
        `UPDATE articles
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

    // ------------------------------------------
    // CONFIRM UPDATE
    // ------------------------------------------

    if (
      result.meta &&
      result.meta.changes === 0
    ) {
      return new Response(
        "Update ran but no database row was changed.\n\n" +
        "Article ID: " +
        id,
        { status: 500 }
      );
    }

    return Response.redirect(
      adminPath + "/articles",
      303
    );

  } catch (error) {
    return new Response(
      "COULD NOT UPDATE ARTICLE.\n\n" +
      "REAL DATABASE ERROR:\n\n" +
      errorMessage(error) +
      "\n\n" +
      "This message is intentionally shown so we can fix the exact problem.",
      {
        status: 500,
        headers: {
          "Content-Type":
            "text/plain; charset=UTF-8"
        }
      }
    );
  }
}


// ==========================================
// DELETE ARTICLE
// ==========================================

async function deleteArticle(
  request,
  env,
  adminPath
) {
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

    await env.DB.prepare(
      "DELETE FROM articles WHERE id = ?"
    )
      .bind(id)
      .run();

    return Response.redirect(
      adminPath + "/articles",
      303
    );

  } catch (error) {
    return new Response(
      "Could not delete article.\n\n" +
      errorMessage(error),
      {
        status: 500,
        headers: {
          "Content-Type":
            "text/plain; charset=UTF-8"
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
    escapeHtml(
      article?.[field] || ""
    );

  const selected = (status) =>
    article?.status === status
      ? "selected"
      : "";

  return `
  <div class="form-card">

    <form
      method="POST"
      action="${action}"
    >

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
        Article Title
      </label>

      <input
        id="title"
        name="title"
        type="text"
        value="${value("title")}"
        placeholder="Enter your article title"
        required
      >

      <label for="slug">
        URL Slug
      </label>

      <input
        id="slug"
        name="slug"
        type="text"
        value="${value("slug")}"
        placeholder="example-article-title"
      >

      <label for="excerpt">
        Short Description
      </label>

      <textarea
        id="excerpt"
        name="excerpt"
        placeholder="A short introduction..."
      >${value("excerpt")}</textarea>

      <label for="category">
        Category
      </label>

      <select
        id="category"
        name="category"
      >

        <option value="">
          Choose a category
        </option>

        <option
          value="Psychic Readings"
          ${article?.category === "Psychic Readings" ? "selected" : ""}
        >
          Psychic Readings
        </option>

        <option
          value="Psychic Websites"
          ${article?.category === "Psychic Websites" ? "selected" : ""}
        >
          Psychic Websites
        </option>

        <option
          value="Astrology"
          ${article?.category === "Astrology" ? "selected" : ""}
        >
          Astrology
        </option>

        <option
          value="Horoscopes"
          ${article?.category === "Horoscopes" ? "selected" : ""}
        >
          Horoscopes
        </option>

        <option
          value="Spirituality"
          ${article?.category === "Spirituality" ? "selected" : ""}
        >
          Spirituality
        </option>

        <option
          value="Reviews"
          ${article?.category === "Reviews" ? "selected" : ""}
        >
          Reviews
        </option>

      </select>

      <label for="featured_image">
        Featured Image URL
      </label>

      <input
        id="featured_image"
        name="featured_image"
        type="text"
        value="${value("featured_image")}"
        placeholder="We'll add image uploads later"
      >

      <label for="content">
        Article Content
      </label>

      <textarea
        id="content"
        name="content"
        class="content"
        placeholder="Write your article here..."
      >${value("content")}</textarea>

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
        placeholder="Description for search engines..."
      >${value("seo_description")}</textarea>

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
          Save as Draft
        </option>

        <option
          value="published"
          ${selected("published")}
        >
          Published
        </option>

      </select>

      <div class="form-buttons">

        <button type="submit">
          ${
            article
              ? "Update Article"
              : "Save Article"
          }
        </button>

      </div>

    </form>

  </div>
  `;
}


// ==========================================
// ADMIN LAYOUT
// ==========================================

function adminLayout(title, content) {
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
${escapeHtml(title)} — Psychic Index
</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family:
    Arial,
    Helvetica,
    sans-serif;

  background: #f5f3f8;
  color: #222;
}

header {
  background: white;
  padding: 22px 30px;
  border-bottom: 1px solid #ddd;
}

header a {
  color: #222;
  text-decoration: none;
}

main {
  max-width: 1150px;
  margin: 35px auto;
  padding: 20px;
}

h1 {
  margin-top: 0;
  font-size: 32px;
}

h2 {
  margin-top: 0;
}

p {
  color: #666;
  line-height: 1.6;
}

.grid {
  display: grid;

  grid-template-columns:
    repeat(
      auto-fit,
      minmax(250px, 1fr)
    );

  gap: 20px;

  margin-top: 30px;
}

.card,
.stat,
.table-card,
.form-card {
  background: white;

  border-radius: 15px;

  box-shadow:
    0 5px 25px
    rgba(0,0,0,0.06);
}

.card {
  padding: 25px;
}

.stats {
  display: grid;

  grid-template-columns:
    repeat(
      auto-fit,
      minmax(180px, 1fr)
    );

  gap: 20px;

  margin: 30px 0;
}

.stat {
  padding: 25px;
}

.stat strong {
  display: block;

  font-size: 32px;

  margin-bottom: 8px;
}

.stat span {
  color: #666;
}

.button,
button {
  display: inline-block;

  border: 0;

  border-radius: 8px;

  background: #222;

  color: white;

  padding: 12px 18px;

  font-size: 15px;

  text-decoration: none;

  cursor: pointer;
}

.page-header {
  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 20px;

  margin-bottom: 25px;
}

.table-card {
  overflow-x: auto;
}

table {
  width: 100%;

  border-collapse: collapse;
}

th,
td {
  padding: 16px;

  text-align: left;

  border-bottom:
    1px solid #eee;
}

th {
  font-size: 14px;

  color: #666;
}

.status {
  display: inline-block;

  padding: 6px 10px;

  border-radius: 20px;

  font-size: 13px;

  text-transform: capitalize;
}

.status.published {
  background: #e8f5ea;
}

.status.draft {
  background: #f1f1f1;
}

.actions {
  display: flex;

  gap: 8px;

  align-items: center;
}

.actions form {
  margin: 0;
}

.small-button,
.delete-button {
  padding: 8px 12px;

  font-size: 13px;
}

.small-button {
  background: #eee;

  color: #222;

  border-radius: 7px;

  text-decoration: none;
}

.delete-button {
  background: #eee;

  color: #222;
}

.form-card {
  padding: 35px;

  max-width: 900px;
}

label {
  display: block;

  margin-top: 22px;

  margin-bottom: 8px;

  font-weight: bold;
}

input,
textarea,
select {
  width: 100%;

  padding: 13px;

  border: 1px solid #ddd;

  border-radius: 8px;

  font-size: 16px;

  font-family: inherit;
}

textarea {
  min-height: 150px;

  resize: vertical;
}

textarea.content {
  min-height: 420px;
}

.form-buttons {
  margin-top: 30px;
}

@media (max-width: 700px) {

  .page-header {
    flex-direction: column;

    align-items: flex-start;
  }

  th:nth-child(2),
  td:nth-child(2),
  th:nth-child(4),
  td:nth-child(4) {
    display: none;
  }

}

</style>

</head>

<body>

<header>

<a href="/admin/${ADMIN_KEY}">
<strong>Psychic Index</strong>
</a>

</header>

<main>

${content}

</main>

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
    escapeHtml(article.content)
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

</head>

<body>

<main>

<article>

<h1>${title}</h1>

${
  article.category
    ? `<p>${escapeHtml(article.category)}</p>`
    : ""
}

${
  article.featured_image
    ? `
    <img
      src="${escapeHtml(article.featured_image)}"
      alt="${title}"
      style="
        max-width:100%;
        height:auto;
      "
    >
    `
    : ""
}

${
  article.excerpt
    ? `
    <p>
      ${escapeHtml(article.excerpt)}
    </p>
    `
    : ""
}

<div>
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
// SLUG GENERATOR
// ==========================================

function createSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


// ==========================================
// DATE FORMAT
// ==========================================

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


// ==========================================
// ERROR MESSAGE
// ==========================================

function errorMessage(error) {
  if (!error) {
    return "Unknown error";
  }

  if (error.message) {
    return error.message;
  }

  return String(error);
}


// ==========================================
// HTML ESCAPING
// ==========================================

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
