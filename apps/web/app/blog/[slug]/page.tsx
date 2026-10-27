import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPostDate, getAllPosts, getPost } from "@/lib/blog";
import { SiteFooter, SiteHeader } from "../../SiteChrome";
import styles from "../blog.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    openGraph: { title: post.title, description: post.description, type: "article" },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();

  return (
    <div className={styles.page}>
      <SiteHeader />
      <main className={styles.postMain}>
        <article>
          <Link href="/blog" className={styles.back}>
            All posts
          </Link>
          <h1 className={styles.postTitle}>{post.title}</h1>
          {post.description && <p className={styles.postLede}>{post.description}</p>}
          <p className={styles.postMeta}>
            By {post.author}, <time dateTime={post.date}>{formatPostDate(post.date)}</time>, {post.readingMinutes} min
            read
          </p>
          <div className={styles.prose} dangerouslySetInnerHTML={{ __html: post.html }} />
        </article>

        <aside className={styles.postCta}>
          <h2>Get feedback pinned exactly where your client means it.</h2>
          <p>Share a link to any website. Reviewers don&apos;t need an account.</p>
          <Link href="/signup" className="btn btnPrimary">
            Start for free
          </Link>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
