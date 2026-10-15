package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"otel/constants"
	"otel/internal/application"
	"otel/internal/config"
	exporter "otel/internal/infrastructure/export"
	"otel/internal/infrastructure/persistence"
	"otel/internal/infrastructure/seeding"
	"otel/internal/infrastructure/storage"
	"otel/internal/infrastructure/tunnel"
	"otel/internal/infrastructure/webui"
	"otel/internal/interfaces/httpapi"
	"otel/migrations"
	"path/filepath"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v3/middleware/adaptor"
	"github.com/joho/godotenv"
)

func main() {
	if err := run(); err != nil {
		slog.Error(err.Error())
		os.Exit(1)
	}
}
func run() error {
	_ = godotenv.Load()
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	command := "serve"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}
	if command == "tunnel" {
		if len(os.Args) != 2 {
			return constants.ErrCLI
		}
		if err := tunnel.Check(); err != nil {
			return err
		}
	}
	if command == "make:migration" {
		if len(os.Args) != 3 {
			return constants.ErrMigrationName
		}
		path, err := migrations.Generate("migrations", os.Args[2])
		if err == nil {
			slog.Info("Migration oluşturuldu", "file", path)
		}
		return err
	}
	connectCtx, connectCancel := context.WithTimeout(ctx, 10*time.Second)
	defer connectCancel()
	db, err := persistence.Open(connectCtx, os.Getenv("DATABASE_URL"))
	if err != nil {
		return constants.Wrap(constants.ErrDatabase, err)
	}
	pool, err := db.DB()
	if err != nil {
		return err
	}
	defer pool.Close()
	switch command {
	case "migrate":
		if err := migrations.Up(db); err != nil {
			return err
		}
		return persistence.EnsureDefaultCatalog(ctx, db)
	case "migrate:rollback":
		return migrations.Down(db, false)
	case "migrate:reset":
		return migrations.Down(db, true)
	case "migrate:status":
		records, err := migrations.Status(db)
		if err != nil {
			return err
		}
		applied := map[string]int{}
		for _, r := range records {
			applied[r.Version] = r.Batch
		}
		for _, m := range migrations.All {
			slog.Info("Migration", "version", m.Version, "batch", applied[m.Version], "applied", applied[m.Version] > 0)
		}
		return nil
	case "db:seed":
		if len(os.Args) > 3 {
			return constants.ErrSeedName
		}
		name := ""
		if len(os.Args) == 3 {
			name = os.Args[2]
		}
		if err := migrations.Up(db); err != nil {
			return err
		}
		persistence.InstallAudit(db)
		if err := seeding.Run(ctx, db, name, seeding.Options{DemoPassword: os.Getenv("DEMO_PASSWORD")}); err != nil {
			return err
		}
		slog.Info("Seed tamamlandı; mevcut kayıtlar korundu", "seed", name)
		return nil
	case "admin:create":
		if err := migrations.Up(db); err != nil {
			return err
		}
		return persistence.Bootstrap(ctx, db, os.Getenv("ADMIN_USERNAME"), os.Getenv("ADMIN_PASSWORD"), os.Getenv("HOTEL_NAME"))
	case "serve", "tunnel":
	default:
		return constants.ErrCLI
	}
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	if command == "tunnel" && !cfg.UIDev {
		return errors.New("Quick Tunnel geliştirme içindir; kalıcı yayında APP_URL ve Cloudflare named tunnel kullanın (README)")
	}
	if err := migrations.Up(db); err != nil {
		return err
	}
	if err := persistence.EnsureDefaultCatalog(ctx, db); err != nil {
		return err
	}
	if !cfg.SkipUI {
		if err := webui.Prepare(ctx, cfg.UIDev); err != nil {
			return err
		}
	}
	// Reserve the origin before exposing it: a busy port must never cause a
	// tunnel to publish an unrelated process already listening there.
	listener, err := net.Listen("tcp", cfg.Address)
	if err != nil {
		return constants.Wrap(constants.ErrServer, err)
	}
	defer listener.Close()
	var tunnelDone <-chan error
	if command == "tunnel" {
		host, port, _ := net.SplitHostPort(cfg.Address)
		if host == "" || host == "0.0.0.0" {
			host = "127.0.0.1"
		} else if host == "::" {
			host = "::1"
		}
		process, err := tunnel.Start(ctx, "http://"+net.JoinHostPort(host, port))
		if err != nil {
			return err
		}
		defer process.Stop()
		tunnelDone = process.Done
		cfg.Origin, cfg.SecureCookies = process.URL, true
	}
	repo := persistence.New(db)
	catalog := &application.Catalog{Staff: repo, Properties: repo, Media: repo, Features: repo, Layout: repo, Bookings: repo}
	auth := &application.Auth{Properties: repo, Users: repo, Tokens: persistence.JWT{Secret: []byte(cfg.JWTSecret)}, Passwords: persistence.Bcrypt{}, TTL: 8 * time.Hour}
	mediaService := &application.Media{Repository: repo, Storage: storage.Local{Root: filepath.Join(cfg.DataDir, "media")}, Catalog: catalog}
	guestService := &application.Guests{Catalog: catalog, Repository: repo}
	renderer := exporter.Renderer{}
	handler := &httpapi.Handler{Notes: &application.Notes{Catalog: catalog, Repository: repo}, Folios: &application.Folios{Catalog: catalog, Repository: repo}, GuestAssessments: &application.GuestAssessments{Catalog: catalog, Repository: repo}, Reporting: &application.Reporting{Repository: repo}, Guests: guestService, Reports: &application.Reports{Guests: guestService, Exporter: renderer}, Documents: &application.Documents{Catalog: catalog, Repository: repo, Exporter: renderer}, Staff: &application.Staff{Catalog: catalog, Repository: repo, Users: repo, Passwords: persistence.Bcrypt{}}, Payments: &application.Payments{Repository: repo}, Audit: &application.Audit{Repository: repo}, Beds: &application.Beds{Catalog: catalog, Repository: repo}, Accommodation: &application.Accommodation{Catalog: catalog, Layout: repo, Bookings: repo}, Auth: auth, Catalog: catalog, Media: mediaService, Features: &application.Features{Repository: repo, Catalog: catalog}, Origin: cfg.Origin, SecureCookies: cfg.SecureCookies}
	if command == "tunnel" {
		_, port, _ := net.SplitHostPort(cfg.Address)
		handler.LocalOrigin = "http://localhost:" + port
	}
	uiURL := cfg.UIURL
	if cfg.SkipUI {
		uiURL = ""
	}
	app := handler.App(uiURL, pool.PingContext)
	serverErrors := make(chan error, 1)
	if cfg.UIDev && !cfg.SkipUI {
		// net/http's reverse proxy carries Next's WebSocket upgrade and streaming
		// responses; Fiber's HTTP balancer strips hop-by-hop upgrade headers.
		devHandler, err := webui.DevelopmentHandler(adaptor.FiberApp(app), cfg.UIURL)
		if err != nil {
			listener.Close()
			return err
		}
		server := &http.Server{Handler: devHandler, ReadHeaderTimeout: 10 * time.Second}
		go func() {
			err := server.Serve(listener)
			if errors.Is(err, http.ErrServerClosed) {
				err = nil
			}
			serverErrors <- err
		}()
		defer func() {
			shutdownCtx, done := context.WithTimeout(context.Background(), 5*time.Second)
			defer done()
			_ = server.Shutdown(shutdownCtx)
		}()
	} else {
		go func() { serverErrors <- app.Listener(listener) }()
	}
	defer func() {
		shutdownCtx, done := context.WithTimeout(context.Background(), 5*time.Second)
		defer done()
		_ = app.ShutdownWithContext(shutdownCtx)
	}()
	var uiDone <-chan error
	if !cfg.SkipUI {
		_, port, _ := net.SplitHostPort(cfg.Address)
		process, err := webui.Start(ctx, cfg.UIAddress, "http://127.0.0.1:"+port, cfg.Origin, cfg.UIDev)
		if err != nil {
			return err
		}
		uiDone = process.Done
	}
	slog.Info(constants.APPLICATION_NAME, "url", cfg.Origin)
	select {
	case <-ctx.Done():
		return nil
	case err := <-serverErrors:
		return err
	case err := <-uiDone:
		return constants.Wrap(constants.ErrUI, err)
	case err := <-tunnelDone:
		if ctx.Err() != nil {
			return nil
		}
		return fmt.Errorf("cloudflared tüneli kapandı (%v)", err)
	}
}
