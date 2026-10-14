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

type RoomIssueInput struct {
	ID          uuid.UUID `json:"id"`
	RoomID      uuid.UUID `json:"room_id"`
	Description string    `json:"description"`
	Priority    string    `json:"priority"`
}

func (s *Reporting) Issue(ctx context.Context, u identity.User, catalog *Catalog, in RoomIssueInput) (reporting.Record, error) {
	if !u.CanOperateRooms() && u.Role != constants.UserRoleTechnical && u.Role != constants.UserRoleMaintenance {
		return reporting.Record{}, constants.ErrForbidden
	}
	room, e := catalog.Room(ctx, u, in.RoomID)
	if e != nil {
		return reporting.Record{}, e
	}
	branch, e := catalog.Branch(ctx, u, room.BranchID)
	if e != nil {
		return reporting.Record{}, e
	}
	if len(strings.TrimSpace(in.Description)) < 10 || len(in.Description) > 2000 {
		return reporting.Record{}, constants.ErrReasonRequired
	}
	now := time.Now().UTC()
	record := reporting.Record{ID: in.ID, HotelID: branch.HotelID, BranchID: branch.BranchID, RoomID: &room.RoomID, ActorID: u.UserID, ActorName: actorName(u), Kind: "maintenance", Category: "other", Label: room.Code + " · Arıza bildirimi", Notes: strings.TrimSpace(in.Description), Priority: in.Priority, Status: "open", Currency: "TRY", Measure: "piece", Quantity: 1, OccurredAt: now, CreatedAt: now}
	if e = record.Validate(); e != nil {
		return record, e
	}
	return s.Repository.AppendReportRecord(ctx, record)
}
