package export

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"github.com/xuri/excelize/v2"
	"html"
	"os/exec"
	"otel/constants"
	"otel/internal/domain/document"
	"path/filepath"
	"strings"
	"time"
)

type Renderer struct{}

var pdfSlots = make(chan struct{}, 2)

func (Renderer) Spreadsheet(ctx context.Context, title string, rows [][]string) ([]byte, error) {
	sheet := "Konaklamalar"
	if title == "Müşteri Listesi" {
		sheet = "Müşteriler"
	}
	f := excelize.NewFile()
	defer f.Close()
	if err := f.SetSheetName("Sheet1", sheet); err != nil {
		return nil, constants.Wrap(constants.ErrExport, err)
	}
	for i, row := range rows {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		for j, value := range row {
			cell, err := excelize.CoordinatesToCellName(j+1, i+1)
			if err != nil {
				return nil, constants.Wrap(constants.ErrExport, err)
			}
			if err := f.SetCellStr(sheet, cell, value); err != nil {
				return nil, constants.Wrap(constants.ErrExport, err)
			}
		}
	}
	lastColumn := "A"
	if len(rows) > 0 && len(rows[0]) > 0 {
		lastColumn, _ = excelize.ColumnNumberToName(len(rows[0]))
	}
	style, err := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Color: "FFFFFF"}, Fill: excelize.Fill{Type: "pattern", Color: []string{"2563EB"}, Pattern: 1}})
	if err != nil {
		return nil, constants.Wrap(constants.ErrExport, err)
	}
	if err := f.SetCellStyle(sheet, "A1", lastColumn+"1", style); err != nil {
		return nil, constants.Wrap(constants.ErrExport, err)
	}
	if err := f.SetColWidth(sheet, "A", lastColumn, 26); err != nil {
		return nil, constants.Wrap(constants.ErrExport, err)
	}
	if err := f.SetPanes(sheet, &excelize.Panes{Freeze: true, YSplit: 1, TopLeftCell: "A2", ActivePane: "bottomLeft"}); err != nil {
		return nil, constants.Wrap(constants.ErrExport, err)
	}
	if title == "Müşteri Listesi" {
		band, err := f.NewStyle(&excelize.Style{Fill: excelize.Fill{Type: "pattern", Color: []string{"F2F2F2"}, Pattern: 1}, Alignment: &excelize.Alignment{Vertical: "center", WrapText: true}})
		if err != nil {
			return nil, err
		}
		for row := 2; row <= len(rows); row++ {
			if err := f.SetRowHeight(sheet, row, 24); err != nil {
				return nil, err
			}
			if row%2 == 0 {
				if err := f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("%s%d", lastColumn, row), band); err != nil {
					return nil, err
				}
			}
		}
		if err := f.SetColWidth(sheet, "E", "E", 48); err != nil {
			return nil, err
		}
		if err := f.SetColWidth(sheet, "D", "D", 12); err != nil {
			return nil, err
		}
		if err := f.AutoFilter(sheet, fmt.Sprintf("A1:%s%d", lastColumn, len(rows)), nil); err != nil {
			return nil, err
		}
	}
	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, constants.Wrap(constants.ErrExport, err)
	}
	return buf.Bytes(), nil
}
func HTML(title, body, language string) string {
	direction := "ltr"
	if language == "AR" {
		direction = "rtl"
	}
	return `<!doctype html><html lang="` + html.EscapeString(strings.ToLower(language)) + `" dir="` + direction + `"><head><meta charset="utf-8"><title>` + html.EscapeString(title) + `</title><style>body{font-family:Arial,"Noto Sans",sans-serif;color:#1e293b;font-size:11pt;line-height:1.6}h1{font-size:19pt;border-bottom:2px solid #2563eb;padding-bottom:12px}pre{font-family:inherit;white-space:pre-wrap;overflow-wrap:anywhere;font-size:11pt;line-height:1.65} article p{margin:0 0 10px}article ul{list-style:disc}article ol{list-style:decimal}table{border-collapse:collapse;width:100%;page-break-inside:auto}th,td{border:1px solid #ddd;padding:8px;vertical-align:top}tr{break-inside:avoid}blockquote{border-left:3px solid #ccc;margin-left:0;padding-left:12px} @page{size:A4;margin:18mm 16mm} @media print{body{margin:0}}</style></head><body><h1>` + html.EscapeString(title) + `</h1><pre>` + html.EscapeString(body) + `</pre></body></html>`
}
func RichHTML(title, body, language string) string {
	plain := HTML(title, "", language)
	return strings.Replace(plain, "<pre></pre>", "<article>"+document.SanitizeHTML(body)+"</article>", 1)
}
func (Renderer) PDF(ctx context.Context, title, body, language string) ([]byte, error) {
	return renderPDF(ctx, HTML(title, body, language))
}
func (Renderer) PDFRich(ctx context.Context, title, body, language string) ([]byte, error) {
	return renderPDF(ctx, RichHTML(title, body, language))
}
func renderPDF(ctx context.Context, markup string) ([]byte, error) {
	select {
	case pdfSlots <- struct{}{}:
		defer func() { <-pdfSlots }()
	case <-ctx.Done():
		return nil, ctx.Err()
	}
	ctx, cancel := context.WithTimeout(ctx, 45*time.Second)
	defer cancel()
	data, err := json.Marshal(map[string]string{"html": markup})
	if err != nil {
		return nil, constants.Wrap(constants.ErrExport, err)
	}
	script, err := filepath.Abs("ui/scripts/pdf.mjs")
	if err != nil {
		return nil, constants.Wrap(constants.ErrExport, err)
	}
	cmd := exec.CommandContext(ctx, "node", script)
	cmd.Stdin = bytes.NewReader(data)
	output, err := cmd.Output()
	if err != nil {
		return nil, constants.Wrap(constants.ErrExport, err)
	}
	return output, nil
}
