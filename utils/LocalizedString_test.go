package utils

import (
	"encoding/json"
	"otel/constants"
	"reflect"
	"testing"
)

func TestLocalizedStringRoundTrip(t *testing.T) {
	want := LocalizedString{
		constants.LanguageTR:   "Deniz manzarası",
		constants.LanguageEN:   "Sea view",
		constants.LanguageNE:   "समुद्र दृश्य",
		constants.LanguageTH:   "วิวทะเล",
		constants.LanguageZHCN: "海景照片",
		constants.LanguageZHTW: "海景照片與說明",
	}
	stored, err := want.Value()
	if err != nil {
		t.Fatal(err)
	}
	for _, input := range []any{stored, []byte(stored.(string))} {
		got := LocalizedString{constants.LanguageFR: "stale translation"}
		if err := got.Scan(input); err != nil {
			t.Fatal(err)
		}
		if !reflect.DeepEqual(got, want) {
			t.Fatalf("round trip: got %#v, want %#v", got, want)
		}
	}
}

func TestLocalizedStringJSONLanguages(t *testing.T) {
	for _, language := range constants.SupportedLanguages() {
		input, _ := json.Marshal(map[string]string{string(language): "translation"})
		var value LocalizedString
		if err := json.Unmarshal(input, &value); err != nil {
			t.Fatalf("supported language %s: %v", language, err)
		}
	}

	var value LocalizedString
	if err := json.Unmarshal([]byte(`{"tr":"Türkçe","zh-cn":"简体中文","zh-tw":"繁體中文"}`), &value); err != nil {
		t.Fatal(err)
	}
	if value[constants.LanguageTR] != "Türkçe" || value[constants.LanguageZHCN] != "简体中文" || value[constants.LanguageZHTW] != "繁體中文" {
		t.Fatalf("language normalization failed: %#v", value)
	}

	for _, input := range []string{
		`{"XX":"unsupported"}`, `{"TR":null}`, `{"TR":42}`,
		`{"TR":"one","tr":"two"}`, `"not an object"`, `[]`, `{`,
	} {
		unchanged := LocalizedString{constants.LanguageEN: "preserved"}
		if err := json.Unmarshal([]byte(input), &unchanged); err == nil {
			t.Errorf("accepted invalid input: %s", input)
		}
		if len(unchanged) != 1 || unchanged[constants.LanguageEN] != "preserved" {
			t.Errorf("invalid input changed existing translations: %#v", unchanged)
		}
	}
	if _, err := (LocalizedString{"XX": "unsupported"}).Value(); err == nil {
		t.Error("database write accepted unsupported language")
	}
}

func TestLocalizedStringNullAndEmpty(t *testing.T) {
	for _, input := range []any{nil, "null", []byte("null")} {
		value := LocalizedString{constants.LanguageTR: "old"}
		if err := value.Scan(input); err != nil || value != nil {
			t.Fatalf("null scan: got %#v, err %v", value, err)
		}
	}
	var value LocalizedString
	if stored, err := value.Value(); err != nil || stored != nil {
		t.Fatalf("nil value: got %#v, err %v", stored, err)
	}
	if err := value.Scan("{}"); err != nil || value == nil || len(value) != 0 {
		t.Fatalf("empty object scan: got %#v, err %v", value, err)
	}
	if stored, err := value.Value(); err != nil || stored != "{}" {
		t.Fatalf("empty value: got %#v, err %v", stored, err)
	}
	if err := value.Scan(42); err == nil {
		t.Error("accepted unsupported database value type")
	}
}
