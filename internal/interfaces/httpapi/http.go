package httpapi

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"otel/constants"
	"otel/internal/application"
	"otel/internal/domain/accommodation"
	"otel/internal/domain/audit"
	"otel/internal/domain/booking"
	"otel/internal/domain/document"
	"otel/internal/domain/features"
	"otel/internal/domain/guest"
	"otel/internal/domain/identity"
	"otel/internal/domain/media"
	"otel/internal/domain/payment"
	"otel/internal/domain/property"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/adaptor"
	"github.com/gofiber/fiber/v3/middleware/limiter"
	"github.com/gofiber/fiber/v3/middleware/proxy"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/requestid"
	"github.com/google/uuid"
)

const CookieName = "interactiveotel_session"

type Handler struct {
	Guests        *application.Guests
	Reports       *application.Reports
	Documents     *application.Documents
	Staff         *application.Staff
	Payments      *application.Payments
	Audit         *application.Audit
	Beds          *application.Beds
	Accommodation *application.Accommodation
	Features      *application.Features
	Auth          *application.Auth
	Catalog       *application.Catalog
	Media         *application.Media
	Origin        string
	LocalOrigin   string // Optional exact localhost origin when a Quick Tunnel is active.
	SecureCookies bool
}
type Response struct {
	Version   string    `json:"version"`
	Code      string    `json:"code"`
	Data      any       `json:"data,omitempty"`
	Error     *APIError `json:"error,omitempty"`
	RequestID string    `json:"request_id"`
}
type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
type localKey uint8

const envelopeKey localKey = 1

func (h *Handler) App(uiURL string, ready func(context.Context) error) *fiber.App {
	app := fiber.New(fiber.Config{AppName: constants.APPLICATION_NAME, BodyLimit: 100 << 20, ReadTimeout: 120 * time.Second, WriteTimeout: 120 * time.Second, ErrorHandler: h.failure})
	app.Use(requestid.New(), recover.New())
	app.Use(func(c fiber.Ctx) error {
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-Frame-Options", "DENY")
		c.Set("Referrer-Policy", "same-origin")
		return c.Next()
	})
	app.Get("/health/live", func(c fiber.Ctx) error { return c.JSON(fiber.Map{"status": "ok"}) })
	app.Get("/health/ready", func(c fiber.Ctx) error {
		ctx, cancel := context.WithTimeout(c.Context(), 3*time.Second)
		defer cancel()
		if err := ready(ctx); err != nil {
			return c.SendStatus(503)
		}
		return c.JSON(fiber.Map{"status": "ok"})
	})
	app.All("/action", h.decode, limiter.New(limiter.Config{Max: 10, Expiration: time.Minute, Next: func(c fiber.Ctx) bool {
		e, _ := c.Locals(envelopeKey).(constants.CommandEnvelope)
		return e.Code != constants.CMD_AUTH_LOGIN
	}, LimitReached: func(c fiber.Ctx) error { c.Status(429); return h.writeError(c, constants.ErrRateLimit, 429) }}), h.command)
	app.Get("/media/:id", h.asset)
	if uiURL != "" {
		app.Use(proxy.Balancer(proxy.Config{Servers: []string{uiURL}, SecurityPolicy: &proxy.SecurityPolicy{AllowPrivateIPs: true}}))
	}
	return app
}
func (h *Handler) secureCookie(c fiber.Ctx) bool {
	return h.SecureCookies && !(h.LocalOrigin != "" && c.Get("Origin") == h.LocalOrigin)
}

func (h *Handler) decode(c fiber.Ctx) error {
	c.Set("Cache-Control", "no-store")
	var e constants.CommandEnvelope
	if c.Method() == "GET" {
		e.Version = c.Query("version")
		e.Code = c.Query("code")
		e.Payload = json.RawMessage(c.Query("payload", "{}"))
	} else if strings.HasPrefix(c.Get("Content-Type"), "multipart/form-data") {
		e.Version = c.FormValue("version")
		e.Code = c.FormValue("code")
		e.Payload = json.RawMessage(c.FormValue("payload", "{}"))
	} else if err := decode(c.Body(), &e); err != nil {
		return err
	}
	if e.Version != constants.COMMAND_VERSION {
		return constants.ErrVersion
	}
	method, ok := constants.CommandMethods[e.Code]
	if !ok {
		return constants.ErrCommand
	}
	if c.Method() != method {
		c.Set("Allow", method)
		return h.writeError(c, constants.ErrMethod, 405)
	}
	if method != "GET" {
		origin := c.Get("Origin")
		if (origin != "" && origin != h.Origin && origin != h.LocalOrigin) || c.Get("Sec-Fetch-Site") == "cross-site" {
			return constants.ErrOrigin
		}
		if origin == "" && c.Cookies(CookieName) != "" && c.Get("X-Requested-With") != "INTERACTIVEOTEL" {
			return constants.ErrOrigin
		}
	}
	if len(e.Payload) == 0 {
		e.Payload = json.RawMessage("{}")
	}
	c.Locals(envelopeKey, e)
	return c.Next()
}
func decode(data []byte, target any) error {
	d := json.NewDecoder(bytes.NewReader(data))
	d.DisallowUnknownFields()
	if err := d.Decode(target); err != nil {
		return constants.ErrPayload
	}
	if err := d.Decode(&struct{}{}); err != io.EOF {
		return constants.ErrPayload
	}
	return nil
}
func (h *Handler) user(c fiber.Ctx) (identity.User, error) {
	token := c.Cookies(CookieName)
	if header := c.Get("Authorization"); strings.HasPrefix(header, "Bearer ") {
		token = strings.TrimPrefix(header, "Bearer ")
	}
	if token == "" {
		return identity.User{}, constants.ErrUnauthorized
	}
	return h.Auth.Authenticate(c.Context(), token)
}
func (h *Handler) command(c fiber.Ctx) error {
	e := c.Locals(envelopeKey).(constants.CommandEnvelope)
	ctx, cancel := context.WithTimeout(c.Context(), 90*time.Second)
	defer cancel()
	ctx = audit.WithActor(ctx, audit.Actor{RequestID: c.GetRespHeader("X-Request-ID"), Command: e.Code})
	c.SetContext(ctx)
	if e.Code == constants.CMD_AUTH_PROPERTIES {
		items, err := h.Catalog.Properties.PublicProperties(ctx)
		if err != nil {
			return err
		}
		return h.success(c, items)
	}
	if e.Code == constants.CMD_AUTH_PEOPLE {
		var input struct {
			BranchID uuid.UUID `json:"branch_id"`
		}
		if err := decode(e.Payload, &input); err != nil {
			return err
		}
		items, err := h.Auth.LoginPeople(ctx, input.BranchID)
		if err != nil {
			return err
		}
		return h.success(c, items)
	}
	if e.Code == constants.CMD_AUTH_LOGIN {
		var input struct {
			Username string    `json:"username"`
			UserID   uuid.UUID `json:"user_id"`
			HotelID  uuid.UUID `json:"hotel_id"`
			BranchID uuid.UUID `json:"branch_id"`
			Password string    `json:"password"`
		}
		if err := decode(e.Payload, &input); err != nil {
			return err
		}
		result, err := h.Auth.Login(ctx, input.Username, input.Password, application.Selection{HotelID: input.HotelID, BranchID: input.BranchID}, input.UserID)
		if err != nil {
			return err
		}
		c.Cookie(&fiber.Cookie{Name: CookieName, Value: result.Token, HTTPOnly: true, Secure: h.secureCookie(c), SameSite: "Lax", Path: "/", Expires: result.ExpiresAt, MaxAge: int(time.Until(result.ExpiresAt).Seconds())})
		return h.success(c, result)
	}
	u, err := h.user(c)
	if err != nil {
		return err
	}
	ctx = audit.WithActor(ctx, audit.Actor{UserID: u.UserID, RequestID: c.GetRespHeader("X-Request-ID"), Command: e.Code})
	var result any
	switch e.Code {
	case constants.CMD_USER_PREFERENCES:
		result = u.Preferences
	case constants.CMD_USER_PREFERENCES_UPDATE:
		var input struct {
			Preferences identity.Preferences `json:"preferences"`
		}
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Auth.UpdatePreferences(ctx, u, input.Preferences)
	case constants.CMD_GUEST_SEARCH:
		var input guest.Query
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Guests.Search(ctx, u, input)
	case constants.CMD_GUEST_STAYS, constants.CMD_GUEST_EXPORT:
		var input guest.Query
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		if e.Code == constants.CMD_GUEST_EXPORT {
			file, err := h.Reports.Export(ctx, u, input)
			if err != nil {
				return err
			}
			return h.file(c, file)
		}
		result, err = h.Guests.List(ctx, u, input, false)
	case constants.CMD_BOOKING_GUESTS:
		var input guest.Update
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Guests.Update(ctx, u, input)
	case constants.CMD_TEMPLATE_DEFAULTS:
		if !u.IsManager() {
			return constants.ErrForbidden
		}
		result = document.Defaults(uuid.Nil)
	case constants.CMD_TEMPLATE_LIST:
		var input struct {
			HotelID uuid.UUID `json:"hotel_id"`
		}
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Documents.Templates(ctx, u, input.HotelID)
	case constants.CMD_TEMPLATE_SAVE:
		var input document.Template
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Documents.SaveTemplate(ctx, u, input)
	case constants.CMD_DOCUMENT_LIST:
		var input document.Query
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Documents.List(ctx, u, input)
	case constants.CMD_DOCUMENT_PREVIEW, constants.CMD_DOCUMENT_ISSUE:
		var input document.Issue
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Documents.Prepare(ctx, u, input, e.Code == constants.CMD_DOCUMENT_ISSUE)
	case constants.CMD_DOCUMENT_DOWNLOAD:
		var input struct {
			ID uuid.UUID `json:"id"`
		}
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		file, err := h.Documents.Download(ctx, u, input.ID)
		if err != nil {
			return err
		}
		return h.file(c, file)
	case constants.CMD_STAFF_LIST:
		var input struct {
			HotelID uuid.UUID `json:"hotel_id"`
		}
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Staff.List(ctx, u, input.HotelID)
	case constants.CMD_STAFF_CREATE, constants.CMD_STAFF_UPDATE:
		var input identity.StaffInput
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Staff.Save(ctx, u, input, e.Code == constants.CMD_STAFF_CREATE)
	case constants.CMD_STAFF_DELETE:
		var input struct {
			HotelID uuid.UUID `json:"hotel_id"`
			ID      uuid.UUID `json:"id"`
		}
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		err = h.Staff.Delete(ctx, u, input.HotelID, input.ID)
	case constants.CMD_AUDIT_LIST:
		var input audit.Query
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Audit.List(ctx, u, input)
	case constants.CMD_ROOM_DELETE_MANY:
		var input struct {
			BranchID uuid.UUID   `json:"branch_id"`
			IDs      []uuid.UUID `json:"ids"`
		}
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		err = h.Accommodation.DeleteRooms(ctx, u, input.BranchID, input.IDs)

	case constants.CMD_BED_LIST:
		var input struct {
			BranchID uuid.UUID `json:"branch_id"`
		}
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Beds.List(ctx, u, input.BranchID)
	case constants.CMD_BED_CREATE, constants.CMD_BED_UPDATE:
		var input accommodation.Bed
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Beds.Save(ctx, u, input, e.Code == constants.CMD_BED_CREATE)
	case constants.CMD_BED_DELETE:
		var input struct {
			ID uuid.UUID `json:"id"`
		}
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		err = h.Beds.Delete(ctx, u, input.ID)

	case constants.CMD_AUTH_LOGOUT:
		err = h.Auth.Logout(ctx, u)
		if err == nil {
			c.Cookie(&fiber.Cookie{Name: CookieName, Value: "", HTTPOnly: true, Secure: h.secureCookie(c), SameSite: "Lax", Path: "/", MaxAge: -1, Expires: time.Unix(1, 0)})
		}
	case constants.CMD_INITIAL_SYNC, constants.CMD_HOTEL_LIST, constants.CMD_BRANCH_LIST, constants.CMD_ROOM_LIST:
		var input application.Selection
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		var snapshot application.Snapshot
		snapshot, err = h.Catalog.InitialSync(ctx, u, input)
		if err == nil && e.Code == constants.CMD_INITIAL_SYNC {
			selection, _ := json.Marshal(application.Selection{HotelID: snapshot.HotelID, BranchID: snapshot.BranchID})
			c.Cookie(&fiber.Cookie{Name: "interactiveotel_selection", Value: base64.RawURLEncoding.EncodeToString(selection), HTTPOnly: true, Secure: h.secureCookie(c), SameSite: "Lax", Path: "/", MaxAge: 86400 * 30})
		}

		switch e.Code {
		case constants.CMD_HOTEL_LIST:
			result = snapshot.Hotels
		case constants.CMD_BRANCH_LIST:
			result = snapshot.Branches
		case constants.CMD_ROOM_LIST:
			result = snapshot.Rooms
		default:
			result = snapshot
		}
	case constants.CMD_HOTEL_CREATE, constants.CMD_HOTEL_UPDATE:
		var input property.Hotel
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Catalog.SaveHotel(ctx, u, input, e.Code == constants.CMD_HOTEL_CREATE)
	case constants.CMD_BRANCH_CREATE, constants.CMD_BRANCH_UPDATE:
		var input property.Branch
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Catalog.SaveBranch(ctx, u, input, e.Code == constants.CMD_BRANCH_CREATE)
	case constants.CMD_ROOM_CREATE, constants.CMD_ROOM_UPDATE, constants.CMD_ROOM_STATE:
		var input property.Room
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		if e.Code == constants.CMD_ROOM_STATE {
			result, err = h.Catalog.SaveState(ctx, u, input)
		} else {
			result, err = h.Catalog.SaveRoom(ctx, u, input, e.Code == constants.CMD_ROOM_CREATE)
		}
	case constants.CMD_ROOM_DELETE, constants.CMD_BRANCH_DELETE, constants.CMD_MEDIA_DELETE:
		var input struct {
			ID uuid.UUID `json:"id"`
		}
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		switch e.Code {
		case constants.CMD_ROOM_DELETE:
			err = h.Catalog.DeleteRoom(ctx, u, input.ID)
		case constants.CMD_BRANCH_DELETE:
			err = h.Catalog.DeleteBranch(ctx, u, input.ID)
		case constants.CMD_MEDIA_DELETE:
			err = h.Media.Delete(ctx, u, input.ID)
		}
	case constants.CMD_ROOM_EXCHANGE:
		var input booking.Transition
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		if input.Action != "move" && input.Action != "swap" {
			return constants.ErrBookingState
		}
		result, err = h.Accommodation.Transition(ctx, u, input)
	case constants.CMD_ROOM_BULK:
		var input property.BulkUnits
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Accommodation.Bulk(ctx, u, input)
	case constants.CMD_FLOOR_LIST:
		var input struct {
			BranchID uuid.UUID `json:"branch_id"`
		}
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Accommodation.Floors(ctx, u, input.BranchID)
	case constants.CMD_FLOOR_CREATE, constants.CMD_FLOOR_UPDATE:
		var input property.Floor
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Accommodation.SaveFloor(ctx, u, input, e.Code == constants.CMD_FLOOR_CREATE)
	case constants.CMD_FLOOR_DELETE, constants.CMD_FLOOR_PLAN:
		var input struct {
			ID uuid.UUID `json:"id"`
		}
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		if e.Code == constants.CMD_FLOOR_DELETE {
			err = h.Accommodation.DeleteFloor(ctx, u, input.ID)
		} else {
			result, err = h.Accommodation.Plan(ctx, u, input.ID)
		}
	case constants.CMD_FLOOR_PLAN_SAVE:
		var input struct {
			FloorID    uuid.UUID            `json:"floor_id"`
			Placements []property.Placement `json:"placements"`
		}
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		err = h.Accommodation.SavePlan(ctx, u, input.FloorID, input.Placements)
	case constants.CMD_BOOKING_LIST:
		var input booking.Query
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Accommodation.ListBookings(ctx, u, input)
	case constants.CMD_BOOKING_CREATE, constants.CMD_BOOKING_UPDATE:
		var input booking.Booking
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Accommodation.SaveBooking(ctx, u, input, e.Code == constants.CMD_BOOKING_CREATE)
	case constants.CMD_BOOKING_TRANSITION:
		var input booking.Transition
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Accommodation.Transition(ctx, u, input)
	case constants.CMD_ROOM_AVAILABILITY:
		var input booking.Availability
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Accommodation.Available(ctx, u, input)
	case constants.CMD_MEDIA_LIST, constants.CMD_MEDIA_UPLOAD:
		var input struct {
			HotelID uuid.UUID `json:"hotel_id"`
		}
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		if e.Code == constants.CMD_MEDIA_LIST {
			result, err = h.Media.List(ctx, u, input.HotelID)
		} else {
			form, formErr := c.MultipartForm()
			if formErr != nil {
				return constants.ErrPayload
			}
			files := []application.Upload{}
			for _, file := range form.File["files"] {
				header := file
				files = append(files, application.Upload{Name: header.Filename, Size: header.Size, Open: func() (io.ReadCloser, error) { return header.Open() }})
			}
			result, err = h.Media.Upload(ctx, u, input.HotelID, files)
		}
	case constants.CMD_MEDIA_UPDATE:
		var input media.Asset
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Media.Update(ctx, u, input)
	case constants.CMD_INVENTORY_UPDATE:
		var input struct {
			HotelID uuid.UUID                `json:"hotel_id"`
			Items   []property.InventoryItem `json:"items"`
		}
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		err = h.Catalog.SaveInventory(ctx, u, input.HotelID, input.Items)
		result = input.Items
	case constants.CMD_FEATURE_REGISTRY:
		var input struct {
			HotelID uuid.UUID `json:"hotel_id"`
		}
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Features.Registry(ctx, u, input.HotelID)
	case constants.CMD_CATEGORY_CREATE, constants.CMD_CATEGORY_UPDATE:
		var input features.Category
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Features.SaveCategory(ctx, u, input, e.Code == constants.CMD_CATEGORY_CREATE)
	case constants.CMD_FEATURE_CREATE, constants.CMD_FEATURE_UPDATE:
		var input features.Definition
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Features.SaveDefinition(ctx, u, input, e.Code == constants.CMD_FEATURE_CREATE)
	case constants.CMD_FEATURE_DELETE, constants.CMD_CATEGORY_DELETE:
		var input struct {
			HotelID uuid.UUID `json:"hotel_id"`
			ID      uuid.UUID `json:"id"`
		}
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		if e.Code == constants.CMD_CATEGORY_DELETE {
			err = h.Features.DeleteCategory(ctx, u, input.HotelID, input.ID)
		} else {
			err = h.Features.DeleteDefinition(ctx, u, input.HotelID, input.ID)
		}
	case constants.CMD_FEATURE_ASSIGN:
		var input struct {
			Target      features.Target       `json:"target"`
			Assignments []features.Assignment `json:"assignments"`
		}
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		err = h.Features.Assign(ctx, u, input.Target, input.Assignments)
	case constants.CMD_ROOM_FILTER:
		var input struct {
			BranchID uuid.UUID         `json:"branch_id"`
			Filters  []features.Filter `json:"filters"`
		}
		if err = decode(e.Payload, &input); err != nil {
			return err
		}
		result, err = h.Features.FilterRooms(ctx, u, input.BranchID, input.Filters)
	case constants.CMD_PAYMENT_METHODS:
		var methodsInput struct {
			HotelID uuid.UUID `json:"hotel_id"`
		}
		if err = decode(e.Payload, &methodsInput); err != nil {
			return err
		}
		result, err = h.Payments.List(ctx, u, methodsInput.HotelID)
	case constants.CMD_PAYMENT_LIST:
		var paymentListInput struct {
			HotelID uuid.UUID `json:"hotel_id"`
		}
		if err = decode(e.Payload, &paymentListInput); err != nil {
			return err
		}
		result, err = h.Payments.List(ctx, u, paymentListInput.HotelID)
	case constants.CMD_PAYMENT_CREATE, constants.CMD_PAYMENT_UPDATE:
		var channel payment.Channel
		if err = decode(e.Payload, &channel); err != nil {
			return err
		}
		result, err = h.Payments.Save(ctx, u, channel, e.Code == constants.CMD_PAYMENT_CREATE)
	case constants.CMD_PAYMENT_DELETE:
		var paymentDeleteInput struct {
			HotelID uuid.UUID `json:"hotel_id"`
			ID      uuid.UUID `json:"id"`
		}
		if err = decode(e.Payload, &paymentDeleteInput); err != nil {
			return err
		}
		err = h.Payments.Delete(ctx, u, paymentDeleteInput.HotelID, paymentDeleteInput.ID)
	default:
		return constants.ErrCommand
	}
	if err != nil {
		return err
	}
	if result == nil {
		result = fiber.Map{"ok": true}
	}
	return h.success(c, result)
}
func (h *Handler) success(c fiber.Ctx, data any) error {
	e, _ := c.Locals(envelopeKey).(constants.CommandEnvelope)
	return c.JSON(Response{Version: constants.COMMAND_VERSION, Code: e.Code, Data: data, RequestID: c.GetRespHeader("X-Request-ID")})
}
func (h *Handler) failure(c fiber.Ctx, err error) error {
	var known *constants.Error
	if !errors.As(err, &known) {
		slog.Error(constants.ErrInternal.Message, "request_id", c.GetRespHeader("X-Request-ID"), "error", err)
		known = constants.ErrInternal
	}
	status := 500
	switch known.Kind {
	case constants.Validation:
		status = 400
	case constants.Unauthorized:
		status = 401
	case constants.Forbidden:
		status = 403
	case constants.NotFound:
		status = 404
	case constants.Conflict:
		status = 409
	}
	return h.writeError(c, known, status)
}
func (h *Handler) writeError(c fiber.Ctx, e *constants.Error, status int) error {
	envelope, _ := c.Locals(envelopeKey).(constants.CommandEnvelope)
	c.Set("Cache-Control", "no-store")
	return c.Status(status).JSON(Response{Version: constants.COMMAND_VERSION, Code: envelope.Code, Error: &APIError{Code: e.Code, Message: e.Message}, RequestID: c.GetRespHeader("X-Request-ID")})
}
func (h *Handler) asset(c fiber.Ctx) error {
	u, err := h.user(c)
	if err != nil {
		return err
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return constants.ErrNotFound
	}
	a, file, err := h.Media.Open(c.Context(), u, id)
	if err != nil {
		return err
	}
	defer file.Close()
	return adaptor.HTTPHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", a.MIMEType)
		w.Header().Set("Cache-Control", "private, no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		http.ServeContent(w, r, a.OriginalName, a.UpdatedAt, file)
	}))(c)
}

func (h *Handler) file(c fiber.Ctx, file application.File) error {
	c.Set("Content-Type", file.MIME)
	c.Set("Content-Disposition", `attachment; filename="`+file.Name+`"`)
	return c.Send(file.Data)
}
