from rest_framework import viewsets
from rest_framework.response import Response

# Deprecated: Rack endpoints removed
class RackViewSet(viewsets.ViewSet):
    def list(self, request):
        return Response([])
