// Package storage wraps an S3-compatible object store (currently Supabase
// Storage's S3 API; swapping to real AWS S3 later only requires changing
// S3_ENDPOINT/S3_REGION/credentials in config, not this code).
package storage

import (
	"context"
	"io"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/config"
)

type Client struct {
	s3     *s3.Client
	bucket string
}

// New returns nil if S3 isn't configured, so callers can treat upload
// endpoints as disabled rather than crashing on startup.
func New(cfg *config.Config) *Client {
	if cfg.S3Bucket == "" || cfg.S3Endpoint == "" || cfg.S3AccessKeyID == "" || cfg.S3SecretAccessKey == "" {
		return nil
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(context.Background(),
		awsconfig.WithRegion(cfg.S3Region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.S3AccessKeyID, cfg.S3SecretAccessKey, "",
		)),
	)
	if err != nil {
		return nil
	}

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(cfg.S3Endpoint)
		o.UsePathStyle = true
	})

	return &Client{s3: client, bucket: cfg.S3Bucket}
}

func (c *Client) Upload(ctx context.Context, key string, body io.Reader, contentType string) error {
	_, err := c.s3.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(c.bucket),
		Key:         aws.String(key),
		Body:        body,
		ContentType: aws.String(contentType),
	})
	return err
}

func (c *Client) Delete(ctx context.Context, key string) error {
	_, err := c.s3.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	return err
}
