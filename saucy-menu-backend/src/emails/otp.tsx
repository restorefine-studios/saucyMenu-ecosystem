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

interface GeneralOtpEmailProps {
  firstName: string;
  otpCode: string;
  purpose?: string;
  expirationTime?: string;
  customMessage?: string;
}

export const GeneralOtpEmail: React.FC<Readonly<GeneralOtpEmailProps>> = ({
  firstName,
  otpCode,
  purpose = "verify your account",
  expirationTime = "5 minutes",
  customMessage,
}) => (
  <Html>
    <Head />
    <Preview>Your Saucy Menu verification code</Preview>
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
          <Heading style={h1}>Verification Code</Heading>

          <Text style={greeting}>Hello {firstName},</Text>

          <Text style={text}>
            {customMessage ||
              `We need to ${purpose} for your Saucy Menu account. Here's your verification code:`}
          </Text>

          {/* OTP Code Display */}
          <Section style={otpContainer}>
            <Text style={h1}>{otpCode}</Text>
          </Section>

          <Text style={instructionText}>
            Enter this code to complete your verification and continue enjoying
            our delicious menu experience! 🍽️
          </Text>

          <Section style={securityBox}>
            <Text style={securityTitle}>🔒 Security Information</Text>
            <Text style={securityText}>
              • This code expires in <strong>{expirationTime}</strong>
            </Text>
            <Text style={securityText}>
              • Use this code only on the Saucy Menu website or app
            </Text>
            <Text style={securityText}>
              • Never share this code with anyone
            </Text>
          </Section>

          <Text style={text}>
            If you didn't request this verification code, please ignore this
            email or contact our support team if you have concerns about your
            account security.
          </Text>
        </Section>

        <Hr style={hr} />

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            <strong>Saucy Menu</strong> - Your Digital Restaurant Experience
          </Text>
          <Text style={footerText}>
            Need help? Contact us at support@saucymenu.com
          </Text>
          <Text style={footerText}>
            © 2024 Saucy Menu. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default GeneralOtpEmail;

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

const securityBox = {
  backgroundColor: "#f0fff4",
  border: "1px solid #9ae6b4",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const securityTitle = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#2f855a",
  margin: "0 0 12px 0",
};

const securityText = {
  fontSize: "14px",
  color: "#2f855a",
  margin: "4px 0",
  lineHeight: "1.4",
};
