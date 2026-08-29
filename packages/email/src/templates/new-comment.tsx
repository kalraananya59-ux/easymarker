import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

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
    <Html>
      <Head />
      <Preview>
        {commenterName} left a comment on {projectTitle}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>New comment on {projectTitle}</Heading>
          <Text style={text}>
            <strong>{commenterName}</strong> left a comment:
          </Text>
          <Section style={quote}>
            <Text style={quoteText}>{commentSnippet}</Text>
          </Section>
          <Link href={reviewUrl} style={button}>
            View comment
          </Link>
          <Text style={footer}>
            You're receiving this because notifications are enabled for this
            project. You can turn them off from your Easymarker dashboard.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default NewCommentEmail;

const main = {
  backgroundColor: "#f8fafc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "32px",
  maxWidth: "480px",
  borderRadius: "8px",
};

const heading = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#0f172a",
  margin: "0 0 16px",
};

const text = {
  fontSize: "14px",
  color: "#334155",
  margin: "0 0 12px",
};

const quote = {
  borderLeft: "3px solid #2563eb",
  paddingLeft: "12px",
  margin: "0 0 20px",
};

const quoteText = {
  fontSize: "14px",
  color: "#475569",
  fontStyle: "italic" as const,
  margin: 0,
};

const button = {
  display: "inline-block",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  textDecoration: "none",
  padding: "10px 20px",
  borderRadius: "6px",
};

const footer = {
  fontSize: "12px",
  color: "#94a3b8",
  marginTop: "28px",
};
