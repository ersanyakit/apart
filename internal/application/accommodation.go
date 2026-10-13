package application

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/domain/audit"
	"otel/internal/domain/booking"
	"otel/internal/domain/identity"
	"otel/internal/domain/property"
	"strings"
)

type Accommodation struct {
	Catalog  *Catalog
	Layout   property.LayoutRepository
	Bookings booking.Repository
}

func (s *Accommodation) Floors(ctx context.Context, u identity.User, id uuid.UUID) ([]property.Floor, error) {
	if _, err := s.Catalog.Branch(ctx, u, id); err != nil {
		return nil, err
	}
	return s.Layout.ListFloors(ctx, id)
}
func (s *Accommodation) SaveFloor(ctx context.Context, u identity.User, f property.Floor, create bool) (property.Floor, error) {
	if !u.IsManager() {
		return f, constants.ErrForbidden
	}
	if _, err := s.Catalog.Branch(ctx, u, f.BranchID); err != nil {
		return f, err
	}
	if create {
		f.FloorID = uuid.New()
	} else {
		old, err := s.Layout.FindFloor(ctx, f.FloorID)
		if err != nil {
			return f, err
		}
		if old.BranchID != f.BranchID {
			return f, constants.ErrForbidden
		}
	}
	if err := f.Validate(); err != nil {
		return f, err
	}
	err := s.Layout.SaveFloor(ctx, f, create)
	return f, err
}
func (s *Accommodation) Plan(ctx context.Context, u identity.User, id uuid.UUID) (property.FloorPlan, error) {
	f, err := s.Layout.FindFloor(ctx, id)
	if err != nil {
		return property.FloorPlan{}, err
	}
	if _, err := s.Catalog.Branch(ctx, u, f.BranchID); err != nil {
		return property.FloorPlan{}, err
	}
	rooms, err := s.Catalog.Properties.ListRooms(ctx, f.BranchID)
	if err != nil {
		return property.FloorPlan{}, err
	}
	out := property.FloorPlan{Floor: f, Rooms: []property.Room{}}
	parents := map[uuid.UUID]bool{}
	for _, r := range rooms {
		if r.ParentID != nil {
			parents[*r.ParentID] = true
		}
	}
	for _, r := range rooms {
		if r.FloorID != nil && *r.FloorID == id {
			r.EffectiveCapacity = property.EffectiveCapacity(rooms, r.RoomID)
			out.Rooms = append(out.Rooms, r)
			if !parents[r.RoomID] {
				if !r.Inactive {
					out.Capacity += r.Capacity
				}
			}
		}
	}
	return out, nil
}
func (s *Accommodation) SavePlan(ctx context.Context, u identity.User, id uuid.UUID, placements []property.Placement) error {
	if !u.IsManager() {
		return constants.ErrForbidden
	}
	if len(placements) > 10000 {
		return constants.ErrPayload
	}
	if _, err := s.Plan(ctx, u, id); err != nil {
		return err
	}
	return s.Layout.SavePlan(ctx, id, placements)
}
func (s *Accommodation) DeleteFloor(ctx context.Context, u identity.User, id uuid.UUID) error {
	if !u.IsManager() {
		return constants.ErrForbidden
	}
	if _, err := s.Plan(ctx, u, id); err != nil {
		return err
	}
	return s.Layout.DeleteFloor(ctx, id)
}
func (s *Accommodation) ListBookings(ctx context.Context, u identity.User, q booking.Query) ([]booking.Booking, error) {
	if _, err := s.Catalog.Branch(ctx, u, q.BranchID); err != nil {
		return nil, err
	}
	if q.From != nil && q.To != nil && !q.To.After(*q.From) {
		return nil, constants.ErrDates
	}
	return s.Bookings.ListBookings(ctx, q)
}
func (s *Accommodation) SaveBooking(ctx context.Context, u identity.User, b booking.Booking, create bool) (booking.Booking, error) {
	if !canBook(u) {
		return b, constants.ErrForbidden
	}
	if _, err := s.Catalog.Branch(ctx, u, b.BranchID); err != nil {
		return b, err
	}
	if create {
		b.BookingID = uuid.New()
		b.UserID = u.UserID
	}
	if err := b.Validate(); err != nil {
		return b, err
	}
	return s.Bookings.SaveBooking(ctx, b, create)
}
func canBook(u identity.User) bool { return u.IsManager() || u.Role == constants.UserRoleReception }
func (s *Accommodation) Transition(ctx context.Context, u identity.User, input booking.Transition) (booking.Booking, error) {
	if !canBook(u) {
		return booking.Booking{}, constants.ErrForbidden
	}
	if _, err := s.Catalog.Branch(ctx, u, input.BranchID); err != nil {
		return booking.Booking{}, err
	}
	actor := audit.ActorFrom(ctx)
	actor.UserID = u.UserID
	return s.Bookings.TransitionBooking(audit.WithActor(ctx, actor), input)
}
func (s *Accommodation) Available(ctx context.Context, u identity.User, q booking.Availability) ([]property.Room, error) {
	if _, err := s.Catalog.Branch(ctx, u, q.BranchID); err != nil {
		return nil, err
	}
	if q.CheckIn.IsZero() || !q.CheckOut.After(q.CheckIn) {
		return nil, constants.ErrDates
	}
	if q.GuestCount < 1 {
		return nil, constants.ErrCapacity
	}
	return s.Bookings.AvailableRooms(ctx, q)
}

func (s *Accommodation) Bulk(ctx context.Context, u identity.User, input property.BulkUnits) ([]property.Room, error) {
	if !u.IsManager() {
		return nil, constants.ErrForbidden
	}
	if _, err := s.Catalog.Branch(ctx, u, input.BranchID); err != nil {
		return nil, err
	}
	if input.Count < 1 || input.Count > 1000 || strings.TrimSpace(input.Prefix) == "" || len(input.Prefix) > 20 {
		return nil, constants.ErrPayload
	}
	if input.Levels < 1 || input.Levels > 10 {
		return nil, constants.ErrBunk
	}
	width, height := 2400, 1600
	if input.FloorID != nil {
		f, err := s.Layout.FindFloor(ctx, *input.FloorID)
		if err != nil {
			return nil, err
		}
		if f.BranchID != input.BranchID {
			return nil, constants.ErrForbidden
		}
		width, height = f.Width, f.Height
	}
	columns := (width - 20) / 160
	if columns < 1 {
		return nil, constants.ErrLayout
	}
	out := make([]property.Room, 0, input.Count)
	for i := 0; i < input.Count; i++ {
		r := property.Room{RoomID: uuid.New(), BranchID: input.BranchID, FloorID: input.FloorID, ParentID: input.ParentID, Kind: input.Kind, Code: fmt.Sprintf("%s-%03d", input.Prefix, i+1), Capacity: input.Capacity, Rentable: input.Rentable, Status: "Temiz", Position: property.Position{X: float64(20 + i%columns*160), Y: float64(20 + i/columns*120), Width: 140, Height: 100}}
		if r.Kind == "bed" {
			r.BedLevel = i%input.Levels + 1
			if input.Levels > 1 {
				r.BedGroup = fmt.Sprintf("%s-R%03d", input.Prefix, i/input.Levels+1)
			}
		}
		if err := r.Validate(); err != nil {
			return nil, err
		}
		if r.Position.Y+r.Position.Height > float64(height) {
			return nil, constants.ErrLayout
		}
		out = append(out, r)
	}
	if err := s.Layout.SaveUnits(ctx, out); err != nil {
		return nil, err
	}
	return out, nil
}

func (s *Accommodation) DeleteRooms(ctx context.Context, u identity.User, branchID uuid.UUID, ids []uuid.UUID) error {
	if !u.IsManager() {
		return constants.ErrForbidden
	}
	if len(ids) < 1 || len(ids) > 10000 {
		return constants.ErrPayload
	}
	if _, err := s.Catalog.Branch(ctx, u, branchID); err != nil {
		return err
	}
	return s.Catalog.Properties.DeleteRooms(ctx, branchID, ids)
}
