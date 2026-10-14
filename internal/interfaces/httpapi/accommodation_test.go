package httpapi_test

import (
	"bytes"
	"context"
	"encoding/json"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"otel/constants"
	"otel/internal/application"
	"otel/internal/domain/guest"
	"otel/internal/infrastructure/persistence"
	"otel/internal/infrastructure/persistence/models"
	"otel/internal/interfaces/httpapi"
	"otel/internal/testdb"
	"otel/migrations"
	"strings"
	"testing"
	"time"
)

func TestActionAuthenticationAndAccommodation(t *testing.T) {
	for _, origin := range []string{"http://localhost:3000", "https://hotel-test.trycloudflare.com"} {
		t.Run(origin, func(t *testing.T) { testActionAuthenticationAndAccommodation(t, origin) })
	}
}

func testActionAuthenticationAndAccommodation(t *testing.T, origin string) {
	db := testdb.Open(t)
	if err := migrations.Up(db); err != nil {
		t.Fatal(err)
	}
	hotelID, branchID, userID := uuid.New(), uuid.New(), uuid.New()
	hash, err := bcrypt.GenerateFromPassword([]byte("integration-password"), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	for _, row := range []any{&models.Hotel{HotelID: hotelID, FacilityInfo: models.FacilityInfo{Name: "API Test"}}, &models.Branch{BranchID: branchID, HotelID: hotelID, FacilityInfo: models.FacilityInfo{Name: "Merkez"}}, &models.User{UserID: userID, HotelID: hotelID, UserName: "admin", Password: string(hash), UserRole: constants.UserRoleAdmin}} {
		if err := db.Create(row).Error; err != nil {
			t.Fatal(err)
		}
	}
	repo := persistence.New(db)
	catalog := &application.Catalog{Properties: repo, Features: repo, Media: repo, Layout: repo, Bookings: repo}
	auth := &application.Auth{Properties: repo, Users: repo, Tokens: persistence.JWT{Secret: []byte("test-secret-only-at-least-thirty-two-bytes")}, Passwords: persistence.Bcrypt{}, TTL: time.Hour}
	h := &httpapi.Handler{Auth: auth, Catalog: catalog, Accommodation: &application.Accommodation{Catalog: catalog, Layout: repo, Bookings: repo}, Features: &application.Features{Repository: repo, Catalog: catalog}, Origin: origin, SecureCookies: strings.HasPrefix(origin, "https://")}
	app := h.App("", func(context.Context) error { return nil })
	h.Guests = &application.Guests{Catalog: catalog, Repository: repo}
	defer app.Shutdown()
	var cookie *http.Cookie
	call := func(code, method string, payload any, origin string) (int, json.RawMessage) {
		t.Helper()
		raw, err := json.Marshal(payload)
		if err != nil {
			t.Fatal(err)
		}
		path := "/action"
		var body io.Reader
		if method == "GET" {
			path += "?" + url.Values{"version": {"1"}, "code": {code}, "payload": {string(raw)}}.Encode()
		} else {
			encoded, err := json.Marshal(constants.CommandEnvelope{Version: "1", Code: code, Payload: raw})
			if err != nil {
				t.Fatal(err)
			}
			body = bytes.NewReader(encoded)
		}
		req := httptest.NewRequest(method, path, body)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Requested-With", "INTERACTIVEOTEL")
		if origin != "" {
			req.Header.Set("Origin", origin)
		}
		if cookie != nil {
			req.AddCookie(cookie)
		}
		resp, err := app.Test(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		var envelope struct {
			Data  json.RawMessage `json:"data"`
			Error json.RawMessage `json:"error"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&envelope); err != nil {
			t.Fatal(err)
		}
		if code == constants.CMD_AUTH_LOGIN && resp.StatusCode == 200 {
			for _, c := range resp.Cookies() {
				if c.Name == httpapi.CookieName {
					cookie = c
					if !c.HttpOnly {
						t.Fatal("session is not HttpOnly")
					}
					if c.Secure != h.SecureCookies || c.SameSite != http.SameSiteLaxMode || c.Domain != "" {
						t.Fatalf("unexpected session cookie policy: %+v", c)
					}
				}
			}
		}
		if resp.StatusCode >= 400 {
			return resp.StatusCode, envelope.Error
		}
		return resp.StatusCode, envelope.Data
	}
	if status, _ := call(constants.CMD_INITIAL_SYNC, "GET", map[string]any{}, ""); status != 401 {
		t.Fatalf("unauthenticated status %d", status)
	}
	if status, body := call(constants.CMD_AUTH_LOGIN, "POST", map[string]any{"username": "admin", "password": "integration-password"}, origin); status != 200 {
		t.Fatalf("login %d %s", status, body)
	}
	t.Run("preferences belong only to the authenticated user", func(t *testing.T) {
		otherID := uuid.New()
		if err := db.Create(&models.User{UserID: otherID, HotelID: hotelID, UserName: "other", Password: string(hash), UserRole: constants.UserRoleReception}).Error; err != nil {
			t.Fatal(err)
		}
		for _, patch := range []map[string]any{{"theme": "purple", "header.calendar": true}, {"background": "gray", "locale": "en"}} {
			if status, body := call(constants.CMD_USER_PREFERENCES_UPDATE, "PATCH", map[string]any{"preferences": patch}, origin); status != 200 {
				t.Fatalf("preferences update %d %s", status, body)
			}
		}
		status, body := call(constants.CMD_USER_PREFERENCES, "GET", nil, "")
		var preferences map[string]any
		if err := json.Unmarshal(body, &preferences); err != nil {
			t.Fatal(err)
		}
		if status != 200 || preferences["theme"] != "purple" || preferences["background"] != "gray" || preferences["header.calendar"] != true {
			t.Fatalf("preferences were overwritten: %d %s", status, body)
		}
		// Fresh repository read stands in for the next session / another device.
		again, err := repo.FindByID(context.Background(), userID)
		if err != nil || again.Preferences["locale"] != "en" {
			t.Fatalf("preferences were not persisted: %v", err)
		}
		// Two devices changing different fields must not overwrite one another.
		updates := make(chan error, 2)
		for key, value := range map[string]any{"font_size": "large", "calendar_view": "week"} {
			go func() {
				_, err := repo.UpdatePreferences(context.Background(), userID, map[string]any{key: value})
				updates <- err
			}()
		}
		for range 2 {
			if err := <-updates; err != nil {
				t.Fatal(err)
			}
		}
		again, err = repo.FindByID(context.Background(), userID)
		if err != nil || again.Preferences["font_size"] != "large" || again.Preferences["calendar_view"] != "week" {
			t.Fatal("concurrent preference updates were lost")
		}
		for _, payload := range []any{
			map[string]any{"user_id": otherID, "preferences": map[string]any{"theme": "pink"}},
			map[string]any{"preferences": map[string]any{"role": "admin"}},
			map[string]any{"preferences": map[string]any{"theme": "invalid"}},
			map[string]any{"preferences": map[string]any{"header.calendar": "false"}},
		} {
			if status, _ := call(constants.CMD_USER_PREFERENCES_UPDATE, "PATCH", payload, origin); status != 400 {
				t.Fatalf("invalid preference accepted: %d", status)
			}
		}
		other, err := repo.FindByID(context.Background(), otherID)
		if err != nil || len(other.Preferences) != 0 {
			t.Fatalf("another user's settings changed: %v", err)
		}
		if status, _ := call(constants.CMD_USER_PREFERENCES_UPDATE, "PATCH", map[string]any{"preferences": map[string]any{"theme": "pink"}}, "https://foreign.invalid"); status != 403 {
			t.Fatalf("preferences bypassed CSRF: %d", status)
		}
		if h.SecureCookies {
			h.LocalOrigin = "http://localhost:3000"
			defer func() { h.LocalOrigin = "" }()
			if status, _ := call(constants.CMD_USER_PREFERENCES_UPDATE, "PATCH", map[string]any{"preferences": map[string]any{"sidebar_open": false}}, h.LocalOrigin); status != 200 {
				t.Fatalf("localhost preferences blocked while tunnelling: %d", status)
			}
			body, _ := json.Marshal(constants.CommandEnvelope{Version: "1", Code: constants.CMD_AUTH_LOGIN, Payload: json.RawMessage(`{"username":"admin","password":"integration-password"}`)})
			request := httptest.NewRequest("POST", "/action", bytes.NewReader(body))
			request.Header.Set("Content-Type", "application/json")
			request.Header.Set("Origin", h.LocalOrigin)
			response, err := app.Test(request)
			if err != nil {
				t.Fatal(err)
			}
			defer response.Body.Close()
			if response.StatusCode != 200 {
				t.Fatalf("localhost login: %d", response.StatusCode)
			}
			for _, cookie := range response.Cookies() {
				if cookie.Name == httpapi.CookieName && cookie.Secure {
					t.Fatal("localhost received an HTTPS-only cookie")
				}
			}
		}
	})
	t.Run("custom category deletion command", func(t *testing.T) {
		status, body := call(constants.CMD_CATEGORY_CREATE, "POST", map[string]any{"hotel_id": hotelID, "code": "CUSTOM_DELETE", "label": map[string]string{"TR": "Silinecek kategori"}}, "")
		if status != 200 {
			t.Fatalf("create category %d %s", status, body)
		}
		var category struct {
			ID uuid.UUID `json:"category_id"`
		}
		if err := json.Unmarshal(body, &category); err != nil {
			t.Fatal(err)
		}
		payload := map[string]any{"hotel_id": hotelID, "id": category.ID}
		if status, _ := call(constants.CMD_CATEGORY_DELETE, "POST", payload, ""); status != 405 {
			t.Fatalf("delete method %d", status)
		}
		if status, body := call(constants.CMD_CATEGORY_DELETE, "DELETE", payload, ""); status != 200 {
			t.Fatalf("delete category %d %s", status, body)
		}
		if status, _ := call(constants.CMD_CATEGORY_DELETE, "DELETE", payload, ""); status != 404 {
			t.Fatalf("deleted category still visible: %d", status)
		}
	})
	if status, _ := call(constants.CMD_FLOOR_CREATE, "POST", map[string]any{}, "https://foreign.invalid"); status != 403 {
		t.Fatalf("CSRF status %d", status)
	}
	if status, _ := call(constants.CMD_FLOOR_CREATE, "POST", map[string]any{}, "https://other.trycloudflare.com"); status != 403 {
		t.Fatalf("another tunnel must not be trusted: %d", status)
	}
	if status, _ := call(constants.CMD_FLOOR_CREATE, "PUT", map[string]any{}, ""); status != 405 {
		t.Fatalf("method status %d", status)
	}
	status, body := call(constants.CMD_FLOOR_CREATE, "POST", map[string]any{"branch_id": branchID, "code": "3", "label": map[string]string{"TR": "Üçüncü Kat"}, "width": 2400, "height": 1600}, origin)
	if status != 200 {
		t.Fatalf("floor %d %s", status, body)
	}
	var floor struct {
		ID uuid.UUID `json:"floor_id"`
	}
	if err := json.Unmarshal(body, &floor); err != nil {
		t.Fatal(err)
	}
	status, body = call(constants.CMD_ROOM_BULK, "POST", map[string]any{"branch_id": branchID, "floor_id": floor.ID, "kind": "room", "prefix": "R", "count": 5, "levels": 1, "capacity": 2, "rentable": true}, "")
	if status != 200 {
		t.Fatalf("bulk %d %s", status, body)
	}
	var rooms []struct {
		ID uuid.UUID `json:"room_id"`
	}
	if err := json.Unmarshal(body, &rooms); err != nil {
		t.Fatal(err)
	}
	if len(rooms) != 5 {
		t.Fatal("bulk result count")
	}
	status, body = call(constants.CMD_ROOM_LIST, "GET", map[string]any{"hotel_id": hotelID, "branch_id": branchID, "floor_id": floor.ID}, "")
	if status != 200 {
		t.Fatalf("list %d %s", status, body)
	}
	start, end := time.Now().UTC().Add(-time.Hour), time.Now().UTC().Add(time.Hour)
	status, body = call(constants.CMD_BOOKING_CREATE, "POST", map[string]any{"branch_id": branchID, "room_id": rooms[0].ID, "guest_name": "API Misafir", "guest_count": 2, "check_in": start, "check_out": end}, "")
	if status != 200 {
		t.Fatalf("booking %d %s", status, body)
	}
	var b struct {
		ID uuid.UUID `json:"booking_id"`
	}
	json.Unmarshal(body, &b)
	status, body = call(constants.CMD_GUEST_SEARCH, "GET", map[string]any{"hotel_id": hotelID, "branch_id": branchID, "search": "api misafir"}, "")
	var matches guest.SearchPage
	if err := json.Unmarshal(body, &matches); err != nil || status != 200 || matches.Total != 1 || len(matches.Items) != 1 || matches.Items[0].GuestID == uuid.Nil {
		t.Fatalf("guest search before check-in: status=%d body=%s err=%v", status, body, err)
	}
	status, body = call(constants.CMD_BOOKING_TRANSITION, "PUT", map[string]any{"branch_id": branchID, "booking_id": b.ID, "action": "check_in"}, "")
	if status != 200 {
		t.Fatalf("checkin %d %s", status, body)
	}
	status, body = call(constants.CMD_BOOKING_TRANSITION, "PUT", map[string]any{"branch_id": branchID, "booking_id": b.ID, "action": "move", "target_id": rooms[1].ID}, "")
	if status != 200 {
		t.Fatalf("move %d %s", status, body)
	}
	if status, body := call(constants.CMD_INITIAL_SYNC, "GET", map[string]any{}, ""); status != 200 {
		t.Fatalf("sync %d %s", status, body)
	}
	oldCookie := cookie
	if status, _ := call(constants.CMD_AUTH_LOGOUT, "POST", map[string]any{}, ""); status != 200 {
		t.Fatal("logout failed")
	}
	cookie = oldCookie
	if status, _ := call(constants.CMD_INITIAL_SYNC, "GET", map[string]any{}, ""); status != 401 {
		t.Fatalf("revoked session accepted %d", status)
	}
}
