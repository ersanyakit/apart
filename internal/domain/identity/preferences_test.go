package identity

import (
	"encoding/json"
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
