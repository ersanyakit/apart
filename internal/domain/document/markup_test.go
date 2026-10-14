package document

import (
	"github.com/google/uuid"
	"otel/constants"
	"strings"
	"testing"
)

func TestMarkupPreservesPrintableFormattingWithoutExecutableContent(t *testing.T) {
	input := `<h2 onclick="evil()">Başlık</h2><p style="color:red;text-align:center;background:url(https://bad)"><strong>Kalın</strong><em>İtalik</em><u>Altı çizili</u></p><ul><li>Satır</li></ul><table><tr><td colspan="2" onmouseover="evil()">Tutar</td></tr></table><script>alert(1)</script><img src="https://bad"><svg><script>bad</script></svg><iframe srcdoc="bad"></iframe><a href="javascript:evil()">Bağlantı metni</a>`
	got := SanitizeHTML(input)
	for _, bad := range []string{"onclick", "onmouseover", "javascript:", "https://", "<script", "<svg", "<img", "<iframe", "background", "color:"} {
		if strings.Contains(got, bad) {
			t.Fatalf("unsafe %q in %s", bad, got)
		}
	}
	for _, good := range []string{"<h2>Başlık</h2>", "<strong>Kalın</strong>", "<em>İtalik</em>", `style="text-align:center"`, `colspan="2"`, "Bağlantı metni"} {
		if !strings.Contains(got, good) {
			t.Fatalf("missing %q in %s", good, got)
		}
	}
	if SanitizeHTML(got) != got {
		t.Fatal("sanitization is not stable")
	}
	if HasText(SanitizeHTML(`<script>bad</script><p><br></p>`)) {
		t.Fatal("empty markup accepted")
	}
}
func TestRenderEscapesGuestValuesAndNeverExpandsGuestTemplateSyntax(t *testing.T) {
	result, err := Render(`<p>{{guest_name}} · {{room_code}}</p>`, map[string]string{"guest_name": `<img src=x onerror=bad> {{room_code}}`, "room_code": "101"}, true)
	if err != nil || result != `<p>&lt;img src=x onerror=bad&gt; {{room_code}} · 101</p>` {
		t.Fatalf("%s %v", result, err)
	}
	for _, bad := range []string{"{{unknown}}", "{{guest_name", "{{guest-name}}"} {
		if _, err := Render(bad, map[string]string{}, true); err == nil {
			t.Fatalf("accepted %s", bad)
		}
	}
}
func TestDefaultsAndFormats(t *testing.T) {
	defs := Defaults(uuid.New())
	if len(defs) != 8 {
		t.Fatalf("want 5 document and 3 report templates, got %d", len(defs))
	}
	for _, template := range defs {
		if err := template.Validate(); err != nil {
			t.Fatalf("%s: %v", template.Kind, err)
		}
		if template.Format != "html" {
			t.Fatal("default not HTML")
		}
		for _, body := range template.Body {
			if !HasText(body) || SanitizeHTML(body) != body {
				t.Fatalf("default unsafe %s", template.Kind)
			}
		}
	}
	template := defs[0]
	template.Format = "javascript"
	if template.Validate() == nil {
		t.Fatal("unsupported format")
	}
	template.Format = "html"
	template.Body[constants.LanguageTR] = "<p><br></p>"
	if template.Validate() == nil {
		t.Fatal("empty template accepted")
	}
}
