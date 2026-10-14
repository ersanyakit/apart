package tunnel

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestURLFromSplitLogWrites(t *testing.T) {
	urls := make(chan string, 1)
	output := &urlOutput{output: io.Discard, urls: urls}
	for _, chunk := range []string{
		"https://wrong.trycloudflare.com.evil.test\nhttps://wrong.trycloudflare.com:8080\n",
		"INF | https://hotel-test.trycloud",
		"flare.com |\n", "INF | https://another.trycloudflare.com |\n",
	} {
		if _, err := output.Write([]byte(chunk)); err != nil {
			t.Fatal(err)
		}
	}
	select {
	case got := <-urls:
		if got != "https://hotel-test.trycloudflare.com" {
			t.Fatal(got)
		}
	default:
		t.Fatal("split URL was not detected")
	}
	if len(urls) != 0 {
		t.Fatal("published more than one origin")
	}
}

func fakeCloudflared(t *testing.T, script string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "cloudflared")
	if err := os.WriteFile(path, []byte("#!/bin/sh\nset -eu\n"+script), 0700); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestProcessLifecycleAndIsolatedEnvironment(t *testing.T) {
	t.Setenv("DATABASE_URL", "must-not-leak")
	t.Setenv("JWT_SECRET", "must-not-leak")
	t.Setenv("TUNNEL_TOKEN", "must-not-select-a-named-tunnel")
	binary := fakeCloudflared(t, `
test -z "${DATABASE_URL:-}${JWT_SECRET:-}${TUNNEL_TOKEN:-}"
test "$1" = tunnel
test "$2" = --config
test -f "$3"
test "$4" = --no-autoupdate
test "$5" = --url
test "$6" = http://127.0.0.1:3000
echo 'INF | https://hotel-test.trycloudflare.com |' >&2
exec sleep 30
`)
	p, err := start(context.Background(), "http://127.0.0.1:3000", binary, io.Discard, 2*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	if p.URL != "https://hotel-test.trycloudflare.com" {
		t.Fatal(p.URL)
	}
	p.Stop()
	p.Stop() // Cleanup is idempotent.
	select {
	case <-p.Done:
	default:
		t.Fatal("process not reaped")
	}
}

func TestStartupFailureTimeoutAndCancellation(t *testing.T) {
	for _, tc := range []struct {
		name, script string
		cancel       bool
	}{
		{"exit", "exit 1\n", false},
		{"timeout", "exec sleep 30\n", false},
		{"cancel", "exec sleep 30\n", true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			if tc.cancel {
				cancel()
			}
			p, err := start(ctx, "http://127.0.0.1:3000", fakeCloudflared(t, tc.script), io.Discard, 100*time.Millisecond)
			if p != nil || err == nil {
				t.Fatalf("process=%v err=%v", p, err)
			}
		})
	}
}

func TestRejectNonLocalTargets(t *testing.T) {
	for _, target := range []string{"http://example.com:3000", "https://127.0.0.1:3000", "http://127.0.0.1", "://bad"} {
		if _, err := start(context.Background(), target, "/nonexistent", io.Discard, time.Second); err == nil || !strings.Contains(err.Error(), "yerel HTTP") {
			t.Fatalf("target=%q err=%v", target, err)
		}
	}
}
