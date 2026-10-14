package export

import (
	"context"
	_ "embed"
	"fmt"
	"math"
	"otel/constants"
	"strings"
	"time"

	"github.com/signintech/gopdf"
)

// Embedding the licensed font makes Turkish text portable across deployments.
//
//go:embed fonts/Go-Regular.ttf
var tableFont []byte

// TablePDF generates a searchable, paginated table directly in Go. It does not
// require a browser process, access to the network, or fonts on the host OS.
func (Renderer) TablePDF(ctx context.Context, title string, rows [][]string) ([]byte, error) {
	if len(rows) == 0 || len(rows[0]) != 5 {
		return nil, constants.ErrPayload
	}
	pdf := gopdf.GoPdf{}
	pdf.Start(gopdf.Config{PageSize: gopdf.Rect{W: 842, H: 595}})
	missing := false
	option := gopdf.TtfOption{OnGlyphNotFound: func(r rune) { missing = true }, OnGlyphNotFoundSubstitute: func(r rune) rune { return '?' }}
	if err := pdf.AddTTFFontDataWithOption("table", tableFont, option); err != nil {
		return nil, constants.Wrap(constants.ErrExport, err)
	}
	widths := []float64{158, 143, 124, 58, 291}
	write := func(x, y, size float64, text string) error {
		if err := pdf.SetFont("table", "", size); err != nil {
			return err
		}
		pdf.SetXY(x, y)
		return pdf.Cell(nil, text)
	}
	y, page := 0.0, 0
	newPage := func() error {
		pdf.AddPage()
		page++
		pdf.SetTextColor(19, 19, 19)
		if err := write(34, 28, 20, title); err != nil {
			return err
		}
		pdf.SetTextColor(107, 107, 107)
		meta := fmt.Sprintf("%d müşteri  ·  %s", len(rows)-1, time.Now().In(time.FixedZone("Europe/Istanbul", 10800)).Format("02.01.2006 15:04"))
		if err := write(34, 56, 9, meta); err != nil {
			return err
		}
		if err := write(744, 569, 9, fmt.Sprintf("Sayfa %d", page)); err != nil {
			return err
		}
		pdf.SetFillColor(242, 242, 242)
		pdf.RectFromUpperLeftWithStyle(34, 82, 774, 28, "F")
		x := 34.0
		for i, label := range rows[0] {
			if err := write(x+8, 90, 9, label); err != nil {
				return err
			}
			x += widths[i]
		}
		y = 110
		return nil
	}
	if err := newPage(); err != nil {
		return nil, constants.Wrap(constants.ErrExport, err)
	}
	for index, row := range rows[1:] {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		if len(row) != 5 {
			return nil, constants.ErrPayload
		}
		if err := pdf.SetFont("table", "", 9); err != nil {
			return nil, err
		}
		lines := make([][]string, 5)
		height := 1
		for col, value := range row {
			if value == "" {
				value = "-"
			}
			for _, paragraph := range strings.Split(strings.ReplaceAll(value, "\r\n", "\n"), "\n") {
				wrapped, err := pdf.SplitTextWithWordWrap(paragraph, widths[col]-16)
				if err != nil {
					return nil, constants.Wrap(constants.ErrExport, err)
				}
				if len(wrapped) == 0 {
					wrapped = []string{""}
				}
				lines[col] = append(lines[col], wrapped...)
			}
			height = max(height, len(lines[col]))
		}
		fullHeight := float64(height)*12 + 16
		if y+fullHeight > 550 && fullHeight <= 440 {
			if err := newPage(); err != nil {
				return nil, err
			}
		}
		for start := 0; start < height; {
			if err := ctx.Err(); err != nil {
				return nil, err
			}
			capacity := int(math.Floor((550 - y - 16) / 12))
			if capacity < 1 {
				if err := newPage(); err != nil {
					return nil, err
				}
				continue
			}
			count := min(capacity, height-start)
			rowHeight := float64(count)*12 + 16
			if index%2 == 1 {
				pdf.SetFillColor(242, 242, 242)
			} else {
				pdf.SetFillColor(255, 255, 255)
			}
			pdf.RectFromUpperLeftWithStyle(34, y, 774, rowHeight, "F")
			pdf.SetStrokeColor(230, 230, 230)
			pdf.SetLineWidth(.4)
			pdf.SetTextColor(19, 19, 19)
			x := 34.0
			for col, parts := range lines {
				pdf.RectFromUpperLeftWithStyle(x, y, widths[col], rowHeight, "D")
				for n := start; n < min(start+count, len(parts)); n++ {
					if err := write(x+8, y+8+float64(n-start)*12, 9, parts[n]); err != nil {
						return nil, err
					}
				}
				x += widths[col]
			}
			y += rowHeight
			start += count
		}
	}
	if missing {
		return nil, constants.Wrap(constants.ErrExport, fmt.Errorf("table font does not support one or more characters"))
	}
	data, err := pdf.GetBytesPdfReturnErr()
	if err != nil {
		return nil, constants.Wrap(constants.ErrExport, err)
	}
	return data, nil
}
