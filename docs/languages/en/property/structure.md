# Properties, floors, rooms and apartments

Open Property Profile and Floor and Room Definitions.

![Property and unit definitions](../images/property.png)

## Plan the structure

The hierarchy is hotel → property/branch → floors and units. A unit may be an apartment, room, dormitory or bed. Rooms can belong to an apartment, and beds can belong to a room. The physical floor and parent unit are separate relationships; rooms within a multi-floor apartment may be on different floors.

## Create floors and units

1. Select the property and open Floor and Room Definitions.
2. Set the floor code, display name and order. Do not reuse a floor code within the same property.
3. In the unit form, select the apartment, room or dormitory type and enter its code.
4. Assign the appropriate floor and, if necessary, a parent unit.
5. Complete the rental-mode choice in the room form.
6. Add physical beds, amenities and inventory information.
7. Save and check the unit in the definitions list and the relevant operational view.

## Rent a room or individual beds?

| Choice | Result |
| --- | --- |
| Entire room | The room is the reservation unit; its physical beds describe the room layout. |
| Individual beds | Linked bed spaces are offered separately. |

The room's rental mode also applies to beds added later. Changes that would affect existing reservations may be blocked.

## Edit or delete a definition

Edit the record to inspect its floor and parent-unit assignment. If a structural change would affect confirmed or active reservations, first move them appropriately or consider cancellation for reservations that have not checked in. Follow the application's validation rather than bypassing it.

For bulk actions, review every selected unit code. Check filters and selected rows before applying changes to multiple units.

Continue with [beds and bunk beds](beds.md) and [amenities and inventory](amenities.md).
