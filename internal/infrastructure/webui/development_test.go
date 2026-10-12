package webui

import (
	"bufio"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestDevelopmentRoutes(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		fmt.Fprint(w, "ui:"+r.URL.RequestURI()+":"+r.Header.Get("Cookie"))
	}))
	defer upstream.Close()
	handler, err := DevelopmentHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { fmt.Fprint(w, "api:"+r.URL.Path) }), upstream.URL)
	if err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{"/action", "/media/file", "/health/live", "/health/ready", "/", "/login", "/_next/static/chunk.js?fresh=1"} {
		t.Run(path, func(t *testing.T) {
			request := httptest.NewRequest("GET", path, nil)
			request.Header.Set("Cookie", "session=test")
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, request)
			expected := "api:" + path
			if path == "/" || path == "/login" || strings.HasPrefix(path, "/_next/") {
				expected = "ui:" + path + ":session=test"
				if response.Header().Get("Cache-Control") != "no-store" {
					t.Fatal("dev cache header was lost")
				}
			}
			if response.Body.String() != expected {
				t.Fatalf("got %q, want %q", response.Body.String(), expected)
			}
		})
	}
}

func TestDevelopmentProxyUpgradesAndStreams(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/_next/hmr" || r.Header.Get("Upgrade") != "websocket" {
			http.Error(w, "missing upgrade", 400)
			return
		}
		conn, rw, err := w.(http.Hijacker).Hijack()
		if err != nil {
			t.Error(err)
			return
		}
		defer conn.Close()
		fmt.Fprint(rw, "HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n")
		rw.Flush()
		// A transport-level echo checks that bytes stream in both directions after
		// the upgrade, independent of the WebSocket frame implementation.
		io.Copy(conn, rw)
	}))
	defer upstream.Close()
	handler, err := DevelopmentHandler(http.NotFoundHandler(), upstream.URL)
	if err != nil {
		t.Fatal(err)
	}
	proxy := httptest.NewServer(handler)
	defer proxy.Close()
	conn, err := net.Dial("tcp", strings.TrimPrefix(proxy.URL, "http://"))
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	conn.SetDeadline(time.Now().Add(5 * time.Second))
	fmt.Fprintf(conn, "GET /_next/hmr HTTP/1.1\r\nHost: localhost\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n")
	reader := bufio.NewReader(conn)
	response, err := http.ReadResponse(reader, nil)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != 101 {
		t.Fatalf("upgrade returned %d", response.StatusCode)
	}
	for _, message := range []string{"first-change", "second-change"} {
		fmt.Fprint(conn, message)
		received := make([]byte, len(message))
		if _, err := io.ReadFull(reader, received); err != nil {
			t.Fatal(err)
		}
		if string(received) != message {
			t.Fatalf("got %q", received)
		}
	}
}
