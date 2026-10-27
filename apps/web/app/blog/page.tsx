import type { Metadata } from "next";
import Link from "next/link";
import { formatPostDate, getAllPosts } from "@/lib/blog";
import { SiteFooter, SiteHeader } from "../SiteChrome";
import styles from "./blog.module.css";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes on client feedback, website reviews and running a smoother design process, from the Easymarker team.",
};

export default function BlogIndexPage() {
  const posts = getAllPosts();
  const [latest, ...rest] = posts;

  return (
    <div className={styles.page}>
      <SiteHeader />
      <main className={styles.indexMain}>
        <header className={styles.indexHeader}>
          <h1 className={styles.indexTitle}>Blog</h1>
          <p className={styles.indexIntro}>
            Notes on client feedback, website reviews and getting work approved without the back-and-forth.
          </p>
        </header>

        {!latest ? (
          <p className={styles.empty}>The first post is on its way.</p>
        ) : (
          <>
            <Link href={`/blog/${latest.slug}`} className={styles.featured}>
              <span className={styles.featuredMeta}>
                Latest post, {formatPostDate(latest.date)}
              </span>
              <h2 className={styles.featuredTitle}>{latest.title}</h2>
              {latest.description && <p className={styles.featuredDesc}>{latest.description}</p>}
              <span className={styles.readMore}>Read the post</span>
            </Link>

            {rest.length > 0 && (
              <ul className={styles.list}>
                {rest.map((post) => (
                  <li key={post.slug}>
                    <Link href={`/blog/${post.slug}`} className={styles.row}>
                      <time className={styles.rowDate} dateTime={post.date}>
                        {formatPostDate(post.date)}
                      </time>
                      <div>
                        <h2 className={styles.rowTitle}>{post.title}</h2>
                        {post.description && <p className={styles.rowDesc}>{post.description}</p>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
