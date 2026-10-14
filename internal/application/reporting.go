package application

import (
	"context"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/domain/identity"
	"otel/internal/domain/reporting"
	"strings"
	"time"
)

type Reporting struct{ Repository reporting.Repository }

func reportingAccess(u identity.User, id uuid.UUID) error {
	if id == uuid.Nil || !u.IsManager() || !u.CanAccessHotel(id) {
		return constants.ErrForbidden
	}
	return nil
}
func (s *Reporting) Generate(ctx context.Context, u identity.User, f reporting.Filter) (reporting.Result, error) {
	if e := reportingAccess(u, f.HotelID); e != nil {
		return reporting.Result{}, e
	}
	if e := f.Validate(); e != nil {
		return reporting.Result{}, e
	}
	report, ok := reporting.Lookup(f.Key)
	if !ok {
		return reporting.Result{}, constants.ErrPayload
	}
	data, e := s.Repository.ReportData(ctx, f)
	if e != nil {
		return reporting.Result{}, e
	}
	return report.Generate(ctx, f, data)
}
func (s *Reporting) Record(ctx context.Context, u identity.User, r reporting.Record) (reporting.Record, error) {
	if e := reportingAccess(u, r.HotelID); e != nil {
		return r, e
	}
	r.ActorID = u.UserID
	r.ActorName = u.DisplayName
	r.CreatedAt = time.Now().UTC()
	r.VoidedAt = nil
	r.VoidReason = ""
	r.ResponsibleName = ""
	if r.Measure == "" {
		r.Measure = "piece"
	}
	if r.Priority == "" {
		r.Priority = "normal"
	}
	if e := r.Validate(); e != nil {
		return r, e
	}
	return s.Repository.AppendReportRecord(ctx, r)
}
func (s *Reporting) Void(ctx context.Context, u identity.User, hotel, id uuid.UUID, reason string) error {
	if e := reportingAccess(u, hotel); e != nil {
		return e
	}
	if id == uuid.Nil || len(strings.TrimSpace(reason)) < 3 || len(reason) > 500 {
		return constants.ErrPayload
	}
	return s.Repository.VoidReportRecord(ctx, hotel, id, u.UserID, reason)
}

func (s *Reporting) Choices(ctx context.Context, u identity.User, hotel, branch uuid.UUID) (reporting.Choices, error) {
	if e := reportingAccess(u, hotel); e != nil {
		return reporting.Choices{}, e
	}
	return s.Repository.RecordChoices(ctx, hotel, branch)
}
