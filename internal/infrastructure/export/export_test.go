package export

import (
	"bytes"
	"context"
	"fmt"
	"github.com/xuri/excelize/v2"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestPlainAndRichDocumentsExportDistinctly(t *testing.T) {
	plain := HTML("<Title>", "<b>old plain text</b>", "TR")
	if !strings.Contains(plain, "&lt;b&gt;old plain text&lt;/b&gt;") {
		t.Fatal("legacy document interpreted as HTML")
	}
	rich := RichHTML("<Title>", `<h2>Başlık</h2><p style="text-align:center"><strong>Kalın</strong></p><script>alert(1)</script><img src="https://example.com">`, "AR")
	for _, required := range []string{`dir="rtl"`, "&lt;Title&gt;", "<h2>Başlık</h2>", "<strong>Kalın</strong>", `text-align:center`} {
		if !strings.Contains(rich, required) {
			t.Fatal(required)
		}
	}
	if strings.Contains(rich, "<script") || strings.Contains(rich, "<img") || strings.Contains(rich, "<pre>") {
		t.Fatal("unsafe or unformatted rich document")
	}
}

func TestCustomerTableExports(t *testing.T) {
	rows := [][]string{{"Ad soyad", "Kimlik / pasaport", "Telefon", "Uyruk", "Adres"}}
	for i := 0; i < 106; i++ {
		rows = append(rows, []string{fmt.Sprintf("Çağrı Şahin %03d", i), fmt.Sprintf("000%03d", i), "+90 555 012 34 56", "TR", "İstanbul, Üsküdar - örnek müşteri adresi"})
	}
	rows[1][4] = strings.Repeat("Uzun adres bilgisi, ", 150) + "SON ADRES"
	rows[2][0] = "=HYPERLINK(\"example\")"
	renderer := Renderer{}
	xlsx, err := renderer.Spreadsheet(context.Background(), "Müşteri Listesi", rows)
	if err != nil {
		t.Fatal(err)
	}
	workbook, err := excelize.OpenReader(bytes.NewReader(xlsx))
	if err != nil {
		t.Fatal(err)
	}
	defer workbook.Close()
	values, err := workbook.GetRows("Müşteriler")
	if err != nil || len(values) != 107 {
		t.Fatalf("spreadsheet rows: %d %v", len(values), err)
	}
	if value, _ := workbook.GetCellValue("Müşteriler", "B2"); value != "000000" {
		t.Fatal("identity leading zero lost")
	}
	if formula, _ := workbook.GetCellFormula("Müşteriler", "A3"); formula != "" {
		t.Fatal("customer data became a formula")
	}
	pdf, err := renderer.TablePDF(context.Background(), "Müşteri Listesi", rows)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(pdf, []byte("%PDF-")) {
		t.Fatal("invalid PDF signature")
	}
	if dir := os.Getenv("EXPORT_REVIEW_DIR"); dir != "" {
		if err := os.MkdirAll(dir, 0755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(dir, "customer-list.pdf"), pdf, 0600); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(dir, "customer-list.xlsx"), xlsx, 0600); err != nil {
			t.Fatal(err)
		}
	}
}
