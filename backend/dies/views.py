import io
import os
import tempfile
import openpyxl
from django.db import transaction, models
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from rest_framework import viewsets, permissions, status, serializers
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from drf_spectacular.utils import OpenApiResponse, extend_schema, inline_serializer
from dies.models import (
    Die, ImportLog, MaintenanceLog, DieTolerance, WearAlert,
    MachineDieStock, DieInventoryRecount, DieInventoryRecountItem,
    EnamelMachine, Manufacturer
)
from dies.serializers import (
    DieListSerializer, DieDetailSerializer, DieCreateSerializer, 
    serialize_die_list_fast, ImportLogSerializer, MaintenanceLogSerializer,
    DieToleranceSerializer, WearAlertSerializer, MachineDieStockSerializer,
    DieInventoryRecountSerializer, EnamelMachineSerializer, ManufacturerSerializer
)
from dies.services.import_service import ImportService
from dies.services.recut_service import RecutService
from users.permissions import IsAdminOrRoot, IsAdminOrRootOrOperatorRelocate, IsAdminOrRootOnly
from search.meili import client as meili_client, INDEX_NAME

class DieViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing die inventory.
    
    Supports full CRUD operations for dies with filtering and pagination.
    
    - **Create** (POST): Add new die (ROUND or FLAT type)
    - **Read** (GET): List all dies with optional filters, or retrieve single die
    - **Update** (PUT/PATCH): Modify die properties
    - **Delete** (DELETE): Remove die from inventory
    
    **Filtering Parameters (GET only):**
    - `die_type`: Filter by die type (ROUND or FLAT)
    - `status`: Filter by status (ACTIVE, INACTIVE, AVAILABLE, etc.)
    - `casing`: Filter by casing material (STEEL, CARBIDE, etc.)
    - `location`: Filter by storage location (partial match, case-insensitive)
    - `size_min`, `size_max`: Range filter for ROUND die current_size
    - `width_min`, `width_max`: Range filter for FLAT die current_width
    - `thick_min`, `thick_max`: Range filter for FLAT die current_thickness
    - `page`: Pagination (100 items per page)
    
    **Examples:**
    - List ROUND dies with size 5.0-5.5: `/api/dies/?die_type=ROUND&size_min=5.0&size_max=5.5`
    - List ACTIVE dies in RACK-A: `/api/dies/?status=ACTIVE&location=RACK-A`
    - List FLAT dies by thickness: `/api/dies/?die_type=FLAT&thick_min=2.0&thick_max=2.5`
    
    **Permissions:** ADMIN, ROOT or OPERATOR (for relocation only)
    
    **Authentication:** Required (JWT Bearer token)
    """
    queryset = Die.objects.select_related('rounddie', 'flatdie', 'current_set__machine', 'manufacturer').prefetch_related('wear_alerts')
    lookup_field = 'die_id'

    lookup_value_regex = r'(?:(?!/wear-prediction(?:/|$)|/maintenance-logs(?:/|$)|/recut(?:/|$))[^?#])+'
    permission_classes = [IsAdminOrRootOrOperatorRelocate]

    def get_serializer_class(self):
        if self.action == 'list':
            return DieListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return DieCreateSerializer
        return DieDetailSerializer

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        
        # 1. OPTIMISTIC CONCURRENCY CONTROL (OCC)
        client_version_raw = request.data.get('version')
        if client_version_raw is None:
            return Response(
                {"detail": "Field 'version' is required for concurrency control.", "code": "version_required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            client_version = int(client_version_raw)
        except (ValueError, TypeError):
            return Response({"detail": "Invalid version format.", "code": "invalid_version"}, status=status.HTTP_400_BAD_REQUEST)

        # 2. PESSIMISTIC LOCKING & OBJECT RETRIEVAL
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}
        try:
            locked_instance = Die.objects.select_for_update().get(**filter_kwargs)
        except Die.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, locked_instance)

        # 3. VERIFY OCC VERSION UNDER LOCK
        if int(locked_instance.version) != client_version:
            return Response({
                "detail": "Concurrency Conflict: This record has been modified by another user. Please refresh and try again.",
                "code": "concurrency_conflict",
                "current_version": locked_instance.version
            }, status=status.HTTP_409_CONFLICT)

        serializer = self.get_serializer(locked_instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        locked_instance.version += 1
        serializer.save(version=locked_instance.version)
        return Response(serializer.data)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            data = serialize_die_list_fast(page)
            return self.get_paginated_response(data)
        data = serialize_die_list_fast(queryset)
        return Response(data)

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'retrieve':
            queryset = queryset.prefetch_related('history')
        
        # Query parameters for filtering

        die_type = self.request.query_params.get('die_type')
        status_val = self.request.query_params.get('status')
        casing = self.request.query_params.get('casing')
        
        # Range queries for ROUND size and FLAT width/thickness
        size_min = self.request.query_params.get('size_min')
        size_max = self.request.query_params.get('size_max')
        
        width_min = self.request.query_params.get('width_min')
        width_max = self.request.query_params.get('width_max')
        thick_min = self.request.query_params.get('thick_min')
        thick_max = self.request.query_params.get('thick_max')
        
        if die_type:
            queryset = queryset.filter(die_type=die_type)
        if status_val:
            queryset = queryset.filter(status=status_val)
        if casing:
            queryset = queryset.filter(casing=casing)
            
        manufacturer = self.request.query_params.get('manufacturer')
        if manufacturer:
            if manufacturer.isdigit():
                queryset = queryset.filter(manufacturer_id=int(manufacturer))
            else:
                queryset = queryset.filter(manufacturer__name__iexact=manufacturer)
            
        if size_min:
            queryset = queryset.filter(rounddie__current_size__gte=size_min)
        if size_max:
            queryset = queryset.filter(rounddie__current_size__lte=size_max)
            
        if width_min:
            queryset = queryset.filter(flatdie__current_width__gte=width_min)
        if width_max:
            queryset = queryset.filter(flatdie__current_width__lte=width_max)
        if thick_min:
            queryset = queryset.filter(flatdie__current_thickness__gte=thick_min)
        if thick_max:
            queryset = queryset.filter(flatdie__current_thickness__lte=thick_max)
            
        return queryset

    @action(detail=True, methods=['get', 'post'], url_path='maintenance-logs')
    def maintenance_logs(self, request, die_id=None):
        die = self.get_object()
        if request.method == 'GET':
            logs = die.maintenance_logs.select_related('created_by').all()
            serializer = MaintenanceLogSerializer(logs, many=True)
            return Response(serializer.data)
        elif request.method == 'POST':
            serializer = MaintenanceLogSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(die=die, created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='recut')
    @transaction.atomic
    def recut(self, request, die_id=None):
        die = self.get_object()
        try:
            RecutService.recut_die(die, request.user, request.data)
        except PermissionError as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Die recut successfully."}, status=status.HTTP_200_OK)


class ImportDiesView(APIView):
    """
    Bulk import dies from CSV or XLSX file.
    
    **Description:**
    Upload a spreadsheet file to create multiple dies at once.
    Supports CSV and XLSX formats with columns:
    - die_id, die_type (ROUND|FLAT), casing, status, location, current_set
    - For ROUND: punched_size, current_size
    - For FLAT: punched_width, current_width, punched_thickness, current_thickness, radius
    
    **Request:**
    - Method: POST
    - Content-Type: multipart/form-data
    - Field: `file` (CSV or XLSX file)
    
    **Response:**
    - `201 Created`: Import completed with summary
    - `400 Bad Request`: Invalid file format or missing file
    
    **Example Response:**
    ```json
    {
      "imported": 42,
      "skipped": 3,
      "errors": [
        {"row": 5, "error": "Invalid die_type: INVALID"}
      ]
    }
    ```
    
    **Permissions:** ADMIN or ROOT user only
    **Authentication:** Required (JWT Bearer token)
    """
    permission_classes = [IsAdminOrRoot]
    parser_classes = [MultiPartParser]

    @extend_schema(
        request={
            'multipart/form-data': inline_serializer(
                name='ImportDiesRequest',
                fields={'file': serializers.FileField()},
            )
        },
        responses={
            200: OpenApiResponse(description='Import completed with summary'),
            400: OpenApiResponse(description='Invalid file upload'),
        },
    )
    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Enforce file size limit of 10MB to prevent Denial of Service (DoS)
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        if file_obj.size > MAX_FILE_SIZE:
            return Response({"error": "File size exceeds the 10MB limit."}, status=status.HTTP_400_BAD_REQUEST)
        
        name, ext = os.path.splitext(file_obj.name)
        if ext.lower() not in ['.csv', '.xlsx']:
            return Response({"error": "Unsupported file format. Only CSV and XLSX are supported."}, status=status.HTTP_400_BAD_REQUEST)

        dry_run = request.query_params.get('dry_run', '').lower() == 'true'

        from django.conf import settings
        tmp_dir = os.path.join(settings.BASE_DIR, 'tmp')
        os.makedirs(tmp_dir, exist_ok=True)

        with tempfile.NamedTemporaryFile(suffix=ext, delete=False, dir=tmp_dir) as temp_file:
            for chunk in file_obj.chunks():
                temp_file.write(chunk)
            temp_path = temp_file.name

        try:
            import json
            from django.core.cache import cache
            from dies.tasks import import_dies_task

            initial_status = {
                "status": "importing",
                "progress": 0,
                "total": 100,
                "filename": file_obj.name,
                "dry_run": dry_run
            }
            cache.set('import_status', json.dumps(initial_status), timeout=3600)

            import_dies_task.delay(temp_path, ext, request.user.username, file_obj.name, dry_run=dry_run)
            
            return Response({
                "detail": "Import started in background",
                "status": "importing"
            }, status=status.HTTP_202_ACCEPTED)
        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            return Response({"error": f"Failed to start import task: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(transaction.non_atomic_requests, name='dispatch')
class ImportTemplateView(APIView):
    """
    Download Excel import templates.
    """
    permission_classes = [IsAdminOrRoot]

    @extend_schema(
        responses={200: OpenApiResponse(description="Excel spreadsheet binary template file")},
        description="Download an Excel template containing tabs for Round Die and Flat Die structure, and validation rules."
    )
    def get(self, request, *args, **kwargs):
        wb = openpyxl.Workbook()
        # Sheet 1: Round Die
        ws1 = wb.active
        ws1.title = "Round Die"
        headers_round = [
            "die_id", "die_type", "casing", "status", "manufacturer", "remarks", 
            "current_set", "machine_name", "punched_size", "current_size"
        ]
        ws1.append(headers_round)
        example_round = [
            "R-999", "ROUND", "25x10", "AVAILABLE", "Apex Tooling Corp", "Example round die",
            "Set A", "Machine A", 12.345, 12.345
        ]
        ws1.append(example_round)

        # Sheet 2: Flat Die
        ws2 = wb.create_sheet(title="Flat Die")
        headers_flat = [
            "die_id", "die_type", "casing", "status", "manufacturer", "remarks",
            "current_set", "machine_name", "punched_width", "current_width",
            "punched_thickness", "current_thickness", "radius"
        ]
        ws2.append(headers_flat)
        example_flat = [
            "F-999", "FLAT", "30x15", "AVAILABLE", "Apex Tooling Corp", "Example flat die",
            "Set B", "Machine B", 50.123, 50.123, 15.456, 15.456, 1.500
        ]
        ws2.append(example_flat)

        # Sheet 3: Field Reference
        ws3 = wb.create_sheet(title="Field Reference")
        ws3.append(["Column Name", "Required/Optional", "Die Type", "Description / Valid Values"])
        reference_rows = [
            ["die_id", "Required", "Both", "Unique identifier for the die (e.g., R-101, F-202)"],
            ["die_type", "Required", "Both", "Must be 'ROUND' or 'FLAT'"],
            ["casing", "Required", "Both", "Physical casing dimensions (e.g., 25x10, 30x15)"],
            ["status", "Required", "Both", "Must be one of: AVAILABLE, RUNNING, CLEANING, DAMAGED, POLISHING, MEASURING, INACTIVE"],
            ["manufacturer", "Optional", "Both", "Die manufacturer/vendor name (creates new record if vendor doesn't exist)"],
            ["remarks", "Optional", "Both", "Free-form text comments"],
            ["current_set", "Optional", "Both", "The Set name or Set ID the die belongs to"],
            ["machine_name", "Optional", "Both", "Machine name to resolve duplicate set names"],
            ["punched_size", "Required", "ROUND", "Punched extrusion size currently marked on die in mm (decimal)"],
            ["current_size", "Required", "ROUND", "Current measured extrusion size in mm (decimal)"],
            ["punched_width", "Required", "FLAT", "Punched flat die width currently marked on die in mm (decimal)"],
            ["current_width", "Required", "FLAT", "Current flat die width in mm (decimal)"],
            ["punched_thickness", "Required", "FLAT", "Punched flat die thickness currently marked on die in mm (decimal)"],
            ["current_thickness", "Required", "FLAT", "Current flat die thickness in mm (decimal)"],
            ["radius", "Required", "FLAT", "Corner/bearing radius in mm (decimal)"],
        ]
        for r in reference_rows:
            ws3.append(r)

        # Autofit column widths for readability
        for sheet in [ws1, ws2, ws3]:
            for col in sheet.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                col_letter = openpyxl.utils.get_column_letter(col[0].column)
                sheet.column_dimensions[col_letter].width = max(max_len + 3, 10)

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="tms_import_template.xlsx"'
        return response


@method_decorator(transaction.non_atomic_requests, name='dispatch')
class RenameDiesView(APIView):
    """
    Bulk rename die IDs from a 2-column CSV or XLSX mapping file.
    
    Permissions: ADMIN or ROOT user only.
    """
    permission_classes = [IsAdminOrRoot]
    parser_classes = [MultiPartParser]

    @extend_schema(
        request={
            'multipart/form-data': inline_serializer(
                name='RenameDiesRequest',
                fields={'file': serializers.FileField()},
            )
        },
        responses={
            202: OpenApiResponse(description='Rename task started in background'),
            400: OpenApiResponse(description='Invalid file upload'),
        },
    )
    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)
        
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        if file_obj.size > MAX_FILE_SIZE:
            return Response({"error": "File size exceeds the 10MB limit."}, status=status.HTTP_400_BAD_REQUEST)
        
        name, ext = os.path.splitext(file_obj.name)
        if ext.lower() not in ['.csv', '.xlsx']:
            return Response({"error": "Unsupported file format. Only CSV and XLSX are supported."}, status=status.HTTP_400_BAD_REQUEST)

        dry_run = request.query_params.get('dry_run', '').lower() == 'true'

        from django.conf import settings
        tmp_dir = os.path.join(settings.BASE_DIR, 'tmp')
        os.makedirs(tmp_dir, exist_ok=True)

        with tempfile.NamedTemporaryFile(suffix=ext, delete=False, dir=tmp_dir) as temp_file:
            for chunk in file_obj.chunks():
                temp_file.write(chunk)
            temp_path = temp_file.name

        try:
            import json
            from django.core.cache import cache
            from dies.tasks import rename_dies_task
            from users.context import get_current_ip

            initial_status = {
                "status": "importing",
                "progress": 0,
                "total": 100,
                "filename": file_obj.name,
                "dry_run": dry_run,
                "operation": "rename"
            }
            cache.set('import_status', json.dumps(initial_status), timeout=3600)

            rename_dies_task.delay(
                temp_path, ext, request.user.username, file_obj.name,
                dry_run=dry_run, ip_address=get_current_ip()
            )
            
            return Response({
                "detail": "Rename started in background",
                "status": "importing",
                "operation": "rename"
            }, status=status.HTTP_202_ACCEPTED)
        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            return Response({"error": f"Failed to start rename task: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(transaction.non_atomic_requests, name='dispatch')
class RenameTemplateView(APIView):
    """
    Download Excel bulk rename mapping template.
    """
    permission_classes = [IsAdminOrRoot]

    @extend_schema(
        responses={200: OpenApiResponse(description="Excel spreadsheet binary template file")},
        description="Download an Excel template containing columns for old_die_id and new_die_id mapping."
    )
    def get(self, request, *args, **kwargs):
        wb = openpyxl.Workbook()
        ws1 = wb.active
        ws1.title = "Die Renames"
        headers = ["old_die_id", "new_die_id"]
        ws1.append(headers)
        ws1.append(["SAMPLE-R-01", "SAMPLE-R-01-A"])
        ws1.append(["SAMPLE-F-01", "SAMPLE-F-01-A"])

        ws2 = wb.create_sheet(title="Instructions")
        ws2.append(["Column Name", "Required", "Description"])
        ws2.append(["old_die_id", "Yes", "The current Die ID existing in the TMS inventory"])
        ws2.append(["new_die_id", "Yes", "The target Die ID to rename to (must be unique, max 50 chars)"])
        ws2.append([])
        ws2.append(["Notes:", "", "All die attributes, measurements, history, and maintenance logs are preserved."])
        ws2.append(["Rules:", "", "Alphanumeric, hyphens, underscores, dots, and slashes allowed."])

        for sheet in [ws1, ws2]:
            for col in sheet.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                col_letter = openpyxl.utils.get_column_letter(col[0].column)
                sheet.column_dimensions[col_letter].width = max(max_len + 4, 14)

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="tms_die_rename_template.xlsx"'
        return response


@method_decorator(transaction.non_atomic_requests, name='dispatch')
class ImportLogsView(APIView):
    """
    Get paginated history of imports.
    """
    permission_classes = [IsAdminOrRoot]

    @extend_schema(
        responses={200: ImportLogSerializer(many=True)},
        description="Retrieve history of bulk imports."
    )
    def get(self, request, *args, **kwargs):
        from rest_framework.pagination import PageNumberPagination
        paginator = PageNumberPagination()
        paginator.page_size = 50
        logs = ImportLog.objects.select_related('imported_by').all()
        result_page = paginator.paginate_queryset(logs, request, view=self)
        serializer = ImportLogSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)


class DieToleranceViewSet(viewsets.ModelViewSet):
    queryset = DieTolerance.objects.all()
    serializer_class = DieToleranceSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrRoot]


class WearAlertViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WearAlert.objects.select_related('die').all()
    serializer_class = WearAlertSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrRootOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        is_resolved = self.request.query_params.get('is_resolved')
        if is_resolved is not None:
            qs = qs.filter(is_resolved=is_resolved.lower() == 'true')
        die_id = self.request.query_params.get('die_id')
        if die_id is not None:
            qs = qs.filter(die__die_id=die_id)
        return qs


class EnamelMachineViewSet(viewsets.ModelViewSet):
    queryset = EnamelMachine.objects.all()
    serializer_class = EnamelMachineSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.recounts.exists() or instance.die_stocks.exists():
            return Response(
                {"detail": "Cannot delete this machine because it has active stock records or recount history associated with it."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


class MachineDieStockViewSet(viewsets.ModelViewSet):
    queryset = MachineDieStock.objects.select_related('enamel_machine').all()
    serializer_class = MachineDieStockSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        enamel_machine_id = self.request.query_params.get('enamel_machine')
        if enamel_machine_id:
            qs = qs.filter(enamel_machine_id=enamel_machine_id)
        return qs


class DieInventoryRecountViewSet(viewsets.ModelViewSet):
    queryset = DieInventoryRecount.objects.select_related('enamel_machine', 'created_by').prefetch_related('items').all()
    serializer_class = DieInventoryRecountSerializer
    permission_classes = [permissions.IsAuthenticated]

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('all') == 'true':
            return None
        return super().paginate_queryset(queryset)

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def perform_create(self, serializer):
        recount = serializer.save(created_by=self.request.user)
        from tms.events import broadcast_event
        from django.db import transaction
        transaction.on_commit(lambda: broadcast_event("recount_update", {
            "id": recount.id,
            "enamel_machine_id": recount.enamel_machine.id,
            "action": "create"
        }))

    def perform_update(self, serializer):
        recount = serializer.save()
        from tms.events import broadcast_event
        from django.db import transaction
        transaction.on_commit(lambda: broadcast_event("recount_update", {
            "id": recount.id,
            "enamel_machine_id": recount.enamel_machine.id,
            "action": "save"
        }))

    @action(detail=True, methods=['post'], url_path='submit')
    @transaction.atomic
    def submit(self, request, pk=None):
        recount = self.get_object()
        if recount.status == 'SUBMITTED':
            return Response({"detail": "This recount sheet is already submitted."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Lock recount for update
        recount = DieInventoryRecount.objects.select_for_update().get(id=recount.id)
        
        # Capture current stocks to save as previous_quantity for audit history
        current_stocks = {
            s.die_size: s.quantity 
            for s in MachineDieStock.objects.filter(enamel_machine=recount.enamel_machine)
        }
        
        # Set previous_quantity on recount items
        for item in recount.items.all():
            item.previous_quantity = current_stocks.get(item.die_size, 0)
            item.save(update_fields=['previous_quantity'])
        
        # 1. Delete all existing stock for this enamel machine to match audit recount exactly
        MachineDieStock.objects.filter(enamel_machine=recount.enamel_machine).delete()
        
        # 2. Re-create machine stock records from recount items
        for item in recount.items.all():
            MachineDieStock.objects.create(
                enamel_machine=recount.enamel_machine,
                die_size=item.die_size,
                quantity=item.quantity
            )
            
        # 3. Mark recount sheet as submitted
        recount.status = 'SUBMITTED'
        recount.save()
        
        # 4. Broadcast recount update real-time event
        from tms.events import broadcast_event
        transaction.on_commit(lambda: broadcast_event("recount_update", {
            "id": recount.id,
            "enamel_machine_id": recount.enamel_machine.id,
            "action": "submit"
        }))
        
        return Response({"detail": "Recount sheet submitted and stock levels updated successfully."})


class ManufacturerViewSet(viewsets.ModelViewSet):
    """
    API endpoint for viewing and managing die manufacturers.
    """
    queryset = Manufacturer.objects.annotate(die_count=models.Count('dies')).order_by('name')
    serializer_class = ManufacturerSerializer
    pagination_class = None

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrRoot()]


class AnalyticsSummaryView(APIView):
    """
    API endpoint returning high-level fleet metrics:
    - Total dies, Round dies vs Flat dies
    - Total machine sets and allocation counts
    - Manufacturer-wise breakdown (total, round, flat, percentage)
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Analytics'],
        description="Retrieve fleet analytics summary: total dies, round vs flat, and manufacturer-wise breakdown."
    )
    def get(self, request):
        from django.core.cache import cache
        cache_key = "analytics_summary_v1"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        from django.db.models import Count, Q
        from machines.models import Set

        totals = Die.objects.aggregate(
            total_dies=Count('id'),
            round_dies=Count('id', filter=Q(die_type='ROUND')),
            flat_dies=Count('id', filter=Q(die_type='FLAT')),
            dies_in_sets=Count('id', filter=Q(current_set__isnull=False)),
            dies_in_storage=Count('id', filter=Q(current_set__isnull=True)),
        )
        total_all = totals['total_dies']
        total_sets = Set.objects.count()
        total_manufacturers = Manufacturer.objects.count()

        # Query all registered manufacturers annotated with die type counts
        mfgs = Manufacturer.objects.annotate(
            total_dies=Count('dies'),
            round_dies=Count('dies', filter=Q(dies__die_type='ROUND')),
            flat_dies=Count('dies', filter=Q(dies__die_type='FLAT')),
        ).order_by('-total_dies', 'name')

        mfg_list = []
        for m in mfgs:
            pct = round((m.total_dies / total_all) * 100, 1) if total_all > 0 else 0.0
            mfg_list.append({
                'id': m.id,
                'name': m.name,
                'total_dies': m.total_dies,
                'round_dies': m.round_dies,
                'flat_dies': m.flat_dies,
                'percentage': pct,
            })

        # Unassigned dies (dies with no manufacturer foreign key)
        unassigned = Die.objects.filter(manufacturer__isnull=True).aggregate(
            total_dies=Count('id'),
            round_dies=Count('id', filter=Q(die_type='ROUND')),
            flat_dies=Count('id', filter=Q(die_type='FLAT')),
        )
        if unassigned['total_dies'] > 0:
            pct = round((unassigned['total_dies'] / total_all) * 100, 1) if total_all > 0 else 0.0
            mfg_list.append({
                'id': None,
                'name': 'Unassigned',
                'total_dies': unassigned['total_dies'],
                'round_dies': unassigned['round_dies'],
                'flat_dies': unassigned['flat_dies'],
                'percentage': pct,
            })

        # Sort with highest die count first
        mfg_list.sort(key=lambda x: x['total_dies'], reverse=True)

        data = {
            'total_dies': totals['total_dies'],
            'round_dies': totals['round_dies'],
            'flat_dies': totals['flat_dies'],
            'total_sets': total_sets,
            'total_manufacturers': total_manufacturers,
            'sets_summary': {
                'total_sets': total_sets,
                'dies_in_sets': totals['dies_in_sets'],
                'dies_in_storage': totals['dies_in_storage'],
            },
            'manufacturers': mfg_list,
        }

        # Cache for 60 seconds
        cache.set(cache_key, data, timeout=60)
        return Response(data)




