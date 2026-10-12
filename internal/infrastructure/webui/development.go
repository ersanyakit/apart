package webui

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

// DevelopmentHandler keeps the API and UI on the same origin, including Next's
// HMR WebSocket. Only the configured loopback UI is used as a proxy target.
func DevelopmentHandler(api http.Handler, uiURL string) (http.Handler, error) {
	target, err := url.Parse(uiURL)
	if err != nil {
		return nil, err
	}
	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.FlushInterval = -1
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if path == "/action" || strings.HasPrefix(path, "/media/") || strings.HasPrefix(path, "/health/") {
			api.ServeHTTP(w, r)
			return
		}
		proxy.ServeHTTP(w, r)
	}), nil
}
