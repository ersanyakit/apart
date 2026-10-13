package application

import (
	"context"
	"otel/constants"
	"otel/internal/domain/audit"
	"otel/internal/domain/identity"
)

type Audit struct{ Repository audit.Repository }

func (s *Audit) List(ctx context.Context, u identity.User, q audit.Query) (audit.Page, error) {
	if !u.IsManager() || !u.CanAccessHotel(q.HotelID) {
		return audit.Page{}, constants.ErrForbidden
	}
	if q.Page < 0 || q.Page > 100000 || (q.From != nil && q.To != nil && !q.To.After(*q.From)) {
		return audit.Page{}, constants.ErrPayload
	}
	if q.PageSize != 0 && q.PageSize != 25 && q.PageSize != 50 && q.PageSize != 100 {
		return audit.Page{}, constants.ErrPayload
	}
	return s.Repository.AuditLogs(ctx, q)
}
