// Package tunnel manages an opt-in cloudflared Quick Tunnel alongside the server.
package tunnel

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/url"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"sync"
	"syscall"
	"time"
)

func Check() error {
	if _, err := exec.LookPath("cloudflared"); err != nil {
		return errors.New("cloudflared bulunamadı; macOS kurulumu: brew install cloudflared")
	}
	return nil
}

type Process struct {
	URL    string
	Done   <-chan error
	cancel context.CancelFunc
	exited <-chan struct{}
}

// Stop also reaps the child on startup failures and normal server shutdown.
func (p *Process) Stop() {
	p.cancel()
	<-p.exited
}

func Start(ctx context.Context, target string) (*Process, error) {
	if err := Check(); err != nil {
		return nil, err
	}
	return start(ctx, target, "cloudflared", os.Stderr, 60*time.Second)
}

func start(ctx context.Context, target, binary string, output io.Writer, timeout time.Duration) (*Process, error) {
	u, err := url.Parse(target)
	if err != nil || u.Scheme != "http" || !net.ParseIP(u.Hostname()).IsLoopback() || u.Port() == "" {
		return nil, errors.New("tünel hedefi yerel HTTP sunucusu olmalıdır")
	}
	// An explicit empty config keeps ~/.cloudflared named tunnels untouched and
	// prevents them from accidentally taking over this opt-in Quick Tunnel.
	config, err := os.CreateTemp("", "otel-cloudflared-*.yml")
	if err != nil {
		return nil, err
	}
	defer os.Remove(config.Name())
	if _, err := config.WriteString("{}\n"); err != nil {
		config.Close()
		return nil, err
	}
	if err := config.Close(); err != nil {
		return nil, err
	}
	childCtx, cancel := context.WithCancel(ctx)
	cmd := exec.CommandContext(childCtx, binary, "tunnel", "--config", config.Name(), "--no-autoupdate", "--url", target)
	// Do not hand database/password/JWT credentials or named-tunnel overrides to
	// cloudflared. Only the executable's OS and network environment is needed.
	for _, key := range []string{"PATH", "HOME", "USER", "TMPDIR", "TMP", "TEMP", "SYSTEMROOT", "SSL_CERT_FILE", "SSL_CERT_DIR", "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "no_proxy"} {
		if value, ok := os.LookupEnv(key); ok {
			cmd.Env = append(cmd.Env, key+"="+value)
		}
	}
	urls := make(chan string, 1)
	logs := &urlOutput{output: output, urls: urls}
	cmd.Stdout, cmd.Stderr = logs, logs
	cmd.Cancel = func() error { return cmd.Process.Signal(syscall.SIGTERM) }
	cmd.WaitDelay = 5 * time.Second
	if err := cmd.Start(); err != nil {
		cancel()
		return nil, fmt.Errorf("cloudflared başlatılamadı: %w", err)
	}
	done := make(chan error, 1)
	exited := make(chan struct{})
	p := &Process{Done: done, cancel: cancel, exited: exited}
	go func() {
		done <- cmd.Wait()
		close(exited)
	}()
	timer := time.NewTimer(timeout)
	defer timer.Stop()
	select {
	case p.URL = <-urls:
		return p, nil
	case err := <-done:
		p.Stop()
		return nil, fmt.Errorf("cloudflared adres oluşturmadan kapandı (%v); yukarıdaki bağlantı günlüğünü kontrol edin", err)
	case <-ctx.Done():
		p.Stop()
		return nil, ctx.Err()
	case <-timer.C:
		p.Stop()
		return nil, errors.New("cloudflared 60 saniyede HTTPS adresi oluşturamadı; internet bağlantısını kontrol edin")
	}
}

var quickURL = regexp.MustCompile(`https://[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com`)

// cloudflared writes its generated URL in the startup log. Buffer complete
// lines because process writes can split the hostname anywhere.
type urlOutput struct {
	mu     sync.Mutex
	buffer []byte
	output io.Writer
	urls   chan<- string
	found  bool
}

func (w *urlOutput) Write(data []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if _, err := w.output.Write(data); err != nil {
		return 0, err
	}
	if w.found {
		return len(data), nil
	}
	w.buffer = append(w.buffer, data...)
	for {
		end := bytes.IndexByte(w.buffer, '\n')
		if end < 0 {
			break
		}
		line := string(w.buffer[:end])
		w.buffer = w.buffer[end+1:]
		for _, candidate := range quickURL.FindAllStringIndex(line, -1) {
			// Reject suffixes such as .evil.test, paths and port overrides.
			if candidate[1] < len(line) && !strings.ContainsRune(" \t\r\"|", rune(line[candidate[1]])) {
				continue
			}
			w.urls <- line[candidate[0]:candidate[1]]
			w.found = true
			w.buffer = nil
			return len(data), nil
		}
	}
	if len(w.buffer) > 64*1024 {
		w.buffer = nil
	}
	return len(data), nil
}
