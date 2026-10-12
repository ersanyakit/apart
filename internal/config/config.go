package config

import (
	"net"
	"net/url"
	"os"
	"otel/constants"
	"strconv"
	"strings"
)

type Config struct {
	DatabaseURL, JWTSecret, Address, Origin, UIAddress, UIURL, DataDir string
	SecureCookies                                                      bool
	SkipUI                                                             bool
	UIDev                                                              bool
}

func Load() (Config, error) {
	c := Config{DatabaseURL: os.Getenv("DATABASE_URL"), JWTSecret: os.Getenv("JWT_SECRET"), DataDir: value("DATA_DIR", "data"), SkipUI: os.Getenv("SKIP_UI") == "true"}
	c.UIDev = !strings.EqualFold(os.Getenv("APP_ENV"), "production")
	port := value("PORT", "3000")
	uiPort := value("UI_PORT", "3001")
	for _, p := range []string{port, uiPort} {
		n, err := strconv.Atoi(p)
		if err != nil || n < 1 || n > 65535 {
			return c, constants.ErrConfig
		}
	}
	if port == uiPort {
		return c, constants.ErrConfig
	}
	c.Address = net.JoinHostPort(value("BIND_HOST", "127.0.0.1"), port)
	c.Origin = value("APP_URL", "http://localhost:"+port)
	u, err := url.Parse(c.Origin)
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
		return c, constants.ErrConfig
	}
	c.SecureCookies = u.Scheme == "https"
	c.UIAddress = net.JoinHostPort("127.0.0.1", uiPort)
	c.UIURL = "http://" + c.UIAddress
	if c.DatabaseURL == "" {
		return c, constants.ErrDatabaseURL
	}
	if len(c.JWTSecret) < 32 {
		return c, constants.ErrJWTSecret
	}
	if strings.EqualFold(os.Getenv("APP_ENV"), "production") && !c.SecureCookies {
		return c, constants.ErrConfig
	}
	return c, nil
}
func value(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
