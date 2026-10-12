package audit

import (
	"context"
	"github.com/google/uuid"
	"time"
)

type Actor struct {
	UserID    uuid.UUID
	RequestID string
	Command   string
}
type actorKey struct{}

func WithActor(ctx context.Context, a Actor) context.Context {
	return context.WithValue(ctx, actorKey{}, a)
}
func ActorFrom(ctx context.Context) Actor { a, _ := ctx.Value(actorKey{}).(Actor); return a }

type Entry struct {
	ID        uuid.UUID `json:"id"`
	HotelID   uuid.UUID `json:"hotel_id"`
	ActorID   uuid.UUID `json:"actor_id"`
	ActorName string    `json:"actor_name"`
	Command   string    `json:"command"`
	Action    string    `json:"action"`
	Entity    string    `json:"entity"`
	EntityID  uuid.UUID `json:"entity_id"`
	RequestID string    `json:"request_id"`
	CreatedAt time.Time `json:"created_at"`
}
type Query struct {
	HotelID uuid.UUID  `json:"hotel_id"`
	From    *time.Time `json:"from"`
	To      *time.Time `json:"to"`
	Action  string     `json:"action"`
	Page    int        `json:"page"`
}
type Page struct {
	Items []Entry `json:"items"`
	Total int64   `json:"total"`
	Page  int     `json:"page"`
}
type Repository interface {
	AuditLogs(context.Context, Query) (Page, error)
}
