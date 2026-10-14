package webui

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"io/fs"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/exec"
	"otel/constants"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

type Process struct {
	cmd  *exec.Cmd
	Done chan error
}

func fingerprint(root string) (string, error) {
	h := sha256.New()
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			if d.Name() == "node_modules" || d.Name() == ".next" || d.Name() == ".git" || d.Name() == "e2e" || d.Name() == "test-results" || d.Name() == "playwright-report" {
				return filepath.SkipDir
			}
			return nil
		}
		if strings.HasSuffix(path, ".tsbuildinfo") || d.Name() == "playwright.config.ts" {
			return nil
		}
		rel, _ := filepath.Rel(root, path)
		io.WriteString(h, rel)
		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()
		_, err = io.Copy(h, file)
		return err
	})
	return hex.EncodeToString(h.Sum(nil)), err
}
func Prepare(ctx context.Context, development bool) error {
	if _, err := exec.LookPath("node"); err != nil {
		return constants.ErrNode
	}
	if _, err := exec.LookPath("npm"); err != nil {
		return constants.ErrNode
	}
	if _, err := os.Stat("ui/node_modules/next/dist/bin/next"); err != nil {
		if err := run(ctx, "npm", "ci", "--no-fund", "--no-audit"); err != nil {
			return err
		}
	}
	if development {
		return nil
	}
	sum, err := fingerprint("ui")
	if err != nil {
		return constants.Wrap(constants.ErrUI, err)
	}
	previous, _ := os.ReadFile("ui/.next/source.sha256")
	_, built := os.Stat("ui/.next/BUILD_ID")
	if string(previous) == sum && built == nil {
		return nil
	}
	slog.Info("Next.js production build hazırlanıyor")
	if err := run(ctx, "npm", "run", "build"); err != nil {
		return err
	}
	// Next may update next-env.d.ts / tsconfig during the first build.
	sum, err = fingerprint("ui")
	if err != nil {
		return constants.Wrap(constants.ErrUI, err)
	}
	return os.WriteFile("ui/.next/source.sha256", []byte(sum), 0600)
}
func run(ctx context.Context, name string, args ...string) error {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Dir = "ui"
	cmd.Env = append(os.Environ(), "NEXT_TELEMETRY_DISABLED=1")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return constants.Wrap(constants.ErrUI, err)
	}
	return nil
}
func Start(ctx context.Context, address, apiURL, publicURL string, development bool) (*Process, error) {
	_, port, err := net.SplitHostPort(address)
	if err != nil {
		return nil, constants.Wrap(constants.ErrUI, err)
	}
	// Fail if another process owns the port; never proxy to an unrelated service.
	listener, err := net.Listen("tcp", address)
	if err != nil {
		return nil, constants.Wrap(constants.ErrUI, err)
	}
	listener.Close()
	mode, nodeEnv := "start", "production"
	if development {
		mode, nodeEnv = "dev", "development"
	}
	slog.Info("Next.js başlatılıyor", "mode", mode, "hot_reload", development)
	cmd := exec.CommandContext(ctx, "node", "node_modules/next/dist/bin/next", mode, "--hostname", "127.0.0.1", "--port", port)
	cmd.Dir = "ui"
	cmd.Env = append(os.Environ(), "NODE_ENV="+nodeEnv, "NEXT_TELEMETRY_DISABLED=1", "API_INTERNAL_URL="+apiURL, "APP_URL="+publicURL)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Cancel = func() error { return cmd.Process.Signal(syscall.SIGTERM) }
	cmd.WaitDelay = 5 * time.Second
	if err := cmd.Start(); err != nil {
		return nil, constants.Wrap(constants.ErrUI, err)
	}
	p := &Process{cmd: cmd, Done: make(chan error, 1)}
	go func() { p.Done <- cmd.Wait() }()
	client := &http.Client{Timeout: 2 * time.Second}
	deadline := time.NewTimer(30 * time.Second)
	defer deadline.Stop()
	ticker := time.NewTicker(200 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case err := <-p.Done:
			return nil, constants.Wrap(constants.ErrUI, err)
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-deadline.C:
			p.cmd.Cancel()
			return nil, constants.ErrUI
		case <-ticker.C:
			response, err := client.Get("http://" + address + "/login")
			if err == nil {
				response.Body.Close()
				if response.StatusCode < 500 {
					return p, nil
				}
			}
		}
	}
}
