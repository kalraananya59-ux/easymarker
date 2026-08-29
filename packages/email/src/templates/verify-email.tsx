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

interface VerifyEmailProps {
  name: string;
  verifyUrl: string;
  isReminder: boolean;
}

export function VerifyEmail({ name, verifyUrl, isReminder }: VerifyEmailProps) {
  const previewText = isReminder ? "Reminder: verify your Easymarker email" : "Verify your Easymarker email";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>{isReminder ? "Just a reminder" : "Welcome to Easymarker"}</Heading>
          <Text style={text}>
            Hi {name}, {isReminder ? "you still haven't verified" : "please verify"} your email address to finish
            setting up your account.
          </Text>
          <Link href={verifyUrl} style={button}>
            Verify email
          </Link>
          <Text style={footer}>
            If you didn't create an Easymarker account, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default VerifyEmail;

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
  margin: "0 0 20px",
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
