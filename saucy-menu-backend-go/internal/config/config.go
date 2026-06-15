package config

import "github.com/caarlos0/env/v11"

type Config struct {
	Port             string `env:"PORT" envDefault:"8080"`
	NodeEnv          string `env:"NODE_ENV" envDefault:"development"`
	DatabaseURL      string `env:"DATABASE_URL,required"`
	DirectURL        string `env:"DIRECT_URL"`
	JWTSecret        string `env:"JWT_SECRET,required"`
	BetterAuthSecret string `env:"BETTER_AUTH_SECRET,required"`
	BetterAuthURL    string `env:"BETTER_AUTH_URL" envDefault:"http://localhost:8080"`
	MediaServiceURL  string `env:"MEDIA_SERVICE_URL"`
	UpstashRedisURL  string `env:"UPSTASH_REDIS_URL"`
	OpenAIAPIKey     string `env:"OPENAI_API_KEY"`
	DeepLAPIKey      string `env:"DEEPL_API_KEY"`
	PlunkSecretKey       string `env:"RESEND_API_KEY"` // renamed from PLUNK_SECRET_KEY
	UploadServiceURL     string `env:"UPLOAD_SERVICE_URL"`
	StripeSecretKey      string `env:"STRIPE_SECRET_KEY"`
	StripeWebhookSecret  string `env:"STRIPE_WEBHOOK_SECRET"`
	InternalAdminToken   string `env:"INTERNAL_ADMIN_TOKEN"`
	WebAuthnRPID         string `env:"WEBAUTHN_RPID" envDefault:"localhost"`
	WebAuthnOrigin       string `env:"WEBAUTHN_ORIGIN" envDefault:"http://localhost:5173"`
}

// Load reads config from the real OS environment.
func Load() (*Config, error) {
	return loadFrom(nil)
}

// loadFrom parses config from the given map; when nil it falls back to os.Environ.
// Used by tests to provide an isolated environment without touching os.Setenv.
func loadFrom(environ map[string]string) (*Config, error) {
	cfg := &Config{}
	opts := env.Options{}
	if environ != nil {
		opts.Environment = environ
	}
	if err := env.ParseWithOptions(cfg, opts); err != nil {
		return nil, err
	}
	return cfg, nil
}
