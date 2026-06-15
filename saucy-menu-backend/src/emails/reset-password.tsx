import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Img,
} from "@react-email/components";
import React from "react";

interface PasswordResetEmailProps {
  firstName: string;
  otpCode: string;
  expirationTime?: string;
}

export const PasswordResetEmail: React.FC<
  Readonly<PasswordResetEmailProps>
> = ({ firstName, otpCode, expirationTime = "5 minutes" }) => (
  <Html>
    <Head />
    <Preview>Reset your Saucy Menu password</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header with Logo */}
        <Section style={header}>
          <Img
            src="https://media.saucymenu.com/4f02a2e6c6acd8a847d3ddaba33f3830.png"
            alt="Saucy Menu Logo"
            style={logo}
          />
          <div style={brandName}>Saucy Menu</div>
        </Section>

        {/* Main Content */}
        <Section style={content}>
          <Heading style={h1}>Password Reset Request</Heading>

          <Text style={greeting}>Hello {firstName},</Text>

          <Text style={text}>
            We received a request to reset your password for your Saucy Menu
            account. No worries, it happens to the best of us! 🍽️
          </Text>

          <Text style={text}>
            Enter this verification code to reset your password:
          </Text>

          {/* OTP Code Display */}
          <Section style={otpContainer}>
            <Text>{otpCode}</Text>
          </Section>

          <Text style={instructionText}>
            Enter this code in the password reset form to continue.
          </Text>

          <Text style={warningText}>
            ⏰ This code will expire in {expirationTime} for security reasons.
          </Text>

          <Text style={text}>
            If you didn't request this password reset, you can safely ignore
            this email. Your password will remain unchanged.
          </Text>
        </Section>

        <Hr style={hr} />

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            <strong>Saucy Menu</strong> - Your Digital Restaurant Experience
          </Text>
          <Text style={footerText}>
            Questions? Contact us at support@saucymenu.com
          </Text>
          <Text style={footerText}>
            © 2024 Saucy Menu. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default PasswordResetEmail;

// Styles
const main = {
  backgroundColor: "#f8f9fa",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "0",
  maxWidth: "600px",
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
};

const header = {
  backgroundColor: "#ff6b35",
  padding: "32px 24px",
  textAlign: "center" as const,
  background: "linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)",
};

const logo = {
  height: "60px",
  margin: "0 auto 16px",
};

const brandName = {
  fontSize: "28px",
  fontWeight: "bold",
  color: "#ffffff",
  textShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
};

const content = {
  padding: "40px 32px",
};

const h1 = {
  color: "#2d3748",
  fontSize: "28px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "0 0 32px 0",
};

const greeting = {
  fontSize: "18px",
  color: "#2d3748",
  margin: "0 0 24px 0",
  fontWeight: "600",
};

const text = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#4a5568",
  margin: "0 0 20px 0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#ff6b35",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "16px 32px",
  border: "none",
  cursor: "pointer",
  boxShadow: "0 4px 6px rgba(255, 107, 53, 0.3)",
  transition: "all 0.2s ease",
};

const smallText = {
  fontSize: "14px",
  color: "#718096",
  margin: "24px 0 8px 0",
  textAlign: "center" as const,
};

const linkText = {
  textAlign: "center" as const,
  margin: "0 0 24px 0",
};

const link = {
  color: "#ff6b35",
  fontSize: "14px",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
};

const warningText = {
  fontSize: "14px",
  color: "#e53e3e",
  backgroundColor: "#fed7d7",
  padding: "12px 16px",
  borderRadius: "6px",
  margin: "24px 0",
  textAlign: "center" as const,
  border: "1px solid #feb2b2",
};

const hr = {
  borderColor: "#e2e8f0",
  margin: "0",
};

const footer = {
  padding: "24px 32px",
  backgroundColor: "#f7fafc",
  textAlign: "center" as const,
};

const footerText = {
  fontSize: "12px",
  color: "#718096",
  margin: "4px 0",
  lineHeight: "1.4",
};

const otpContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
  padding: "24px",
  backgroundColor: "#fff5f5",
  borderRadius: "12px",
  border: "2px dashed #ff6b35",
};

const otpCode = {
  fontSize: "36px",
  fontWeight: "bold",
  color: "#ff6b35",
  letterSpacing: "8px",
  fontFamily: "Monaco, Consolas, 'Courier New', monospace",
  textAlign: "center" as const,
  padding: "16px",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
};

const instructionText = {
  fontSize: "16px",
  color: "#4a5568",
  textAlign: "center" as const,
  margin: "16px 0 24px 0",
  fontWeight: "500",
};
