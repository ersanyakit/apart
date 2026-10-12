package config

import "testing"

func TestUIDevelopmentMode(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://unused/test")
	t.Setenv("JWT_SECRET", "test-secret-with-at-least-32-characters")
	t.Setenv("PORT", "3000")
	t.Setenv("UI_PORT", "3001")
	t.Setenv("APP_URL", "https://localhost:3000")
	for _, test := range []struct {
		env string
		dev bool
	}{{"", true}, {"development", true}, {"production", false}, {"PRODUCTION", false}} {
		t.Run(test.env, func(t *testing.T) {
			t.Setenv("APP_ENV", test.env)
			cfg, err := Load()
			if err != nil {
				t.Fatal(err)
			}
			if cfg.UIDev != test.dev {
				t.Fatalf("UIDev=%v, want %v", cfg.UIDev, test.dev)
			}
		})
	}
}
