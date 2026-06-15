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
  Link,
} from "@react-email/components";
import React from "react";

interface AdminWelcomeEmailProps {
  firstName: string;
  email: string;
  temporaryPassword: string;
  loginUrl?: string;
}

export const AdminWelcomeEmail: React.FC<Readonly<AdminWelcomeEmailProps>> = ({
  firstName,
  email,
  temporaryPassword,
  //   loginUrl = "https://admin.saucymenu.com/login",
}) => (
  <Html>
    <Head />
    <Preview>Welcome to Saucy Menu Admin - Your account is ready</Preview>
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
          <div style={adminBadge}>SUPER ADMIN PORTAL</div>
        </Section>

        {/* Main Content */}
        <Section style={content}>
          <Heading style={h1}>Welcome to the Admin Team!</Heading>

          <Text style={greeting}>Hello {firstName},</Text>

          <Text style={text}>
            Congratulations! You've been granted Super Admin access to the Saucy
            Menu management system. Your account has been created and is ready
            to use.
          </Text>

          {/* Login Credentials Box */}
          <Section style={credentialsBox}>
            <Text style={credentialsTitle}>🔐 Your Login Credentials</Text>

            <div style={credentialRow}>
              <Text style={credentialLabel}>Email:</Text>
              <Text style={credentialValue}>{email}</Text>
            </div>

            <div style={credentialRow}>
              <Text style={credentialLabel}>Password:</Text>
              <div style={passwordContainer}>
                <Text style={passwordText}>{temporaryPassword}</Text>
              </div>
            </div>
          </Section>

          {/* Login Instructions */}
          {/* <Section style={instructionsBox}>
            <Text style={instructionsTitle}>📋 Getting Started</Text>
            <Text style={instructionItem}>
              1. Visit the admin portal:{" "}
              <Link href={loginUrl} style={link}>
                {loginUrl}
              </Link>
            </Text>
            <Text style={instructionItem}>
              2. Login with your email and temporary password
            </Text>
            <Text style={instructionItem}>
              3. You'll be prompted to create a new secure password
            </Text>
            <Text style={instructionItem}>4. Complete your profile setup</Text>
          </Section> */}

          {/* Security Warning */}
          {/* <Section style={securityBox}>
            <Text style={securityTitle}>⚠️ Important Security Notice</Text>
            <Text style={securityText}>
              • <strong>Change your password immediately</strong> after your
              first login
            </Text>
            <Text style={securityText}>
              • This temporary password expires in <strong>24 hours</strong>
            </Text>
            <Text style={securityText}>
              • Never share your admin credentials with anyone
            </Text>
            <Text style={securityText}>
              • Enable two-factor authentication for enhanced security
            </Text>
          </Section> */}

          <Text style={text}>
            As a Super Admin, you'll have full access to manage restaurants,
            users. If you have any questions or need assistance, please don't
            hesitate to reach out to our technical team.
          </Text>

          <Text style={text}>Welcome aboard! 🎉</Text>
        </Section>

        <Hr style={hr} />

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            <strong>Saucy Menu Admin Portal</strong>
          </Text>
          <Text style={footerText}>
            Technical Support: admin-support@saucymenu.com
          </Text>
          <Text style={footerText}>Emergency Contact: +1 (555) 123-4567</Text>
          <Text style={footerText}>
            © 2024 Saucy Menu. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default AdminWelcomeEmail;

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
  backgroundColor: "#1a365d",
  padding: "32px 24px",
  textAlign: "center" as const,
  background: "linear-gradient(135deg, #1a365d 0%, #2d3748 100%)",
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
  marginBottom: "8px",
};

const adminBadge = {
  fontSize: "12px",
  fontWeight: "bold",
  color: "#ffd700",
  backgroundColor: "rgba(255, 215, 0, 0.2)",
  padding: "4px 12px",
  borderRadius: "12px",
  border: "1px solid #ffd700",
  display: "inline-block",
};

const content = {
  padding: "40px 32px",
};

const h1 = {
  color: "#1a365d",
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

const credentialsBox = {
  backgroundColor: "#f7fafc",
  border: "2px solid #e2e8f0",
  borderRadius: "12px",
  padding: "24px",
  margin: "24px 0",
};

const credentialsTitle = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#1a365d",
  margin: "0 0 16px 0",
};

const credentialRow = {
  margin: "12px 0",
};

const credentialLabel = {
  fontSize: "14px",
  color: "#718096",
  margin: "0 0 4px 0",
  fontWeight: "500",
};

const credentialValue = {
  fontSize: "16px",
  color: "#2d3748",
  fontWeight: "600",
  margin: "0",
};

const passwordContainer = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  padding: "12px",
  marginTop: "4px",
};

const passwordText = {
  fontSize: "18px",
  fontFamily: "Monaco, Consolas, 'Courier New', monospace",
  color: "#1a365d",
  fontWeight: "bold",
  letterSpacing: "2px",
  margin: "0",
};

const instructionsBox = {
  backgroundColor: "#edf2f7",
  border: "1px solid #cbd5e0",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const instructionsTitle = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#2d3748",
  margin: "0 0 12px 0",
};

const instructionItem = {
  fontSize: "14px",
  color: "#4a5568",
  margin: "8px 0",
  lineHeight: "1.4",
};

const securityBox = {
  backgroundColor: "#fff5f5",
  border: "1px solid #feb2b2",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const securityTitle = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#c53030",
  margin: "0 0 12px 0",
};

const securityText = {
  fontSize: "14px",
  color: "#c53030",
  margin: "6px 0",
  lineHeight: "1.4",
};

const link = {
  color: "#3182ce",
  textDecoration: "underline",
};

const hr = {
  borderColor: "#e2e8f0",
  margin: "0",
};

const footer = {
  padding: "24px 32px",
  backgroundColor: "#1a365d",
  textAlign: "center" as const,
};

const footerText = {
  fontSize: "12px",
  color: "#cbd5e0",
  margin: "4px 0",
  lineHeight: "1.4",
};
