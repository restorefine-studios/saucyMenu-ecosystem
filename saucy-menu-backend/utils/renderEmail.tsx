// utils/renderEmail.ts
import { render } from "@react-email/render";
import PasswordResetEmail from "../src/emails/reset-password";
import React from "react";
import GeneralOtpEmail from "../src/emails/otp";
import AdminWelcomeEmail from "../src/emails/super-admin-welcome";
import AccountReleasedEmail from "../src/emails/account-release";

export const renderPasswordResetEmail = (
  name: string,
  otpCode: string,
  expirationTime?: string
) => {
  return render(
    <PasswordResetEmail
      firstName={name}
      otpCode={otpCode}
      expirationTime={expirationTime}
    />
  );
};

export const renderOtpEmail = (
  name: string,
  otpCode: string,
  purpose?: string,
  expirationTime?: string,
  customMessage?: string
) => {
  return render(
    <GeneralOtpEmail
      firstName={name}
      otpCode={otpCode}
      purpose={purpose}
      expirationTime={expirationTime}
      customMessage={customMessage}
    />
  );
};

export const renderWelcomeEmail = (
  firstName: string,
  email: string,
  temporaryPassword: string,
  loginUrl?: string
) => {
  return render(
    <AdminWelcomeEmail
      firstName={firstName}
      email={email}
      temporaryPassword={temporaryPassword}
      loginUrl={loginUrl}
    />
  );
};

export const renderAccountReleasedEmail = (
  firstName: string,
  email: string,
  password: string,
  restaurantName?: string,
  loginUrl?: string
) => {
  return render(
    <AccountReleasedEmail
      firstName={firstName}
      email={email}
      password={password}
      loginUrl={loginUrl}
      restaurantName={restaurantName}
    />
  );
};
