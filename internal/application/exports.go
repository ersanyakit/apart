package application

import (
	"context"
	"fmt"
	"otel/constants"
	"otel/internal/domain/guest"
	"otel/internal/domain/identity"
	"strings"
	"time"
)

type File struct {
	Name string
	MIME string
	Data []byte
}
type Exporter interface {
	Spreadsheet(context.Context, string, [][]string) ([]byte, error)
	PDF(context.Context, string, string, string) ([]byte, error)
}
type Reports struct {
	Guests   *Guests
	Exporter Exporter
}

func (s *Reports) Export(ctx context.Context, u identity.User, q guest.Query) (File, error) {
	page, err := s.Guests.List(ctx, u, q, true)
	if err != nil {
		return File{}, err
	}
	zone, err := time.LoadLocation("Europe/Istanbul")
	if err != nil {
		return File{}, constants.Wrap(constants.ErrExport, err)
	}
	rows := [][]string{{"Misafir", "Kimlik", "Telefon", "Tesis", "Oda", "Giriş tarihi ve saati", "Çıkış tarihi ve saati", "Durum", "Birlikte konakladıkları"}}
	for _, r := range page.Items {
		names := []string{}
		for _, c := range r.Companions {
			names = append(names, c.Name)
		}
		rows = append(rows, []string{r.Name, r.TCNo, r.Phone, r.BranchName, r.RoomCode, r.Start.In(zone).Format("02.01.2006 15:04"), r.End.In(zone).Format("02.01.2006 15:04"), r.Status, strings.Join(names, ", ")})
	}
	switch q.Format {
	case "xlsx":
		data, err := s.Exporter.Spreadsheet(ctx, "Konaklama kayıtları", rows)
		return File{Name: "konaklamalar.xlsx", MIME: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Data: data}, err
	case "pdf":
		var body strings.Builder
		fmt.Fprintf(&body, "Oluşturulma: %s\nKayıt sayısı: %d\n\n", time.Now().In(zone).Format("02.01.2006 15:04"), page.Total)
		for _, row := range rows[1:] {
			for i, value := range row {
				fmt.Fprintf(&body, "%s: %s\n", rows[0][i], value)
			}
			body.WriteString("\n────────────────────────────\n\n")
		}
		data, err := s.Exporter.PDF(ctx, "Konaklama kayıtları", body.String(), "TR")
		return File{Name: "konaklamalar.pdf", MIME: "application/pdf", Data: data}, err
	default:
		return File{}, constants.ErrPayload
	}
}

// Customer exports share the directory query, but never its page offset.
func (s *Reports) ExportCustomers(ctx context.Context, u identity.User, q guest.Query) (File, error) {
	if q.Format != "xlsx" && q.Format != "pdf" {
		return File{}, constants.ErrPayload
	}
	page, err := s.Guests.ExportCustomers(ctx, u, q)
	if err != nil {
		return File{}, err
	}
	rows := [][]string{{"Ad soyad", "Kimlik / pasaport", "Telefon", "Uyruk", "Adres"}}
	for _, r := range page.Items {
		rows = append(rows, []string{r.Name, r.NationalID, r.Phone, r.Nationality, r.Address})
	}
	if q.Format == "xlsx" {
		data, err := s.Exporter.Spreadsheet(ctx, "Müşteri Listesi", rows)
		return File{Name: "musteri-listesi.xlsx", MIME: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Data: data}, err
	}
	renderer, ok := s.Exporter.(interface {
		TablePDF(context.Context, string, [][]string) ([]byte, error)
	})
	if !ok {
		return File{}, constants.ErrExport
	}
	data, err := renderer.TablePDF(ctx, "Müşteri Listesi", rows)
	return File{Name: "musteri-listesi.pdf", MIME: "application/pdf", Data: data}, err
}
