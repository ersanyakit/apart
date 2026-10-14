package document

import (
	"bytes"
	"html"
	"regexp"
	"strconv"
	"strings"

	nethtml "golang.org/x/net/html"
	"golang.org/x/net/html/atom"
	"otel/constants"
)

// Markup is deliberately limited to printable text, lists and tables. It cannot
// load remote resources or execute scripts, including in the PDF renderer.
func SanitizeHTML(source string) string {
	nodes, err := nethtml.ParseFragment(strings.NewReader(source), &nethtml.Node{Type: nethtml.ElementNode, Data: "div", DataAtom: atom.Div})
	if err != nil {
		return ""
	}
	var out strings.Builder
	var write func(*nethtml.Node)
	write = func(n *nethtml.Node) {
		if n.Type == nethtml.TextNode {
			out.WriteString(html.EscapeString(n.Data))
			return
		}
		if n.Type != nethtml.ElementNode {
			return
		}
		switch n.Data {
		case "script", "style", "iframe", "object", "embed", "svg", "math", "template", "noscript":
			return
		}
		allowed := strings.Contains("|p|br|strong|b|em|i|u|s|h1|h2|h3|h4|ul|ol|li|blockquote|table|thead|tbody|tfoot|tr|th|td|hr|span|", "|"+n.Data+"|")
		if allowed {
			out.WriteString("<" + n.Data)
			for _, a := range n.Attr {
				if a.Key == "style" {
					for _, rule := range strings.Split(a.Val, ";") {
						pair := strings.SplitN(rule, ":", 2)
						if len(pair) == 2 && strings.TrimSpace(strings.ToLower(pair[0])) == "text-align" {
							v := strings.TrimSpace(strings.ToLower(pair[1]))
							if v == "left" || v == "right" || v == "center" || v == "justify" {
								out.WriteString(` style="text-align:` + v + `"`)
								break
							}
						}
					}
				}
				if (n.Data == "td" || n.Data == "th") && (a.Key == "colspan" || a.Key == "rowspan") {
					v, e := strconv.Atoi(a.Val)
					if e == nil && v >= 1 && v <= 20 {
						out.WriteString(" " + a.Key + `="` + strconv.Itoa(v) + `"`)
					}
				}
				if a.Key == "dir" && (a.Val == "rtl" || a.Val == "ltr") {
					out.WriteString(` dir="` + a.Val + `"`)
				}
			}
			out.WriteString(">")
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			write(c)
		}
		if allowed && n.Data != "br" && n.Data != "hr" {
			out.WriteString("</" + n.Data + ">")
		}
	}
	for _, n := range nodes {
		write(n)
	}
	return out.String()
}
func PlainHTML(text string) string {
	return "<p>" + strings.ReplaceAll(strings.ReplaceAll(html.EscapeString(text), "\r\n", "\n"), "\n", "<br>") + "</p>"
}
func HasText(source string) bool {
	doc, _ := nethtml.Parse(strings.NewReader(source))
	var b bytes.Buffer
	var walk func(*nethtml.Node)
	walk = func(n *nethtml.Node) {
		if n.Type == nethtml.TextNode {
			b.WriteString(n.Data)
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	if doc != nil {
		walk(doc)
	}
	return strings.TrimSpace(b.String()) != ""
}

var placeholder = regexp.MustCompile(`\{\{([a-z_]+)\}\}`)

// One pass prevents guest text containing template syntax from being expanded.
func Render(text string, values map[string]string, markup bool) (string, error) {
	remaining := placeholder.ReplaceAllString(text, "")
	if strings.Contains(remaining, "{{") || strings.Contains(remaining, "}}") {
		return "", constants.ErrDocumentPlaceholder
	}
	invalid := false
	result := placeholder.ReplaceAllStringFunc(text, func(token string) string {
		value, ok := values[token[2:len(token)-2]]
		if !ok {
			invalid = true
		}
		if markup {
			return html.EscapeString(value)
		}
		return value
	})
	if invalid {
		return "", constants.ErrDocumentPlaceholder
	}
	return result, nil
}

func ValidatePlaceholders(t Template) error {
	keys := "hotel_name branch_name room_code guest_name guest_names id_numbers phones relationships check_in check_out inventory amount currency payment_method payment_reference paid_at booking_id"
	if strings.HasPrefix(t.Kind, "report_") {
		keys = "report_title hotel_name branch_name report_period currency report_metrics report_tables report_notes prepared_by generated_at"
	}
	values := map[string]string{}
	for _, key := range strings.Fields(keys) {
		values[key] = ""
	}
	for _, body := range t.Body {
		if _, e := Render(body, values, false); e != nil {
			return e
		}
	}
	for _, title := range t.Title {
		if _, e := Render(title, values, false); e != nil {
			return e
		}
	}
	return nil
}
