const ADMIN_KEY = "PX9-vQ72-Lm4!zK81-Rt6";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
    // ADMIN ACCESS
    // ==========================================

    const adminPath = "/admin/" + ADMIN_KEY;

    if (url.pathname === adminPath) {
      return adminDashboard();
    }

    // ==========================================
    // NEW ARTICLE
    // ==========================================

    if (
      url.pathname === adminPath + "/articles/new"
    ) {
      return newArticlePage();
    }

    // ==========================================
    // CREATE ARTICLE
    // ==========================================

    if (
      url.pathname === adminPath + "/articles/create" &&
      request.method === "POST"
    ) {
      const form = await request.formData();

      const title = String(
        form.get("title") || ""
      ).trim();

      const slug = createSlug(
        String(form.get("slug") || title)
      );

      const excerpt = String(
        form.get("excerpt") || ""
      ).trim();

      const content = String(
        form.get("content") || ""
      );

      const category = String(
        form.get("category") || ""
      ).trim();

      const featuredImage = String(
        form.get("featured_image") || ""
      ).trim();

      const seoTitle = String(
        form.get("seo_title") || ""
      ).trim();

      const seoDescription = String(
        form.get("seo_description") || ""
      ).trim();

      const status =
        form.get("status") === "published"
          ? "published"
          : "draft";

      const publishedAt =
        status === "published"
          ? new Date().toISOString()
          : null;

      if (!title) {
        return new Response(
          "Article title is required.",
          { status: 400 }
        );
      }

      try {
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

        return new Response(null, {
          status: 303,
          headers: {
            Location: adminPath
          }
        });

      } catch (error) {
        return new Response(
          "Could not save article. The slug may already exist.",
          { status: 500 }
        );
      }
    }

    // ==========================================
    // PUBLIC ARTICLE
    // ==========================================

    if (
      url.pathname.startsWith("/articles/")
    ) {
      const slug =
        url.pathname
          .replace("/articles/", "")
          .replace(/\/$/, "");

      const article =
        await env.DB.prepare(
          `SELECT *
           FROM articles
           WHERE slug = ?
           AND status = 'published'
           LIMIT 1`
        )
          .bind(slug)
          .first();

      if (!article) {
        return new Response(
          "Article not found.",
          { status: 404 }
        );
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

function adminDashboard() {
  const adminPath =
    "/admin/" + ADMIN_KEY;

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
  max-width: 1100px;
  margin: 40px auto;
  padding: 20px;
}

h1 {
  margin-top: 0;
}

.grid {
  display: grid;
  grid-template-columns:
    repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-top: 30px;
}

.card {
  background: white;
  padding: 25px;
  border-radius: 15px;
  box-shadow:
    0 5px 25px rgba(0,0,0,0.06);
}

.card a {
  text-decoration: none;
  color: inherit;
}

.card h2 {
  margin-top: 0;
}

.card p {
  color: #666;
}

.button {
  display: inline-block;
  padding: 12px 18px;
  background: #222;
  color: white !important;
  border-radius: 8px;
  text-decoration: none;
}

</style>

</head>

<body>

<header>

<strong>Psychic Index</strong>

</header>

<main>

<h1>Admin Dashboard</h1>

<p>
Welcome to your Psychic Index administration area.
</p>

<div class="grid">

<div class="card">

<h2>📝 Articles</h2>

<p>
Create and manage articles.
</p>

<a
  class="button"
  href="${adminPath}/articles/new"
>
New Article
</a>

</div>

<div class="card">

<h2>🔮 Psychic Websites</h2>

<p>
Coming next.
</p>

</div>

<div class="card">

<h2>⭐ Reviews & Ratings</h2>

<p>
Coming next.
</p>

</div>

<div class="card">

<h2>🖼️ Media</h2>

<p>
Coming next.
</p>

</div>

<div class="card">

<h2>🏷️ Categories</h2>

<p>
Coming next.
</p>

</div>

<div class="card">

<h2>⚙️ SEO</h2>

<p>
Coming next.
</p>

</div>

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
// NEW ARTICLE PAGE
// ==========================================

function newArticlePage() {

  const adminPath =
    "/admin/" + ADMIN_KEY;

  return new Response(
    `<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>New Article — Psychic Index</title>

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
  max-width: 900px;
  margin: 40px auto;
  padding: 20px;
}

.card {
  background: white;
  padding: 35px;
  border-radius: 15px;
  box-shadow:
    0 5px 25px rgba(0,0,0,0.06);
}

label {
  display: block;
  font-weight: bold;
  margin-top: 20px;
  margin-bottom: 8px;
}

input,
textarea,
select {
  width: 100%;
  box-sizing: border-box;
  padding: 13px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
}

textarea {
  min-height: 220px;
  resize: vertical;
}

.content {
  min-height: 400px;
}

.buttons {
  margin-top: 30px;
  display: flex;
  gap: 15px;
}

button {
  padding: 13px 22px;
  border: 0;
  border-radius: 8px;
  background: #222;
  color: white;
  font-size: 16px;
  cursor: pointer;
}

.back {
  display: inline-block;
  margin-bottom: 25px;
  color: #555;
  text-decoration: none;
}

</style>

</head>

<body>

<header>

<strong>Psychic Index</strong>

</header>

<main>

<a
  class="back"
  href="${adminPath}"
>
← Back to Dashboard
</a>

<div class="card">

<h1>New Article</h1>

<form
  method="POST"
  action="${adminPath}/articles/create"
>

<label for="title">
Article Title
</label>

<input
  id="title"
  name="title"
  type="text"
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
  placeholder="example-article-title"
>

<label for="excerpt">
Short Description
</label>

<textarea
  id="excerpt"
  name="excerpt"
  placeholder="A short introduction to the article..."
></textarea>

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

<option value="Psychic Readings">
Psychic Readings
</option>

<option value="Psychic Websites">
Psychic Websites
</option>

<option value="Astrology">
Astrology
</option>

<option value="Horoscopes">
Horoscopes
</option>

<option value="Spirituality">
Spirituality
</option>

<option value="Reviews">
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
  placeholder="Image URL — we'll add uploading later"
>

<label for="content">
Article Content
</label>

<textarea
  id="content"
  name="content"
  class="content"
  placeholder="Write your article here..."
></textarea>

<label for="seo_title">
SEO Title
</label>

<input
  id="seo_title"
  name="seo_title"
  type="text"
  placeholder="SEO title"
>

<label for="seo_description">
SEO Description
</label>

<textarea
  id="seo_description"
  name="seo_description"
  placeholder="Description for search engines..."
></textarea>

<label for="status">
Status
</label>

<select
  id="status"
  name="status"
>

<option value="draft">
Save as Draft
</option>

<option value="published">
Publish
</option>

</select>

<div class="buttons">

<button type="submit">
Save Article
</button>

</div>

</form>

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
    ? `<img
        src="${escapeHtml(article.featured_image)}"
        alt="${title}"
        style="max-width:100%;height:auto;"
      >`
    : ""
}

<p>
${escapeHtml(article.excerpt || "")}
</p>

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
