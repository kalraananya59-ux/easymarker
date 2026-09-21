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

interface ResetPasswordEmailProps {
  name: string;
  resetUrl: string;
}

export function ResetPasswordEmail({ name, resetUrl }: ResetPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your Easymarker password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Reset your password</Heading>
          <Text style={text}>
            Hi {name}, we received a request to reset your Easymarker password. Click below to
            choose a new one — this link expires in 1 hour.
          </Text>
          <Link href={resetUrl} style={button}>
            Reset password
          </Link>
          <Text style={footer}>
            If you didn't request this, you can safely ignore this email — your password won't
            change.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ResetPasswordEmail;

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
