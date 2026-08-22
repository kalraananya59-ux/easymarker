import * as React from "react";

interface NewCommentEmailProps {
  projectTitle: string;
  commenterName: string;
  commentSnippet: string;
  reviewUrl: string;
}

export function NewCommentEmail({
  projectTitle,
  commenterName,
  commentSnippet,
  reviewUrl,
}: NewCommentEmailProps) {
  return (
    <div>
      <h1>New comment on {projectTitle}</h1>
      <p><strong>{commenterName}</strong> left a comment:</p>
      <blockquote>{commentSnippet}</blockquote>
      <a href={reviewUrl}>View comment</a>
    </div>
  );
}
