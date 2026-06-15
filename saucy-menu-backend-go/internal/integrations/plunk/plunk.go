// Package plunk is now backed by Resend (api.resend.com).
// The external interface (Client, SendParams, OTPEmailBody) is unchanged
// so no call sites need updating.
package plunk

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

const apiURL = "https://api.resend.com/emails"

const FromAddress = "noreply@saucymenu.com"

type Client struct {
	apiKey     string
	httpClient *http.Client
}

func New(apiKey string) *Client {
	return &Client{apiKey: apiKey, httpClient: &http.Client{}}
}

type SendParams struct {
	To      string `json:"to"`
	Subject string `json:"subject"`
	Body    string `json:"body"` // plain-text; mapped to Resend's "text" field
}

type resendRequest struct {
	From    string `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	Text    string   `json:"text"`
}

func (c *Client) Send(p SendParams) error {
	if c.apiKey == "" {
		return fmt.Errorf("resend: RESEND_API_KEY not configured")
	}

	body, _ := json.Marshal(resendRequest{
		From:    FromAddress,
		To:      []string{p.To},
		Subject: p.Subject,
		Text:    p.Body,
	})

	req, err := http.NewRequest("POST", apiURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("resend: send failed with status %d", resp.StatusCode)
	}
	return nil
}

// OTPEmailBody returns plain-text email body for OTP emails.
func OTPEmailBody(nameOrEmail, otp, title string) string {
	return fmt.Sprintf(
		"Hi %s,\n\nYour %s code is:\n\n  %s\n\nThis code expires in 5 minutes. If you didn't request this, ignore this email.",
		nameOrEmail, title, otp,
	)
}
