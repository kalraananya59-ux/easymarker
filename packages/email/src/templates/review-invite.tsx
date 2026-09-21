import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";

interface ReviewInviteEmailProps {
  inviterName: string;
  projectTitle: string;
  reviewUrl: string;
}

export function ReviewInviteEmail({ inviterName, projectTitle, reviewUrl }: ReviewInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {inviterName} wants your feedback on {projectTitle}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>You've been asked to review {projectTitle}</Heading>
          <Text style={text}>
            <strong>{inviterName}</strong> shared a project with you on Easymarker and would like
            your feedback.
          </Text>
          <Text style={text}>
            Click below to open it — no account or sign-up needed. Click anywhere on the page to
            pin a comment exactly where you mean it.
          </Text>
          <Link href={reviewUrl} style={button}>
            Open the review
          </Link>
          <Text style={footer}>
            This link was sent to you by {inviterName}. If you weren't expecting this, you can
            safely ignore it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ReviewInviteEmail;

const main = {
  backgroundColor: "#f8fafc",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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

const button = {
  display: "inline-block",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  textDecoration: "none",
  padding: "10px 20px",
  borderRadius: "6px",
  margin: "8px 0 20px",
};

const footer = {
  fontSize: "12px",
  color: "#94a3b8",
  marginTop: "28px",
};
