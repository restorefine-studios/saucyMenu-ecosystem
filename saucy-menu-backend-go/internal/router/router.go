package router

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/restorefine-studios/saucy-menu-backend-go/internal/auth"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/config"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/db/sqlc"
	adminhandler "github.com/restorefine-studios/saucy-menu-backend-go/internal/handlers/admin"
	authhandler "github.com/restorefine-studios/saucy-menu-backend-go/internal/handlers/auth"
	pubhandler "github.com/restorefine-studios/saucy-menu-backend-go/internal/handlers/public"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/handlers/shared"
	superhandler "github.com/restorefine-studios/saucy-menu-backend-go/internal/handlers/super"
	userhandler "github.com/restorefine-studios/saucy-menu-backend-go/internal/handlers/user"
	webhookhandler "github.com/restorefine-studios/saucy-menu-backend-go/internal/handlers/webhook"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/httpx"
	oaiclient "github.com/restorefine-studios/saucy-menu-backend-go/internal/integrations/openai"
	stripeint "github.com/restorefine-studios/saucy-menu-backend-go/internal/integrations/stripe"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/queue"
	"github.com/restorefine-studios/saucy-menu-backend-go/internal/storage"
)

func New(pool *pgxpool.Pool, cfg *config.Config) http.Handler {
	q := sqlc.New(pool)
	r := chi.NewRouter()

	// Initialise Stripe globally
	if cfg.StripeSecretKey != "" {
		stripeint.Init(cfg.StripeSecretKey)
	}

	// Optional asynq client for background job enqueueing
	var asynqClient *asynq.Client
	if cfg.UpstashRedisURL != "" {
		asynqClient = queue.NewClient(cfg.UpstashRedisURL)
	}


	allowedOrigins := []string{
		"https://dashboard.saucymenu.com",
		"https://saucymenu.com",
		"https://menu.saucymenu.com",
		"https://admin.saucymenu.com",
		"https://super-admin-79d.pages.dev",
	}
	if cfg.NodeEnv == "development" {
		allowedOrigins = append(allowedOrigins,
			"http://localhost:5173",        // restaurant-admin
			"http://localhost:5174",        // super-admin
			"http://localhost:3000",        // end-user-app
			"http://localhost:3001",
			"http://192.168.101.3:5173",    // restaurant-admin on local network
			"http://192.168.101.3:3000",    // end-user-app on local network (phone testing)
		)
		// Allow the ngrok frontend origin (used for iPhone testing)
		if cfg.WebAuthnOrigin != "" && cfg.WebAuthnOrigin != "http://localhost:5173" {
			allowedOrigins = append(allowedOrigins, cfg.WebAuthnOrigin)
		}
	}

	r.Use(httpx.Recover)
	r.Use(httpx.LangContext)
	// Strip trailing slashes so /admin/menu and /admin/menu/ both work
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if len(r.URL.Path) > 1 && r.URL.Path[len(r.URL.Path)-1] == '/' {
				r.URL.Path = r.URL.Path[:len(r.URL.Path)-1]
			}
			next.ServeHTTP(w, r)
		})
	})
	r.Use(cors.Handler(cors.Options{
		AllowOriginFunc: func(r *http.Request, origin string) bool {
			if cfg.NodeEnv == "development" {
				if strings.HasSuffix(origin, ".trycloudflare.com") || strings.HasSuffix(origin, ".ngrok-free.app") {
					return true
				}
			}
			for _, allowed := range allowedOrigins {
				if allowed == origin {
					return true
				}
			}
			return false
		},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "lang", "x-internal-admin-token"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		httpx.WriteSuccess(w, http.StatusOK, map[string]any{"status": "ok"})
	})

	// Public slug resolver — used by diner app to look up restaurant ID from slug
	slugH := pubhandler.NewSlugHandler(q)
	r.Get("/r/{slug}", slugH.Resolve)

	// better-auth compatible routes (Phase 1)
	ah := authhandler.New(q, cfg)
	r.Mount("/auth", ah.Routes())

	// Shared routes (public)
	r.Route("/shared", func(r chi.Router) {
		r.Get("/base/setup", shared.NewSetupHandler(q).ServeHTTP)
	})

	// ─── User (diner) routes ─────────────────────────────────────────────────
	oai := oaiclient.New(cfg.OpenAIAPIKey)
	uAuth := userhandler.NewAuthHandler(q, cfg.JWTSecret)
	menuH := userhandler.NewMenuHandler(q)
	classH := userhandler.NewClassificationsHandler(q)
	prefH := userhandler.NewPreferencesHandler(q)
	revH := userhandler.NewReviewsHandler(q)
	aiH := userhandler.NewAIHandler(q, oai, cfg.MediaServiceURL)

	r.Route("/user", func(r chi.Router) {
		r.Post("/auth/session", uAuth.CreateSession)
		r.Group(func(r chi.Router) {
			r.Use(auth.UserAuth(cfg.JWTSecret))
			r.Get("/auth/restaurant", uAuth.GetRestaurant)
			r.Post("/auth/ai/generate", uAuth.LogAIUsage)
			r.Get("/menu", menuH.ListMenus)
			r.Get("/menu/menu-items/all", menuH.ListAllMenuItems)
			r.Get("/menu/items/{menuId}", menuH.GetMenuItemByID)
			r.Get("/menu-items/classified-items", menuH.ListClassifiedItems)
			r.Get("/menu-items", menuH.ListMenuItems)
			r.Get("/menu-items/{id}", menuH.GetMenuItemDetail)
			r.Get("/menu-sections/{menuId}", menuH.ListMenuSections)
			r.Get("/classifications/allergens", classH.ListAllergens)
			r.Get("/classifications/diets", classH.ListDiets)
			r.Get("/preferences", prefH.GetPreferences)
			r.Post("/preferences", prefH.SavePreferences)
			r.Get("/reviews", revH.GetReviews)
			r.Post("/reviews", revH.CreateReview)
			r.Post("/ai", aiH.MenuChat)
			r.Post("/ai/{menuItemId}", aiH.ItemChat)
		})
	})

	// ─── Admin routes (Phase 3) ───────────────────────────────────────────────
	s3 := storage.New(cfg)

	r.Route("/admin", func(r chi.Router) {
		r.Use(auth.AdminAuth(q, cfg.BetterAuthSecret))
		if asynqClient != nil {
			adminhandler.Routes(r, q, cfg.StripeSecretKey, oai, s3, asynqClient)
		} else {
			adminhandler.Routes(r, q, cfg.StripeSecretKey, oai, s3)
		}
	})

	// ─── Super-admin routes (Phase 4) ─────────────────────────────────────────
	r.Route("/super", func(r chi.Router) {
		// /super/auth/signup is public (internal token protected inside handler)
		r.Post("/auth/signup", superhandler.NewAuthHandler(q, cfg.InternalAdminToken).Signup)
		// All other /super/* routes require super-admin session
		r.Group(func(r chi.Router) {
			r.Use(auth.SuperAdminAuth(q, cfg.BetterAuthSecret))
			superhandler.Routes(r, q, cfg)
		})
	})

	// ─── Webhook routes (Phase 4) ─────────────────────────────────────────────
	r.Route("/webhook", func(r chi.Router) {
		wh := webhookhandler.NewStripeHandler(q, cfg.StripeWebhookSecret, cfg.PlunkSecretKey)
		r.Post("/stripe", wh.Handle)
	})

	return r
}
