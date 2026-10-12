package export

import (
	"bytes"
	"context"
	"encoding/json"
	"github.com/xuri/excelize/v2"
	"html"
	"os/exec"
	"otel/constants"
	"path/filepath"
	"strings"
	"time"
)

type Renderer struct{}

var pdfSlots = make(chan struct{}, 2)

func (Renderer) Spreadsheet(ctx context.Context, title string, rows [][]string) ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()
	if err := f.SetSheetName("Sheet1", "Konaklamalar"); err != nil {
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
			if err := f.SetCellStr("Konaklamalar", cell, value); err != nil {
				return nil, constants.Wrap(constants.ErrExport, err)
			}
		}
	}
	style, err := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Color: "FFFFFF"}, Fill: excelize.Fill{Type: "pattern", Color: []string{"2563EB"}, Pattern: 1}})
	if err != nil {
		return nil, constants.Wrap(constants.ErrExport, err)
	}
	if err := f.SetCellStyle("Konaklamalar", "A1", "I1", style); err != nil {
		return nil, constants.Wrap(constants.ErrExport, err)
	}
	if err := f.SetColWidth("Konaklamalar", "A", "I", 26); err != nil {
		return nil, constants.Wrap(constants.ErrExport, err)
	}
	if err := f.SetPanes("Konaklamalar", &excelize.Panes{Freeze: true, YSplit: 1, TopLeftCell: "A2", ActivePane: "bottomLeft"}); err != nil {
		return nil, constants.Wrap(constants.ErrExport, err)
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
	return `<!doctype html><html lang="` + html.EscapeString(strings.ToLower(language)) + `" dir="` + direction + `"><head><meta charset="utf-8"><title>` + html.EscapeString(title) + `</title><style>body{font-family:Arial,"Noto Sans",sans-serif;color:#1e293b;font-size:11pt;line-height:1.6}h1{font-size:19pt;border-bottom:2px solid #2563eb;padding-bottom:12px}pre{font-family:inherit;white-space:pre-wrap;overflow-wrap:anywhere;font-size:11pt;line-height:1.65} @page{size:A4;margin:18mm 16mm} @media print{body{margin:0}}</style></head><body><h1>` + html.EscapeString(title) + `</h1><pre>` + html.EscapeString(body) + `</pre></body></html>`
}
func (Renderer) PDF(ctx context.Context, title, body, language string) ([]byte, error) {
	select {
	case pdfSlots <- struct{}{}:
		defer func() { <-pdfSlots }()
	case <-ctx.Done():
		return nil, ctx.Err()
	}
	ctx, cancel := context.WithTimeout(ctx, 45*time.Second)
	defer cancel()
	data, err := json.Marshal(map[string]string{"html": HTML(title, body, language)})
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
