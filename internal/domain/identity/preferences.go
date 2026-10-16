package identity

import (
	"otel/constants"
	"regexp"
	"slices"
	"strings"
)

// Preferences contains only presentation settings, never permissions or tenant
// selection. Flat keys let independent changes merge atomically in PostgreSQL.
type Preferences map[string]any

var pageIDs = []string{"setup", "property3d", "kanban", "blacklist", "reports", "board", "calendar", "bookings", "bookings-list", "stays", "units", "staff", "guests", "templates", "logs", "facility", "features", "appsettings"}
var preferenceEnums = map[string][]string{
	"bookings_view":   {"timeline", "list"},
	"bookings_status": {"all", string(constants.BookingConfirmed), string(constants.BookingCheckedIn), string(constants.BookingCompleted)},
	"theme":           {"blue", "pink", "green", "orange", "purple", "fuchsia"},
	"background":      {"white", "gray"}, "font_size": {"compact", "normal", "large", "xlarge"},
	"money_format": {"tr", "en"}, "calendar_view": {"day", "week", "month"},
	"calendar_status": {"active", "all", string(constants.BookingConfirmed), string(constants.BookingCheckedIn), string(constants.BookingCompleted), string(constants.BookingCancelled)},
	"stays_status":    {"all", string(constants.BookingConfirmed), string(constants.BookingCheckedIn), string(constants.BookingCompleted)},
}
var reportHeader = regexp.MustCompile(`^header\.report\.[a-z_]{1,24}\.[a-z_]{1,40}$`)
var countryCode = regexp.MustCompile(`^[A-Z]{2}$`)
var currencyCode = regexp.MustCompile(`^[A-Z]{3}$`)

func (p Preferences) Validate() error {
	if len(p) == 0 || len(p) > 40 {
		return constants.ErrPayload
	}
	for key, value := range p {
		if allowed, ok := preferenceEnums[key]; ok {
			v, ok := value.(string)
			if !ok || !slices.Contains(allowed, v) {
				return constants.ErrPayload
			}
			continue
		}
		switch {
		case key == "property3d_exploded" || key == "property3d_walls" || key == "reports_kpi_finance" || key == "reports_kpi_capacity" || key == "reports_kpi_operations" || key == "currency_auto" || key == "sidebar_open" || key == "bookings_show_empty" || key == "stays_show_empty" || key == "board_plan":
			if _, ok := value.(bool); !ok {
				return constants.ErrPayload
			}
		case strings.HasPrefix(key, "header."):
			if _, ok := value.(bool); !ok || (!slices.Contains(pageIDs, strings.TrimPrefix(key, "header.")) && !reportHeader.MatchString(key) && !isReportGroupHeader(key)) {
				return constants.ErrPayload
			}
		case key == "bookings_days" || key == "stays_days" || key == "audit_page_size":
			n, ok := value.(float64)
			allowed := []float64{7, 14, 30}
			if key == "audit_page_size" {
				allowed = []float64{25, 50, 100}
			}
			if !ok || !slices.Contains(allowed, n) {
				return constants.ErrPayload
			}
		case key == "default_country" || key == "currency":
			v, ok := value.(string)
			pattern := countryCode
			if key == "currency" {
				pattern = currencyCode
			}
			if !ok || !pattern.MatchString(v) {
				return constants.ErrPayload
			}
		case key == "locale":
			v, ok := value.(string)
			if !ok {
				return constants.ErrPayload
			}
			if _, err := constants.ParseLanguage(v); err != nil {
				return constants.ErrPayload
			}
		default:
			return constants.ErrPayload
		}
	}
	return nil
}

func isReportGroupHeader(key string) bool {
	for _, group := range constants.ReportGroups() {
		if key == "header.report-group."+group.Key {
			return true
		}
	}
	return false
}
