package identity

import (
	"encoding/json"
	"otel/constants"
	"testing"
)

func TestPreferenceValidation(t *testing.T) {
	for _, tc := range []struct {
		json  string
		valid bool
	}{
		{`{"theme":"blue","background":"gray","font_size":"large","locale":"zh-CN","header.stays":true}`, true},
		{`{"currency":"EUR","money_format":"tr","default_country":"TR","currency_auto":false}`, true},
		{`{"stays_days":14,"audit_page_size":50,"calendar_view":"week","sidebar_open":false}`, true},
		{`{"header.property3d":true,"property3d_exploded":false,"property3d_walls":true}`, true},
		{`{"bookings_days":14,"bookings_show_empty":true,"bookings_view":"list","header.bookings-list":true}`, true},
		{`{"bookings_days":9999}`, false},
		{`{"bookings_show_empty":"false"}`, false},
		{`{"bookings_view":"invalid"}`, false},
		{`{"property3d_walls":"false"}`, false},
		{`{}`, false}, {`{"role":"admin"}`, false}, {`{"header.missing":true}`, false},
		{`{"theme":null}`, false}, {`{"header.stays":"false"}`, false},
		{`{"locale":"not-a-language"}`, false}, {`{"stays_days":9999}`, false},
		{`{"background":{"color":"red"}}`, false},
	} {
		var p Preferences
		if err := json.Unmarshal([]byte(tc.json), &p); err != nil {
			t.Fatal(err)
		}
		if err := p.Validate(); (err == nil) != tc.valid {
			t.Fatalf("%s: %v", tc.json, err)
		}
	}
}

func TestReportGroupAndLogPreferences(t *testing.T) {
	for _, group := range constants.ReportGroups() {
		// A retried report-header preference and a later log change can share a patch.
		p := Preferences{"header.report-group." + group.Key: true, "header.logs": false, "audit_page_size": float64(50)}
		if err := p.Validate(); err != nil {
			t.Fatalf("%s: %v", group.Key, err)
		}
	}
	for _, p := range []Preferences{
		{"header.report-group.unknown": true}, {"header.report-group.finance": "true"},
		{"audit_page_size": float64(999)}, {"header.logs": "false"},
	} {
		if p.Validate() == nil {
			t.Fatalf("accepted invalid preferences: %v", p)
		}
	}
}
