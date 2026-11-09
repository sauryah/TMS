# Django machines Module (machines.md)

## Purpose
Manages physical floor organizational divisions and production line assignments: `MachineCategory`, `Machine`, and `Set`.

## Important Files
- [models.py](file:///backend/machines/models.py): Asset and layout models (`MachineCategory`, `Machine`, `Set`).
- [views/](file:///backend/machines/views/): ViewSet modules:
  - `category.py`: `MachineCategoryViewSet`
  - `machine.py`: `MachineViewSet`
  - `set.py`: `SetViewSet` (handles machine set allocations and die assignments)
- [signals.py](file:///backend/machines/signals.py): Audit logging signals tracking machine layout modifications to `MachineHistory`.

