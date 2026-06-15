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

interface AccountReleasedEmailProps {
  firstName: string;
  email: string;
  password: string;
  restaurantName?: string;
  loginUrl?: string;
}

export const AccountReleasedEmail: React.FC<
  Readonly<AccountReleasedEmailProps>
> = ({
  firstName,
  email,
  password,
  //   loginUrl = "https://saucymenu.com/login",
  restaurantName,
}) => (
  <Html>
    <Head />
    <Preview>Your Saucy Menu account is now active!</Preview>
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
          <div style={welcomeBadge}>ACCOUNT ACTIVATED</div>
        </Section>

        {/* Main Content */}
        <Section style={content}>
          <Heading style={h1}>Welcome to Saucy Menu! 🎉</Heading>

          <Text style={greeting}>Hello {firstName},</Text>

          <Text style={text}>
            Great news! Your Saucy Menu account has been approved and is now
            ready to use.
            {restaurantName &&
              ` You can now access ${restaurantName}'s digital menu and place orders seamlessly.`}
          </Text>

          <Text style={text}>
            Get ready to explore delicious menus, place orders with ease, and
            enjoy a fantastic dining experience! 🍽️
          </Text>

          {/* Login Credentials Box */}
          <Section style={credentialsBox}>
            <Text style={credentialsTitle}>🔐 Your Login Details</Text>

            <div style={credentialRow}>
              <Text style={credentialLabel}>Email:</Text>
              <Text style={credentialValue}>{email}</Text>
            </div>

            <div style={credentialRow}>
              <Text style={credentialLabel}>Password:</Text>
              <div style={passwordContainer}>
                <Text style={passwordText}>{password}</Text>
              </div>
            </div>
          </Section>

          {/* Quick Start Guide */}
          {/* <Section style={quickStartBox}>
            <Text style={quickStartTitle}>🚀 Quick Start Guide</Text>
            <Text style={instructionItem}>
              1. Visit:{" "}
              <Link href={loginUrl} style={link}>
                {loginUrl}
              </Link>
            </Text>
            <Text style={instructionItem}>2. Login with your email and password</Text>
            <Text style={instructionItem}>3. Browse menus and discover amazing dishes</Text>
            <Text style={instructionItem}>4. Place your first order and enjoy!</Text>
          </Section> */}

          {/* Features Highlight */}
          {/* <Section style={featuresBox}>
            <Text style={featuresTitle}>✨ What You Can Do</Text>
            <Text style={featureItem}>🍕 Browse interactive digital menus</Text>
            <Text style={featureItem}>📱 Place orders directly from your phone</Text>
            <Text style={featureItem}>⭐ Rate and review your favorite dishes</Text>
            <Text style={featureItem}>🎯 Get personalized recommendations</Text>
            <Text style={featureItem}>📋 Track your order history</Text>
          </Section> */}

          {/* Security Note */}
          <Section style={securityBox}>
            <Text style={securityTitle}>🔒 Keep Your Account Secure</Text>
            <Text style={securityText}>
              • We recommend changing your password after your first login
            </Text>
            <Text style={securityText}>
              • Never share your login credentials with others
            </Text>
            <Text style={securityText}>
              • Log out when using shared devices
            </Text>
          </Section>

          <Text style={text}>
            We're excited to have you as part of the Saucy Menu family! If you
            have any questions or need help getting started, our support team is
            here to assist you.
          </Text>

          <Text style={text}>Happy dining! 🥳</Text>
        </Section>

        <Hr style={hr} />

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            <strong>Saucy Menu</strong> - Your Digital Restaurant Experience
          </Text>
          {/* <Text style={footerText}>Customer Support: support@saucymenu.com</Text> */}
          {/* <Text style={footerText}>Help Center: help.saucymenu.com</Text> */}
          <Text style={footerText}>
            © 2024 Saucy Menu. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default AccountReleasedEmail;

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
  marginBottom: "8px",
};

const welcomeBadge = {
  fontSize: "12px",
  fontWeight: "bold",
  color: "#ffffff",
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  padding: "4px 12px",
  borderRadius: "12px",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  display: "inline-block",
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

const credentialsBox = {
  backgroundColor: "#fff5f5",
  border: "2px solid #ff6b35",
  borderRadius: "12px",
  padding: "24px",
  margin: "24px 0",
};

const credentialsTitle = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#ff6b35",
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
  color: "#ff6b35",
  fontWeight: "bold",
  letterSpacing: "2px",
  margin: "0",
};

const quickStartBox = {
  backgroundColor: "#f0fff4",
  border: "1px solid #9ae6b4",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const quickStartTitle = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#2f855a",
  margin: "0 0 12px 0",
};

const instructionItem = {
  fontSize: "14px",
  color: "#2f855a",
  margin: "8px 0",
  lineHeight: "1.4",
};

const featuresBox = {
  backgroundColor: "#fffaf0",
  border: "1px solid #fbd38d",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const featuresTitle = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#c05621",
  margin: "0 0 12px 0",
};

const featureItem = {
  fontSize: "14px",
  color: "#c05621",
  margin: "6px 0",
  lineHeight: "1.4",
};

const securityBox = {
  backgroundColor: "#f7fafc",
  border: "1px solid #cbd5e0",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const securityTitle = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#4a5568",
  margin: "0 0 12px 0",
};

const securityText = {
  fontSize: "14px",
  color: "#4a5568",
  margin: "6px 0",
  lineHeight: "1.4",
};

const link = {
  color: "#ff6b35",
  textDecoration: "underline",
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
